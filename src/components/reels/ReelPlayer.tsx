import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  AppState,
  AppStateStatus,
  ActivityIndicator,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Volume2,
  VolumeX,
  Film,
  Rocket,
} from 'lucide-react-native';

import { api, getMediaUrl, toFarsiDigits } from '../../api/axiosClient';

let FileSystem: any = null;
try {
  FileSystem = require('expo-file-system');
} catch {}

interface ReelPlayerProps {
  reel: any;
  isActive: boolean;
  isFocused: boolean;
  onOpenComments: () => void;
}

export default function ReelPlayer({ reel, isActive, isFocused, onOpenComments }: ReelPlayerProps) {
  const router = useRouter();

  const [isUserPaused, setIsUserPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(Boolean(reel.isLiked));
  const [likesCount, setLikesCount] = useState(reel.likesCount || 0);
  const [isBookmarked, setIsBookmarked] = useState(Boolean(reel.isBookmarked));
  const [isVideoReady, setIsVideoReady] = useState(false);

  const [ownerProfile, setOwnerProfile] = useState<any>(reel.owner || null);

  const hasTrackedView = useRef(false);
  const lastTapRef = useRef(0);
  const singleTapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const defaultRemoteUri = useMemo(() => {
    return reel?.videoUrl ? getMediaUrl(reel.videoUrl) : '';
  }, [reel?.videoUrl]);

  const [activeVideoUri, setActiveVideoUri] = useState<string>(defaultRemoteUri);

  const posterUri = useMemo(() => {
    const raw = reel?.posterUrl || reel?.thumbnailUrl || reel?.coverUrl;
    return raw ? getMediaUrl(raw) : '';
  }, [reel?.posterUrl, reel?.thumbnailUrl, reel?.coverUrl]);

  // بررسی اولویت پخش از حافظه محلی کش‌شده
  useEffect(() => {
    let isMounted = true;
    const checkCache = async () => {
      if (FileSystem?.cacheDirectory && reel?.id) {
        const localPath = `${FileSystem.cacheDirectory}reels_cache/${reel.id}.mp4`;
        try {
          const info = await FileSystem.getInfoAsync(localPath);
          if (info.exists && isMounted) {
            setActiveVideoUri(localPath);
            return;
          }
        } catch {}
      }
      if (isMounted) {
        setActiveVideoUri(defaultRemoteUri);
      }
    };

    checkCache();
    return () => {
      isMounted = false;
    };
  }, [reel?.id, defaultRemoteUri]);

  const player = useVideoPlayer(activeVideoUri, (p) => {
    p.loop = true;
    p.muted = isMuted;
  });

  // 🟢 حل اخطار و فریز اصلی با متد آسنکرون replaceAsync
  useEffect(() => {
    if (!player || !activeVideoUri) return;
    try {
      if (typeof (player as any).replaceAsync === 'function') {
        (player as any).replaceAsync(activeVideoUri).catch(() => {});
      } else {
        player.replace(activeVideoUri);
      }
    } catch {}
  }, [activeVideoUri, player]);

  // استماع وضعیت بارگذاری ویدیو
  useEffect(() => {
    if (!player) return;

    const statusSub = player.addListener('statusChange', (payload: any) => {
      const status = payload?.status || payload;
      if (status === 'readyToPlay' || status === 'playing') {
        setIsVideoReady(true);
        if (isActive && isFocused && !isUserPaused) {
          player.play();
        }
      }
    });

    const playingSub = player.addListener('playingChange', (event: any) => {
      if (event?.isPlaying) {
        setIsVideoReady(true);
      }
    });

    return () => {
      statusSub?.remove?.();
      playingSub?.remove?.();
    };
  }, [player, isActive, isFocused, isUserPaused]);

  useEffect(() => {
    const targetUserId = reel.owner?.id || reel.ownerId || reel.userId;
    if (!targetUserId) return;

    let isMounted = true;
    api.post('/profile/users/batch', [targetUserId])
      .then((res) => {
        const freshUser = res.data?.[0];
        if (isMounted && freshUser) {
          setOwnerProfile(freshUser);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [reel.owner?.id, reel.ownerId, reel.userId]);

  // ریست شدن کامل وضعیت ریلز در زمان تعویض ویدیو
  useEffect(() => {
    setIsLiked(Boolean(reel.isLiked));
    setIsBookmarked(Boolean(reel.isBookmarked));
    setLikesCount(reel.likesCount || 0);
    setIsUserPaused(false);
    setIsVideoReady(false);
  }, [reel?.id]);

  useEffect(() => {
    if (!player || !activeVideoUri) return;

    const isShouldPlay = isActive && isFocused && !isUserPaused;

    if (isShouldPlay) {
      hasTrackedView.current = false;
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, isFocused, isUserPaused, player, activeVideoUri]);

  useEffect(() => {
    if (player) player.muted = isMuted;
  }, [isMuted, player]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState !== 'active') {
        player.pause();
      } else if (isActive && isFocused && !isUserPaused) {
        player.play();
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [isActive, isFocused, isUserPaused, player]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && isFocused && !isUserPaused) {
      interval = setInterval(() => {
        if (!hasTrackedView.current && player.currentTime >= 5) {
          hasTrackedView.current = true;
          api.post(`/reels/${reel.id}/view`).catch(() => {});
        }
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isFocused, isUserPaused, player, reel.id]);

  const togglePlay = () => {
    if (player.playing) {
      player.pause();
      setIsUserPaused(true);
    } else {
      player.play();
      setIsUserPaused(false);
    }
  };

  const showHeartAnimation = () => {
    heartScale.setValue(0);
    heartOpacity.setValue(1);

    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.25,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.delay(200),
      Animated.timing(heartOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      heartScale.setValue(0);
      heartOpacity.setValue(0);
    });
  };

  const handleLike = async (forceLike = false) => {
    showHeartAnimation();

    if (forceLike && isLiked) {
      return;
    }

    const nextState = forceLike ? true : !isLiked;
    setIsLiked(nextState);
    setLikesCount((prev: number) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      await api.post(`/reels/${reel.id}/like`);
    } catch {
      setIsLiked(!nextState);
      setLikesCount((prev: number) => (nextState ? Math.max(0, prev - 1) : prev + 1));
    }
  };

  const handleVideoPress = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 360;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapRef.current = 0;
      handleLike(true);
    } else {
      lastTapRef.current = now;
      singleTapTimerRef.current = setTimeout(() => {
        togglePlay();
        singleTapTimerRef.current = null;
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handleBookmark = async () => {
    const nextState = !isBookmarked;
    setIsBookmarked(nextState);
    try {
      await api.post(`/reels/${reel.id}/bookmark`);
    } catch {
      setIsBookmarked(!nextState);
    }
  };

  const handleNavigateLinked = () => {
    if (!reel.linkedEntity) return;
    player.pause();
    api.post(`/reels/${reel.id}/track-link-click`).catch(() => {});

    if (reel.linkedEntity.type === 'Movie') {
      router.push(`/movie/${reel.linkedEntity.id}` as any);
    } else {
      router.push(`/campaigns/${reel.linkedEntity.id}` as any);
    }
  };

  const handleNavigateOwner = () => {
    const targetUserId = ownerProfile?.id || reel.owner?.id || reel.ownerId || reel.userId;
    if (!targetUserId) return;

    player.pause();
    router.push(`/user/${targetUserId}` as any);
  };

  const ownerAvatar = ownerProfile?.avatar || ownerProfile?.avatarUrl || reel.owner?.avatar || reel.owner?.avatarUrl;
  const ownerUsername = ownerProfile?.username || reel.owner?.username || 'user';
  const ownerName = ownerProfile?.name || reel.owner?.name || ownerUsername;

  return (
    <View style={styles.container}>
      {/* لایه پوستر زیرین جهت حذف کامل سیاهی فریم اولیه */}
      {posterUri ? (
        <Image
          source={{ uri: posterUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      ) : null}

      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
      />

      {!isVideoReady && isActive && (
        <View style={styles.loadingCenter} pointerEvents="none">
          <ActivityIndicator size="small" color="#14b8a6" />
        </View>
      )}

      <Pressable style={StyleSheet.absoluteFill} onPress={handleVideoPress}>
        <Animated.View
          style={[
            styles.doubleTapHeart,
            { transform: [{ scale: heartScale }], opacity: heartOpacity },
          ]}
          pointerEvents="none"
        >
          <Heart size={105} color="#f43f5e" fill="#f43f5e" />
        </Animated.View>
      </Pressable>

      <TouchableOpacity
        style={styles.muteBtn}
        activeOpacity={0.7}
        onPress={() => setIsMuted(!isMuted)}
      >
        {isMuted ? <VolumeX size={18} color="#ffffff" /> : <Volume2 size={18} color="#ffffff" />}
      </TouchableOpacity>

      <View style={styles.sideActions} pointerEvents="box-none">
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={() => handleLike(false)}>
          <View style={styles.actionIconBox}>
            <Heart
              size={26}
              color={isLiked ? '#f43f5e' : '#ffffff'}
              fill={isLiked ? '#f43f5e' : 'transparent'}
            />
          </View>
          <Text style={styles.actionText}>{toFarsiDigits(likesCount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={onOpenComments}>
          <View style={styles.actionIconBox}>
            <MessageCircle size={26} color="#ffffff" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={handleBookmark}>
          <View style={styles.actionIconBox}>
            <Bookmark
              size={26}
              color={isBookmarked ? '#14b8a6' : '#ffffff'}
              fill={isBookmarked ? '#14b8a6' : 'transparent'}
            />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomInfoContainer} pointerEvents="box-none">
        {reel.linkedEntity && (
          <TouchableOpacity style={styles.linkedBadge} activeOpacity={0.8} onPress={handleNavigateLinked}>
            {reel.linkedEntity.type === 'Movie' ? <Film size={14} color="#2dd4bf" /> : <Rocket size={14} color="#2dd4bf" />}
            <Text style={styles.linkedBadgeText} numberOfLines={1}>
              {reel.linkedEntity.type === 'Movie' ? 'فیلم: ' : 'کمپین: '}
              {reel.linkedEntity.title}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.ownerRow}
          activeOpacity={0.75}
          onPress={handleNavigateOwner}
        >
          <View style={styles.ownerAvatarBox}>
            {ownerAvatar ? (
              <Image source={{ uri: getMediaUrl(ownerAvatar) }} style={styles.ownerAvatar} contentFit="cover" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{ownerName[0]}</Text>
              </View>
            )}
          </View>
          <Text style={styles.ownerUsername}>@{ownerUsername}</Text>
        </TouchableOpacity>

        {reel.caption ? (
          <Text style={styles.captionText} numberOfLines={2}>
            {reel.caption}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  loadingCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doubleTapHeart: {
    position: 'absolute',
    top: '42%',
    left: '50%',
    marginLeft: -52,
    marginTop: -52,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  muteBtn: {
    position: 'absolute',
    top: 54,
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  sideActions: {
    position: 'absolute',
    right: 14,
    bottom: 30,
    alignItems: 'center',
    gap: 16,
    zIndex: 30,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11,
    color: '#ffffff',
  },
  bottomInfoContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 74,
    alignItems: 'flex-start',
    gap: 8,
    zIndex: 30,
  },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  linkedBadgeText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11.5,
    color: '#2dd4bf',
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ownerAvatarBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  ownerAvatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'Ravi-Black',
    fontSize: 14,
    color: '#ffffff',
  },
  ownerUsername: {
    fontFamily: 'Ravi-Bold',
    fontSize: 13,
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  captionText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 12,
    lineHeight: 18,
    color: '#f1f5f9',
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});