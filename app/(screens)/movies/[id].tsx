import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  ToastAndroid,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Film,
  BarChart2,
  Edit3,
  Trash2,
  ChevronLeft,
} from 'lucide-react-native';
import { api } from '../../../src/api/axiosClient';
import MovieSingleAnalytics from '../../../src/components/movies/MovieSingleAnalytics';
import MovieEditStepperForm from '../../../src/components/movies/MovieEditStepperForm';

export default function MovieDetailScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analytics' | 'edit'>(tab === 'edit' ? 'edit' : 'analytics');

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  const fetchMovieDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/movies/${id}`);
      const data = res.data;
      setMovie(data);

      // 🟢 اگر پارامتر تب edit بود یا وضعیت فیلم درفت بود، مستقیم به ویرایش برود
      if (tab === 'edit' || data.status === 'Draft' || data.status === 0 || data.status === '0') {
        setActiveTab('edit');
      }
    } catch {
      showToast('خطا در دریافت مشخصات فیلم');
    } finally {
      setLoading(false);
    }
  }, [id, tab]);

  useEffect(() => {
    if (id) fetchMovieDetails();
  }, [id, fetchMovieDetails]);

  const handleDeleteMovie = () => {
    Alert.alert(
      'حذف کامل اثر',
      'با حذف اثر، تمامی فایل‌های ویدئویی، تیزر و پوسترهای آن کلاً از سرور پاک خواهند شد. آیا مطمئن هستید؟',
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'بله، حذف کامل',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/movies/${id}`);
              showToast('فیلم با موفقیت حذف شد');
              router.replace('/(screens)/movies');
            } catch (err: any) {
              showToast(err.response?.data?.message || 'خطا در حذف فیلم');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.deleteHeaderBtn}
            activeOpacity={0.75}
            onPress={handleDeleteMovie}
          >
            <Trash2 size={16} color="#f43f5e" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {movie?.titleFa || 'جزئیات فیلم'}
            </Text>
            <Text style={styles.headerSubtitle}>مدیریت، آنالیز و ویرایش اثر</Text>
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

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
        </View>
      ) : !movie ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>فیلم مورد نظر یافت نشد.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'analytics' && styles.activeTabBtn]}
              onPress={() => setActiveTab('analytics')}
            >
              <BarChart2 size={16} color={activeTab === 'analytics' ? '#030712' : '#94a3b8'} />
              <Text style={[styles.tabBtnText, activeTab === 'analytics' && styles.activeTabText]}>
                آنالیز اثر
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'edit' && styles.activeTabBtn]}
              onPress={() => setActiveTab('edit')}
            >
              <Edit3 size={16} color={activeTab === 'edit' ? '#030712' : '#94a3b8'} />
              <Text style={[styles.tabBtnText, activeTab === 'edit' && styles.activeTabText]}>
                ویرایش مشخصات
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'analytics' ? (
            <MovieSingleAnalytics movie={movie} />
          ) : (
            <MovieEditStepperForm
              movie={movie}
              onSuccess={() => {
                fetchMovieDetails();
                setActiveTab('analytics');
              }}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
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
  headerRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, flex: 1 },
  deleteHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: 'Ravi-Bold', fontSize: 13.5, color: '#ffffff', textAlign: 'right' },
  headerSubtitle: { fontFamily: 'Ravi-Regular', fontSize: 9.5, color: '#94a3b8', textAlign: 'right' },
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
});