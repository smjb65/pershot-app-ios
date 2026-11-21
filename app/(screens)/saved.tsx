import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
    Bookmark,
    ChevronLeft,
    Clock,
    Eye,
    Film,
    Heart,
    Play,
    PlaySquare,
    ThumbsUp,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator,
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, getMediaUrl } from '../../src/api/axiosClient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 44) / 2;

const toFarsiDigits = (num: number | string | undefined | null): string => {
  if (num === undefined || num === null) return '۰';
  const str = num.toString();
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (d) => farsiDigits[parseInt(d, 10)]);
};

interface MovieCardItem {
  id: string;
  titleFa: string;
  titleEn?: string;
  mainPosterUrl: string;
  durationMinutes: number;
  likePercentage?: number;
  category?: string;
}

interface ReelCardItem {
  id: string;
  videoUrl: string;
  posterUrl?: string;
  caption?: string;
  likesCount?: number;
  viewsCount?: number;
  linkedEntityTitle?: string;
  owner?: {
    id: string;
    username: string;
    avatar?: string;
  };
}

export default function SavedItemsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'movies' | 'reels'>('movies');
  const [savedMovies, setSavedMovies] = useState<MovieCardItem[]>([]);
  const [savedReels, setSavedReels] = useState<ReelCardItem[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [loadingReels, setLoadingReels] = useState(true);

  // ۱. دریافت فیلم‌های ذخیره‌شده
  const fetchSavedMovies = useCallback(async () => {
    try {
      setLoadingMovies(true);
      const profileRes = await api.get('/profile/me');
      const userData = profileRes.data?.data || profileRes.data;
      const bookmarkedIds: string[] =
        userData?.bookmarkedIds || userData?.BookmarkedIds || [];

      if (bookmarkedIds.length > 0) {
        const moviesRes = await api.post('/movies/by-ids', bookmarkedIds);
        setSavedMovies(moviesRes.data || []);
      } else {
        setSavedMovies([]);
      }
    } catch {
      setSavedMovies([]);
    } finally {
      setLoadingMovies(false);
    }
  }, []);

  // ۲. دریافت ریلزی ذخیره‌شده
  const fetchSavedReels = useCallback(async () => {
    try {
      setLoadingReels(true);
      const reelsRes = await api.get('/reels/bookmarked');
      setSavedReels(reelsRes.data || []);
    } catch {
      setSavedReels([]);
    } finally {
      setLoadingReels(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedMovies();
    fetchSavedReels();
  }, [fetchSavedMovies, fetchSavedReels]);

  // انتقال مستقیم به ریلز انتخابی در تب ریلز
  const handleOpenReel = (reelId: string) => {
    router.push({
      pathname: '/(tabs)/reels',
      params: { reelId },
    } as any);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* هدر صفحه */}
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <View style={styles.headerIconBox}>
            <Bookmark size={20} color="#14b8a6" />
          </View>
          <View>
            <Text style={styles.headerTitle}>نشان‌شده‌ها و ذخیره‌ها</Text>
            <Text style={styles.headerSubtitle}>آثار سینمایی و ریلزی برگزیده شما</Text>
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

      {/* سوییچر تب‌ها */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'movies' && styles.activeTabBtn]}
          activeOpacity={0.8}
          onPress={() => setActiveTab('movies')}
        >
          <Film
            size={16}
            color={activeTab === 'movies' ? '#030712' : '#94a3b8'}
          />
          <Text
            style={[
              styles.tabBtnText,
              activeTab === 'movies' ? styles.activeTabText : styles.inactiveTabText,
            ]}
          >
            فیلم‌ها ({toFarsiDigits(savedMovies.length)})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'reels' && styles.activeTabBtn]}
          activeOpacity={0.8}
          onPress={() => setActiveTab('reels')}
        >
          <PlaySquare
            size={16}
            color={activeTab === 'reels' ? '#030712' : '#94a3b8'}
          />
          <Text
            style={[
              styles.tabBtnText,
              activeTab === 'reels' ? styles.activeTabText : styles.inactiveTabText,
            ]}
          >
            ریلز ({toFarsiDigits(savedReels.length)})
          </Text>
        </TouchableOpacity>
      </View>

      {/* لیست محتوای تب فیلم‌ها */}
      {activeTab === 'movies' && (
        <View style={styles.contentContainer}>
          {loadingMovies ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#14b8a6" />
            </View>
          ) : savedMovies.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Film size={44} color="#334155" />
              <Text style={styles.emptyTitle}>هیچ فیلمی ذخیره نشده است</Text>
              <Text style={styles.emptyDesc}>
                فیلم‌های کوتاهی که در صفحه فیلم نشان می‌کنید، در این بخش قرار می‌گیرند.
              </Text>
            </View>
          ) : (
            <FlatList
              data={savedMovies}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.columnWrapper}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const likePercent = item.likePercentage
                  ? Math.round(item.likePercentage)
                  : 0;

                return (
                  <TouchableOpacity
                    style={styles.movieCard}
                    activeOpacity={0.8}
                    onPress={() => router.push(`/movie/${item.id}` as any)}
                  >
                    <View style={styles.moviePosterContainer}>
                      <Image
                        source={{ uri: getMediaUrl(item.mainPosterUrl) }}
                        style={styles.moviePoster}
                        contentFit="cover"
                      />
                      <View style={styles.playIconBadge}>
                        <Play size={14} color="#ffffff" fill="#ffffff" />
                      </View>

                      {likePercent > 0 && (
                        <View style={styles.likeBadge}>
                          <ThumbsUp size={10} color="#10b981" />
                          <Text style={styles.likeText}>{toFarsiDigits(likePercent)}٪</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.movieDetails}>
                      <Text style={styles.movieTitle} numberOfLines={1}>
                        {item.titleFa}
                      </Text>
                      {item.titleEn && (
                        <Text style={styles.movieTitleEn} numberOfLines={1}>
                          {item.titleEn}
                        </Text>
                      )}

                      <View style={styles.movieMetaRow}>
                        <Text style={styles.categoryText} numberOfLines={1}>
                          {item.category || 'فیلم کوتاه'}
                        </Text>
                        {item.durationMinutes > 0 && (
                          <View style={styles.durationBox}>
                            <Clock size={10} color="#64748b" />
                            <Text style={styles.durationText}>
                              {toFarsiDigits(item.durationMinutes)} د
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      )}

      {/* لیست محتوای تب ریلز */}
      {activeTab === 'reels' && (
        <View style={styles.contentContainer}>
          {loadingReels ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#14b8a6" />
            </View>
          ) : savedReels.length === 0 ? (
            <View style={styles.emptyContainer}>
              <PlaySquare size={44} color="#334155" />
              <Text style={styles.emptyTitle}>هیچ ریلزی ذخیره نشده است</Text>
              <Text style={styles.emptyDesc}>
                ریلزیی که با آیکون بوک‌مارک نشان می‌کنید، در این بخش قابل دسترسی هستند.
              </Text>
            </View>
          ) : (
            <FlatList
              data={savedReels}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.columnWrapper}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.reelCard}
                  activeOpacity={0.85}
                  onPress={() => handleOpenReel(item.id)}
                >
                  <Image
                    source={{ uri: getMediaUrl(item.posterUrl || item.videoUrl) }}
                    style={styles.reelPoster}
                    contentFit="cover"
                  />

                  <View style={styles.reelOverlay}>
                    <View style={styles.reelTopRow}>
                      <View style={styles.reelPlayBadge}>
                        <Play size={12} color="#2dd4bf" fill="#2dd4bf" />
                      </View>
                    </View>

                    <View style={styles.reelBottomDetails}>
                      {item.linkedEntityTitle && (
                        <View style={styles.linkedEntityBadge}>
                          <Text style={styles.linkedEntityText} numberOfLines={1}>
                            {item.linkedEntityTitle}
                          </Text>
                        </View>
                      )}

                      {item.caption ? (
                        <Text style={styles.reelCaption} numberOfLines={2}>
                          {item.caption}
                        </Text>
                      ) : null}

                      <View style={styles.reelStatsRow}>
                        <View style={styles.reelStat}>
                          <Eye size={11} color="#2dd4bf" />
                          <Text style={styles.reelStatText}>
                            {toFarsiDigits(item.viewsCount || 0)}
                          </Text>
                        </View>
                        <View style={styles.reelStat}>
                          <Heart size={11} color="#f43f5e" />
                          <Text style={styles.reelStatText}>
                            {toFarsiDigits(item.likesCount || 0)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
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
    backgroundColor: 'rgba(13, 21, 32, 0.6)',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
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
  },
  activeTabText: {
    color: '#030712',
  },
  inactiveTabText: {
    color: '#94a3b8',
  },
  contentContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 6,
  },
  emptyDesc: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  columnWrapper: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  movieCard: {
    width: CARD_WIDTH,
    backgroundColor: '#0d1520',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  moviePosterContainer: {
    width: '100%',
    height: CARD_WIDTH * 1.45,
    backgroundColor: '#030712',
    position: 'relative',
  },
  moviePoster: {
    width: '100%',
    height: '100%',
  },
  playIconBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(20, 184, 166, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  likeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(3, 7, 18, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  likeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 9,
    color: '#10b981',
  },
  movieDetails: {
    padding: 10,
    gap: 3,
  },
  movieTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'right',
  },
  movieTitleEn: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 9.5,
    color: '#64748b',
    textAlign: 'right',
  },
  movieMetaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 4,
  },
  categoryText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 9.5,
    color: '#94a3b8',
    maxWidth: '65%',
  },
  durationBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
  },
  durationText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 9,
    color: '#64748b',
  },
  reelCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.77,
    backgroundColor: '#0d1520',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    position: 'relative',
  },
  reelPoster: {
    width: '100%',
    height: '100%',
  },
  reelOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'space-between',
    padding: 10,
  },
  reelTopRow: {
    alignItems: 'flex-start',
  },
  reelPlayBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  reelBottomDetails: {
    gap: 4,
  },
  linkedEntityBadge: {
    backgroundColor: 'rgba(20, 184, 166, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  linkedEntityText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 8.5,
    color: '#5eead4',
  },
  reelCaption: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10,
    color: '#ffffff',
    textAlign: 'right',
    lineHeight: 14,
  },
  reelStatsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 4,
    marginTop: 2,
  },
  reelStat: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
  },
  reelStatText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 9.5,
    color: '#cbd5e1',
  },
});