import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronLeft,
    Link as LinkIcon,
    Play,
    PlaySquare,
    XCircle,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    ToastAndroid,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, getMediaUrl } from '../../../src/api/axiosClient';
import VideoPreviewModal from '../../../src/components/common/VideoPreviewModal';

interface ReelItem {
  id: string;
  videoUrl: string;
  posterUrl?: string;
  caption?: string;
  ownerUsername?: string;
  linkedEntityTitle?: string;
  createdAt: string;
}

export default function VerifyReelScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [reels, setReels] = useState<ReelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // استیت آدرس ویدیو برای پخش در مدال مدرن
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  // استیت‌های مدال ثبت دلیل رد شدن
  const [rejectModalItem, setRejectModalItem] = useState<ReelItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  const fetchPendingReels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/reels/pending-admin');
      setReels(res.data?.items || res.data || []);
    } catch {
      showToast('خطا در دریافت لیست ریلزی در انتظار');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingReels();
  }, [fetchPendingReels]);

  // تایید مستقیم ریلز
  const handleApprove = async (id: string) => {
    try {
      setActionLoadingId(id);
      await api.post(`/reels/${id}/review-admin`, {
        isApproved: true,
      });
      showToast('ریلز با موفقیت تایید و منتشر شد');
      setReels((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در تایید ریلز');
    } finally {
      setActionLoadingId(null);
    }
  };

  // ثبت رد ریلز به همراه دلیل
  const handleRejectConfirm = async () => {
    if (!rejectModalItem || !rejectReason.trim()) {
      showToast('وارد کردن دلیل رد الزامی است');
      return;
    }

    try {
      setActionLoadingId(rejectModalItem.id);
      await api.post(`/reels/${rejectModalItem.id}/review-admin`, {
        isApproved: false,
        rejectionReason: rejectReason.trim(),
      });
      showToast('ریلز رد شد و جهت بررسی نهایی به سوپر ادمین ارجاع یافت');
      setReels((prev) => prev.filter((r) => r.id !== rejectModalItem.id));
      setRejectModalItem(null);
      setRejectReason('');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ثبت وضعیت ریلز');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* هدر صفحه */}
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <View style={styles.headerIconBox}>
            <PlaySquare size={20} color="#a855f7" />
          </View>
          <View>
            <Text style={styles.headerTitle}>تایید ریلزی ارسالی</Text>
            <Text style={styles.headerSubtitle}>{reels.length} ریلز در انتظار بررسی</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <ChevronLeft size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* لیست ریلز */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#a855f7" />
        </View>
      ) : reels.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>هیچ ریلزی در انتظار تایید نیست.</Text>
        </View>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {/* هدر کارت: مشخصات سازنده و فیلم لینک‌شده */}
              <View style={styles.userRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.ownerUsername?.[0] || 'U'}</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.username}>@{item.ownerUsername || 'کاربر'}</Text>
                  {item.linkedEntityTitle && (
                    <View style={styles.linkedRow}>
                      <LinkIcon size={10} color="#38bdf8" />
                      <Text style={styles.linkedTitle} numberOfLines={1}>
                        لینک به: {item.linkedEntityTitle}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* کاور و پیش‌نمایش ویدیو با کلیک */}
              <TouchableOpacity
                style={styles.videoThumbnailBox}
                activeOpacity={0.85}
                onPress={() => setPreviewVideoUrl(getMediaUrl(item.videoUrl))}
              >
                {item.posterUrl ? (
                  <Image
                    source={{ uri: getMediaUrl(item.posterUrl) }}
                    style={styles.thumbnailImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.thumbnailPlaceholder}>
                    <PlaySquare size={36} color="#64748b" />
                  </View>
                )}
                <View style={styles.playOverlay}>
                  <View style={styles.playIconCircle}>
                    <Play size={22} color="#ffffff" fill="#ffffff" />
                  </View>
                  <Text style={styles.playOverlayText}>لمس برای پخش ویدیو</Text>
                </View>
              </TouchableOpacity>

              {/* کپشن ریلز */}
              {item.caption ? (
                <Text style={styles.captionText} numberOfLines={2}>
                  {item.caption}
                </Text>
              ) : null}

              {/* اکشن‌های تایید و رد */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  activeOpacity={0.75}
                  disabled={actionLoadingId === item.id}
                  onPress={() => {
                    setRejectModalItem(item);
                    setRejectReason('');
                  }}
                >
                  <XCircle size={16} color="#f43f5e" />
                  <Text style={styles.rejectBtnText}>رد و ارجاع</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  activeOpacity={0.8}
                  disabled={actionLoadingId === item.id}
                  onPress={() => handleApprove(item.id)}
                >
                  {actionLoadingId === item.id ? (
                    <ActivityIndicator size="small" color="#030712" />
                  ) : (
                    <>
                      <CheckCircle2 size={16} color="#030712" />
                      <Text style={styles.approveBtnText}>تایید و انتشار</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* 🟢 ۱. مدال استاندارد و مدرن پخش ویدیو ریلز */}
      <VideoPreviewModal
        visible={!!previewVideoUrl}
        videoUrl={previewVideoUrl}
        onClose={() => setPreviewVideoUrl(null)}
        title="پیش‌نمایش ریلز"
      />

      {/* 🟢 ۲. مدال ثبت دلیل رد ریلز */}
      {rejectModalItem && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.rejectModalCard}>
              <View style={styles.modalHeaderIconBox}>
                <AlertTriangle size={28} color="#f43f5e" />
              </View>
              <Text style={styles.modalTitle}>علت عدم تایید ریلز</Text>
              <Text style={styles.modalDesc}>
                دلیل رد شدن ریلز را بنویسید (جهت ارجاع به سوپر ادمین):
              </Text>

              <TextInput
                style={styles.modalInput}
                multiline
                numberOfLines={4}
                placeholder="علت رد شدن ریلز را بنویسید..."
                placeholderTextColor="#64748b"
                value={rejectReason}
                onChangeText={setRejectReason}
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setRejectModalItem(null)}
                >
                  <Text style={styles.modalCancelText}>انصراف</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={handleRejectConfirm}
                  disabled={actionLoadingId === rejectModalItem.id || !rejectReason.trim()}
                >
                  {actionLoadingId === rejectModalItem.id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalSubmitText}>ثبت و ارجاع</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 12,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(13, 21, 32, 0.85)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 13.5,
    color: '#ffffff',
  },
  headerSubtitle: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'right',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: '#0d1520',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
    gap: 12,
  },
  userRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    paddingBottom: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 13,
    color: '#c084fc',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  username: {
    fontFamily: 'Ravi-Bold',
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'right',
  },
  linkedRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  linkedTitle: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10,
    color: '#38bdf8',
    textAlign: 'right',
    flex: 1,
  },
  videoThumbnailBox: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#030712',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    opacity: 0.75,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  playIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(168, 85, 247, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
  },
  playOverlayText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 10.5,
    color: '#ffffff',
  },
  captionText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11.5,
    color: '#cbd5e1',
    textAlign: 'right',
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rejectBtn: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
  },
  rejectBtnText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11.5,
    color: '#f43f5e',
  },
  approveBtn: {
    backgroundColor: '#a855f7',
  },
  approveBtnText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11.5,
    color: '#030712',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  rejectModalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#0d1520',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  modalHeaderIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
  },
  modalDesc: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10.5,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
  },
  modalInput: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    borderRadius: 14,
    padding: 10,
    fontFamily: 'Ravi-Regular',
    fontSize: 11.5,
    color: '#ffffff',
    textAlign: 'right',
    height: 80,
    textAlignVertical: 'top',
    marginTop: 4,
  },
  modalBtnRow: {
    flexDirection: 'row-reverse',
    width: '100%',
    gap: 8,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11,
    color: '#94a3b8',
  },
  modalSubmitBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f43f5e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11,
    color: '#ffffff',
  },
});