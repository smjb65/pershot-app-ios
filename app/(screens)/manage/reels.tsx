import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Eye,
    Heart,
    Play,
    Trash2,
    User,
    Video as VideoIcon,
    X,
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

interface ReelItem {
  id: string;
  videoUrl: string;
  posterUrl?: string;
  caption?: string;
  ownerUsername?: string;
  viewsCount?: number;
  likesCount?: number;
  createdAt?: string;
}

// 🟢 کامپوننت اختصاصی پیش‌نمایش ویدیو با expo-video
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
            <Text style={styles.videoPlayerTitle}>پیش‌نمایش ویدیو ریلز</Text>
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

export default function AdminReelsManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<ReelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // استیت مدال پیش‌نمایش ویدیو
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  const pageSize = 10;

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  const fetchList = useCallback(async (pageNum: number) => {
    try {
      setLoading(true);
      const res = await api.get('/reels/my-reels', {
        params: { page: pageNum, pageSize },
      });
      setItems(res.data?.items || res.data || []);
      setTotal(res.data?.total || res.data?.length || 0);
    } catch {
      showToast('خطا در دریافت لیست ریلز');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList(page);
  }, [page, fetchList]);

  const handleDelete = (id: string) => {
    Alert.alert(
      'حذف کامل ریلز',
      'با حذف این اثر توسط ادمین، تمامی فایل‌های ویدئویی و اطلاعات آن کلاً از سرور و دیتابیس پاک خواهند شد! آیا مطمئن هستید؟',
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'بله، حذف کامل شود',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(id);
              await api.delete(`/reels/${id}`);
              showToast('ریلز و فایل‌های آن با موفقیت پاک شدند');
              fetchList(page);
            } catch (err: any) {
              showToast(err.response?.data?.message || 'خطا در انجام عملیات حذف');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* هدر صفحه */}
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <View style={styles.headerIconBox}>
            <VideoIcon size={20} color="#06b6d4" />
          </View>
          <View>
            <Text style={styles.headerTitle}>مدیریت ریلز (ادمین)</Text>
            <Text style={styles.headerSubtitle}>مشاهده کل ریلز و حذف موارد متخلف</Text>
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
          <ActivityIndicator size="large" color="#06b6d4" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>هیچ ریلزی یافت نشد.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.topRow}>
                {/* پیش‌نمایش ویدیو با امکان باز کردن در مدال */}
                <TouchableOpacity
                  style={styles.thumbnailBox}
                  activeOpacity={0.85}
                  onPress={() => setPreviewVideoUrl(getMediaUrl(item.videoUrl))}
                >
                  <View style={styles.thumbnailPlaceholder}>
                    <VideoIcon size={22} color="#64748b" />
                  </View>
                  <View style={styles.playOverlay}>
                    <Play size={14} color="#ffffff" fill="#ffffff" />
                  </View>
                </TouchableOpacity>

                {/* اطلاعات سازنده، کپشن و تاریخ */}
                <View style={styles.details}>
                  <View style={styles.userRow}>
                    <User size={13} color="#06b6d4" />
                    <Text style={styles.usernameText}>
                      @{item.ownerUsername || 'شما'}
                    </Text>
                  </View>

                  <Text style={styles.captionText} numberOfLines={2}>
                    {item.caption || '-'}
                  </Text>

                  <View style={styles.metaRow}>
                    <View style={styles.statBox}>
                      <Eye size={12} color="#06b6d4" />
                      <Text style={styles.statText}>
                        {(item.viewsCount || 0).toLocaleString('fa-IR')}
                      </Text>
                    </View>

                    <View style={styles.statBox}>
                      <Heart size={12} color="#f43f5e" />
                      <Text style={styles.statText}>
                        {(item.likesCount || 0).toLocaleString('fa-IR')}
                      </Text>
                    </View>

                    {item.createdAt && (
                      <View style={styles.dateBox}>
                        <Calendar size={11} color="#64748b" />
                        <Text style={styles.dateText}>
                          {new Date(item.createdAt).toLocaleDateString('fa-IR')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* دکمه حذف */}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  activeOpacity={0.75}
                  disabled={deletingId === item.id}
                  onPress={() => handleDelete(item.id)}
                >
                  {deletingId === item.id ? (
                    <ActivityIndicator size="small" color="#f43f5e" />
                  ) : (
                    <Trash2 size={16} color="#f43f5e" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListFooterComponent={
            <View style={styles.paginationContainer}>
              <Text style={styles.totalCountText}>مجموع: {total} ریلز</Text>

              {totalPages > 1 && (
                <View style={styles.paginationRow}>
                  <TouchableOpacity
                    style={[styles.pageBtn, page >= totalPages && styles.disabledPageBtn]}
                    disabled={page >= totalPages}
                    onPress={() => setPage((p) => Math.min(p + 1, totalPages))}
                  >
                    <ChevronLeft
                      size={16}
                      color={page >= totalPages ? '#475569' : '#ffffff'}
                    />
                    <Text
                      style={[
                        styles.pageBtnText,
                        page >= totalPages && styles.disabledPageText,
                      ]}
                    >
                      بعدی
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.pageInfoText}>
                    صفحه {page} از {totalPages}
                  </Text>

                  <TouchableOpacity
                    style={[styles.pageBtn, page <= 1 && styles.disabledPageBtn]}
                    disabled={page <= 1}
                    onPress={() => setPage((p) => Math.max(p - 1, 1))}
                  >
                    <Text
                      style={[
                        styles.pageBtnText,
                        page <= 1 && styles.disabledPageText,
                      ]}
                    >
                      قبلی
                    </Text>
                    <ChevronRight
                      size={16}
                      color={page <= 1 ? '#475569' : '#ffffff'}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          }
        />
      )}

      {/* 🟢 مدال پیش‌نمایش ویدیوی ریلز با expo-video */}
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
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
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
    gap: 10,
  },
  card: {
    backgroundColor: '#0d1520',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
  },
  topRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  thumbnailBox: {
    width: 50,
    height: 75,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#030712',
    position: 'relative',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050b14',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    flex: 1,
    gap: 4,
  },
  userRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  usernameText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11.5,
    color: '#2dd4bf',
    textAlign: 'right',
  },
  captionText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11,
    color: '#cbd5e1',
    textAlign: 'right',
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  statBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: '#94a3b8',
  },
  dateBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
  },
  dateText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 9.5,
    color: '#64748b',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationContainer: {
    marginTop: 10,
    paddingVertical: 12,
    gap: 8,
  },
  totalCountText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10.5,
    color: '#64748b',
    textAlign: 'center',
  },
  paginationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  disabledPageBtn: {
    opacity: 0.3,
  },
  pageBtnText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 10.5,
    color: '#ffffff',
  },
  disabledPageText: {
    color: '#475569',
  },
  pageInfoText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: '#94a3b8',
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