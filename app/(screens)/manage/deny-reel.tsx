import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
    AlertTriangle,
    ChevronLeft,
    Link as LinkIcon,
    Play,
    PlaySquare,
    Trash2,
    Undo2,
    X,
    XCircle,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    ToastAndroid,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, getMediaUrl } from '../../../src/api/axiosClient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DeniedReelItem {
  id: string;
  videoUrl: string;
  posterUrl?: string;
  caption?: string;
  ownerUsername?: string;
  linkedEntityTitle?: string;
  rejectionReason?: string;
  createdAt?: string;
}

// 🟢 کامپوننت اختصاصی پخش ویدیو با استفاده از استاندارد مدرن expo-video
function VideoPreviewModal({
  videoUrl,
  onClose,
}: {
  videoUrl: string;
  onClose: () => void;
}) {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.videoPlayerCard}>
          <View style={styles.videoPlayerHeader}>
            <Text style={styles.videoPlayerTitle}>بازبینی ویدیو ریلز</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={styles.videoContainer}>
            <VideoView
              style={styles.fullVideo}
              player={player}
              allowsFullscreen
              allowsPictureInPicture
              nativeControls
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function DenyReelScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [reels, setReels] = useState<DeniedReelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // استیت مدال پیش‌نمایش ویدیو
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  const fetchPendingSuperAdminReels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/reels/pending-superadmin');
      setReels(res.data?.items || res.data || []);
    } catch {
      showToast('خطا در دریافت لیست ریلزی رد شده');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingSuperAdminReels();
  }, [fetchPendingSuperAdminReels]);

  // ۱. ارجاع مجدد به صف بررسی ادمین اولیه
  const handleApproveToAdmin = async (id: string) => {
    try {
      setActionLoadingId(id);
      await api.post(`/reels/${id}/review-superadmin`, { isApproved: true });
      showToast('ریلز جهت بررسی مجدد به صف ادمین اولیه ارجاع شد');
      setReels((prev) => prev.filter((r) => r.id !== id));
      if (previewVideoUrl) setPreviewVideoUrl(null);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ارجاع به ادمین');
    } finally {
      setActionLoadingId(null);
    }
  };

  // ۲. حذف قطعی و پاکسازی کامل فیزیکی فایل‌ها
  const handleFinalDelete = (id: string) => {
    Alert.alert(
      'رد قطعی و حذف دائم ریلز',
      'با این کار، ویدیوی ریلز، کاور و تمامی رکورد‌های آن کلاً از سرور و دیتابیس پاک خواهند شد و این عملیات غیرقابل بازگشت است! آیا مطمئن هستید؟',
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'بله، حذف کامل و نهایی شود',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoadingId(id);
              await api.post(`/reels/${id}/review-superadmin`, { isApproved: false });
              showToast('ریلز و تمامی فایل‌های آن با موفقیت پاک شدند');
              setReels((prev) => prev.filter((r) => r.id !== id));
              if (previewVideoUrl) setPreviewVideoUrl(null);
            } catch (err: any) {
              showToast(err.response?.data?.message || 'خطا در حذف نهایی ریلز');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* هدر صفحه */}
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <View style={styles.headerIconBox}>
            <XCircle size={20} color="#f43f5e" />
          </View>
          <View>
            <Text style={styles.headerTitle}>ریلزی رد شده (مدیریت ارشد)</Text>
            <Text style={styles.headerSubtitle}>ارزیابی آثار رد شده توسط ادمین اولیه</Text>
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

      {/* لیست ریلزی رد شده */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#f43f5e" />
        </View>
      ) : reels.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>هیچ ریلزی در صف بررسی سوپر ادمین وجود ندارد.</Text>
        </View>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {/* مشخصات سازنده و فیلم لینک‌شده */}
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

              {/* پیش‌نمایش ویدیو با امکان پخش در مدال */}
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
                  <Text style={styles.playOverlayText}>لمس برای بازبینی ویدیو</Text>
                </View>
              </TouchableOpacity>

              {/* دلیل عدم تایید ادمین اولیه */}
              <View style={styles.rejectionReasonBox}>
                <AlertTriangle size={14} color="#f43f5e" />
                <View style={styles.rejectionTextCol}>
                  <Text style={styles.rejectionTitle}>علت رد ادمین اولیه:</Text>
                  <Text style={styles.rejectionDesc}>
                    {item.rejectionReason || 'دلیلی قید نشده است.'}
                  </Text>
                </View>
              </View>

              {/* اکشن‌های سوپر ادمین */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  activeOpacity={0.75}
                  disabled={actionLoadingId === item.id}
                  onPress={() => handleFinalDelete(item.id)}
                >
                  <Trash2 size={15} color="#f43f5e" />
                  <Text style={styles.deleteBtnText}>حذف قطعی</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  activeOpacity={0.8}
                  disabled={actionLoadingId === item.id}
                  onPress={() => handleApproveToAdmin(item.id)}
                >
                  {actionLoadingId === item.id ? (
                    <ActivityIndicator size="small" color="#030712" />
                  ) : (
                    <>
                      <Undo2 size={15} color="#030712" />
                      <Text style={styles.approveBtnText}>ارجاع به ادمین</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* مدال پیش‌نمایش و بازبینی ویدیو ریلز با Expo Video */}
      {previewVideoUrl && (
        <VideoPreviewModal
          videoUrl={previewVideoUrl}
          onClose={() => setPreviewVideoUrl(null)}
        />
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
    paddingVertical: 40,
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
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
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
    borderColor: 'rgba(244, 63, 94, 0.2)',
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
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 13,
    color: '#2dd4bf',
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
    opacity: 0.7,
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
    backgroundColor: 'rgba(20, 184, 166, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
  },
  playOverlayText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 10.5,
    color: '#ffffff',
  },
  rejectionReasonBox: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
    borderRadius: 14,
    padding: 10,
  },
  rejectionTextCol: {
    flex: 1,
    gap: 2,
  },
  rejectionTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 10.5,
    color: '#f43f5e',
    textAlign: 'right',
  },
  rejectionDesc: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11,
    color: '#fecdd3',
    textAlign: 'right',
    lineHeight: 16,
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
  deleteBtn: {
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  deleteBtnText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11,
    color: '#f43f5e',
  },
  approveBtn: {
    backgroundColor: '#14b8a6',
  },
  approveBtnText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11,
    color: '#030712',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  videoPlayerCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0c1222',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  videoPlayerHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  videoPlayerTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 13,
    color: '#ffffff',
  },
  videoContainer: {
    width: '100%',
    height: 400,
    backgroundColor: '#000000',
  },
  fullVideo: {
    width: '100%',
    height: '100%',
  },
});