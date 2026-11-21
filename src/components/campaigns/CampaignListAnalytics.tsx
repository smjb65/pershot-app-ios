import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Rocket, ChevronLeft } from 'lucide-react-native';
import { api, getMediaUrl, toFarsiDigits } from '../../api/axiosClient';

export interface CampaignItem {
  id: string;
  titleFa: string;
  posterUrl: string;
  currentFunding: number;
  fundingGoal: number;
  status: string | number;
  createdAt: string;
}

export default function CampaignListAnalytics({ campaigns: initialCampaigns }: { campaigns?: CampaignItem[] }) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CampaignItem[]>(initialCampaigns || []);
  const [loading, setLoading] = useState(!initialCampaigns);

  useEffect(() => {
    if (initialCampaigns) {
      setCampaigns(initialCampaigns);
      return;
    }
    api.get('/projects/my-campaigns')
      .then((res) => setCampaigns(res.data || []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, [initialCampaigns]);

  const getStatusBadge = (status: string | number) => {
    const s = status?.toString()?.toLowerCase();
    if (s === 'draft' || s === '0') {
      return { label: 'پیش‌نویس (تکمیل‌نشده)', bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8' };
    }
    switch (s) {
      case 'approved':
      case '2':
      case 'funded':
      case '4':
        return { label: 'تایید شده / فعال', bg: 'rgba(20, 184, 166, 0.15)', text: '#2dd4bf' };
      case 'completed':
      case '5':
        return { label: 'پایان یافته', bg: 'rgba(16, 185, 129, 0.2)', text: '#10b981' };
      case 'rejected':
      case '3':
        return { label: 'رد شده (مهلت ۷ روزه)', bg: 'rgba(244, 63, 94, 0.15)', text: '#f43f5e' };
      default:
        return { label: 'در انتظار بررسی ادمین', bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' };
    }
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.loadingText}>در حال دریافت اطلاعات کمپین‌ها...</Text>
      </View>
    );
  }

  if (campaigns.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Rocket size={40} color="#334155" />
        <Text style={styles.emptyTitle}>هیچ کمپینی ثبت نشده است</Text>
        <Text style={styles.emptyDesc}>
          برای جذب سرمایه و حمایت، اولین کمپین خود را از تب «ثبت کمپین جدید» ایجاد کنید.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {campaigns.map((campaign) => {
        const isDraft = String(campaign.status).toLowerCase() === 'draft' || String(campaign.status) === '0';
        const badge = getStatusBadge(campaign.status);
        const goal = Math.max(1, campaign.fundingGoal || 1);
        const progress = Math.min(((campaign.currentFunding || 0) / goal) * 100, 100);

        return (
          <TouchableOpacity
            key={campaign.id}
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => {
              // 🟢 مستقیم به بخش مدیریت کمپین هدایت می‌شود و نه صفحه عمومی
              router.push({
                pathname: `/(screens)/campaigns/${campaign.id}`,
                params: { tab: isDraft ? 'edit' : 'manage' },
              } as any);
            }}
          >
            <View style={styles.row}>
              <Image
                source={{ uri: getMediaUrl(campaign.posterUrl) }}
                style={styles.poster}
                contentFit="cover"
              />

              <View style={styles.details}>
                <View style={styles.titleRow}>
                  <Text style={styles.titleText} numberOfLines={1}>
                    {campaign.titleFa}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>

                <Text style={styles.dateText}>{campaign.createdAt}</Text>

                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>
                  <View style={styles.progressMeta}>
                    <Text style={styles.percentText}>{toFarsiDigits(progress.toFixed(0))}٪</Text>
                    <Text style={styles.amountText}>
                      {toFarsiDigits((campaign.currentFunding || 0).toLocaleString('fa-IR'))} / {toFarsiDigits((campaign.fundingGoal || 0).toLocaleString('fa-IR'))} ت
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.footerActionText}>
                {isDraft ? 'تکمیل مشخصات و ارسال به ادمین' : 'مدیریت، دعوتنامه‌ها و فازها'}
              </Text>
              <ChevronLeft size={14} color="#14b8a6" />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  centerBox: { paddingVertical: 40, alignItems: 'center', gap: 8 },
  loadingText: { fontFamily: 'Ravi-Regular', fontSize: 11, color: '#94a3b8' },
  emptyBox: { paddingVertical: 40, alignItems: 'center', gap: 6 },
  emptyTitle: { fontFamily: 'Ravi-Bold', fontSize: 13, color: '#94a3b8' },
  emptyDesc: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#64748b', textAlign: 'center', paddingHorizontal: 20 },
  card: {
    backgroundColor: '#0d1520',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    gap: 8,
  },
  row: { flexDirection: 'row-reverse', gap: 12 },
  poster: { width: 55, height: 80, borderRadius: 12, backgroundColor: '#030712' },
  details: { flex: 1, justifyContent: 'space-between', gap: 4 },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  titleText: { fontFamily: 'Ravi-Bold', fontSize: 13, color: '#ffffff', flex: 1, textAlign: 'right' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontFamily: 'Ravi-Bold', fontSize: 9 },
  dateText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 9.5, color: '#64748b', textAlign: 'right' },
  progressContainer: { gap: 3 },
  progressBar: { height: 4, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#14b8a6' },
  progressMeta: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  percentText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 9.5, color: '#2dd4bf' },
  amountText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 9, color: '#94a3b8' },
  footerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 8,
  },
  footerActionText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#14b8a6' },
});