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
  XCircle,
  Undo2,
  Trash2,
  Rocket,
  Eye,
  AlertTriangle,
  ChevronLeft,
  DollarSign,
  Calendar,
  Clock,
  Globe,
  MapPin,
  Film,
  Hash,
  Video,
  FileText,
  Download,
  X,
  CheckCircle2,
} from 'lucide-react-native';
import { api, getMediaUrl } from '../../../src/api/axiosClient';

interface DeniedCampaignItem {
  id: string;
  titleFa: string;
  mainPosterUrl: string;
  fundingGoal: number;
  createdAt: string;
  rejectionReason?: string;
}

export default function DenyCampaignScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [campaigns, setCampaigns] = useState<DeniedCampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // استیت‌های مدال مشاهده جزئیات کامل کمپین
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [fullData, setFullData] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // استیت‌های مدال ثبت اکشن سوپر ادمین (رد نهایی یا ارسال به ادمین)
  const [reviewActionModal, setReviewActionModal] = useState<{
    campaign: DeniedCampaignItem;
    action: 'reject' | 'approve';
  } | null>(null);
  const [actionReason, setActionReason] = useState('');

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  const fetchRejectedCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/projects/rejected');
      setCampaigns(res.data?.items || res.data || []);
    } catch {
      showToast('خطا در دریافت کمپین‌های رد شده');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRejectedCampaigns();
  }, [fetchRejectedCampaigns]);

  // باز کردن مدال جزئیات کامل
  const handleOpenDetails = async (id: string) => {
    try {
      setSelectedCampaignId(id);
      setDetailsLoading(true);
      const res = await api.get(`/projects/${id}`);
      setFullData(res.data);
    } catch {
      showToast('خطا در دریافت اطلاعات کامل کمپین');
    } finally {
      setDetailsLoading(false);
    }
  };

  // ارسال تصمیم نهایی سوپرادمین
  const handleConfirmReview = async () => {
    if (!reviewActionModal) return;

    if (!actionReason.trim()) {
      showToast('وارد کردن توضیحات الزامی است');
      return;
    }

    const { campaign, action } = reviewActionModal;

    try {
      setSubmittingId(campaign.id);
      await api.post(`/projects/${campaign.id}/super-admin-review`, {
        action,
        reason: actionReason.trim(),
      });

      if (action === 'approve') {
        showToast('کمپین جهت بررسی مجدد به صف ادمین ارجاع داده شد');
      } else {
        showToast('کمپین رد قطعی شد و در صف مهلت ۷ روزه قرار گرفت');
      }

      setCampaigns((prev) => prev.filter((c) => c.id !== campaign.id));
      setReviewActionModal(null);
      setActionReason('');
      if (selectedCampaignId === campaign.id) setSelectedCampaignId(null);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ثبت وضعیت کمپین');
    } finally {
      setSubmittingId(null);
    }
  };

  const cost = fullData?.costDetails || {};
  const time = fullData?.timeDetails || {};

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* هدر صفحه */}
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <View style={styles.headerIconBox}>
            <XCircle size={20} color="#f43f5e" />
          </View>
          <View>
            <Text style={styles.headerTitle}>آرشیو کمپین‌های رد شده (مدیریت ارشد)</Text>
            <Text style={styles.headerSubtitle}>امکان رد قطعی با مهلت ۷ روزه یا ارجاع مجدد به ادمین</Text>
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

      {/* لیست کمپین‌های رد شده */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#f43f5e" />
        </View>
      ) : campaigns.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>هیچ کمپین رد شده‌ای وجود ندارد.</Text>
        </View>
      ) : (
        <FlatList
          data={campaigns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.itemRow}>
                <Image
                  source={{ uri: getMediaUrl(item.mainPosterUrl) }}
                  style={styles.poster}
                  contentFit="cover"
                />

                <View style={styles.details}>
                  <Text style={styles.campaignTitle} numberOfLines={1}>
                    {item.titleFa}
                  </Text>
                  <Text style={styles.dateText}>تاریخ ثبت: {item.createdAt}</Text>

                  {/* علت رد قبلی */}
                  <View style={styles.rejectionReasonBox}>
                    <AlertTriangle size={13} color="#f43f5e" />
                    <View style={styles.rejectionTextCol}>
                      <Text style={styles.rejectionTitle}>علت رد قبلی:</Text>
                      <Text style={styles.rejectionDesc} numberOfLines={2}>
                        {item.rejectionReason || 'علتی قید نشده است.'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* دکمه‌های کنترلی سوپر ادمین */}
              <View style={styles.actionGrid}>
                <TouchableOpacity
                  style={styles.detailsBtn}
                  activeOpacity={0.75}
                  onPress={() => handleOpenDetails(item.id)}
                >
                  <Eye size={13} color="#38bdf8" />
                  <Text style={styles.detailsBtnText}>مشاهده جزئیات</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rejectBtn}
                  activeOpacity={0.75}
                  disabled={submittingId === item.id}
                  onPress={() => {
                    setReviewActionModal({ campaign: item, action: 'reject' });
                    setActionReason('');
                  }}
                >
                  <Trash2 size={13} color="#f43f5e" />
                  <Text style={styles.rejectBtnText}>رد قطعی (۷ روز)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.approveBtn}
                  activeOpacity={0.8}
                  disabled={submittingId === item.id}
                  onPress={() => {
                    setReviewActionModal({ campaign: item, action: 'approve' });
                    setActionReason('');
                  }}
                >
                  {submittingId === item.id ? (
                    <ActivityIndicator size="small" color="#030712" />
                  ) : (
                    <>
                      <CheckCircle2 size={13} color="#030712" />
                      <Text style={styles.approveBtnText}>ارسال به ادمین</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* 🟢 ۱. مدال نمایش جزئیات کامل و مدارک کمپین */}
      {selectedCampaignId && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleBox}>
                  <Eye size={18} color="#10b981" />
                  <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                    {fullData?.titleFa || 'جزئیات کامل کمپین'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedCampaignId(null)}>
                  <X size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {detailsLoading || !fullData ? (
                <View style={styles.modalLoadingBox}>
                  <ActivityIndicator size="large" color="#10b981" />
                  <Text style={styles.modalLoadingText}>در حال دریافت اطلاعات کامل...</Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                  {/* اطلاعات پایه و پوستر */}
                  <View style={styles.modalTopSection}>
                    <Image
                      source={{ uri: getMediaUrl(fullData.mainPosterUrl) }}
                      style={styles.modalPoster}
                      contentFit="cover"
                    />

                    <View style={styles.modalBasicInfo}>
                      <Text style={styles.modalTitleFa}>{fullData.titleFa}</Text>

                      <View style={styles.modalBadgesGrid}>
                        <View style={styles.modalSpecBadge}>
                          <Text style={styles.modalSpecText}>مرحله: {fullData.currentStage || 'نامشخص'}</Text>
                        </View>
                        <View style={styles.modalSpecBadge}>
                          <Text style={styles.modalSpecText}>دسته‌بندی: {fullData.category || 'فیلم کوتاه'}</Text>
                        </View>
                        {fullData.releaseYear && (
                          <View style={styles.modalSpecBadge}>
                            <Text style={styles.modalSpecText}>سال ساخت: {fullData.releaseYear}</Text>
                          </View>
                        )}
                        {fullData.campaignDurationDays > 0 && (
                          <View style={styles.modalSpecBadge}>
                            <Calendar size={11} color="#818cf8" />
                            <Text style={styles.modalSpecText}>مدت کمپین: {fullData.campaignDurationDays} روز</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* ویژگی‌های هویتی */}
                  <View style={styles.specsGridBox}>
                    <View style={styles.specItem}>
                      <Film size={13} color="#14b8a6" />
                      <Text style={styles.specItemText}>ژانرها: {fullData.genres?.join('، ') || '-'}</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Clock size={13} color="#14b8a6" />
                      <Text style={styles.specItemText}>مدت: {fullData.durationMinutes} دقیقه</Text>
                    </View>
                    <View style={styles.specItem}>
                      <Globe size={13} color="#14b8a6" />
                      <Text style={styles.specItemText}>زبان: {fullData.language || '-'}</Text>
                    </View>
                    <View style={styles.specItem}>
                      <MapPin size={13} color="#14b8a6" />
                      <Text style={styles.specItemText}>لوکیشن: {fullData.productionLocations?.join('، ') || '-'}</Text>
                    </View>
                  </View>

                  {(fullData.ideaRegistrationNumber || fullData.scriptRegistrationNumber) && (
                    <View style={styles.regNumbersBox}>
                      {fullData.ideaRegistrationNumber && (
                        <View style={styles.specItem}>
                          <Hash size={13} color="#14b8a6" />
                          <Text style={styles.specItemText}>شماره ثبت طرح: {fullData.ideaRegistrationNumber}</Text>
                        </View>
                      )}
                      {fullData.scriptRegistrationNumber && (
                        <View style={styles.specItem}>
                          <Hash size={13} color="#14b8a6" />
                          <Text style={styles.specItemText}>شماره ثبت فیلمنامه: {fullData.scriptRegistrationNumber}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* خلاصه‌ها */}
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionLabel}>خلاصه کوتاه:</Text>
                    <Text style={styles.sectionDescText}>{fullData.shortSynopsis || 'ثبت نشده'}</Text>
                  </View>

                  {fullData.logline && (
                    <View style={styles.modalSection}>
                      <Text style={styles.sectionLabel}>لاگ‌لاین:</Text>
                      <Text style={styles.loglineText}>{fullData.logline}</Text>
                    </View>
                  )}

                  <View style={styles.modalSection}>
                    <Text style={styles.sectionLabel}>خلاصه داستان کامل:</Text>
                    <Text style={styles.sectionDescText}>{fullData.synopsis || 'ثبت نشده'}</Text>
                  </View>

                  {/* شکست هزینه‌ها و بودجه */}
                  <View style={styles.costSection}>
                    <View style={styles.costTitleRow}>
                      <DollarSign size={15} color="#14b8a6" />
                      <Text style={styles.costTitleText}>شکست هزینه‌ها و بودجه مورد نیاز</Text>
                    </View>

                    <View style={styles.costCardsRow}>
                      <View style={styles.costCard}>
                        <Text style={styles.costCardLabel}>۱. پیش‌تولید</Text>
                        <Text style={styles.costCardVal}>{(cost.preProductionCost || 0).toLocaleString('fa-IR')} ت</Text>
                        <Text style={styles.costCardTime}>زمان: {time.preProductionDays || 0} روز</Text>
                      </View>

                      <View style={[styles.costCard, styles.costCardMain]}>
                        <Text style={[styles.costCardLabel, { color: '#2dd4bf' }]}>۲. تولید</Text>
                        <Text style={styles.costCardVal}>{(cost.productionCost || 0).toLocaleString('fa-IR')} ت</Text>
                        <Text style={styles.costCardTime}>زمان: {time.productionDays || 0} روز</Text>
                      </View>

                      <View style={styles.costCard}>
                        <Text style={styles.costCardLabel}>۳. پس‌تولید</Text>
                        <Text style={styles.costCardVal}>{(cost.postProductionCost || 0).toLocaleString('fa-IR')} ت</Text>
                        <Text style={styles.costCardTime}>زمان: {time.postProductionDays || 0} روز</Text>
                      </View>
                    </View>

                    <View style={styles.totalBudgetRow}>
                      <Text style={styles.totalBudgetLabel}>مجموع بودجه درخواستی:</Text>
                      <Text style={styles.totalBudgetVal}>
                        {(cost.grandTotal || fullData.fundingGoal || 0).toLocaleString('fa-IR')} تومان
                      </Text>
                    </View>
                  </View>

                  {/* مدارک و اسناد ارسالی */}
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionLabel}>مدارک و فایل‌های پیوست:</Text>
                    <View style={styles.docsGrid}>
                      {fullData.pitchVideoUrl && (
                        <TouchableOpacity
                          style={[styles.docBtn, styles.pitchDocBtn]}
                          activeOpacity={0.8}
                          onPress={() => Linking.openURL(getMediaUrl(fullData.pitchVideoUrl)).catch(() => {})}
                        >
                          <Video size={14} color="#2dd4bf" />
                          <Text style={styles.pitchDocText}>ویدیوی پیچ</Text>
                          <Download size={13} color="#2dd4bf" />
                        </TouchableOpacity>
                      )}

                      {fullData.scriptFileUrl && (
                        <TouchableOpacity
                          style={styles.docBtn}
                          activeOpacity={0.8}
                          onPress={() => Linking.openURL(getMediaUrl(fullData.scriptFileUrl)).catch(() => {})}
                        >
                          <FileText size={14} color="#94a3b8" />
                          <Text style={styles.docBtnText}>فایل فیلمنامه</Text>
                          <Download size={13} color="#94a3b8" />
                        </TouchableOpacity>
                      )}

                      {fullData.ideaFileUrl && (
                        <TouchableOpacity
                          style={styles.docBtn}
                          activeOpacity={0.8}
                          onPress={() => Linking.openURL(getMediaUrl(fullData.ideaFileUrl)).catch(() => {})}
                        >
                          <FileText size={14} color="#94a3b8" />
                          <Text style={styles.docBtnText}>فایل طرح اولیه</Text>
                          <Download size={13} color="#94a3b8" />
                        </TouchableOpacity>
                      )}

                      {fullData.roughCutUrl && (
                        <TouchableOpacity
                          style={[styles.docBtn, styles.roughDocBtn]}
                          activeOpacity={0.8}
                          onPress={() => Linking.openURL(getMediaUrl(fullData.roughCutUrl)).catch(() => {})}
                        >
                          <Video size={14} color="#f59e0b" />
                          <Text style={styles.roughDocText}>فایل راف‌کات</Text>
                          <Download size={13} color="#f59e0b" />
                        </TouchableOpacity>
                      )}

                      {fullData.financialDocumentsUrl && (
                        <TouchableOpacity
                          style={styles.docBtn}
                          activeOpacity={0.8}
                          onPress={() => Linking.openURL(getMediaUrl(fullData.financialDocumentsUrl)).catch(() => {})}
                        >
                          <FileText size={14} color="#94a3b8" />
                          <Text style={styles.docBtnText}>ریز فاکتورهای مالی</Text>
                          <Download size={13} color="#94a3b8" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* 🟢 ۲. مدال ثبت نظر و انجام اکشن (رد قطعی ۷ روزه یا ارسال به ادمین) */}
      {reviewActionModal && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.actionModalCard}>
              <View
                style={[
                  styles.actionModalIconBox,
                  reviewActionModal.action === 'approve'
                    ? styles.approveIconBg
                    : styles.rejectIconBg,
                ]}
              >
                {reviewActionModal.action === 'approve' ? (
                  <Undo2 size={26} color="#10b981" />
                ) : (
                  <AlertTriangle size={26} color="#f43f5e" />
                )}
              </View>

              <Text style={styles.modalTitle}>
                {reviewActionModal.action === 'approve'
                  ? 'تایید و ارسال به صف ادمین'
                  : 'رد قطعی کمپین (مهلت ۷ روزه)'}
              </Text>

              <Text style={styles.modalDesc}>
                {reviewActionModal.action === 'approve'
                  ? `دلیل تایید برای مشاهده ادمین در پروژه «${reviewActionModal.campaign.titleFa}» را بنویسید:`
                  : `در صورت عدم ویرایش ظرف ۷ روز توسط کاربر، پروژه «${reviewActionModal.campaign.titleFa}» کلاً پاک خواهد شد:`}
              </Text>

              <TextInput
                style={[
                  styles.modalInput,
                  reviewActionModal.action === 'approve'
                    ? styles.approveBorder
                    : styles.rejectBorder,
                ]}
                multiline
                numberOfLines={4}
                placeholder="توضیحات و دلیل را بنویسید..."
                placeholderTextColor="#64748b"
                value={actionReason}
                onChangeText={setActionReason}
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setReviewActionModal(null)}
                >
                  <Text style={styles.modalCancelText}>انصراف</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalSubmitBtn,
                    reviewActionModal.action === 'approve'
                      ? styles.approveSubmitBg
                      : styles.rejectSubmitBg,
                  ]}
                  onPress={handleConfirmReview}
                  disabled={
                    submittingId === reviewActionModal.campaign.id || !actionReason.trim()
                  }
                >
                  {submittingId === reviewActionModal.campaign.id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalSubmitText}>
                      {reviewActionModal.action === 'approve' ? 'ارسال به ادمین' : 'ثبت و شروع مهلت'}
                    </Text>
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
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  headerTitle: { fontFamily: 'Ravi-Bold', fontSize: 13, color: '#ffffff' },
  headerSubtitle: { fontFamily: 'Ravi-Regular', fontSize: 9.5, color: '#94a3b8', textAlign: 'right' },
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
    gap: 12,
  },
  itemRow: { flexDirection: 'row-reverse', gap: 12 },
  poster: { width: 65, height: 95, borderRadius: 14, backgroundColor: '#030712' },
  details: { flex: 1, justifyContent: 'center', gap: 4 },
  campaignTitle: { fontFamily: 'Ravi-Bold', fontSize: 13, color: '#ffffff', textAlign: 'right' },
  dateText: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#64748b', textAlign: 'right' },
  rejectionReasonBox: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
    borderRadius: 10,
    padding: 6,
    marginTop: 2,
  },
  rejectionTextCol: { flex: 1 },
  rejectionTitle: { fontFamily: 'Ravi-Bold', fontSize: 9.5, color: '#f43f5e', textAlign: 'right' },
  rejectionDesc: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#fecdd3', textAlign: 'right', lineHeight: 14 },
  actionGrid: {
    flexDirection: 'row-reverse',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
  },
  detailsBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  detailsBtnText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#38bdf8' },
  rejectBtn: {
    flex: 1.2,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
  },
  rejectBtnText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#f43f5e' },
  approveBtn: {
    flex: 1.2,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#10b981',
  },
  approveBtnText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#030712' },
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
  modalTopSection: { flexDirection: 'row-reverse', gap: 12 },
  modalPoster: { width: 85, height: 125, borderRadius: 14, backgroundColor: '#030712' },
  modalBasicInfo: { flex: 1, gap: 4, justifyContent: 'center' },
  modalTitleFa: { fontFamily: 'Ravi-Bold', fontSize: 14, color: '#ffffff', textAlign: 'right' },
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
  specsGridBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 10,
    gap: 6,
  },
  specItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  specItemText: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#cbd5e1', textAlign: 'right' },
  regNumbersBox: {
    backgroundColor: 'rgba(20, 184, 166, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 14,
    padding: 10,
    gap: 6,
  },
  modalSection: { gap: 6 },
  sectionLabel: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#94a3b8', textAlign: 'right' },
  sectionDescText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11.5,
    color: '#cbd5e1',
    textAlign: 'right',
    lineHeight: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 10,
    borderRadius: 12,
  },
  loglineText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11,
    color: '#fbbf24',
    textAlign: 'right',
    fontStyle: 'italic',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    padding: 10,
    borderRadius: 12,
  },
  costSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  costTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  costTitleText: { fontFamily: 'Ravi-Bold', fontSize: 11.5, color: '#2dd4bf' },
  costCardsRow: { flexDirection: 'row-reverse', gap: 6 },
  costCard: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    gap: 3,
  },
  costCardMain: { borderColor: 'rgba(45, 212, 191, 0.4)' },
  costCardLabel: { fontFamily: 'Ravi-Regular', fontSize: 9.5, color: '#94a3b8' },
  costCardVal: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#ffffff' },
  costCardTime: { fontFamily: 'Ravi-Regular', fontSize: 8.5, color: '#64748b' },
  totalBudgetRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderRadius: 10,
    padding: 10,
  },
  totalBudgetLabel: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#94a3b8' },
  totalBudgetVal: { fontFamily: 'Ravi-Bold', fontSize: 13, color: '#2dd4bf' },
  docsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  docBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  docBtnText: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#cbd5e1' },
  pitchDocBtn: { backgroundColor: 'rgba(20, 184, 166, 0.1)', borderColor: 'rgba(20, 184, 166, 0.25)' },
  pitchDocText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#2dd4bf' },
  roughDocBtn: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.25)' },
  roughDocText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#f59e0b' },
  actionModalCard: {
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
  actionModalIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  approveIconBg: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
  rejectIconBg: { backgroundColor: 'rgba(244, 63, 94, 0.12)' },
  modalTitle: { fontFamily: 'Ravi-Bold', fontSize: 13.5, color: '#ffffff', textAlign: 'center' },
  modalDesc: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#94a3b8', textAlign: 'center', lineHeight: 16 },
  modalInput: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
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
  approveBorder: { borderColor: 'rgba(16, 185, 129, 0.3)' },
  rejectBorder: { borderColor: 'rgba(244, 63, 94, 0.3)' },
  modalBtnRow: { flexDirection: 'row-reverse', width: '100%', gap: 8, marginTop: 6 },
  modalCancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#94a3b8' },
  modalSubmitBtn: {
    flex: 1.3,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveSubmitBg: { backgroundColor: '#10b981' },
  rejectSubmitBg: { backgroundColor: '#f43f5e' },
  modalSubmitText: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#ffffff' },
});