import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { X, CheckCircle, AlertCircle } from 'lucide-react-native';
import { api, getMediaUrl } from '../../src/api/axiosClient';

import MovieHero from '../../src/components/movie/MovieHero';
import MovieActions from '../../src/components/movie/MovieActions';
import MovieTabs from '../../src/components/movie/MovieTabs';
import AdvancedVideoPlayer from '../../src/components/movie/AdvancedVideoPlayer';
import DonationModal from '../../src/components/movie/DonationModal';

interface ActivePlayerState {
  isOpen: boolean;
  src: string;
  title: string;
  isMainMovie: boolean;
}

export default function MovieDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [likePercentage, setLikePercentage] = useState(0);

  const [movieOwner, setMovieOwner] = useState<any>(null);
  const [crewUsers, setCrewUsers] = useState<any[]>([]);

  // استیت پلیر
  const [playerState, setPlayerState] = useState<ActivePlayerState>({
    isOpen: false,
    src: '',
    title: '',
    isMainMovie: true,
  });

  // استیت مدال دونیت پس از بستن فیلم
  const [isDonationOpen, setIsDonationOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // سیستم Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastOpacity = useState(new Animated.Value(0))[0];

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };

  const fetchMovieDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.get(`/movies/${id}/details`);
      const movieData = res.data;
      setMovie(movieData);
      setLikePercentage(movieData.likePercentage ? Math.round(movieData.likePercentage) : 0);

      const crewList = Array.isArray(movieData.crew) ? movieData.crew : [];
      const userIds: string[] = crewList.map((c: any) => c.userId).filter(Boolean);
      if (movieData.ownerId && !userIds.includes(movieData.ownerId)) {
        userIds.push(movieData.ownerId);
      }

      if (userIds.length > 0) {
        const usersRes = await api.post('/profile/users/batch', userIds);
        const users = usersRes.data || [];
        if (movieData.ownerId) {
          setMovieOwner(users.find((u: any) => u.id === movieData.ownerId));
        }
        if (crewList.length > 0) {
          setCrewUsers(crewList.map((c: any) => ({ ...c, ...users.find((u: any) => u.id === c.userId) })));
        }
      }
    } catch (err) {
      console.error('Error loading movie details:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMovieDetails();
  }, [fetchMovieDetails]);

  const handlePlayMainMovie = async () => {
    try {
      const res = await api.get(`/movies/${id}/presigned-stream`);
      if (res.data?.streamUrl) {
        setPlayerState({
          isOpen: true,
          src: res.data.streamUrl,
          title: movie?.titleFa || 'فیلم سینمایی',
          isMainMovie: true,
        });
      }
    } catch {
      showToast('لطفاً ابتدا وارد حساب کاربری خود شوید', 'error');
      setTimeout(() => router.push('/(auth)/login' as any), 1200);
    }
  };

  const handlePlayTrailer = () => {
    if (movie?.trailerUrl) {
      setPlayerState({
        isOpen: true,
        src: movie.trailerUrl,
        title: `تیزر رسمی: ${movie.titleFa}`,
        isMainMovie: false,
      });
    } else {
      showToast('تیزری برای این فیلم ثبت نشده است', 'error');
    }
  };

  const handlePlayBehindScene = () => {
    if (movie?.behindSceneVideoUrl) {
      setPlayerState({
        isOpen: true,
        src: movie.behindSceneVideoUrl,
        title: `پشت صحنه: ${movie.titleFa}`,
        isMainMovie: false,
      });
    } else {
      showToast('ویدیوی پشت صحنه‌ای برای این اثر ثبت نشده است', 'error');
    }
  };

  // خروج از پلیر و نمایش خودکار مدال حمایت
  const handleClosePlayer = () => {
    const wasMainMovie = playerState.isMainMovie;
    setPlayerState((prev) => ({ ...prev, isOpen: false }));

    // اگر فیلم اصلی بود، پس از بسته شدن پلیر مدال دونیت را باز کن
    if (wasMainMovie && (movie?.enableDonation ?? true)) {
      setTimeout(() => {
        setIsDonationOpen(true);
      }, 400);
    }
  };

  if (loading || !movie) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, contentStyle: { backgroundColor: '#030712' } }} />
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            toast.type === 'error' ? styles.toastError : styles.toastSuccess,
            { opacity: toastOpacity },
          ]}
        >
          {toast.type === 'error' ? (
            <AlertCircle size={16} color="#f43f5e" />
          ) : (
            <CheckCircle size={16} color="#10b981" />
          )}
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <MovieHero
          movie={movie}
          likePercentage={likePercentage}
          onPlayClick={handlePlayMainMovie}
          onToast={showToast}
        />

        <MovieActions
          movieId={id as string}
          initialLikePercentage={likePercentage}
          onLikeChange={setLikePercentage}
          onToast={showToast}
        />

        <MovieTabs
          movieId={id as string}
          movie={movie}
          movieOwner={movieOwner}
          crewUsers={crewUsers}
          onOpenImage={(url) => setSelectedImage(url)}
          onPlayTrailer={handlePlayTrailer}
          onPlayBehindScene={handlePlayBehindScene}
          onToast={showToast}
        />
      </ScrollView>

      {/* مدال پلیر پیشرفته تمام‌صفحه و افقی */}
      <Modal
        visible={playerState.isOpen}
        animationType="fade"
        supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}
        onRequestClose={handleClosePlayer}
      >
        {playerState.isOpen && playerState.src ? (
          <AdvancedVideoPlayer
            src={playerState.src}
            poster={movie.mainPosterUrl}
            title={playerState.title}
            movieId={id as string}
            userId={movieOwner?.id}
            isMainMovie={playerState.isMainMovie}
            onClose={handleClosePlayer}
          />
        ) : null}
      </Modal>

      {/* مدال حمایت مالی فیلم با اطلاعات کامل */}
      <DonationModal
        isOpen={isDonationOpen}
        onClose={() => setIsDonationOpen(false)}
        targetType="Movie"
        targetId={id as string}
        targetTitle={movie?.titleFa || 'فیلم سینمایی'}
        ownerUserId={movie?.ownerId || movieOwner?.id}
        presetAmounts={movie?.donationAmounts}
      />

      {/* مدال لایت‌باکس تصاویر */}
      <Modal visible={Boolean(selectedImage)} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <View style={styles.lightboxContainer}>
          <TouchableOpacity style={styles.closeLightboxBtn} onPress={() => setSelectedImage(null)}>
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.lightboxImage} contentFit="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#030712',
  },
  scrollContent: {
    paddingBottom: 60,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#030712',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toastContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 999,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  toastSuccess: {
    backgroundColor: '#064e3b',
    borderColor: '#059669',
    borderWidth: 1,
  },
  toastError: {
    backgroundColor: '#4c0519',
    borderColor: '#e11d48',
    borderWidth: 1,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  lightboxContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeLightboxBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 50,
    padding: 8,
  },
  lightboxImage: {
    width: '90%',
    height: '70%',
  },
});