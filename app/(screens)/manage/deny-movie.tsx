import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  ToastAndroid,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  XCircle,
  Undo2,
  Trash2,
  Film,
  Clock,
  Calendar,
  Eye,
  User,
  Globe,
  Tag,
  Play,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react-native';
import { api, getMediaUrl } from '../../../src/api/axiosClient';

interface CrewMember {
  userId?: string;
  name: string;
  role: string;
  avatar?: string;
}

interface MovieDetails {
  id: string;
  titleFa: string;
  titleEn?: string;
  synopsis: string;
  category: string;
  genres: string[];
  keywords: string[];
  crew: CrewMember[];
  productionCountries: string[];
  releaseYear?: number;
  durationMinutes: number;
  videoUrl?: string;
  trailerUrl?: string;
  mainPosterUrl: string;
  posters: string[];
  behindSceneVideoUrl?: string;
  behindSceneImages: string[];
  status: string;
  rejectionReason?: string;
  createdAt: string;
  ownerId?: string;
}

export default function DenyMovieScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [movies, setMovies] = useState<MovieDetails[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // استیت‌های مدال بررسی جزئیات اثر رد شده
  const [selectedMovie, setSelectedMovie] = useState<MovieDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const pageSize = 10;

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  const fetchRejectedMovies = useCallback(async (pageNum: number) => {
    try {
      setLoading(true);
      const res = await api.get('/movies/rejected', {
        params: { page: pageNum, pageSize },
      });
      if (res.data && res.data.items) {
        setMovies(res.data.items);
        setTotalCount(res.data.totalCount || res.data.items.length);
      } else {
        setMovies(res.data || []);
        setTotalCount(res.data?.length || 0);
      }
    } catch {
      showToast('خطا در دریافت لیست فیلم‌های رد شده');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRejectedMovies(page);
  }, [page, fetchRejectedMovies]);

  // باز کردن مدال جزئیات کامل فیلم
  const handleOpenModal = async (movieId: string) => {
    try {
      setDetailsLoading(true);
      const res = await api.get(`/movies/${movieId}`);
      setSelectedMovie(res.data);
    } catch {
      showToast('خطا در بارگذاری جزئیات فیلم');
    } finally {
      setDetailsLoading(false);
    }
  };

  // اکشن‌های تایید به ادمین یا رد نهایی توسط سوپرادمین
  const handleAction = async (
    id: string,
    action: 'approvesuperadmin' | 'rejectsuperadmin',
    reason?: string
  ) => {
    try {
      setActionLoadingId(id);
      await api.post(`/movies/${id}/review`, {
        isApproved: action === 'approvesuperadmin',
        rejectionReason: reason,
        action: action,
      });

      if (action === 'approvesuperadmin') {
        showToast('فیلم با موفقیت تایید و جهت بررسی مجدد به صف ادمین بازگشت');
      } else {
        showToast('فیلم رد نهایی شد (در صف شمارش معکوس پاکسازی)');
      }

      setSelectedMovie(null);
      fetchRejectedMovies(page);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ثبت عملیات فیلم');
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* هدر صفحه */}
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <View style={styles.headerIconBox}>
            <XCircle size={20} color="#f43f5e" />
          </View>
          <View>
            <Text style={styles.headerTitle}>فیلم‌های رد شده (سوپر ادمین)</Text>
            <Text style={styles.headerSubtitle}>ارزیابی آثار رد شده و تعیین تکلیف نهایی</Text>
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

      {/* لیست فیلم‌ها */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#f43f5e" />
        </View>
      ) : movies.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>هیچ فیلم رد شده‌ای یافت نشد.</Text>
        </View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.movieRow}>
                <Image
                  source={{ uri: getMediaUrl(item.mainPosterUrl) }}
                  style={styles.poster}
                  contentFit="cover"
                />

                <View style={styles.details}>
                  <Text style={styles.movieTitle} numberOfLines={1}>
                    {item.titleFa}
                  </Text>
                  {item.titleEn ? (
                    <Text style={styles.movieTitleEn} numberOfLines={1}>
                      {item.titleEn}
                    </Text>
                  ) : null}

                  {/* دلیل عدم تایید */}
                  <View style={styles.rejectionReasonBox}>
                    <AlertTriangle size={12} color="#f43f5e" />
                    <Text style={styles.rejectionReasonText} numberOfLines={2}>
                      {item.rejectionReason || 'دلیلی توسط ادمین ثبت نشده است.'}
                    </Text>
                  </View>

                  {/* وضعیت اثر */}
                  <View style={styles.statusBadgeRow}>
                    {item.status === 'Rejected' ? (
                      <View style={styles.statusRejectedBadge}>
                        <Text style={styles.statusRejectedText}>رد نهایی (در صف پاکسازی)</Text>
                      </View>
                    ) : (
                      <View style={styles.statusPendingSuperBadge}>
                        <Text style={styles.statusPendingSuperText}>منتظر بررسی سوپرادمین</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* اکشن‌های کارت */}
              <View style={styles.cardActions}>
                {item.ownerId && (
                  <TouchableOpacity
                    style={styles.ownerBtn}
                    activeOpacity={0.75}
                    onPress={() => router.push(`/user/${item.ownerId}` as any)}
                  >
                    <User size={13} color="#38bdf8" />
                    <Text style={styles.ownerBtnText}>مشاهده ناشر</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.reviewBtn}
                  activeOpacity={0.8}
                  onPress={() => handleOpenModal(item.id)}
                >
                  <Eye size={14} color="#f43f5e" />
                  <Text style={styles.reviewBtnText}>بررسی سوپر ادمین</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  style={[styles.pageBtn, page >= totalPages && styles.disabledPageBtn]}
                  disabled={page >= totalPages}
                  onPress={() => setPage((p) => Math.min(p + 1, totalPages))}
                >
                  <ChevronLeft size={16} color={page >= totalPages ? '#475569' : '#ffffff'} />
                  <Text style={[styles.pageBtnText, page >= totalPages && styles.disabledPageText]}>
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
                  <Text style={[styles.pageBtnText, page <= 1 && styles.disabledPageText]}>
                    قبلی
                  </Text>
                  <ChevronRight size={16} color={page <= 1 ? '#475569' : '#ffffff'} />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* 🟢 مدال بررسی و ارزیابی سوپرادمین (DenyMovieDetailModal) */}
      {selectedMovie && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              {/* هدر مدال */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleBox}>
                  <Film size={18} color="#f43f5e" />
                  <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                    {selectedMovie.titleFa}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedMovie(null)}>
                  <X size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {detailsLoading ? (
                <View style={styles.modalLoadingBox}>
                  <ActivityIndicator size="large" color="#f43f5e" />
                  <Text style={styles.modalLoadingText}>در حال بارگذاری مشخصات فیلم...</Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                  {/* باکس علت عدم تایید توسط ادمین */}
                  <View style={styles.modalRejectionCallout}>
                    <AlertTriangle size={16} color="#f43f5e" />
                    <View style={styles.modalRejectionCol}>
                      <Text style={styles.modalRejectionTitle}>علت عدم تایید توسط ادمین:</Text>
                      <Text style={styles.modalRejectionDesc}>
                        {selectedMovie.rejectionReason || 'دلیلی قید نشده است.'}
                      </Text>
                    </View>
                  </View>

                  {/* پوستر اصلی و مشخصات پایه */}
                  <View style={styles.modalTopSection}>
                    <Image
                      source={{ uri: getMediaUrl(selectedMovie.mainPosterUrl) }}
                      style={styles.modalPoster}
                      contentFit="cover"
                    />

                    <View style={styles.modalBasicInfo}>
                      <Text style={styles.modalTitleFa}>{selectedMovie.titleFa}</Text>
                      {selectedMovie.titleEn && (
                        <Text style={styles.modalTitleEn}>{selectedMovie.titleEn}</Text>
                      )}

                      <View style={styles.modalBadgesGrid}>
                        <View style={styles.modalSpecBadge}>
                          <Clock size={11} color="#14b8a6" />
                          <Text style={styles.modalSpecText}>{selectedMovie.durationMinutes} دقیقه</Text>
                        </View>
                        <View style={styles.modalSpecBadge}>
                          <Calendar size={11} color="#f59e0b" />
                          <Text style={styles.modalSpecText}>سال: {selectedMovie.releaseYear || '-'}</Text>
                        </View>
                        <View style={styles.modalSpecBadge}>
                          <Text style={styles.modalSpecText}>{selectedMovie.category || 'ثبت نشده'}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* خلاصه داستان */}
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionLabel}>خلاصه داستان:</Text>
                    <Text style={styles.synopsisText}>
                      {selectedMovie.synopsis || 'توضیحاتی برای این فیلم ثبت نشده است.'}
                    </Text>
                  </View>

                  {/* ژانرها */}
                  {selectedMovie.genres && selectedMovie.genres.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.sectionLabel}>ژانرها:</Text>
                      <View style={styles.tagsWrapper}>
                        {selectedMovie.genres.map((g, idx) => (
                          <View key={idx} style={styles.genreTag}>
                            <Text style={styles.genreTagText}>{g}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* کلمات کلیدی */}
                  {selectedMovie.keywords && selectedMovie.keywords.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.sectionLabel}>کلمات کلیدی:</Text>
                      <View style={styles.tagsWrapper}>
                        {selectedMovie.keywords.map((kw, idx) => (
                          <View key={idx} style={styles.keywordTag}>
                            <Text style={styles.keywordTagText}>#{kw}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* کشورهای سازنده */}
                  {selectedMovie.productionCountries && selectedMovie.productionCountries.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.sectionLabel}>کشورهای سازنده:</Text>
                      <Text style={styles.sectionValue}>
                        {selectedMovie.productionCountries.join('، ')}
                      </Text>
                    </View>
                  )}

                  {/* عوامل فیلم */}
                  {selectedMovie.crew && selectedMovie.crew.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.sectionLabel}>
                        عوامل فیلم ({selectedMovie.crew.length} نفر):
                      </Text>
                      <View style={styles.crewList}>
                        {selectedMovie.crew.map((member, idx) => (
                          <View key={idx} style={styles.crewCard}>
                            <Image
                              source={{ uri: getMediaUrl(member.avatar) }}
                              style={styles.crewAvatar}
                              contentFit="cover"
                            />
                            <View style={styles.crewMeta}>
                              <Text style={styles.crewName}>{member.name}</Text>
                              <Text style={styles.crewRole}>{member.role}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* لینک‌های ویدیوی اصلی و تریلر */}
                  <View style={styles.mediaLinksSection}>
                    {selectedMovie.videoUrl && (
                      <TouchableOpacity
                        style={[styles.mediaLinkBtn, styles.videoLinkBtn]}
                        activeOpacity={0.8}
                        onPress={() => Linking.openURL(getMediaUrl(selectedMovie.videoUrl)).catch(() => {})}
                      >
                        <Play size={14} color="#f59e0b" />
                        <Text style={styles.videoLinkText}>مشاهده / دانلود فایل اصلی فیلم</Text>
                        <ExternalLink size={14} color="#f59e0b" />
                      </TouchableOpacity>
                    )}

                    {selectedMovie.trailerUrl && (
                      <TouchableOpacity
                        style={[styles.mediaLinkBtn, styles.trailerLinkBtn]}
                        activeOpacity={0.8}
                        onPress={() => Linking.openURL(getMediaUrl(selectedMovie.trailerUrl)).catch(() => {})}
                      >
                        <Play size={14} color="#818cf8" />
                        <Text style={styles.trailerLinkText}>مشاهده تریلر فیلم</Text>
                        <ExternalLink size={14} color="#818cf8" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* سایر پوسترها */}
                  {selectedMovie.posters && selectedMovie.posters.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.sectionLabel}>سایر پوسترهای فیلم:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.postersScroll}>
                        {selectedMovie.posters.map((pUrl, idx) => (
                          <Image
                            key={idx}
                            source={{ uri: getMediaUrl(pUrl) }}
                            style={styles.subPoster}
                            contentFit="cover"
                          />
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* پشت صحنه */}
                  {(selectedMovie.behindSceneVideoUrl || (selectedMovie.behindSceneImages && selectedMovie.behindSceneImages.length > 0)) && (
                    <View style={styles.modalSection}>
                      <Text style={styles.sectionLabel}>محتوای پشت صحنه:</Text>
                      {selectedMovie.behindSceneVideoUrl && (
                        <TouchableOpacity
                          style={[styles.mediaLinkBtn, styles.behindVideoBtn]}
                          activeOpacity={0.8}
                          onPress={() => Linking.openURL(getMediaUrl(selectedMovie.behindSceneVideoUrl)).catch(() => {})}
                        >
                          <Play size={14} color="#c084fc" />
                          <Text style={styles.behindVideoText}>مشاهده ویدیوی پشت صحنه</Text>
                          <ExternalLink size={14} color="#c084fc" />
                        </TouchableOpacity>
                      )}

                      {selectedMovie.behindSceneImages && selectedMovie.behindSceneImages.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.postersScroll}>
                          {selectedMovie.behindSceneImages.map((bImg, idx) => (
                            <Image
                              key={idx}
                              source={{ uri: getMediaUrl(bImg) }}
                              style={styles.behindImage}
                              contentFit="cover"
                            />
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  )}
                </ScrollView>
              )}

              {/* فوتر اکشن‌های سوپر ادمین */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.finalRejectBtn}
                  activeOpacity={0.8}
                  disabled={actionLoadingId === selectedMovie.id}
                  onPress={() => handleAction(selectedMovie.id, 'rejectsuperadmin')}
                >
                  <Trash2 size={15} color="#f43f5e" />
                  <Text style={styles.finalRejectText}>رد نهایی (حذف پس از ۱ دقیقه)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.returnToAdminBtn}
                  activeOpacity={0.8}
                  disabled={actionLoadingId === selectedMovie.id}
                  onPress={() => handleAction(selectedMovie.id, 'approvesuperadmin')}
                >
                  {actionLoadingId === selectedMovie.id ? (
                    <ActivityIndicator size="small" color="#030712" />
                  ) : (
                    <>
                      <Undo2 size={15} color="#030712" />
                      <Text style={styles.returnToAdminText}>تایید و ارجاع به ادمین</Text>
                    </>
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
  container: { flex: 1, backgroundColor: '#030712' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontFamily: 'Ravi-Regular', fontSize: 12, color: '#64748b' },
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
  headerRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: 'Ravi-Bold', fontSize: 13.5, color: '#ffffff' },
  headerSubtitle: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#94a3b8', textAlign: 'right' },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  card: {
    backgroundColor: '#0d1520',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.15)',
    padding: 14,
    gap: 10,
  },
  movieRow: { flexDirection: 'row-reverse', gap: 12 },
  poster: { width: 65, height: 95, borderRadius: 14, backgroundColor: '#030712' },
  details: { flex: 1, justifyContent: 'center', gap: 4 },
  movieTitle: { fontFamily: 'Ravi-Bold', fontSize: 13, color: '#ffffff', textAlign: 'right' },
  movieTitleEn: { fontFamily: 'monospace', fontSize: 10, color: '#64748b', textAlign: 'right' },
  rejectionReasonBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    padding: 6,
    borderRadius: 8,
  },
  rejectionReasonText: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#fca5a5', textAlign: 'right', flex: 1 },
  statusBadgeRow: { flexDirection: 'row-reverse', marginTop: 2 },
  statusRejectedBadge: { backgroundColor: 'rgba(244, 63, 94, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusRejectedText: { fontFamily: 'Ravi-Bold', fontSize: 9, color: '#f43f5e' },
  statusPendingSuperBadge: { backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusPendingSuperText: { fontFamily: 'Ravi-Bold', fontSize: 9, color: '#fbbf24' },
  cardActions: {
    flexDirection: 'row-reverse',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
  },
  ownerBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 10,
  },
  ownerBtnText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#38bdf8' },
  reviewBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    height: 36,
    borderRadius: 10,
  },
  reviewBtnText: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#f43f5e' },
  paginationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingVertical: 12,
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
  disabledPageBtn: { opacity: 0.3 },
  pageBtnText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#ffffff' },
  disabledPageText: { color: '#475569' },
  pageInfoText: { fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  modalCard: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: '#0c1222',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  modalHeaderTitleBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flex: 1 },
  modalHeaderTitle: { fontFamily: 'Ravi-Bold', fontSize: 13.5, color: '#ffffff', textAlign: 'right' },
  modalLoadingBox: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center', gap: 10 },
  modalLoadingText: { fontFamily: 'Ravi-Regular', fontSize: 12, color: '#94a3b8' },
  modalScrollContent: { padding: 16, gap: 14 },
  modalRejectionCallout: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    borderRadius: 14,
    padding: 10,
  },
  modalRejectionCol: { flex: 1, gap: 2 },
  modalRejectionTitle: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#f43f5e', textAlign: 'right' },
  modalRejectionDesc: { fontFamily: 'Ravi-Regular', fontSize: 11, color: '#fecdd3', textAlign: 'right', lineHeight: 16 },
  modalTopSection: { flexDirection: 'row-reverse', gap: 12 },
  modalPoster: { width: 85, height: 125, borderRadius: 14, backgroundColor: '#030712' },
  modalBasicInfo: { flex: 1, gap: 4, justifyContent: 'center' },
  modalTitleFa: { fontFamily: 'Ravi-Bold', fontSize: 14, color: '#ffffff', textAlign: 'right' },
  modalTitleEn: { fontFamily: 'monospace', fontSize: 10, color: '#64748b', textAlign: 'right' },
  modalBadgesGrid: { gap: 4, marginTop: 4 },
  modalSpecBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  modalSpecText: { fontFamily: 'Ravi-Regular', fontSize: 9.5, color: '#cbd5e1' },
  modalSection: { gap: 6 },
  sectionLabel: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#94a3b8', textAlign: 'right' },
  sectionValue: { fontFamily: 'Ravi-Regular', fontSize: 11, color: '#e2e8f0', textAlign: 'right' },
  synopsisText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11.5,
    color: '#cbd5e1',
    textAlign: 'right',
    lineHeight: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 10,
    borderRadius: 12,
  },
  tagsWrapper: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  genreTag: {
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  genreTagText: { fontFamily: 'Ravi-Bold', fontSize: 10, color: '#2dd4bf' },
  keywordTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  keywordTagText: { fontFamily: 'monospace', fontSize: 10, color: '#94a3b8' },
  crewList: { gap: 6 },
  crewCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 8,
    borderRadius: 12,
  },
  crewAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#030712' },
  crewMeta: { flex: 1 },
  crewName: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#ffffff', textAlign: 'right' },
  crewRole: { fontFamily: 'Ravi-Regular', fontSize: 9.5, color: '#14b8a6', textAlign: 'right' },
  mediaLinksSection: { gap: 8 },
  mediaLinkBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  videoLinkBtn: { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.25)' },
  videoLinkText: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#f59e0b' },
  trailerLinkBtn: { backgroundColor: 'rgba(99, 102, 241, 0.12)', borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.25)' },
  trailerLinkText: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#818cf8' },
  behindVideoBtn: { backgroundColor: 'rgba(192, 132, 252, 0.12)', borderWidth: 1, borderColor: 'rgba(192, 132, 252, 0.25)' },
  behindVideoText: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#c084fc' },
  postersScroll: { flexDirection: 'row-reverse', gap: 8 },
  subPoster: { width: 65, height: 95, borderRadius: 10, backgroundColor: '#030712' },
  behindImage: { width: 110, height: 75, borderRadius: 10, backgroundColor: '#030712' },
  modalFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    flexDirection: 'row-reverse',
    gap: 8,
  },
  finalRejectBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  finalRejectText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#f43f5e' },
  returnToAdminBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#14b8a6',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  returnToAdminText: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#030712' },
});