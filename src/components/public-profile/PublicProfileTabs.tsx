import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Clapperboard, Film, Rocket, Video } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api, getMediaUrl, toFarsiDigits } from '../../api/axiosClient';

interface PublicProfileTabsProps {
  userId: string;
}

function ReelProfileVideoFrame({ videoUrl }: { videoUrl: string }) {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.muted = true;
    p.loop = false;
    p.currentTime = 1;
    p.pause();
  });

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      allowsFullscreen={false}
    />
  );
}

export default function PublicProfileTabs({ userId }: PublicProfileTabsProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'films' | 'reels' | 'campaigns'>('films');
  const [movies, setMovies] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    setLoading(true);

    // ۱. واکشی فوری آثاری که کاربر ناشر آن‌ها بوده است
    Promise.allSettled([
      api.get(`/profile/${userId}/movies`),
      api.get(`/profile/${userId}`),
    ]).then(([moviesRes, profileRes]) => {
      if (!isMounted) return;

      if (moviesRes.status === 'fulfilled') {
        const mData = moviesRes.value.data;
        const rawMovies = mData?.movies || mData?.items || mData || [];
        setMovies(rawMovies.map((m: any) => ({ ...m, userRole: 'ناشر' })));
      }

      if (profileRes.status === 'fulfilled') {
        const pData = profileRes.value.data?.data || profileRes.value.data;
        setReels(pData?.reels || pData?.userApprovedReels || []);
        const rawCampaigns = pData?.campaigns || pData?.userApprovedCampaigns || [];
        setCampaigns(rawCampaigns.map((c: any) => ({ ...c, userRole: 'ناشر' })));
      }

      // ۲. دریافت غیرهمگام (AJAX) سایر آثاری که کاربر جزو عوامل بوده است
      api.get(`/search/crew-works/${userId}`)
        .then((res) => {
          if (!isMounted || !res.data?.success) return;
          const crewMovies = res.data.movies || [];
          const crewCampaigns = res.data.campaigns || [];

          if (crewMovies.length > 0) {
            setMovies((prev) => {
              const existingIds = new Set(prev.map((m) => m.movieId || m.id));
              const newItems = crewMovies
                .filter((cm: any) => !existingIds.has(cm.movieId || cm.id))
                .map((cm: any) => ({ ...cm, userRole: cm.role || 'عوامل' }));
              return [...prev, ...newItems];
            });
          }

          if (crewCampaigns.length > 0) {
            setCampaigns((prev) => {
              const existingIds = new Set(prev.map((c) => c.campaignId || c.id));
              const newItems = crewCampaigns
                .filter((cc: any) => !existingIds.has(cc.campaignId || cc.id))
                .map((cc: any) => ({ ...cc, userRole: cc.role || 'عوامل' }));
              return [...prev, ...newItems];
            });
          }
        })
        .catch(() => {});
    }).finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const handleReelPress = (targetId: string) => {
    if (!targetId) return;

    DeviceEventEmitter.emit('SWITCH_TAB', 2);
    DeviceEventEmitter.emit('NAVIGATE_TO_REELS_TAB', { reelId: targetId });

    try {
      if (router.canDismiss()) {
        router.dismissAll();
      }
    } catch {}

    router.navigate('/(tabs)');

    setTimeout(() => {
      DeviceEventEmitter.emit('SWITCH_TAB', 2);
      DeviceEventEmitter.emit('NAVIGATE_TO_REELS_TAB', { reelId: targetId });
    }, 150);
  };

  return (
    <View style={styles.container}>
      {/* هدر تب‌ها */}
      <View style={styles.tabHeader}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'films' && styles.tabButtonActive]}
          onPress={() => setActiveTab('films')}
        >
          <Film size={16} color={activeTab === 'films' ? '#14b8a6' : '#64748b'} />
          <Text
            numberOfLines={1}
            ellipsizeMode="clip"
            style={[styles.tabButtonText, activeTab === 'films' && styles.tabButtonTextActive]}
          >
            فیلم‌ها ({toFarsiDigits(movies.length)})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'reels' && styles.tabButtonActive]}
          onPress={() => setActiveTab('reels')}
        >
          <Clapperboard size={16} color={activeTab === 'reels' ? '#14b8a6' : '#64748b'} />
          <Text
            numberOfLines={1}
            ellipsizeMode="clip"
            style={[styles.tabButtonText, activeTab === 'reels' && styles.tabButtonTextActive]}
          >
            ریلز ({toFarsiDigits(reels.length)})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'campaigns' && styles.tabButtonActive]}
          onPress={() => setActiveTab('campaigns')}
        >
          <Rocket size={16} color={activeTab === 'campaigns' ? '#14b8a6' : '#64748b'} />
          <Text
            numberOfLines={1}
            ellipsizeMode="clip"
            style={[styles.tabButtonText, activeTab === 'campaigns' && styles.tabButtonTextActive]}
          >
            کمپین‌ها ({toFarsiDigits(campaigns.length)})
          </Text>
        </TouchableOpacity>
      </View>

      {/* بدنه محتوا */}
      <View style={styles.tabBody}>
        {loading ? (
          <ActivityIndicator size="small" color="#14b8a6" style={{ marginVertical: 32 }} />
        ) : activeTab === 'films' ? (
          movies.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Film size={36} color="#334155" />
              <Text style={styles.emptyText}>هیچ فیلمی برای این کاربر ثبت نشده است.</Text>
            </View>
          ) : (
            <View style={styles.itemsGrid}>
              {movies.map((movie) => {
                const targetId = movie.movieId || movie.id || movie._id;
                const isPublisher = movie.userRole === 'ناشر';

                return (
                  <TouchableOpacity
                    key={targetId}
                    style={styles.filmCard}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/movie/${targetId}` as any)}
                  >
                    <View style={styles.filmPosterContainer}>
                      <Image
                        source={{ uri: getMediaUrl(movie.mainPosterUrl || movie.posterUrl) }}
                        style={styles.fullMedia}
                        contentFit="cover"
                      />
                      {/* نشان نقش کاربر در گوشه پوستر */}
                      <View style={[styles.roleBadge, isPublisher ? styles.publisherBadge : styles.crewBadge]}>
                        <Text style={[styles.roleBadgeText, isPublisher && styles.publisherBadgeText]}>
                          {movie.userRole || 'عوامل'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.filmDetails}>
                      <Text
                        style={styles.filmTitle}
                        numberOfLines={1}
                        ellipsizeMode="clip"
                      >
                        {movie.titleFa || movie.title}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )
        ) : activeTab === 'reels' ? (
          reels.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Video size={36} color="#334155" />
              <Text style={styles.emptyText}>ریلزی توسط این کاربر ثبت نشده است.</Text>
            </View>
          ) : (
            <View style={styles.itemsGrid}>
              {reels.map((reel) => {
                const targetId = reel.reelId || reel.id || reel._id;
                const posterUri = reel.posterUrl || reel.thumbnailUrl;
                const videoUri = reel.videoUrl ? getMediaUrl(reel.videoUrl) : null;

                return (
                  <View key={targetId} style={styles.reelCard}>
                    <View style={StyleSheet.absoluteFill} pointerEvents="none">
                      {posterUri ? (
                        <Image
                          source={{ uri: getMediaUrl(posterUri) }}
                          style={styles.fullMedia}
                          contentFit="cover"
                        />
                      ) : videoUri ? (
                        <ReelProfileVideoFrame videoUrl={videoUri} />
                      ) : (
                        <View style={styles.placeholderBox} />
                      )}
                    </View>

                    <TouchableOpacity
                      style={StyleSheet.absoluteFill}
                      activeOpacity={0.75}
                      onPress={() => handleReelPress(targetId)}
                    >
                      <View style={styles.reelOverlay} pointerEvents="none">
                        {reel.viewsCount !== undefined && (
                          <Text style={styles.viewsText}>{toFarsiDigits(reel.viewsCount)}</Text>
                        )}
                        {reel.caption ? (
                          <Text
                            style={styles.reelCaption}
                            numberOfLines={1}
                            ellipsizeMode="clip"
                          >
                            {reel.caption}
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )
        ) : campaigns.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Rocket size={36} color="#334155" />
            <Text style={styles.emptyText}>کمپینی توسط این کاربر ایجاد نشده است.</Text>
          </View>
        ) : (
          <View style={styles.campaignsGrid}>
            {campaigns.map((camp) => {
              const targetId = camp.campaignId || camp.id || camp._id;
              const isPublisher = camp.userRole === 'ناشر';

              return (
                <TouchableOpacity
                  key={targetId}
                  style={styles.campaignCard}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/campaigns/${targetId}` as any)}
                >
                  <View style={styles.campaignPosterWrapper}>
                    <Image
                      source={{ uri: getMediaUrl(camp.mainPosterUrl || camp.posterUrl) }}
                      style={styles.campaignPoster}
                      contentFit="cover"
                    />
                    <View style={[styles.roleBadge, isPublisher ? styles.publisherBadge : styles.crewBadge]}>
                      <Text style={[styles.roleBadgeText, isPublisher && styles.publisherBadgeText]}>
                        {camp.userRole || 'عوامل'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.campaignDetails}>
                    <Text
                      style={styles.campaignTitle}
                      numberOfLines={1}
                      ellipsizeMode="clip"
                    >
                      {camp.titleFa || camp.title}
                    </Text>
                    {Number(camp.fundingGoal) > 0 && (
                      <Text style={styles.campaignGoal}>
                        هدف: {toFarsiDigits(Number(camp.fundingGoal).toLocaleString('fa-IR'))} تومان
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d1520',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    gap: 12,
    width: '100%',
  },
  tabHeader: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 4,
    width: '100%',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#14b8a6',
  },
  tabButtonText: {
    color: '#64748b',
    fontSize: 11.5,
    fontFamily: 'Ravi-Bold',
    includeFontPadding: false,
  },
  tabButtonTextActive: {
    color: '#14b8a6',
  },
  tabBody: {
    paddingTop: 4,
    width: '100%',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
    width: '100%',
  },
  emptyText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11.5,
    color: '#64748b',
    textAlign: 'center',
    includeFontPadding: false,
  },
  itemsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  filmCard: {
    width: '48.5%',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  filmPosterContainer: {
    width: '100%',
    aspectRatio: 1 / 1.38,
    backgroundColor: '#080d14',
    position: 'relative',
  },
  fullMedia: {
    width: '100%',
    height: '100%',
  },
  placeholderBox: {
    width: '100%',
    height: '100%',
    backgroundColor: '#080d14',
  },
  roleBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.5)',
    zIndex: 10,
  },
  publisherBadge: {
    borderColor: 'rgba(250, 204, 21, 0.6)',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
  },
  roleBadgeText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 9.5,
    color: '#2dd4bf',
    includeFontPadding: false,
  },
  publisherBadgeText: {
    color: '#facc15',
  },
  filmDetails: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    width: '100%',
  },
  filmTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11,
    color: '#ffffff',
    textAlign: 'center',
    width: '100%',
    includeFontPadding: false,
  },
  reelCard: {
    width: '48.5%',
    aspectRatio: 1 / 1.38,
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#080d14',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
  },
  reelOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    justifyContent: 'flex-end',
    padding: 8,
    gap: 4,
  },
  viewsText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 9.5,
    color: '#ffffff',
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    includeFontPadding: false,
  },
  reelCaption: {
    fontFamily: 'Ravi-Regular',
    fontSize: 9,
    color: '#ffffff',
    textAlign: 'right',
    includeFontPadding: false,
  },
  campaignsGrid: {
    gap: 12,
    width: '100%',
  },
  campaignCard: {
    backgroundColor: '#080d14',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
  },
  campaignPosterWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  campaignPoster: {
    width: '100%',
    height: '100%',
    backgroundColor: '#030712',
  },
  campaignDetails: {
    padding: 12,
    gap: 4,
  },
  campaignTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 12.5,
    color: '#ffffff',
    textAlign: 'right',
    includeFontPadding: false,
  },
  campaignGoal: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11,
    color: '#2dd4bf',
    textAlign: 'right',
    includeFontPadding: false,
  },
});