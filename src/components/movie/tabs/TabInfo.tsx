import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  Calendar,
  Clapperboard,
  Clock,
  Globe,
  Heart,
  Play,
  Tag,
  Video,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  DeviceEventEmitter,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api, getMediaUrl, toFarsiDigits } from '../../../api/axiosClient';

interface TabInfoProps {
  movie: any;
  movieOwner: any;
  crewUsers: any[];
  onOpenImage: (url: string) => void;
  onPlayTrailer: () => void;
  onPlayBehindScene?: () => void;
  onLayoutHeight?: (height: number) => void;
}

function ReelVideoFrame({ videoUrl }: { videoUrl: string }) {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.muted = true;
    p.loop = false;
    p.currentTime = 1;
    p.pause();
  });

  return (
    <VideoView
      player={player}
      style={styles.reelPoster}
      contentFit="cover"
      nativeControls={false}
      allowsFullscreen={false}
    />
  );
}

function ReelThumbnailItem({ item, fallbackPoster }: { item: any; fallbackPoster?: string }) {
  const posterUri = item.posterUrl || item.thumbnailUrl || item.coverUrl;

  if (posterUri) {
    return (
      <Image
        source={{ uri: getMediaUrl(posterUri) }}
        style={styles.reelPoster}
        contentFit="cover"
        transition={150}
      />
    );
  }

  const videoUrl = item.videoUrl ? getMediaUrl(item.videoUrl) : null;
  if (videoUrl) {
    return <ReelVideoFrame videoUrl={videoUrl} />;
  }

  return (
    <Image
      source={{ uri: getMediaUrl(fallbackPoster) }}
      style={styles.reelPoster}
      contentFit="cover"
      transition={150}
    />
  );
}

