import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import {
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Lock,
  Share2,
  ShieldAlert,
  Upload,
  UserPlus,
  XCircle
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { api, getMediaUrl, toFarsiDigits } from '../../api/axiosClient';

interface Props {
  campaign: any;
  onRefresh: () => void;
}

const crewRoles = [
  'کارگردان',
  'تهیه‌کننده',
  'نویسنده',
  'مدیر فیلمبرداری',
  'تدوین‌گر',
  'آهنگساز',
  'صدابردار',
  'طراح صحنه',
  'بازیگر',
  'سایر',
];

export default function CampaignSingleAnalytics({ campaign, onRefresh }: Props) {
  const [uploadingStage, setUploadingStage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number } | null>(null);

  // استیت‌های سیستم دعوتنامه
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [selectedRole, setSelectedRole] = useState(crewRoles[0]);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [latestGeneratedLink, setLatestGeneratedLink] = useState<string | null>(null);

  const documents = campaign?.documents || [];

  const isCampaignApproved =
    campaign?.status === 'Approved' ||
    campaign?.status === 'Funded' ||
    campaign?.status === 'Completed' ||
    campaign?.status === 2 ||
    campaign?.status === 4 ||
    campaign?.status === 5;

  const isRejected =
    campaign?.status === 'Rejected' ||
    campaign?.status === 3 ||
    campaign?.status === 'rejected';

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
    else Alert.alert('', msg);
  };

  // دریافت لیست دعوتنامه‌های این کمپین
  const fetchCampaignInvites = useCallback(async () => {
    if (!campaign?.id) return;
    try {
      setLoadingInvites(true);
      const res = await api.get(`/projects/${campaign.id}/invitations`);
      setInvitations(res.data || []);
    } catch {
      setInvitations([]);
    } finally {
      setLoadingInvites(false);
    }
  }, [campaign?.id]);

  useEffect(() => {
    fetchCampaignInvites();
  }, [fetchCampaignInvites]);

  // تولید لینک دعوت جدید
  const handleGenerateInvite = async () => {
    if (!memberName.trim()) {
      showToast('لطفاً نام همکار مورد نظر را وارد کنید.');
      return;
    }

    try {
      setIsGeneratingInvite(true);
      const res = await api.post(`/projects/${campaign.id}/generate-invite`, {
        memberName: memberName.trim(),
        role: selectedRole,
      });

      const token = res.data?.token;
      if (token) {
        const inviteUrl = `https://pershot.ir/tabs/profile/invite?token=${token}`;
        setLatestGeneratedLink(inviteUrl);
        showToast('لینک دعوت با موفقیت تولید شد');
        setMemberName('');
        fetchCampaignInvites();
        onRefresh();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در تولید لینک دعوت');
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleShareInvite = async (url: string) => {
    try {
      await Share.share({
        message: `دعوت به همکاری در پروژه «${campaign.titleFa}»:\n${url}`,
      });
    } catch {}
  };

  // مهلت ۷ روزه حذف در صورت رد
  useEffect(() => {
    if (isRejected && campaign) {
      const baseDateStr = campaign.updatedAt || campaign.createdAt;
      if (!baseDateStr) return;

      const baseDate = new Date(baseDateStr);
      const deletionDate = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      const updateTimer = () => {
        const now = new Date();
        const diff = deletionDate.getTime() - now.getTime();

        if (diff <= 0) {
          setTimeLeft({ days: 0, hours: 0 });
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          setTimeLeft({ days, hours });
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000 * 60 * 60);
      return () => clearInterval(interval);
    }
  }, [isRejected, campaign]);

  const getStageStatus = (stage: string) => {
    const doc = documents.find((d: any) => d.stage === stage);
    return doc ? doc.status : 'not-submitted';
  };

  const getStageFileUrl = (stage: string) => {
    const doc = documents.find((d: any) => d.stage === stage);
    return doc?.fileUrl ? getMediaUrl(doc.fileUrl) : null;
  };

  const canUploadStage = (stage: 'pre-production' | 'production' | 'post-production') => {
    if (!isCampaignApproved) return false;

    const currentStageText = campaign?.currentStage || '';
    const isStartedFromProd = currentStageText.includes('تولید (Production)');
    const isStartedFromPostProd = currentStageText.includes('پس‌تولید');

    const preProdStatus = getStageStatus('pre-production');
    const prodStatus = getStageStatus('production');

    if (stage === 'pre-production') {
      if (isStartedFromProd || isStartedFromPostProd) return false;
      return preProdStatus === 'not-submitted' || preProdStatus === 'rejected';
    }

    if (stage === 'production') {
      if (isStartedFromPostProd) return false;
      const isPreApproved = isStartedFromProd || preProdStatus === 'approved';
      return isPreApproved && (prodStatus === 'not-submitted' || prodStatus === 'rejected');
    }

    if (stage === 'post-production') {
      const isProdApproved = prodStatus === 'approved';
      const postProdStatus = getStageStatus('post-production');
      return isProdApproved && (postProdStatus === 'not-submitted' || postProdStatus === 'rejected');
    }

    return false;
  };

  const handleStageZipUpload = async (stage: string) => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/zip', 'application/x-zip-compressed'],
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets[0]) return;

      setUploadingStage(stage);
      const formData = new FormData();
      formData.append('projectId', campaign.id);
      formData.append('stage', stage);
      formData.append('file', {
        uri: res.assets[0].uri,
        name: res.assets[0].name,
        type: 'application/zip',
      } as any);

      await api.post('/projects/documents/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showToast('مستندات مرحله ارسال شد و در انتظار تایید ادمین است');
      onRefresh();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در آپلود مستندات');
    } finally {
      setUploadingStage(null);
    }
  };

  const goal = Math.max(1, campaign?.fundingGoal || 1);
  const progress = Math.min(((campaign?.currentFunding || 0) / goal) * 100, 100);

  return (
    <View style={styles.container}>
      {/* اخطار رد سوپرادمین */}
      {isRejected ? (
        <View style={styles.rejectedNotice}>
          <View style={styles.rejectedHeader}>
            <ShieldAlert size={22} color="#f43f5e" />
            <Text style={styles.rejectedTitle}>کمپین رد قطعی شده است (اخطار حذف)</Text>
          </View>

          <View style={styles.rejectedReasonBox}>
            <Text style={styles.rejectedReasonLabel}>علت رد توسط مدیریت ارشد:</Text>
            <Text style={styles.rejectedReasonText}>
              {campaign?.rejectionReason || 'بدون توضیح'}
            </Text>
          </View>

          <View style={styles.timerRow}>
            <Clock size={16} color="#fda4af" />
            <Text style={styles.timerText}>فرصت ویرایش قبل از حذف کامل:</Text>
            <View style={styles.timerBadge}>
              <Text style={styles.timerBadgeText}>
                {timeLeft
                  ? timeLeft.days === 0 && timeLeft.hours === 0
                    ? 'زمان به پایان رسیده'
                    : `${toFarsiDigits(timeLeft.days)} روز و ${toFarsiDigits(timeLeft.hours)} ساعت`
                  : 'در حال محاسبه...'}
              </Text>
            </View>
          </View>
        </View>
      ) : !isCampaignApproved && (
        <View style={styles.pendingNotice}>
          <ShieldAlert size={18} color="#fbbf24" />
          <Text style={styles.pendingNoticeText}>
            این کمپین در انتظار تایید اولیه ادمین است. امکان ارسال مستندات مراحل پس از تایید نهایی فعال می‌شود.
          </Text>
        </View>
      )}

      {/* خلاصه کمپین */}
      <View style={[styles.overviewCard, isRejected && styles.dimmedCard]}>
        <Image
          source={{ uri: getMediaUrl(campaign?.thumbnail || campaign?.mainPosterUrl) }}
          style={styles.poster}
          contentFit="cover"
        />
        <View style={styles.overviewDetails}>
          <Text style={styles.stagePill}>مرحله: {campaign?.currentStage || 'طرح'}</Text>
          <Text style={styles.titleFa} numberOfLines={1}>
            {campaign?.titleFa}
          </Text>
          <Text style={styles.synopsisText} numberOfLines={2}>
            {campaign?.shortSynopsis || campaign?.synopsis}
          </Text>

          <View style={styles.progressBox}>
            <View style={styles.progressRow}>
              <Text style={styles.progressPercent}>{toFarsiDigits(progress.toFixed(0))}٪ تامین شده</Text>
              <Text style={styles.progressAmount}>
                {toFarsiDigits((campaign?.currentFunding || 0).toLocaleString('fa-IR'))} ت
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>
        </View>
      </View>

      {/* 🟢 بخش تولید دعوتنامه همکاری برای نقش‌های مختلف (مشابه وب) */}
      <View style={styles.inviteSection}>
        <View style={styles.sectionHeaderRow}>
          <UserPlus size={18} color="#14b8a6" />
          <Text style={styles.sectionTitle}>صدور دعوتنامه همکاری برای عوامل</Text>
        </View>
        <Text style={styles.sectionDesc}>
          نقش و نام همکار را مشخص کنید تا لینک دعوت اختصاصی برای عضویت در پروژه تولید شود.
        </Text>

        {/* انتخاب نقش */}
        <View style={styles.rolesRow}>
          {crewRoles.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleSelectBtn, selectedRole === r && styles.roleSelectBtnActive]}
              onPress={() => setSelectedRole(r)}
            >
              <Text style={[styles.roleSelectText, selectedRole === r && styles.roleSelectTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* فیلد نام همکار و دکمه ایجاد لینک */}
        <View style={styles.generateRow}>
          <TextInput
            style={styles.inviteInput}
            placeholder="نام و نام خانوادگی همکار..."
            placeholderTextColor="#64748b"
            value={memberName}
            onChangeText={setMemberName}
          />
          <TouchableOpacity
            style={[styles.generateBtn, isGeneratingInvite && { opacity: 0.6 }]}
            activeOpacity={0.8}
            disabled={isGeneratingInvite}
            onPress={handleGenerateInvite}
          >
            {isGeneratingInvite ? (
              <ActivityIndicator size="small" color="#030712" />
            ) : (
              <Text style={styles.generateBtnText}>تولید لینک</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* آخرین لینک تولیدشده */}
        {latestGeneratedLink && (
          <View style={styles.latestLinkCard}>
            <Text style={styles.latestLinkLabel} numberOfLines={1}>
              {latestGeneratedLink}
            </Text>
            <TouchableOpacity
              style={styles.shareIconBtn}
              activeOpacity={0.8}
              onPress={() => handleShareInvite(latestGeneratedLink)}
            >
              <Share2 size={16} color="#030712" />
              <Text style={styles.shareIconText}>اشتراک‌گذاری</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* لیست دعوتنامه‌های صادرشده و وضعیت پذیرش */}
        <View style={styles.invitesListCard}>
          <Text style={styles.invitesListTitle}>دعوتنامه‌های صادرشده این کمپین ({toFarsiDigits(invitations.length)}):</Text>
          {loadingInvites ? (
            <ActivityIndicator size="small" color="#14b8a6" style={{ marginVertical: 10 }} />
          ) : invitations.length === 0 ? (
            <Text style={styles.noInvitesText}>تاکنون دعوتنامه‌ای برای این پروژه صادر نشده است.</Text>
          ) : (
            <View style={styles.invitesList}>
              {invitations.map((inv) => {
                const isAccepted = inv.status === 'Accepted';
                const isRejectedInv = inv.status === 'Rejected';
                const inviteUrl = `https://pershot.ir/tabs/profile/invite?token=${inv.token}`;

                return (
                  <View key={inv.id} style={styles.inviteItem}>
                    <View style={styles.inviteItemRight}>
                      <Text style={styles.inviteMemberName}>{inv.invitedName}</Text>
                      <Text style={styles.inviteRole}>{inv.role}</Text>
                    </View>

                    <View style={styles.inviteItemLeft}>
                      <View
                        style={[
                          styles.inviteStatusBadge,
                          isAccepted
                            ? styles.statusAccepted
                            : isRejectedInv
                            ? styles.statusRejected
                            : styles.statusPending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.inviteStatusText,
                            { color: isAccepted ? '#10b981' : isRejectedInv ? '#f43f5e' : '#fbbf24' },
                          ]}
                        >
                          {isAccepted ? 'عضو شد' : isRejectedInv ? 'رد کرد' : 'در انتظار'}
                        </Text>
                      </View>

                      {!isAccepted && (
                        <TouchableOpacity
                          style={styles.miniShareBtn}
                          onPress={() => handleShareInvite(inviteUrl)}
                        >
                          <Share2 size={14} color="#94a3b8" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* مستندات فازهای ۳ گانه */}
      <View style={[styles.stagesSection, !isCampaignApproved && styles.dimmedSection]}>
        <View style={styles.stagesHeader}>
          <FileText size={18} color="#14b8a6" />
          <Text style={styles.sectionTitle}>مستندات مراحل ساخت (فایل‌های ZIP)</Text>
        </View>

        {(['pre-production', 'production', 'post-production'] as const).map((stageKey) => {
          const status = getStageStatus(stageKey);
          const fileUrl = getStageFileUrl(stageKey);
          const isUploadAllowed = canUploadStage(stageKey);

          const isStartedFromProd = (campaign?.currentStage || '').includes('تولید (Production)');
          const isStartedFromPostProd = (campaign?.currentStage || '').includes('پس‌تولید');

          const isBypassedStage =
            (stageKey === 'pre-production' && (isStartedFromProd || isStartedFromPostProd)) ||
            (stageKey === 'production' && isStartedFromPostProd);

          const stageNames = {
            'pre-production': '۱. پیش‌تولید',
            'production': '۲. تولید',
            'post-production': '۳. پس‌تولید',
          };

          return (
            <View
              key={stageKey}
              style={[
                styles.stageCard,
                (isBypassedStage || (!isUploadAllowed && status === 'not-submitted')) && styles.stageCardDisabled,
              ]}
            >
              <View style={styles.stageTopRow}>
                <Text style={styles.stageName}>{stageNames[stageKey]}</Text>
                <View style={styles.statusIndicator}>
                  {status === 'approved' && <CheckCircle2 size={16} color="#10b981" />}
                  {status === 'pending' && <Clock size={16} color="#f59e0b" />}
                  {status === 'rejected' && <XCircle size={16} color="#f43f5e" />}
                  {status === 'not-submitted' && <Lock size={16} color="#64748b" />}
                  <Text style={styles.statusLabel}>
                    {status === 'approved'
                      ? 'تایید شده'
                      : status === 'pending'
                      ? 'در انتظار بررسی'
                      : status === 'rejected'
                      ? 'رد شده'
                      : 'ارسال نشده'}
                  </Text>
                </View>
              </View>

              {fileUrl && (
                <TouchableOpacity
                  style={styles.downloadBtn}
                  onPress={() => Linking.openURL(fileUrl).catch(() => {})}
                >
                  <Download size={13} color="#2dd4bf" />
                  <Text style={styles.downloadBtnText}>دانلود ZIP ارسال‌شده</Text>
                </TouchableOpacity>
              )}

              {isUploadAllowed && (
                <TouchableOpacity
                  style={styles.uploadStageBtn}
                  disabled={uploadingStage === stageKey}
                  onPress={() => handleStageZipUpload(stageKey)}
                >
                  {uploadingStage === stageKey ? (
                    <ActivityIndicator size="small" color="#030712" />
                  ) : (
                    <>
                      <Upload size={14} color="#030712" />
                      <Text style={styles.uploadStageBtnText}>
                        {status === 'rejected' ? 'ارسال مجدد فایل ZIP' : 'آپلود فایل ZIP مرحله'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  rejectedNotice: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  rejectedHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  rejectedTitle: { fontFamily: 'Ravi-Bold', fontSize: 13.5, color: '#f43f5e', textAlign: 'right' },
  rejectedReasonBox: {
    backgroundColor: 'rgba(3, 7, 18, 0.4)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  rejectedReasonLabel: { fontFamily: 'Ravi-Bold', fontSize: 10, color: '#cbd5e1', marginBottom: 6, textAlign: 'right' },
  rejectedReasonText: { fontFamily: 'Ravi-Regular', fontSize: 12, color: '#fecdd3', textAlign: 'right', lineHeight: 20 },
  timerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 2 },
  timerText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#fda4af' },
  timerBadge: { backgroundColor: '#f43f5e', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  timerBadgeText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#ffffff' },
  pendingNotice: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 14,
    padding: 10,
  },
  pendingNoticeText: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#fde68a', flex: 1, textAlign: 'right' },
  overviewCard: {
    flexDirection: 'row-reverse',
    backgroundColor: '#0d1520',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    gap: 12,
  },
  dimmedCard: { opacity: 0.8 },
  poster: { width: 75, height: 110, borderRadius: 12, backgroundColor: '#030712' },
  overviewDetails: { flex: 1, justifyContent: 'space-between', gap: 4 },
  stagePill: {
    fontFamily: 'Ravi-Bold',
    fontSize: 9.5,
    color: '#2dd4bf',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  titleFa: { fontFamily: 'Ravi-Bold', fontSize: 13.5, color: '#ffffff', textAlign: 'right' },
  synopsisText: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#cbd5e1', textAlign: 'right' },
  progressBox: { gap: 4 },
  progressRow: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  progressPercent: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 10, color: '#2dd4bf' },
  progressAmount: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 9.5, color: '#94a3b8' },
  progressBar: { height: 4, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#14b8a6' },

  /* استایل‌های صدور دعوتنامه */
  inviteSection: {
    backgroundColor: '#0d1520',
    borderRadius: 20,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.3)',
  },
  sectionHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: { fontFamily: 'Ravi-Bold', fontSize: 12.5, color: '#ffffff' },
  sectionDesc: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#94a3b8', textAlign: 'right', lineHeight: 16 },
  rolesRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  roleSelectBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  roleSelectBtnActive: {
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
    borderColor: '#14b8a6',
  },
  roleSelectText: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#94a3b8' },
  roleSelectTextActive: { fontFamily: 'Ravi-Bold', color: '#2dd4bf' },
  generateRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 4,
  },
  inviteInput: {
    flex: 1,
    height: 42,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontFamily: 'Ravi-Regular',
    fontSize: 11.5,
    color: '#ffffff',
    textAlign: 'right',
  },
  generateBtn: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateBtnText: { fontFamily: 'Ravi-Bold', fontSize: 11.5, color: '#030712' },
  latestLinkCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
  },
  latestLinkLabel: { flex: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 9.5, color: '#2dd4bf', textAlign: 'left', marginLeft: 8 },
  shareIconBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#14b8a6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  shareIconText: { fontFamily: 'Ravi-Bold', fontSize: 10, color: '#030712' },
  invitesListCard: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
    gap: 6,
  },
  invitesListTitle: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#cbd5e1', textAlign: 'right' },
  noInvitesText: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#64748b', textAlign: 'right' },
  invitesList: { gap: 6 },
  inviteItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  inviteItemRight: { gap: 2 },
  inviteMemberName: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#ffffff', textAlign: 'right' },
  inviteRole: { fontFamily: 'Ravi-Regular', fontSize: 9.5, color: '#14b8a6', textAlign: 'right' },
  inviteItemLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  inviteStatusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  statusAccepted: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  statusRejected: { backgroundColor: 'rgba(244, 63, 94, 0.15)' },
  statusPending: { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
  inviteStatusText: { fontFamily: 'Ravi-Bold', fontSize: 9 },
  miniShareBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* استایل مراحل ساخت */
  stagesSection: { backgroundColor: '#0d1520', borderRadius: 20, padding: 14, gap: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  dimmedSection: { opacity: 0.6 },
  stagesHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  stageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    gap: 8,
  },
  stageCardDisabled: {
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.02)',
    opacity: 0.6,
  },
  stageTopRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  stageName: { fontFamily: 'Ravi-Bold', fontSize: 12, color: '#2dd4bf' },
  statusIndicator: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  statusLabel: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#cbd5e1' },
  downloadBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
  },
  downloadBtnText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#2dd4bf' },
  uploadStageBtn: {
    height: 38,
    borderRadius: 10,
    backgroundColor: '#14b8a6',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadStageBtnText: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#030712' },
});