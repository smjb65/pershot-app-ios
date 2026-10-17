import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Rocket,
  PlusCircle,
  BarChart2,
  ChevronLeft,
} from 'lucide-react-native';
import { api } from '../../../src/api/axiosClient';
import CampaignAnalyticsOverview from '../../../src/components/campaigns/CampaignAnalyticsOverview';
import CampaignListAnalytics, { CampaignItem } from '../../../src/components/campaigns/CampaignListAnalytics';
import AddCampaignStepperForm from '../../../src/components/campaigns/AddCampaignStepperForm';

export default function CampaignsManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'analytics' | 'add'>('analytics');
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/projects/my-campaigns');
      const rawList = Array.isArray(res.data)
        ? res.data
        : (res.data?.items || res.data?.data || []);

      // استانداردسازی فیلد پوستر برای هماهنگی با کامپوننت
      const formattedList: CampaignItem[] = rawList.map((item: any) => ({
        id: item.id,
        titleFa: item.titleFa || item.title || '',
        posterUrl: item.posterUrl || item.mainPosterUrl || '',
        currentFunding: Number(item.currentFunding || 0),
        fundingGoal: Number(item.fundingGoal || 1),
        status: item.status?.toString() || 'PendingAdmin',
        createdAt: item.createdAt || '',
      }));

      setCampaigns(formattedList);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserCampaigns();
  }, [fetchUserCampaigns]);

  // محاسبه داده‌های آماری جهت ارسال به CampaignAnalyticsOverview
  const analyticsData = {
    totalFunding: campaigns.reduce((sum, item) => sum + (item.currentFunding || 0), 0),
    fundingGoalTotal: campaigns.reduce((sum, item) => sum + (item.fundingGoal || 0), 0),
    activeCount: campaigns.filter(
      (c) =>
        c.status === 'Approved' ||
        c.status === 'published' ||
        c.status === 'Funded' ||
        c.status === 'funded' ||
        c.status === '3' ||
        c.status === '2'
    ).length,
    pendingCount: campaigns.filter(
      (c) =>
        c.status === 'PendingAdmin' ||
        c.status === 'pending' ||
        c.status === '1'
    ).length,
    rejectedCount: campaigns.filter(
      (c) =>
        c.status === 'PendingSuperAdmin' ||
        c.status === 'rejected' ||
        c.status === 'Rejected' ||
        c.status === '4'
    ).length,
  };

  const handleFormSuccess = () => {
    setActiveTab('analytics');
    fetchUserCampaigns();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* هدر صفحه */}
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <View style={styles.headerIconBox}>
            <Rocket size={20} color="#14b8a6" />
          </View>
          <View>
            <Text style={styles.headerTitle}>مدیریت و آنالیز کمپین‌ها</Text>
            <Text style={styles.headerSubtitle}>تامین مالی جمعی، پیشرفت مالی و ارسال پروژه</Text>
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ۱. کارت‌های تحلیلی خلاصه آمار */}
        <CampaignAnalyticsOverview data={analyticsData} />

        {/* ۲. سوییچر تب‌ها */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'analytics' && styles.activeTabBtn]}
            onPress={() => {
              setActiveTab('analytics');
              fetchUserCampaigns();
            }}
          >
            <BarChart2 size={16} color={activeTab === 'analytics' ? '#030712' : '#94a3b8'} />
            <Text style={[styles.tabBtnText, activeTab === 'analytics' && styles.activeTabText]}>
              کمپین‌های من
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'add' && styles.activeTabBtn]}
            onPress={() => setActiveTab('add')}
          >
            <PlusCircle size={16} color={activeTab === 'add' ? '#030712' : '#94a3b8'} />
            <Text style={[styles.tabBtnText, activeTab === 'add' && styles.activeTabText]}>
              ثبت کمپین جدید
            </Text>
          </TouchableOpacity>
        </View>

        {/* ۳. محتوای فعال تب */}
        {activeTab === 'analytics' ? (
          <CampaignListAnalytics campaigns={campaigns} />
        ) : (
          <AddCampaignStepperForm onSuccess={handleFormSuccess} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
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
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
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
  tabSwitcher: {
    flexDirection: 'row-reverse',
    backgroundColor: '#0d1520',
    borderRadius: 16,
    marginBottom: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  activeTabBtn: {
    backgroundColor: '#14b8a6',
  },
  tabBtnText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11.5,
    color: '#94a3b8',
  },
  activeTabText: {
    color: '#030712',
  },
});