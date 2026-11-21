import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  ToastAndroid,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Film,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  Eye,
  Clock,
  Calendar,
  Play,
  X,
  Check,
  Send,
  ExternalLink,
  Globe,
  Tag,
  Users,
  Heart,
  Layers,
  Image as ImageIcon,
  Video,
} from 'lucide-react-native';
import { api, getMediaUrl, toFarsiDigits } from '../../../src/api/axiosClient';

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
  enableDonation?: boolean;
  donationAmounts?: number[];
  status: string;
  rejectionReason?: string;
  createdAt: string;
  ownerId?: string;
}

export default function VerifyMovieScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [movies, setMovies] = useState<MovieDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [transcodingMovieIds, setTranscodingMovieIds] = useState<string[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<MovieDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [rejectModalItem, setRejectModalItem] = useState<MovieDetails | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [approveModalItem, setApproveModalItem] = useState<MovieDetails | null>(null);
  const [publishToTelegram, setPublishToTelegram] = useState(true);
  const [publishToBale, setPublishToBale] = useState(true);

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
    else Alert.alert('', msg);
  };

  const fetchPendingMovies = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await api.get('/movies/pending?page=1&pageSize=50');
      const items = res.data?.items || res.data || [];
      setMovies(items);
      const currentPendingIds = new Set(items.map((m: any) => m.id));
      setTranscodingMovieIds((prev) => prev.filter((id) => currentPendingIds.has(id)));
    } catch {
      if (!isSilent) showToast('خطا در دریافت لیست فیلم‌های در انتظار');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingMovies();
    const interval = setInterval(() => fetchPendingMovies(true), 4000);
    return () => clearInterval(interval);
  }, [fetchPendingMovies]);

  const handleOpenDetailModal = async (movieId: string) => {
    try {
      setDetailsLoading(true);
      const res = await api.get(`/movies/${movieId}`);
      setSelectedMovie(res.data);
    } catch {
      showToast('خطا در بارگذاری جزئیات کامل فیلم');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleConfirmApprove = async () => {
    if (!approveModalItem) return;
    const targetId = approveModalItem.id;
    try {
      setActionLoadingId(targetId);
      await api.post(`/movies/${targetId}/review`, {
        isApproved: true,
        action: 'approveadmin',
        rejectionReason: 'HLS_PROCESSING',
        publishToTelegram,
        publishToBale,
      });

      showToast('تایید ثبت شد و پروسه HLS آغاز گردید');
      setMovies((prev) =>
        prev.map((m) => (m.id === targetId ? { ...m, rejectionReason: 'HLS_PROCESSING' } : m))
      );
      setTranscodingMovieIds((prev) => Array.from(new Set([...prev, targetId])));
      setApproveModalItem(null);
      if (selectedMovie?.id === targetId) setSelectedMovie(null);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در تایید فیلم');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalItem || !rejectReason.trim()) {
      showToast('لطفاً دلیل عدم تایید را وارد کنید');
      return;
    }
    try {
      setActionLoadingId(rejectModalItem.id);
      await api.post(`/movies/${rejectModalItem.id}/review`, {
        isApproved: false,
        action: 'rejectadmin',
        rejectionReason: rejectReason.trim(),
      });

      showToast('فیلم رد شد');
      setMovies((prev) => prev.filter((m) => m.id !== rejectModalItem.id));
      setRejectModalItem(null);
      setRejectReason('');
      if (selectedMovie?.id === rejectModalItem.id) setSelectedMovie(null);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ثبت وضعیت');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <View style={styles.headerIconBox}>
            <Film size={20} color="#14b8a6" />
          </View>
          <View>
            <Text style={styles.headerTitle}>تایید فیلم‌های جدید</Text>
            <Text style={styles.headerSubtitle}>{movies.length} اثر منتظر ارزیابی</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
        </View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isHlsProcessing =
              item.rejectionReason?.startsWith('HLS_PROCESSING') ||
              transcodingMovieIds.includes(item.id);

            return (
              <View style={styles.card}>
                <View style={styles.movieRow}>
                  <Image source={{ uri: getMediaUrl(item.mainPosterUrl) }} style={styles.poster} contentFit="cover" />
                  <View style={styles.details}>
                    <Text style={styles.movieTitle}>{item.titleFa}</Text>
                    {item.titleEn ? <Text style={styles.movieTitleEn}>{item.titleEn}</Text> : null}
                    <View style={styles.metaRow}>
                      <View style={styles.metaBadge}>
                        <Clock size={11} color="#14b8a6" />
                        <Text style={styles.metaText}>{item.durationMinutes} د</Text>
                      </View>
                      <View style={styles.metaBadge}>
                        <Text style={styles.metaText}>{item.category || 'فیلم کوتاه'}</Text>
                      </View>
                    </View>
                    <Text style={styles.dateText}>ارسال: {item.createdAt}</Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.detailsBtn} onPress={() => handleOpenDetailModal(item.id)}>
                    <Eye size={15} color="#14b8a6" />
                    <Text style={styles.detailsBtnText}>مشاهده تمام مشخصات</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rejectTriggerBtn}
                    disabled={isHlsProcessing}
                    onPress={() => {
                      setRejectModalItem(item);
                      setRejectReason('');
                    }}
                  >
                    <XCircle size={15} color="#f43f5e" />
                    <Text style={styles.rejectTriggerText}>رد</Text>
                  </TouchableOpacity>

                  {isHlsProcessing ? (
                    <View style={styles.hlsProcessingBadge}>
                      <ActivityIndicator size="small" color="#fbbf24" />
                      <Text style={styles.hlsProcessingText}>HLS...</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.quickApproveBtn}
                      onPress={() => {
                        setApproveModalItem(item);
                        setPublishToTelegram(true);
                        setPublishToBale(true);
                      }}
                    >
                      <CheckCircle2 size={15} color="#030712" />
                      <Text style={styles.quickApproveText}>تایید و HLS</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* مدال کامل نمایش تمام داده‌های اثر */}
      {selectedMovie && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleBox}>
                  <Film size={18} color="#14b8a6" />
                  <Text style={styles.modalHeaderTitle} numberOfLines={1}>{selectedMovie.titleFa}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedMovie(null)}>
                  <X size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                {/* مشخصات اصلی و پوستر */}
                <View style={styles.modalTopSection}>
                  <Image source={{ uri: getMediaUrl(selectedMovie.mainPosterUrl) }} style={styles.modalPoster} contentFit="cover" />
                  <View style={styles.modalBasicInfo}>
                    <Text style={styles.modalTitleFa}>{selectedMovie.titleFa}</Text>
                    {selectedMovie.titleEn ? <Text style={styles.modalTitleEn}>{selectedMovie.titleEn}</Text> : null}
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
                        <Text style={styles.modalSpecText}>{selectedMovie.category}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* خلاصه داستان */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionLabel}>خلاصه داستان:</Text>
                  <Text style={styles.synopsisText}>{selectedMovie.synopsis}</Text>
                </View>

                {/* لینک پخش هر ۳ ویدیو */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionLabel}>ویدیوهای آپلودشده (جهت بازبینی):</Text>
                  <View style={styles.mediaLinksGrid}>
                    {selectedMovie.videoUrl && (
                      <TouchableOpacity
                        style={styles.mediaLinkBtn}
                        onPress={() => Linking.openURL(getMediaUrl(selectedMovie.videoUrl!)).catch(() => {})}
                      >
                        <Play size={13} color="#14b8a6" />
                        <Text style={styles.mediaLinkText}>فیلم اصلی</Text>
                        <ExternalLink size={12} color="#14b8a6" />
                      </TouchableOpacity>
                    )}
                    {selectedMovie.trailerUrl && (
                      <TouchableOpacity
                        style={[styles.mediaLinkBtn, { borderColor: 'rgba(245, 158, 11, 0.3)', backgroundColor: 'rgba(245, 158, 11, 0.08)' }]}
                        onPress={() => Linking.openURL(getMediaUrl(selectedMovie.trailerUrl!)).catch(() => {})}
                      >
                        <Video size={13} color="#f59e0b" />
                        <Text style={[styles.mediaLinkText, { color: '#f59e0b' }]}>تیزر تبلیغاتی</Text>
                        <ExternalLink size={12} color="#f59e0b" />
                      </TouchableOpacity>
                    )}
                    {selectedMovie.behindSceneVideoUrl && (
                      <TouchableOpacity
                        style={[styles.mediaLinkBtn, { borderColor: 'rgba(192, 132, 252, 0.3)', backgroundColor: 'rgba(192, 132, 252, 0.08)' }]}
                        onPress={() => Linking.openURL(getMediaUrl(selectedMovie.behindSceneVideoUrl!)).catch(() => {})}
                      >
                        <Layers size={13} color="#c084fc" />
                        <Text style={[styles.mediaLinkText, { color: '#c084fc' }]}>پشت صحنه</Text>
                        <ExternalLink size={12} color="#c084fc" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* گالری تمام پوسترهای اثر */}
                {selectedMovie.posters && selectedMovie.posters.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionLabel}>تمام پوسترهای اثر ({selectedMovie.posters.length}):</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                      {selectedMovie.posters.map((p, idx) => (
                        <Image key={idx} source={{ uri: getMediaUrl(p) }} style={styles.galleryPoster} contentFit="cover" />
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* تصاویر پشت صحنه */}
                {selectedMovie.behindSceneImages && selectedMovie.behindSceneImages.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionLabel}>تصاویر پشت صحنه ({selectedMovie.behindSceneImages.length}):</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                      {selectedMovie.behindSceneImages.map((b, idx) => (
                        <Image key={idx} source={{ uri: getMediaUrl(b) }} style={styles.galleryBehind} contentFit="cover" />
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* ژانرها و برچسب‌ها */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionLabel}>ژانرها و کلیدواژه‌ها:</Text>
                  <View style={styles.tagsWrap}>
                    {selectedMovie.genres?.map((g, idx) => (
                      <View key={`g-${idx}`} style={styles.genrePill}>
                        <Text style={styles.genrePillText}>{g}</Text>
                      </View>
                    ))}
                    {selectedMovie.keywords?.map((k, idx) => (
                      <View key={`k-${idx}`} style={styles.keywordPill}>
                        <Text style={styles.keywordPillText}>#{k}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* کشورهای تولیدکننده */}
                {selectedMovie.productionCountries && selectedMovie.productionCountries.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionLabel}>کشور یا شهر تولیدکننده:</Text>
                    <Text style={styles.countryText}>{selectedMovie.productionCountries.join(' ، ')}</Text>
                  </View>
                )}

                {/* عوامل و سازندگان */}
                {selectedMovie.crew && selectedMovie.crew.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionLabel}>عوامل و سازندگان اثر ({selectedMovie.crew.length}):</Text>
                    <View style={styles.crewGrid}>
                      {selectedMovie.crew.map((c, idx) => (
                        <View key={idx} style={styles.crewCard}>
                          {c.avatar ? (
                            <Image source={{ uri: getMediaUrl(c.avatar) }} style={styles.crewAvatar} />
                          ) : (
                            <View style={styles.crewAvatarPlaceholder}>
                              <Text style={styles.crewInitial}>{c.name?.[0] || 'ع'}</Text>
                            </View>
                          )}
                          <View style={styles.crewTexts}>
                            <Text style={styles.crewName}>{c.name}</Text>
                            <Text style={styles.crewRole}>{c.role}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* حمایت مالی (دونیت) */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionLabel}>تنظیمات حمایت مالی (دونیت):</Text>
                  <View style={styles.donationBox}>
                    <Text style={styles.donationStatusText}>
                      وضعیت: {selectedMovie.enableDonation ? 'فعال' : 'غیرفعال'}
                    </Text>
                    {selectedMovie.donationAmounts && selectedMovie.donationAmounts.length > 0 && (
                      <Text style={styles.donationAmountsText}>
                        مبالغ: {selectedMovie.donationAmounts.map((a) => toFarsiDigits(a.toLocaleString('en-US')) + ' ت').join(' | ')}
                      </Text>
                    )}
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalRejectBtn}
                  onPress={() => {
                    setRejectModalItem(selectedMovie);
                    setRejectReason('');
                  }}
                >
                  <XCircle size={15} color="#f43f5e" />
                  <Text style={styles.modalRejectBtnText}>رد اثر</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalApproveBtn}
                  onPress={() => {
                    setApproveModalItem(selectedMovie);
                    setPublishToTelegram(true);
                    setPublishToBale(true);
                  }}
                >
                  <CheckCircle2 size={15} color="#030712" />
                  <Text style={styles.modalApproveBtnText}>تایید و شروع HLS</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* دیالوگ انتشار */}
      {approveModalItem && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.dialogCard}>
              <Text style={styles.dialogTitle}>تایید نهایی اثر</Text>
              <Text style={styles.dialogDesc}>
                آیا از تایید فیلم «{approveModalItem.titleFa}» اطمینان دارید؟ تمام فایل‌های ویدیویی (فیلم اصلی، تیزر و پشت صحنه) به فرمت HLS تبدیل خواهند شد.
              </Text>
              <TouchableOpacity
                style={styles.channelRow}
                onPress={() => setPublishToTelegram(!publishToTelegram)}
              >
                <View style={[styles.checkbox, publishToTelegram && styles.checkboxActive]}>
                  {publishToTelegram && <Check size={12} color="#030712" />}
                </View>
                <Text style={styles.channelLabel}>ارسال به کانال تلگرام (@pershot_ir)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.channelRow}
                onPress={() => setPublishToBale(!publishToBale)}
              >
                <View style={[styles.checkbox, publishToBale && styles.checkboxActive]}>
                  {publishToBale && <Check size={12} color="#030712" />}
                </View>
                <Text style={styles.channelLabel}>ارسال به کانال بله (@pershot)</Text>
              </TouchableOpacity>
              <View style={styles.dialogBtnRow}>
                <TouchableOpacity style={styles.dialogCancelBtn} onPress={() => setApproveModalItem(null)}>
                  <Text style={styles.dialogCancelText}>انصراف</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dialogSubmitBtn} onPress={handleConfirmApprove}>
                  <Send size={13} color="#030712" />
                  <Text style={styles.dialogSubmitText}>تایید و آغاز تبدیل</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* دیالوگ رد */}
      {rejectModalItem && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.dialogCard}>
              <Text style={styles.dialogTitle}>دلیل عدم تایید اثر</Text>
              <TextInput
                style={styles.dialogInput}
                multiline
                numberOfLines={3}
                placeholder="توضیحات رد فیلم برای سازنده..."
                placeholderTextColor="#64748b"
                value={rejectReason}
                onChangeText={setRejectReason}
              />
              <View style={styles.dialogBtnRow}>
                <TouchableOpacity style={styles.dialogCancelBtn} onPress={() => setRejectModalItem(null)}>
                  <Text style={styles.dialogCancelText}>انصراف</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dialogRejectSubmitBtn} onPress={handleConfirmReject}>
                  <Text style={styles.dialogRejectSubmitText}>ثبت رد اثر</Text>
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
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 12, padding: 12, backgroundColor: 'rgba(13, 21, 32, 0.85)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  headerRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  headerIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(20, 184, 166, 0.12)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Ravi-Bold', fontSize: 13, color: '#ffffff' },
  headerSubtitle: { fontFamily: 'Ravi-Regular', fontSize: 9.5, color: '#94a3b8' },
  backBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255, 255, 255, 0.04)', alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 35, gap: 10 },
  card: { backgroundColor: '#0d1520', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)', padding: 12, gap: 10 },
  movieRow: { flexDirection: 'row-reverse', gap: 10 },
  poster: { width: 60, height: 88, borderRadius: 12, backgroundColor: '#030712' },
  details: { flex: 1, justifyContent: 'center', gap: 3 },
  movieTitle: { fontFamily: 'Ravi-Bold', fontSize: 12.5, color: '#ffffff', textAlign: 'right' },
  movieTitleEn: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 9.5, color: '#64748b', textAlign: 'right' },
  metaRow: { flexDirection: 'row-reverse', gap: 6, marginTop: 2 },
  metaBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255, 255, 255, 0.04)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  metaText: { fontFamily: 'Ravi-Regular', fontSize: 9, color: '#94a3b8' },
  dateText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 8.5, color: '#64748b', textAlign: 'right' },
  cardActions: { flexDirection: 'row-reverse', gap: 6, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)', paddingTop: 8 },
  detailsBtn: { flex: 1.4, height: 38, borderRadius: 10, backgroundColor: 'rgba(20, 184, 166, 0.1)', borderWidth: 1, borderColor: 'rgba(20, 184, 166, 0.25)', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 4 },
  detailsBtnText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#14b8a6' },
  rejectTriggerBtn: { flex: 0.8, height: 38, borderRadius: 10, backgroundColor: 'rgba(244, 63, 94, 0.1)', borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.25)', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 4 },
  rejectTriggerText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#f43f5e' },
  quickApproveBtn: { flex: 1.4, height: 38, borderRadius: 10, backgroundColor: '#14b8a6', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 4 },
  quickApproveText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#030712' },
  hlsProcessingBadge: { flex: 1.4, height: 38, borderRadius: 10, backgroundColor: 'rgba(245, 158, 11, 0.12)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 4 },
  hlsProcessingText: { fontFamily: 'Ravi-Bold', fontSize: 9.5, color: '#fbbf24' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 12 },
  modalCard: { width: '100%', maxHeight: '92%', backgroundColor: '#0c1222', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.08)' },
  modalHeaderTitleBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, flex: 1 },
  modalHeaderTitle: { fontFamily: 'Ravi-Bold', fontSize: 13, color: '#ffffff', textAlign: 'right' },
  modalScrollContent: { padding: 14, gap: 12 },
  modalTopSection: { flexDirection: 'row-reverse', gap: 10 },
  modalPoster: { width: 75, height: 110, borderRadius: 12, backgroundColor: '#030712' },
  modalBasicInfo: { flex: 1, gap: 4, justifyContent: 'center' },
  modalTitleFa: { fontFamily: 'Ravi-Bold', fontSize: 13.5, color: '#ffffff', textAlign: 'right' },
  modalTitleEn: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 9.5, color: '#64748b', textAlign: 'right' },
  modalBadgesGrid: { gap: 4, marginTop: 2 },
  modalSpecBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255, 255, 255, 0.04)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  modalSpecText: { fontFamily: 'Ravi-Regular', fontSize: 9, color: '#cbd5e1' },
  modalSection: { gap: 4 },
  sectionLabel: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#94a3b8', textAlign: 'right' },
  synopsisText: { fontFamily: 'Ravi-Regular', fontSize: 11, color: '#cbd5e1', textAlign: 'right', lineHeight: 16, backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: 8, borderRadius: 10 },
  mediaLinksGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  mediaLinkBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(20, 184, 166, 0.1)', borderWidth: 1, borderColor: 'rgba(20, 184, 166, 0.25)' },
  mediaLinkText: { fontFamily: 'Ravi-Bold', fontSize: 10, color: '#14b8a6' },
  galleryScroll: { flexDirection: 'row-reverse', gap: 6, paddingVertical: 2 },
  galleryPoster: { width: 65, height: 95, borderRadius: 10, backgroundColor: '#030712', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  galleryBehind: { width: 85, height: 60, borderRadius: 10, backgroundColor: '#030712', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  tagsWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 4 },
  genrePill: { backgroundColor: 'rgba(20, 184, 166, 0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  genrePillText: { fontFamily: 'Ravi-Regular', fontSize: 9.5, color: '#2dd4bf' },
  keywordPill: { backgroundColor: 'rgba(245, 158, 11, 0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  keywordPillText: { fontFamily: 'Ravi-Regular', fontSize: 9.5, color: '#fbbf24' },
  countryText: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#ffffff', textAlign: 'right' },
  crewGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  crewCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: '#0d1520', borderRadius: 10, padding: 6, minWidth: '47%' },
  crewAvatar: { width: 24, height: 24, borderRadius: 12 },
  crewAvatarPlaceholder: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(20, 184, 166, 0.15)', alignItems: 'center', justifyContent: 'center' },
  crewInitial: { fontFamily: 'Ravi-Bold', fontSize: 9.5, color: '#2dd4bf' },
  crewTexts: { flex: 1 },
  crewName: { fontFamily: 'Ravi-Bold', fontSize: 10, color: '#ffffff', textAlign: 'right' },
  crewRole: { fontFamily: 'Ravi-Regular', fontSize: 8.5, color: '#14b8a6', textAlign: 'right' },
  donationBox: { backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: 8, borderRadius: 10, gap: 2 },
  donationStatusText: { fontFamily: 'Ravi-Bold', fontSize: 10, color: '#cbd5e1', textAlign: 'right' },
  donationAmountsText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 9.5, color: '#fbbf24', textAlign: 'right' },
  modalFooter: { padding: 12, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.08)', flexDirection: 'row-reverse', gap: 8 },
  modalRejectBtn: { flex: 1, height: 38, borderRadius: 10, backgroundColor: 'rgba(244, 63, 94, 0.12)', borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.3)', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 4 },
  modalRejectBtnText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#f43f5e' },
  modalApproveBtn: { flex: 1.5, height: 38, borderRadius: 10, backgroundColor: '#14b8a6', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 4 },
  modalApproveBtnText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#030712' },
  dialogCard: { width: '100%', maxWidth: 320, backgroundColor: '#0d1520', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', padding: 16, alignItems: 'center', gap: 8 },
  dialogTitle: { fontFamily: 'Ravi-Bold', fontSize: 13, color: '#ffffff', textAlign: 'center' },
  dialogDesc: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#94a3b8', textAlign: 'center', lineHeight: 16 },
  channelRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: 8, borderRadius: 10 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: '#64748b', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#14b8a6', borderColor: '#14b8a6' },
  channelLabel: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#f1f5f9', flex: 1, textAlign: 'right' },
  dialogInput: { width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.04)', borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.3)', borderRadius: 12, padding: 8, fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#ffffff', textAlign: 'right', height: 70, textAlignVertical: 'top' },
  dialogBtnRow: { flexDirection: 'row-reverse', width: '100%', gap: 6, marginTop: 4 },
  dialogCancelBtn: { flex: 1, height: 36, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.05)', alignItems: 'center', justifyContent: 'center' },
  dialogCancelText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#94a3b8' },
  dialogSubmitBtn: { flex: 1.5, height: 36, borderRadius: 10, backgroundColor: '#10b981', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 4 },
  dialogSubmitText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#030712' },
  dialogRejectSubmitBtn: { flex: 1.5, height: 36, borderRadius: 10, backgroundColor: '#f43f5e', alignItems: 'center', justifyContent: 'center' },
  dialogRejectSubmitText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#ffffff' },
});