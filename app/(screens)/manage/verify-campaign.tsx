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
  Rocket,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  FileText,
  Eye,
  AlertCircle,
  DollarSign,
  Calendar,
  Clock,
  Globe,
  MapPin,
  Film,
  Hash,
  Video,
  Download,
  X,
  Check,
  Send,
} from 'lucide-react-native';
import { api, getMediaUrl, toFarsiDigits } from '../../../src/api/axiosClient';

interface CampaignItem {
  id: string;
  titleFa: string;
  mainPosterUrl: string;
  fundingGoal: number;
  createdAt: string;
  superAdminNote?: string;
  scriptFileUrl?: string;
  pitchVideoUrl?: string;
  rejectionReason?: string;
}

export default function VerifyCampaignScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // 🟢 استیت رهگیری کمپین‌هایی که تبدیل HLS ویدیوی پیچ آن‌ها توسط ادمین آغاز شده است
  const [transcodingCampaignIds, setTranscodingCampaignIds] = useState<string[]>([]);

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [fullData, setFullData] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [rejectModalItem, setRejectModalItem] = useState<CampaignItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [approveModalItem, setApproveModalItem] = useState<CampaignItem | null>(null);
  const [publishToTelegram, setPublishToTelegram] = useState(true);
  const [publishToBale, setPublishToBale] = useState(true);

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
    else Alert.alert('', msg);
  };

  const fetchPendingCampaigns = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await api.get('/projects/pending');
      const items = res.data?.items || res.data || [];
      setCampaigns(items);

      // همگام‌‌سازی: در صورت اتمام تبدیل HLS در بک‌اند و خروج از لیست، از استیت ترنسکدینگ نیز برداشته شود
      const currentPendingIds = new Set(items.map((c: any) => c.id));
      setTranscodingCampaignIds((prev) => prev.filter((id) => currentPendingIds.has(id)));
    } catch {
      if (!isSilent) showToast('خطا در دریافت لیست کمپین‌های در انتظار');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingCampaigns();
    // 🟢 پایش هر ۴ ثانیه برای حذف خودکار از کارتابل ادمین پس از تبدیل HLS
    const interval = setInterval(() => {
      fetchPendingCampaigns(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchPendingCampaigns]);

  const handleOpenDetails = async (id: string) => {
    try {
      setSelectedCampaignId(id);
      setDetailsLoading(true);
      const res = await api.get(`/projects/${id}`);
      setFullData(res.data?.data || res.data);
    } catch {
      showToast('خطا در دریافت مشخصات کامل پروژه');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleConfirmApprove = async () => {
    if (!approveModalItem) return;
    const targetId = approveModalItem.id;
    try {
      setActionLoadingId(targetId);
      await api.post(`/projects/${targetId}/review`, {
        isApproved: true,
        publishToTelegram,
        publishToBale,
      });

      showToast('تایید ثبت شد و فرآیند تبدیل ویدیوی پیچ به HLS آغاز گردید');

      // 🟢 فعال شدن فوری بج زرد رنگ لودینگ در پنل ادمین
      setTranscodingCampaignIds((prev) => Array.from(new Set([...prev, targetId])));

      setApproveModalItem(null);
      if (selectedCampaignId === targetId) setSelectedCampaignId(null);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در تایید کمپین');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalItem || !rejectReason.trim()) {
      showToast('وارد کردن دلیل رد الزامی است');
      return;
    }
    try {
      setActionLoadingId(rejectModalItem.id);
      await api.post(`/projects/${rejectModalItem.id}/review`, {
        isApproved: false,
        rejectionReason: rejectReason.trim(),
      });

      showToast('کمپین رد شد و به سازنده اطلاع‌رسانی گردید');
      setCampaigns((prev) => prev.filter((c) => c.id !== rejectModalItem.id));
      setRejectModalItem(null);
      setRejectReason('');
      if (selectedCampaignId === rejectModalItem.id) setSelectedCampaignId(null);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در رد کمپین');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* هدر */}
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <View style={styles.headerIconBox}>
            <Rocket size={20} color="#10b981" />
          </View>
          <View>
            <Text style={styles.headerTitle}>بررسی و تایید کمپین‌های جدید</Text>
            <Text style={styles.headerSubtitle}>{toFarsiDigits(campaigns.length)} پروژه در انتظار بررسی</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.backBtn} activeOpacity={0.7} onPress={() => router.back()}>
          <ChevronLeft size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* لیست کمپین‌ها */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : campaigns.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>هیچ کمپینی در انتظار تایید وجود ندارد.</Text>
        </View>
      ) : (
        <FlatList
          data={campaigns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            // 🟢 بررسی وضعیت لودینگ هم از دیتابیس و هم از استیت لحظه‌ای اکشن ادمین
            const isHlsProcessing =
              item.rejectionReason?.startsWith('HLS_PROCESSING') ||
              transcodingCampaignIds.includes(item.id);

            return (
              <View style={styles.card}>
                {item.superAdminNote ? (
                  <View style={styles.superAdminNoteBox}>
                    <AlertCircle size={16} color="#2dd4bf" />
                    <View style={styles.superAdminNoteTextCol}>
                      <Text style={styles.superAdminNoteTitle}>پیام ارجاع سوپرادمین:</Text>
                      <Text style={styles.superAdminNoteDesc}>{item.superAdminNote}</Text>
                    </View>
                  </View>
                ) : null}

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
                    <Text style={styles.dateText}>تاریخ درخواست: {item.createdAt}</Text>

                    <View style={styles.budgetBadge}>
                      <DollarSign size={11} color="#f59e0b" />
                      <Text style={styles.budgetText}>
                        بودجه: {toFarsiDigits((item.fundingGoal || 0).toLocaleString('fa-IR'))} تومان
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.actionGrid}>
                  {item.scriptFileUrl ? (
                    <TouchableOpacity
                      style={styles.scriptBtn}
                      activeOpacity={0.75}
                      onPress={() => Linking.openURL(getMediaUrl(item.scriptFileUrl)).catch(() => {})}
                    >
                      <FileText size={13} color="#2dd4bf" />
                      <Text style={styles.scriptBtnText}>فیلمنامه</Text>
                    </TouchableOpacity>
                  ) : null}

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
                    disabled={isHlsProcessing}
                    onPress={() => {
                      setRejectModalItem(item);
                      setRejectReason('');
                    }}
                  >
                    <XCircle size={13} color="#f43f5e" />
                    <Text style={styles.rejectBtnText}>رد</Text>
                  </TouchableOpacity>

                  {/* 🟢 نمایش وضعیت لودینگ تبدیل به HLS */}
                  {isHlsProcessing ? (
                    <View style={styles.hlsProcessingBadge}>
                      <ActivityIndicator size="small" color="#fbbf24" />
                      <Text style={styles.hlsProcessingText}>در حال تبدیل به HLS...</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.approveBtn}
                      activeOpacity={0.8}
                      disabled={actionLoadingId === item.id}
                      onPress={() => {
                        setApproveModalItem(item);
                        setPublishToTelegram(true);
                        setPublishToBale(true);
                      }}
                    >
                      {actionLoadingId === item.id ? (
                        <ActivityIndicator size="small" color="#030712" />
                      ) : (
                        <>
                          <CheckCircle2 size={13} color="#030712" />
                          <Text style={styles.approveBtnText}>تایید و انتشار</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* مدال تایید و کانال‌ها */}
      {approveModalItem && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.dialogCard}>
              <View style={styles.dialogIconCircleApprove}>
                <CheckCircle2 size={26} color="#10b981" />
              </View>
              <Text style={styles.dialogTitle}>تایید و انتشار کمپین</Text>
              <Text style={styles.dialogDesc}>
                آیا از تایید کمپین «{approveModalItem.titleFa}» اطمینان دارید؟ تبدیل کیفیت HLS ویدیوی پیچ آغاز خواهد شد و پس از اتمام به طور خودکار منتشر می‌شود.
              </Text>

              <Text style={styles.channelHeaderTitle}>انتشار خودکار در شبکه‌های اجتماعی:</Text>

              <TouchableOpacity
                style={styles.channelRow}
                activeOpacity={0.85}
                onPress={() => setPublishToTelegram(!publishToTelegram)}
              >
                <View style={[styles.checkbox, publishToTelegram && styles.checkboxActive]}>
                  {publishToTelegram && <Check size={13} color="#030712" />}
                </View>
                <Text style={styles.channelRowLabel}>ارسال به کانال تلگرام پرشات (@pershot_ir)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.channelRow}
                activeOpacity={0.85}
                onPress={() => setPublishToBale(!publishToBale)}
              >
                <View style={[styles.checkbox, publishToBale && styles.checkboxActive]}>
                  {publishToBale && <Check size={13} color="#030712" />}
                </View>
                <Text style={styles.channelRowLabel}>ارسال به کانال بله پرشات (@pershot)</Text>
              </TouchableOpacity>

              <View style={styles.dialogBtnRow}>
                <TouchableOpacity
                  style={styles.dialogCancelBtn}
                  onPress={() => setApproveModalItem(null)}
                >
                  <Text style={styles.dialogCancelText}>انصراف</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dialogSubmitApproveBtn}
                  disabled={actionLoadingId === approveModalItem.id}
                  onPress={handleConfirmApprove}
                >
                  {actionLoadingId === approveModalItem.id ? (
                    <ActivityIndicator size="small" color="#030712" />
                  ) : (
                    <>
                      <Send size={14} color="#030712" />
                      <Text style={styles.dialogSubmitApproveText}>تایید و ارسال</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* مدال رد */}
      {rejectModalItem && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.dialogCard}>
              <View style={styles.dialogIconCircleReject}>
                <XCircle size={26} color="#f43f5e" />
              </View>
              <Text style={styles.dialogTitle}>عدم تایید کمپین</Text>
              <Text style={styles.dialogDesc}>
                دلیل رد شدن کمپین «{rejectModalItem.titleFa}» را برای کاربر بنویسید:
              </Text>

              <TextInput
                style={styles.dialogInput}
                multiline
                numberOfLines={4}
                placeholder="توضیحات عدم تایید کمپین..."
                placeholderTextColor="#64748b"
                value={rejectReason}
                onChangeText={setRejectReason}
              />

              <View style={styles.dialogBtnRow}>
                <TouchableOpacity
                  style={styles.dialogCancelBtn}
                  onPress={() => setRejectModalItem(null)}
                >
                  <Text style={styles.dialogCancelText}>انصراف</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dialogSubmitRejectBtn}
                  disabled={actionLoadingId === rejectModalItem.id || !rejectReason.trim()}
                  onPress={handleConfirmReject}
                >
                  {actionLoadingId === rejectModalItem.id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.dialogSubmitRejectText}>ثبت و رد</Text>
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
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
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
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
    gap: 12,
  },
  superAdminNoteBox: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(45, 212, 191, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.2)',
    borderRadius: 14,
    padding: 10,
  },
  superAdminNoteTextCol: { flex: 1, gap: 2 },
  superAdminNoteTitle: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#2dd4bf', textAlign: 'right' },
  superAdminNoteDesc: { fontFamily: 'Ravi-Regular', fontSize: 11, color: '#e2e8f0', textAlign: 'right', lineHeight: 16 },
  itemRow: { flexDirection: 'row-reverse', gap: 12 },
  poster: { width: 65, height: 95, borderRadius: 14, backgroundColor: '#030712' },
  details: { flex: 1, justifyContent: 'center', gap: 4 },
  campaignTitle: { fontFamily: 'Ravi-Bold', fontSize: 13, color: '#ffffff', textAlign: 'right' },
  dateText: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#64748b', textAlign: 'right' },
  budgetBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  budgetText: { fontFamily: 'Ravi-Bold', fontSize: 10, color: '#fbbf24' },
  actionGrid: {
    flexDirection: 'row-reverse',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
  },
  scriptBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  scriptBtnText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#2dd4bf' },
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
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
  },
  rejectBtnText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#f43f5e' },
  approveBtn: {
    flex: 1.5,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#10b981',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  approveBtnText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#030712' },
  hlsProcessingBadge: {
    flex: 1.5,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 8,
    height: 38,
    borderRadius: 10,
  },
  hlsProcessingText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 10.5,
    color: '#fbbf24',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#0d1520',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  dialogIconCircleApprove: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogIconCircleReject: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogTitle: { fontFamily: 'Ravi-Bold', fontSize: 14, color: '#ffffff', textAlign: 'center' },
  dialogDesc: { fontFamily: 'Ravi-Regular', fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },
  channelHeaderTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 10.5,
    color: '#cbd5e1',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  channelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 10,
    borderRadius: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#14b8a6',
    borderColor: '#14b8a6',
  },
  channelRowLabel: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11,
    color: '#f1f5f9',
    flex: 1,
    textAlign: 'right',
  },
  dialogInput: {
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
  },
  dialogBtnRow: { flexDirection: 'row-reverse', width: '100%', gap: 8, marginTop: 4 },
  dialogCancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogCancelText: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#94a3b8' },
  dialogSubmitApproveBtn: {
    flex: 1.5,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#10b981',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dialogSubmitApproveText: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#030712' },
  dialogSubmitRejectBtn: {
    flex: 1.5,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f43f5e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogSubmitRejectText: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#ffffff' },
});