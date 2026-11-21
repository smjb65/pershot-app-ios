import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  ToastAndroid,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Film,
  Search,
  Star,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  Sparkles,
} from 'lucide-react-native';
import { api, getMediaUrl } from '../../../src/api/axiosClient';

interface MovieItem {
  id: string;
  titleFa: string;
  titleEn?: string;
  mainPosterUrl: string;
  category?: string;
  releaseYear?: number;
  durationMinutes?: number;
  createdAt: string;
  isMainBanner: boolean;
}

export default function ManageMoviesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const pageSize = 10;

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  const fetchMovies = useCallback(async (pageNum: number, searchQuery: string) => {
    try {
      setLoading(true);
      const res = await api.get('/movies/manage-list', {
        params: { search: searchQuery, page: pageNum, pageSize },
      });
      setMovies(res.data?.items || res.data || []);
      setTotalCount(res.data?.totalCount || 0);
    } catch {
      showToast('خطا در دریافت لیست فیلم‌ها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMovies(page, search);
    }, 350);
    return () => clearTimeout(timer);
  }, [page, search, fetchMovies]);

  // تغییر وضعیت فیلم بنر اصلی
  const handleToggleBanner = async (movieId: string) => {
    try {
      setActionLoadingId(movieId);
      const res = await api.post(`/movies/${movieId}/toggle-banner`);
      if (res.data?.success || res.status === 200) {
        setMovies((prev) =>
          prev.map((m) =>
            m.id === movieId ? { ...m, isMainBanner: res.data?.isMainBanner ?? !m.isMainBanner } : m
          )
        );
        showToast('وضعیت بنر اصلی فیلم تغییر یافت');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در تغییر وضعیت بنر اصلی');
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
            <Film size={20} color="#f59e0b" />
          </View>
          <View>
            <Text style={styles.headerTitle}>مدیریت فیلم‌ها و بنر اصلی</Text>
            <Text style={styles.headerSubtitle}>تعیین یا عزل فیلم‌ها از بنر اصلی پلتفرم</Text>
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

      {/* فیلد جستجو */}
      <View style={styles.searchBox}>
        <Search size={16} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="جستجوی نام فیلم (فارسی یا انگلیسی)..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={(val) => {
            setSearch(val);
            setPage(1);
          }}
        />
      </View>

      {/* لیست و کارت‌های فیلم‌ها */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      ) : movies.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>هیچ فیلمی یافت نشد.</Text>
        </View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.topRow}>
                <Image
                  source={{ uri: getMediaUrl(item.mainPosterUrl) }}
                  style={styles.poster}
                  contentFit="cover"
                />

                <View style={styles.details}>
                  <View style={styles.titleContainer}>
                    <Text style={styles.movieTitle} numberOfLines={1}>
                      {item.titleFa}
                    </Text>
                    {item.titleEn ? (
                      <Text style={styles.movieTitleEn} numberOfLines={1}>
                        {item.titleEn}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{item.category || 'ثبت نشده'}</Text>
                    </View>
                    <View style={styles.dateBadge}>
                      <Calendar size={11} color="#64748b" />
                      <Text style={styles.dateText}>{item.createdAt}</Text>
                    </View>
                  </View>

                  {/* وضعیت فعلی بنر */}
                  <View style={styles.statusRow}>
                    {item.isMainBanner ? (
                      <View style={styles.bannerActiveBadge}>
                        <Sparkles size={11} color="#f59e0b" />
                        <Text style={styles.bannerActiveText}>بنر اصلی پلتفرم</Text>
                      </View>
                    ) : (
                      <View style={styles.bannerNormalBadge}>
                        <Text style={styles.bannerNormalText}>عادی</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* اکشن‌های مدیریتی */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.viewBtn}
                  activeOpacity={0.75}
                  onPress={() => router.push(`/movie/${item.id}` as any)}
                >
                  <Eye size={15} color="#cbd5e1" />
                  <Text style={styles.viewBtnText}>مشاهده</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleBannerBtn,
                    item.isMainBanner ? styles.removeBannerBtn : styles.setBannerBtn,
                  ]}
                  activeOpacity={0.8}
                  disabled={actionLoadingId === item.id}
                  onPress={() => handleToggleBanner(item.id)}
                >
                  {actionLoadingId === item.id ? (
                    <ActivityIndicator
                      size="small"
                      color={item.isMainBanner ? '#f43f5e' : '#030712'}
                    />
                  ) : (
                    <>
                      <Star
                        size={14}
                        color={item.isMainBanner ? '#f43f5e' : '#030712'}
                        fill={item.isMainBanner ? 'transparent' : '#030712'}
                      />
                      <Text
                        style={[
                          styles.toggleBannerText,
                          item.isMainBanner
                            ? styles.removeBannerText
                            : styles.setBannerText,
                        ]}
                      >
                        {item.isMainBanner ? 'عزل از بنر' : 'تبدیل به بنر'}
                      </Text>
                    </>
                  )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 12,
    color: '#64748b',
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
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
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
  searchBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Ravi-Regular',
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'right',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: '#0d1520',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  poster: {
    width: 60,
    height: 85,
    borderRadius: 14,
    backgroundColor: '#030712',
  },
  details: {
    flex: 1,
    justifyContent: 'space-between',
  },
  titleContainer: {
    gap: 2,
  },
  movieTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 13,
    color: '#ffffff',
    textAlign: 'right',
  },
  movieTitleEn: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 9.5,
    color: '#64748b',
    textAlign: 'right',
  },
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 9.5,
    color: '#94a3b8',
  },
  dateBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 9.5,
    color: '#64748b',
  },
  statusRow: {
    flexDirection: 'row-reverse',
  },
  bannerActiveBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bannerActiveText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 9.5,
    color: '#f59e0b',
  },
  bannerNormalBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bannerNormalText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 9.5,
    color: '#64748b',
  },
  actionRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
  },
  viewBtn: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  viewBtnText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11,
    color: '#cbd5e1',
  },
  toggleBannerBtn: {
    flex: 2,
    height: 38,
    borderRadius: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  setBannerBtn: {
    backgroundColor: '#f59e0b',
  },
  removeBannerBtn: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  toggleBannerText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11,
  },
  setBannerText: {
    color: '#030712',
  },
  removeBannerText: {
    color: '#f43f5e',
  },
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
  disabledPageBtn: {
    opacity: 0.3,
  },
  pageBtnText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 10.5,
    color: '#ffffff',
  },
  disabledPageText: {
    color: '#475569',
  },
  pageInfoText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: '#94a3b8',
  },
});