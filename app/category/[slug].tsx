import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ArrowRight } from 'lucide-react-native';
import { api, getMediaUrl, toFarsiDigits } from '../../src/api/axiosClient';

const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;
const GAP = 14;
const CARD_WIDTH = (width - HORIZONTAL_PADDING * 2 - GAP) / 2;
const POSTER_HEIGHT = CARD_WIDTH * 1.48;

const CATEGORY_NAMES: Record<string, string> = {
  newest: 'تازه‌ها',
  trending: 'داغ‌ترین‌ها',
  'short-film': 'فیلم کوتاه داستانی',
  animation: 'انیمیشن',
  documentary: 'مستند',
  experimental: 'تجربی',
};

interface MovieItem {
  id: string;
  titleFa: string;
  titleEn?: string;
  mainPosterUrl: string;
  durationMinutes?: number;
  category?: string;
}

export default function CategoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const categoryTitle = CATEGORY_NAMES[slug as string] || 'لیست فیلم‌ها';

  const fetchMovies = useCallback(
    async (pageNumber: number, isRefresh = false) => {
      if (loading || (!hasMore && pageNumber !== 1 && !isRefresh)) return;
      setLoading(true);

      try {
        const res = await api.get(`/movies/category/${slug}`, {
          params: { page: pageNumber, pageSize: 10 },
        });

        const newItems: MovieItem[] = res.data.items || [];

        if (newItems.length < 10) {
          setHasMore(false);
        }

        setMovies((prev) => (pageNumber === 1 ? newItems : [...prev, ...newItems]));
      } catch (error) {
        console.error('Error fetching category movies:', error);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [slug, hasMore, loading]
  );

  useEffect(() => {
    setMovies([]);
    setPage(1);
    setHasMore(true);
    fetchMovies(1);
  }, [slug]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setPage(1);
    setHasMore(true);
    fetchMovies(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMovies(nextPage);
    }
  };

  const renderMovieCard = ({ item }: { item: MovieItem }) => (
    <TouchableOpacity
      style={styles.cardContainer}
      activeOpacity={0.85}
      onPress={() => router.push(`/movie/${item.id}` as any)}
    >
      <View style={styles.posterWrapper}>
        <Image
          source={{ uri: getMediaUrl(item.mainPosterUrl) }}
          style={styles.posterImage}
          contentFit="cover"
          transition={150}
        />
      </View>
      <View style={styles.cardMetaContainer}>
        <Text numberOfLines={1} style={styles.movieTitleFa}>
          {item.titleFa}
        </Text>
        {item.titleEn ? (
          <Text numberOfLines={1} style={styles.movieTitleEn}>
            {item.titleEn}
          </Text>
        ) : item.durationMinutes ? (
          <Text numberOfLines={1} style={styles.movieTitleEn}>
            {toFarsiDigits(item.durationMinutes)} دقیقه
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (loading && page > 1) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#14b8a6" />
        </View>
      );
    }
    if (!hasMore && movies.length > 0) {
      return (
        <View style={styles.endList}>
          <Text style={styles.endListText}>پایان لیست فیلم‌ها</Text>
        </View>
      );
    }
    return <View style={{ height: 30 }} />;
  };

  return (
    <View style={styles.root}>
      {/* ۱. قفل سخت‌افزاری پس‌زمینه در سطح React Navigation */}
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#030712' },
          statusBarColor: '#030712',
          navigationBarColor: '#030712',
        }}
      />
      <StatusBar barStyle="light-content" backgroundColor="#030712" />

      {/* ۲. هدر بالایی با رعایت Safe Area */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <ArrowRight size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{categoryTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ۳. لیست دو ستونه با اسکرول بی‌نهایت */}
      {loading && page === 1 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
        </View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item, index) => item.id || index.toString()}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          style={styles.flatList}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={renderMovieCard}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#14b8a6"
              colors={['#14b8a6']}
              progressBackgroundColor="#0f172a"
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>اثری در این دسته‌بندی یافت نشد.</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#030712',
  },
  flatList: {
    flex: 1,
    backgroundColor: '#030712',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#030712',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
    paddingBottom: 60,
    backgroundColor: '#030712',
  },
  columnWrapper: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  cardContainer: {
    width: CARD_WIDTH,
  },
  posterWrapper: {
    width: CARD_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  posterImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0f172a',
  },
  cardMetaContainer: {
    marginTop: 8,
    gap: 3,
  },
  movieTitleFa: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  movieTitleEn: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'right',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#030712',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: '#030712',
  },
  endList: {
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: '#030712',
  },
  endListText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#030712',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
  },
});