import { useRouter } from 'expo-router';
import {
    BarChart2,
    ChevronLeft,
    Clapperboard,
    PlusCircle,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../src/api/axiosClient';
import AddReelForm from '../../src/components/reels/AddReelForm';
import MyReelsList from '../../src/components/reels/MyReelsList';
import ReelsAnalyticsOverview from '../../src/components/reels/ReelsAnalyticsOverview';

export default function ProfileReelsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'analytics' | 'add'>('analytics');
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserReels = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/reels/my-reels');
      setReels(response.data || []);
    } catch {
      setReels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserReels();
  }, [fetchUserReels]);

  const handleTabChange = (tab: 'analytics' | 'add') => {
    setActiveTab(tab);
    if (tab === 'analytics') {
      fetchUserReels();
    }
  };

  const analyticsData = {
    totalViews: reels.reduce((sum, item) => sum + (item.viewsCount || 0), 0),
    totalLikes: reels.reduce((sum, item) => sum + (item.likesCount || 0), 0),
    publishedCount: reels.filter((r) => r.status === 3 || r.status === 'Approved').length,
    pendingCount: reels.filter((r) => r.status === 1 || r.status === 'PendingAdmin').length,
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* هدر صفحه */}
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <View style={styles.headerIconBox}>
            <Clapperboard size={20} color="#ec4899" />
          </View>
          <View>
            <Text style={styles.headerTitle}>مدیریت و آنالیز ریلز</Text>
            <Text style={styles.headerSubtitle}>ارسال ریلز جدید متصل به آثار و بررسی آمار</Text>
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* کارت‌های خلاصه آمار */}
        <ReelsAnalyticsOverview data={analyticsData} />

        {/* سوییچر تب‌ها */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'analytics' && styles.activeTabBtn]}
            onPress={() => handleTabChange('analytics')}
          >
            <BarChart2 size={16} color={activeTab === 'analytics' ? '#030712' : '#94a3b8'} />
            <Text style={[styles.tabBtnText, activeTab === 'analytics' && styles.activeTabText]}>
              آنالیز و لیست ریلز
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'add' && styles.activeTabBtn]}
            onPress={() => handleTabChange('add')}
          >
            <PlusCircle size={16} color={activeTab === 'add' ? '#030712' : '#94a3b8'} />
            <Text style={[styles.tabBtnText, activeTab === 'add' && styles.activeTabText]}>
              ثبت ریلز جدید
            </Text>
          </TouchableOpacity>
        </View>

        {/* محتوای فعال */}
        {activeTab === 'analytics' ? (
          loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#ec4899" />
              <Text style={styles.loadingText}>در حال دریافت لیست ریلزی شما...</Text>
            </View>
          ) : (
            <MyReelsList reels={reels} onRefresh={fetchUserReels} />
          )
        ) : (
          <AddReelForm onSuccess={() => handleTabChange('analytics')} />
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
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11,
    color: '#94a3b8',
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
    backgroundColor: 'rgba(236, 72, 153, 0.12)',
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