export default function TabInfo({
  movie,
  movieOwner,
  crewUsers,
  onOpenImage,
  onPlayTrailer,
  onPlayBehindScene,
  onLayoutHeight,
}: TabInfoProps) {
  const router = useRouter();
  const [linkedReels, setLinkedReels] = useState<any[]>([]);

  useEffect(() => {
    if (movie?.id) {
      api
        .get(`/reels/by-entity/Movie/${movie.id}?take=10`)
        .then((res) => setLinkedReels(Array.isArray(res.data) ? res.data : []))
        .catch(() => setLinkedReels([]));
    }
  }, [movie?.id]);

  const handleReelPress = (reelId: string) => {
    if (!reelId) return;

    DeviceEventEmitter.emit('SWITCH_TAB', 2);
    DeviceEventEmitter.emit('NAVIGATE_TO_REELS_TAB', { reelId });

    try {
      if (router.canDismiss()) {
        router.dismissAll();
      }
    } catch {}

    router.navigate('/(tabs)');

    setTimeout(() => {
      DeviceEventEmitter.emit('SWITCH_TAB', 2);
      DeviceEventEmitter.emit('NAVIGATE_TO_REELS_TAB', { reelId });
    }, 150);
  };

  const behindImagesList = movie?.behindSceneImages || movie?.behindImages || [];

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0 && onLayoutHeight) {
          onLayoutHeight(h);
        }
      }}
    >
      {/* ۱. خلاصه داستان */}
      <View style={styles.cardBox}>
        <Text style={styles.sectionTitle}>خلاصه داستان</Text>
        <Text style={styles.synopsisText}>
          {movie?.synopsis || 'خلاصه‌ای برای این اثر ثبت نشده است.'}
        </Text>
      </View>

      {/* ۲. مشخصات فیلم */}
      <View style={styles.specsGrid}>
        <View style={styles.specItem}>
          <View style={styles.specHeader}>
            <Calendar size={14} color="#fbbf24" />
            <Text style={styles.specLabel}>سال ساخت</Text>
          </View>
          <Text style={styles.specValue}>{toFarsiDigits(movie?.releaseYear || '—')}</Text>
        </View>

        <View style={styles.specItem}>
          <View style={styles.specHeader}>
            <Globe size={14} color="#38bdf8" />
            <Text style={styles.specLabel}>کشور</Text>
          </View>
          <Text style={styles.specValue}>
            {Array.isArray(movie?.productionCountries)
              ? movie.productionCountries.join('، ')
              : movie?.productionCountries || 'ایران'}
          </Text>
        </View>

        <View style={styles.specItem}>
          <View style={styles.specHeader}>
            <Clock size={14} color="#f43f5e" />
            <Text style={styles.specLabel}>مدت زمان</Text>
          </View>
          <Text style={styles.specValue}>
            {toFarsiDigits(movie?.durationMinutes || '—')} دقیقه
          </Text>
        </View>

        <View style={styles.specItem}>
          <View style={styles.specHeader}>
            <Tag size={14} color="#2dd4bf" />
            <Text style={styles.specLabel}>ژانر</Text>
          </View>
          <Text style={styles.specValue}>
            {Array.isArray(movie?.genres)
              ? movie.genres.join('، ')
              : movie?.genre || movie?.category || 'کوتاه'}
          </Text>
        </View>
      </View>

      {/* ۳. ریلزی متصل با لایه لمسی شفاف رویین */}
      {linkedReels.length > 0 && (
        <View style={styles.subSection}>
          <View style={styles.sectionTitleRow}>
            <Video size={16} color="#fbbf24" />
            <Text style={styles.sectionTitle}>ریلزی مرتبط با اثر</Text>
          </View>
          <FlatList
            horizontal
            inverted
            data={linkedReels}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            renderItem={({ item }) => (
              <View style={styles.reelCard}>
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  <ReelThumbnailItem item={item} fallbackPoster={movie?.mainPosterUrl} />
                </View>

                <TouchableOpacity
                  style={StyleSheet.absoluteFill}
                  activeOpacity={0.75}
                  onPress={() => handleReelPress(item.id)}
                >
                  <View style={styles.reelOverlay} pointerEvents="none">
                    <View style={styles.reelPlayIcon}>
                      <Play size={10} color="#2dd4bf" fill="#2dd4bf" />
                    </View>
                    <View style={styles.reelStats}>
                      <Text style={styles.reelStatText}>{toFarsiDigits(item.likesCount || 0)}</Text>
                      <Heart size={10} color="#f43f5e" fill="#f43f5e" />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}

      {/* ۴. عوامل و سازندگان فیلم */}
      <View style={styles.subSection}>
        <Text style={styles.sectionTitle}>عوامل و سازندگان فیلم</Text>
        <FlatList
          horizontal
          inverted
          data={crewUsers}
          keyExtractor={(_, i) => i.toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.crewList}
          ListHeaderComponent={
            movieOwner ? (
              <TouchableOpacity
                style={styles.crewItem}
                activeOpacity={0.75}
                onPress={() => router.push(`/user/${movieOwner.id || movie?.ownerId}` as any)}
              >
                <Image
                  source={{ uri: getMediaUrl(movieOwner.avatar) }}
                  style={[styles.crewAvatar, styles.crewOwnerAvatar]}
                  contentFit="cover"
                />
                <Text numberOfLines={2} style={styles.crewName}>
                  {movieOwner.name || movieOwner.username}
                </Text>
                <Text numberOfLines={1} style={styles.crewOwnerBadge}>ناشر اثر</Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item: member }) => (
            <TouchableOpacity
              style={styles.crewItem}
              activeOpacity={0.75}
              onPress={() => {
                const targetUserId = member.userId || member.id;
                if (targetUserId) {
                  router.push(`/user/${targetUserId}` as any);
                }
              }}
            >
              <Image
                source={{ uri: getMediaUrl(member.avatar) }}
                style={styles.crewAvatar}
                contentFit="cover"
              />
              <Text numberOfLines={2} style={styles.crewName}>
                {member.name || member.username}
              </Text>
              <Text numberOfLines={1} style={styles.crewRole}>
                {member.role || 'عامل'}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* ۵. تیزر رسمی اثر */}
      {movie?.trailerUrl ? (
        <View style={styles.subSection}>
          <Text style={styles.sectionTitle}>تیزر رسمی اثر</Text>
          <TouchableOpacity style={styles.trailerBox} activeOpacity={0.88} onPress={onPlayTrailer}>
            <Image
              source={{ uri: getMediaUrl(movie.mainPosterUrl) }}
              style={styles.trailerPoster}
              contentFit="cover"
            />
            <View style={styles.trailerPlayOverlay}>
              <View style={styles.trailerPlayIcon}>
                <Play size={22} color="#030712" fill="#030712" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ۶. ویدیوی پشت صحنه فیلم */}
      {movie?.behindSceneVideoUrl ? (
        <View style={styles.subSection}>
          <View style={styles.sectionTitleRow}>
            <Clapperboard size={16} color="#c084fc" />
            <Text style={styles.sectionTitle}>پشت صحنه فیلم</Text>
          </View>
          <TouchableOpacity
            style={[styles.trailerBox, styles.behindSceneBox]}
            activeOpacity={0.88}
            onPress={onPlayBehindScene}
          >
            <Image
              source={{ uri: getMediaUrl(movie.mainPosterUrl) }}
              style={styles.trailerPoster}
              contentFit="cover"
            />
            <View style={styles.trailerPlayOverlay}>
              <View style={[styles.trailerPlayIcon, styles.behindScenePlayIcon]}>
                <Play size={22} color="#030712" fill="#030712" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ۷. آلبوم تصاویر و پوسترها */}
      {((movie?.posters && movie.posters.length > 0) || behindImagesList.length > 0) && (
        <View style={styles.subSection}>
          <Text style={styles.sectionTitle}>آلبوم تصاویر و پوسترها</Text>
          <ScrollView
            horizontal
            inverted
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {(movie.posters || []).map((img: string, i: number) => (
              <TouchableOpacity
                key={`p-${i}`}
                activeOpacity={0.8}
                onPress={() => onOpenImage(getMediaUrl(img))}
              >
                <Image
                  source={{ uri: getMediaUrl(img) }}
                  style={styles.galleryPoster}
                  contentFit="cover"
                />
              </TouchableOpacity>
            ))}
            {behindImagesList.map((img: string, i: number) => (
              <TouchableOpacity
                key={`b-${i}`}
                activeOpacity={0.8}
                onPress={() => onOpenImage(getMediaUrl(img))}
              >
                <Image
                  source={{ uri: getMediaUrl(img) }}
                  style={styles.galleryBehind}
                  contentFit="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 18,
    paddingBottom: 24,
  },
  cardBox: {
    backgroundColor: 'rgba(17, 24, 39, 0.65)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontFamily: 'Ravi-Bold',
    textAlign: 'right',
  },
  synopsisText: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'Ravi-Regular',
    lineHeight: 22,
    textAlign: 'right',
  },
  specsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(17, 24, 39, 0.65)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  specItem: {
    width: '46%',
    gap: 4,
  },
  specHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  specLabel: {
    color: '#64748b',
    fontSize: 10,
    fontFamily: 'Ravi-Bold',
  },
  specValue: {
    color: '#f1f5f9',
    fontSize: 12,
    fontFamily: 'Ravi-Bold',
    textAlign: 'right',
  },
  subSection: {
    gap: 10,
  },
  horizontalList: {
    gap: 10,
  },
  reelCard: {
    width: 105,
    height: 155,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
  },
  reelPoster: {
    width: '100%',
    height: '100%',
  },
  reelOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'space-between',
    padding: 6,
  },
  reelPlayIcon: {
    alignSelf: 'flex-start',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  reelStats: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reelStatText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  crewList: {
    gap: 14,
    paddingVertical: 4,
  },
  crewItem: {
    width: 82,
    alignItems: 'center',
    gap: 4,
  },
  crewAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  crewOwnerAvatar: {
    borderColor: '#14b8a6',
    borderWidth: 2,
  },
  crewName: {
    color: '#f8fafc',
    fontSize: 11,
    fontFamily: 'Ravi-Bold',
    textAlign: 'center',
    lineHeight: 16,
  },
  crewRole: {
    color: '#64748b',
    fontSize: 9,
    fontFamily: 'Ravi-Regular',
    textAlign: 'center',
    width: '100%',
  },
  crewOwnerBadge: {
    color: '#14b8a6',
    fontSize: 9,
    fontFamily: 'Ravi-Bold',
  },
  trailerBox: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  behindSceneBox: {
    borderColor: 'rgba(192, 132, 252, 0.35)',
  },
  trailerPoster: {
    width: '100%',
    height: '100%',
    opacity: 0.65,
  },
  trailerPlayOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailerPlayIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  behindScenePlayIcon: {
    backgroundColor: '#c084fc',
  },
  galleryPoster: {
    width: 90,
    height: 130,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  galleryBehind: {
    width: 140,
    height: 130,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
});