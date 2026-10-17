import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  ViewToken,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
  DeviceEventEmitter,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Search, X } from 'lucide-react-native';
import { api, getMediaUrl, toFarsiDigits } from '../../api/axiosClient';

const CATEGORIES = [
  { title: 'تازه‌ها', slug: 'newest' },
  { title: 'داغ‌ترین‌ها', slug: 'trending' },
  { title: 'فیلم کوتاه داستانی', slug: 'short-film' },
  { title: 'انیمیشن', slug: 'animation' },
  { title: 'مستند', slug: 'documentary' },
  { title: 'تجربی', slug: 'experimental' },
];

export default function FilmsTabContent({ isTabActive }: { isTabActive?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const bannerHeight = windowHeight * 0.8;
  const safeBottom = insets.bottom > 0 ? insets.bottom : 4;
  const bottomBarHeight = 50 + safeBottom;
  const cardWidth = (windowWidth - 32 - 12) / 2;

  const [heroMovies, setHeroMovies] = useState<any[]>([]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [showFloatingBtn, setShowFloatingBtn] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const bannerListRef = useRef<FlatList>(null);
  const searchInputRef = useRef<TextInput>(null);

  const fetchHeroBanners = async () => {
    try {
      const res = await api.get('/movies/banners');
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.items || []);
      setHeroMovies(list);
    } catch (err) {
      console.error('Error fetching hero banners:', err);
    }
  };

  useEffect(() => {
    if (isTabActive) {
      fetchHeroBanners();
    }
  }, [isTabActive]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchHeroBanners();
    setRefreshKey((prev) => prev + 1);
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (heroMovies.length <= 1) return;

    const interval = setInterval(() => {
      setActiveBannerIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % heroMovies.length;
        bannerListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, 6000);

    return () => clearInterval(interval);
  }, [heroMovies.length]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems && viewableItems.length > 0) {
      const currentIndex = viewableItems[0].index;
      if (currentIndex !== null && currentIndex !== undefined) {
        setActiveBannerIndex(currentIndex);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  useEffect(() => {
    if (isSearchOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const threshold = heroMovies.length > 0 ? bannerHeight * 0.7 : 180;
    setShowFloatingBtn(scrollY > threshold);
  };

  const executeSearch = useCallback(async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await api.get('/search', {
        params: { query: q, itemType: 'Movie', limit: 24 },
      });
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (raw?.items || raw?.data || []);
      setSearchResults(list);
    } catch (err) {
      console.error('خطا در جستجو:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) return;
    executeSearch(searchQuery);
    setIsSearchOpen(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    setIsSearchOpen(false);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomBarHeight + 30 },
        ]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#14b8a6"
            colors={['#14b8a6']}
            progressBackgroundColor="#0f172a"
          />
        }
      >
        {/* ۱. اسلایدر هیرو بنر ۸۰ درصدی با قفل لمسی ایزوله */}
        {!hasSearched && heroMovies.length > 0 && (
          <View style={[styles.sliderWrapper, { width: windowWidth, height: bannerHeight }]}>
            <TouchableOpacity
              style={[styles.topSearchBtn, { top: insets.top + 10 }]}
              activeOpacity={0.8}
              onPress={() => setIsSearchOpen(true)}
            >
              <Search size={18} color="#ffffff" />
            </TouchableOpacity>

            <FlatList
              ref={bannerListRef}
              data={heroMovies}
              horizontal
              inverted
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled={true}
              overScrollMode="never"
              directionalLockEnabled={true}
              scrollEventThrottle={16}
              /* 🟢 مسدودسازی فوری جابجایی تب هنگام لمس یا اسکرول بنر */
              onTouchStart={(e) => {
                e.stopPropagation();
                DeviceEventEmitter.emit('SET_PAGER_SWIPE', false);
              }}
              onTouchEnd={() => {
                DeviceEventEmitter.emit('SET_PAGER_SWIPE', true);
              }}
              onScrollBeginDrag={() => {
                DeviceEventEmitter.emit('SET_PAGER_SWIPE', false);
              }}
              onScrollEndDrag={() => {
                DeviceEventEmitter.emit('SET_PAGER_SWIPE', true);
              }}
              onMomentumScrollEnd={() => {
                DeviceEventEmitter.emit('SET_PAGER_SWIPE', true);
              }}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              getItemLayout={(_, index) => ({
                length: windowWidth,
                offset: windowWidth * index,
                index,
              })}
              keyExtractor={(item, idx) => item.id || idx.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.95}
                  onPress={() => router.push(`/movie/${item.id}` as any)}
                  style={[styles.bannerItem, { width: windowWidth, height: bannerHeight }]}
                >
                  <Image
                    source={{ uri: getMediaUrl(item.mainPosterUrl) }}
                    style={styles.bannerImage}
                    contentFit="cover"
                    priority="high"
                  />

                  <LinearGradient
                    colors={[
                      'transparent',
                      'transparent',
                      'rgba(3, 7, 18, 0.25)',
                      'rgba(3, 7, 18, 0.75)',
                      '#030712',
                    ]}
                    locations={[0, 0.68, 0.84, 0.94, 1]}
                    style={styles.bannerGradient}
                  />

                  <View style={styles.titleContainer}>
                    <Text numberOfLines={1} style={styles.bannerTitleText}>
                      {item.titleFa}
                    </Text>
                    {item.synopsis ? (
                      <Text numberOfLines={2} style={styles.bannerSubText}>
                        {item.synopsis}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              )}
            />

            {heroMovies.length > 1 && (
              <View style={styles.dotsContainer}>
                {heroMovies.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      activeBannerIndex === index ? styles.activeDot : styles.inactiveDot,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* ۲. بخش نتایج جستجو */}
        {hasSearched && (
          <View style={[styles.searchResultsContainer, { paddingTop: insets.top + 14 }]}>
            <View style={styles.searchHeaderBar}>
              <Text style={styles.searchQueryNotice} numberOfLines={1}>
                نتایج جستجو برای: «<Text style={styles.searchQueryWord}>{searchQuery}</Text>»
              </Text>
              <TouchableOpacity
                style={styles.clearSearchBtn}
                activeOpacity={0.8}
                onPress={handleClearSearch}
              >
                <Text style={styles.clearSearchBtnText}>پاکسازی و بازگشت</Text>
              </TouchableOpacity>
            </View>

            {isSearching ? (
              <View style={styles.searchLoadingBox}>
                <ActivityIndicator size="large" color="#14b8a6" />
                <Text style={styles.searchLoadingText}>در حال جستجو در آثار...</Text>
              </View>
            ) : searchResults.length === 0 ? (
              <View style={styles.searchEmptyBox}>
                <Text style={styles.searchEmptyText}>فیلمی با این مشخصات یافت نشد.</Text>
              </View>
            ) : (
              <View style={styles.searchGrid}>
                {searchResults.map((movie) => (
                  <TouchableOpacity
                    key={movie.id}
                    style={[styles.searchCard, { width: cardWidth }]}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/movie/${movie.id}` as any)}
                  >
                    <View style={styles.searchPosterWrapper}>
                      <Image
                        source={{ uri: getMediaUrl(movie.mainPosterUrl || movie.posterUrl) }}
                        style={styles.searchPosterImg}
                        contentFit="cover"
                        transition={150}
                      />
                      {movie.category && (
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{movie.category}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.searchCardMeta}>
                      <Text numberOfLines={1} style={styles.searchMovieTitleFa}>
                        {movie.titleFa}
                      </Text>
                      <Text numberOfLines={1} style={styles.searchMovieTitleEn}>
                        {movie.titleEn || movie.genre || ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ۳. ردیف‌های دسته‌بندی */}
        {!hasSearched &&
          CATEGORIES.map((cat, index) => (
            <CategoryRow
              key={`${cat.slug}-${index}`}
              title={cat.title}
              slug={cat.slug}
              refreshKey={refreshKey}
            />
          ))}
      </ScrollView>

      {/* ۴. دکمه شناور جستجو */}
      {showFloatingBtn && !isSearchOpen && (
        <TouchableOpacity
          style={[styles.floatingSearchBtn, { bottom: bottomBarHeight + 14 }]}
          activeOpacity={0.85}
          onPress={() => setIsSearchOpen(true)}
        >
          <Search size={22} color="#030712" />
        </TouchableOpacity>
      )}

      {/* ۵. مدال جستجو */}
      <Modal
        visible={isSearchOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSearchOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.searchModalBackdrop}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsSearchOpen(false)}
          />

          <View style={[styles.searchBarCard, { marginTop: insets.top + 14 }]}>
            <View style={styles.inputSearchBox}>
              <Search size={18} color="#14b8a6" />
              <TextInput
                ref={searchInputRef}
                style={styles.searchTextInput}
                placeholder="جستجو در نام فیلم، عوامل، ژانر..."
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                onSubmitEditing={handleSearchSubmit}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                  <X size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.searchActionBtn,
                !searchQuery.trim() && styles.searchActionBtnDisabled,
              ]}
              activeOpacity={0.8}
              disabled={!searchQuery.trim()}
              onPress={handleSearchSubmit}
            >
              <Text style={styles.searchActionBtnText}>جستجو</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeSearchBtn}
              activeOpacity={0.7}
              onPress={() => setIsSearchOpen(false)}
            >
              <X size={18} color="#cbd5e1" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function CategoryRow({
  title,
  slug,
  refreshKey,
}: {
  title: string;
  slug: string;
  refreshKey: number;
}) {
  const router = useRouter();
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api
      .get(`/movies/category/${slug}?page=1&pageSize=10`)
      .then((res) => {
        if (isMounted) {
          setMovies(res.data.items || res.data || []);
        }
      })
      .catch(() => {
        if (isMounted) setMovies([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug, refreshKey]);

  if (!loading && movies.length === 0) return null;

  const renderMovieCard = ({ item: movie }: { item: any }) => (
    <TouchableOpacity
      style={styles.movieCard}
      activeOpacity={0.85}
      onPress={() => router.push(`/movie/${movie.id}` as any)}
    >
      <Image
        source={{ uri: getMediaUrl(movie.mainPosterUrl) }}
        style={styles.moviePoster}
        contentFit="cover"
        transition={150}
      />
      <Text numberOfLines={1} style={styles.movieTitle}>
        {movie.titleFa}
      </Text>
      {movie.durationMinutes ? (
        <Text style={styles.movieMeta}>{toFarsiDigits(movie.durationMinutes)} دقیقه</Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.categorySection}>
      <TouchableOpacity
        style={styles.sectionHeader}
        activeOpacity={0.7}
        onPress={() => router.push(`/category/${slug}` as any)}
      >
        <Text style={[styles.sectionTitle, { flex: 1 }]}>{title}</Text>
        <View style={styles.moreBtn}>
          <ChevronLeft size={18} color="#94a3b8" />
        </View>
      </TouchableOpacity>

      {loading && movies.length === 0 ? (
        <View style={styles.rowLoadingContainer}>
          <ActivityIndicator size="small" color="#14b8a6" />
        </View>
      ) : (
        <FlatList
          horizontal
          inverted
          data={movies.slice(0, 10)}
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
          overScrollMode="never"
          directionalLockEnabled={true}
          scrollEventThrottle={16}
          /* 🟢 مسدودسازی تغییر تب حین سوایپ روی ردیف فیلم‌های هر دسته‌بندی */
          onTouchStart={(e) => {
            e.stopPropagation();
            DeviceEventEmitter.emit('SET_PAGER_SWIPE', false);
          }}
          onTouchEnd={() => {
            DeviceEventEmitter.emit('SET_PAGER_SWIPE', true);
          }}
          onScrollBeginDrag={() => {
            DeviceEventEmitter.emit('SET_PAGER_SWIPE', false);
          }}
          onScrollEndDrag={() => {
            DeviceEventEmitter.emit('SET_PAGER_SWIPE', true);
          }}
          onMomentumScrollEnd={() => {
            DeviceEventEmitter.emit('SET_PAGER_SWIPE', true);
          }}
          contentContainerStyle={styles.horizontalList}
          keyExtractor={(item, idx) => item.id || `${slug}-${idx}`}
          renderItem={renderMovieCard}
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
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sliderWrapper: {
    position: 'relative',
    backgroundColor: '#030712',
  },
  topSearchBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 40,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerItem: {
    position: 'relative',
    justifyContent: 'flex-end',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  bannerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    alignItems: 'center',
    gap: 4,
  },
  bannerTitleText: {
    color: '#ffffff',
    fontSize: 22,
    fontFamily: 'Ravi-Black',
    textAlign: 'center',
    includeFontPadding: false,
    paddingHorizontal: 8,
    lineHeight: 32,
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  bannerSubText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontFamily: 'Ravi-Regular',
    marginTop: 2,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 18,
    includeFontPadding: false,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 3.5,
    borderRadius: 2,
  },
  activeDot: {
    width: 14,
    backgroundColor: '#ffffff',
  },
  inactiveDot: {
    width: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  categorySection: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Ravi-Bold',
    textAlign: 'right',
    includeFontPadding: false,
    paddingHorizontal: 4,
    lineHeight: 24,
  },
  moreBtn: {
    padding: 4,
  },
  horizontalList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  movieCard: {
    width: 120,
    gap: 6,
  },
  moviePoster: {
    width: 120,
    height: 170,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  movieTitle: {
    color: '#f1f5f9',
    fontSize: 12,
    fontFamily: 'Ravi-Bold',
    textAlign: 'right',
    includeFontPadding: false,
    paddingHorizontal: 3,
    lineHeight: 18,
  },
  movieMeta: {
    color: '#64748b',
    fontSize: 10,
    fontFamily: 'Ravi-Regular',
    textAlign: 'right',
    includeFontPadding: false,
    paddingHorizontal: 2,
    lineHeight: 16,
  },
  rowLoadingContainer: {
    height: 170,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingSearchBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 60,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  searchModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  searchBarCard: {
    width: '100%',
    backgroundColor: '#080d14',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.4)',
    borderRadius: 20,
    padding: 8,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  inputSearchBox: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    height: 44,
    gap: 8,
  },
  searchTextInput: {
    flex: 1,
    color: '#ffffff',
    fontFamily: 'Ravi-Regular',
    fontSize: 12,
    textAlign: 'right',
    height: '100%',
    includeFontPadding: false,
  },
  searchActionBtn: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchActionBtnDisabled: {
    opacity: 0.5,
  },
  searchActionBtnText: {
    color: '#030712',
    fontFamily: 'Ravi-Bold',
    fontSize: 12,
    includeFontPadding: false,
  },
  closeSearchBtn: {
    width: 38,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  searchResultsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  searchHeaderBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  searchQueryNotice: {
    color: '#5eead4',
    fontFamily: 'Ravi-Regular',
    fontSize: 11,
    flex: 1,
    textAlign: 'right',
    includeFontPadding: false,
    lineHeight: 18,
  },
  searchQueryWord: {
    color: '#ffffff',
    fontFamily: 'Ravi-Bold',
    includeFontPadding: false,
  },
  clearSearchBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginLeft: 6,
  },
  clearSearchBtnText: {
    color: '#e2e8f0',
    fontFamily: 'Ravi-Bold',
    fontSize: 10,
    includeFontPadding: false,
  },
  searchLoadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 8,
  },
  searchLoadingText: {
    color: '#94a3b8',
    fontFamily: 'Ravi-Regular',
    fontSize: 11.5,
    includeFontPadding: false,
  },
  searchEmptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchEmptyText: {
    color: '#64748b',
    fontFamily: 'Ravi-Bold',
    fontSize: 12,
    includeFontPadding: false,
  },
  searchGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 12,
  },
  searchCard: {
    backgroundColor: '#0d1520',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 8,
    gap: 6,
  },
  searchPosterWrapper: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#030712',
    position: 'relative',
  },
  searchPosterImg: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryBadgeText: {
    color: '#2dd4bf',
    fontFamily: 'Ravi-Bold',
    fontSize: 8.5,
    includeFontPadding: false,
    paddingHorizontal: 2,
  },
  searchCardMeta: {
    gap: 2,
  },
  searchMovieTitleFa: {
    color: '#ffffff',
    fontFamily: 'Ravi-Bold',
    fontSize: 11.5,
    textAlign: 'right',
    includeFontPadding: false,
    paddingHorizontal: 3,
    lineHeight: 18,
  },
  searchMovieTitleEn: {
    color: '#64748b',
    fontFamily: 'monospace',
    fontSize: 9.5,
    textAlign: 'left',
    includeFontPadding: false,
  },
});