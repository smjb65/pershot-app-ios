import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Film,
  PlusCircle,
  BarChart2,
  ChevronLeft,
} from 'lucide-react-native';
import { api } from '../../../src/api/axiosClient';
import MovieAnalyticsOverview from '../../../src/components/movies/MovieAnalyticsOverview';
import MovieListAnalytics, { MovieItem } from '../../../src/components/movies/MovieListAnalytics';
import AddMovieStepperForm from '../../../src/components/movies/AddMovieStepperForm';

export default function MoviesManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ refresh?: string; tab?: string }>();

  const [activeTab, setActiveTab] = useState<'analytics' | 'add'>('analytics');
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserMovies = async (showLoadingIndicator = true) => {
    try {
      if (showLoadingIndicator) setLoading(true);
      const res = await api.get('/movies/my-movies');
      setMovies(res.data || []);
    } catch {
      setMovies([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUserMovies();

      if (params?.tab === 'add') {
        setActiveTab('add');
      } else {
        setActiveTab('analytics');
      }
    }, [params?.refresh, params?.tab])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserMovies(false);
  };

  const analyticsData = {
    totalViews: movies.reduce((sum, item) => sum + (item.views || 0), 0),
    publishedCount: movies.filter((m) => m.status === 'Approved' || m.status === 'published').length,
    pendingCount: movies.filter((m) => m.status === 'PendingAdmin' || m.status === 'pending').length,
    rejectedCount: movies.filter((m) => m.status === 'PendingSuperAdmin' || m.status === 'rejected' || m.status === 'Rejected').length,
    totalEarnings: 0,
  };

  const handleFormSuccess = () => {
    setActiveTab('analytics');
    fetchUserMovies();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* هدر صفحه */}
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <View style={styles.headerIconBox}>
            <Film size={20} color="#14b8a6" />
          </View>
          <View>
            <Text style={styles.headerTitle}>مدیریت و آنالیز فیلم‌ها</Text>
            <Text style={styles.headerSubtitle}>ارسال اثر جدید و بررسی آمار آثار ویدئویی</Text>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#14b8a6"
            colors={['#14b8a6']}
          />
        }
      >
        {/* آمار کلی */}
        <MovieAnalyticsOverview data={analyticsData} />

        {/* سوییچر تب‌ها */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'analytics' && styles.activeTabBtn]}
            onPress={() => {
              setActiveTab('analytics');
              fetchUserMovies(false);
            }}
          >
            <BarChart2 size={16} color={activeTab === 'analytics' ? '#030712' : '#94a3b8'} />
            <Text style={[styles.tabBtnText, activeTab === 'analytics' && styles.activeTabText]}>
              آنالیز آثار
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'add' && styles.activeTabBtn]}
            onPress={() => setActiveTab('add')}
          >
            <PlusCircle size={16} color={activeTab === 'add' ? '#030712' : '#94a3b8'} />
            <Text style={[styles.tabBtnText, activeTab === 'add' && styles.activeTabText]}>
              افزودن فیلم جدید
            </Text>
          </TouchableOpacity>
        </View>

        {/* محتوای تب */}
        {activeTab === 'analytics' ? (
          loading && !refreshing ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#14b8a6" />
              <Text style={styles.loadingText}>در حال دریافت لیست فیلم‌ها...</Text>
            </View>
          ) : (
            <MovieListAnalytics movies={movies} />
          )
        ) : (
          <AddMovieStepperForm onSuccess={handleFormSuccess} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
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
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
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
  activeTabBtn: { backgroundColor: '#14b8a6' },
  tabBtnText: { fontFamily: 'Ravi-Bold', fontSize: 11.5, color: '#94a3b8' },
  activeTabText: { color: '#030712' },
  loadingBox: { paddingVertical: 40, alignItems: 'center', gap: 10 },
  loadingText: { fontFamily: 'Ravi-Regular', fontSize: 11, color: '#94a3b8' },
});