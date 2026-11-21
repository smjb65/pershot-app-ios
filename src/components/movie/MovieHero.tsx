import React from 'react';
import { Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowRight, Play, Share2, ThumbsUp, Eye } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMediaUrl, toFarsiDigits } from '../../api/axiosClient';

interface MovieHeroProps {
  movie: any;
  likePercentage: number;
  onPlayClick: () => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function MovieHero({
  movie,
  likePercentage,
  onPlayClick,
  onToast,
}: MovieHeroProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // بررسی وجود ویدیوی اصلی
  const hasMainVideo = Boolean(movie?.videoUrl);
  const posterHeight = hasMainVideo ? windowHeight * 0.7 : windowHeight * 0.76;

  // استخراج تعداد بازدید واقعی فیلم
  const totalViews = movie?.totalViews ?? movie?.views ?? movie?.viewsCount ?? 0;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `تماشای فیلم «${movie?.titleFa}» در اپلیکیشن پرشات:\nhttps://pershot.ir/movie/${movie?.id}\n\nدریافت اپلیکیشن پرشات از مایکت:\nhttps://myket.ir/app/com.pershot.app`,
      });
      onToast('لینک فیلم کپی شد', 'success');
    } catch { }
  };

  return (
    <View style={styles.wrapper}>
      {/* کادر پوستر فیلم و مشخصات روی آن */}
      <View style={[styles.heroContainer, { width: windowWidth, height: posterHeight }]}>
        <Image
          source={{ uri: getMediaUrl(movie?.mainPosterUrl) }}
          style={styles.heroImage}
          contentFit="cover"
          priority="high"
        />

        <LinearGradient
          colors={[
            'transparent',
            'transparent',
            'rgba(3, 7, 18, 0.45)',
            'rgba(3, 7, 18, 0.85)',
            '#030712',
          ]}
          locations={[0, 0.5, 0.72, 0.88, 1]}
          style={styles.heroGradient}
        />

        {/* نوار بالایی: بازگشت و اشتراک‌گذاری */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.75}
            onPress={() => router.back()}
          >
            <ArrowRight size={20} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.75}
            onPress={handleShare}
          >
            <Share2 size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* مشخصات فیلم در پایین پوستر */}
        <View style={styles.heroBottomInfo}>
          <Text style={styles.heroTitleFa} numberOfLines={2}>
            {movie?.titleFa}
          </Text>
          {movie?.titleEn ? (
            <Text style={styles.heroTitleEn} numberOfLines={1}>
              {movie.titleEn}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            {movie?.durationMinutes ? (
              <Text style={styles.metaText}>{toFarsiDigits(movie.durationMinutes)} دقیقه</Text>
            ) : null}
            <View style={styles.metaDot} />
            <Text style={styles.metaText}>
              {Array.isArray(movie?.genres)
                ? movie.genres.join('، ')
                : movie?.genre || movie?.category || 'فیلم کوتاه'}
            </Text>
            <View style={styles.metaDot} />
            
            {/* درصد رضایت */}
            <View style={styles.likeBadge}>
              <ThumbsUp size={11} color="#34d399" />
              <Text style={styles.likeBadgeText}>{toFarsiDigits(likePercentage)}٪ رضایت</Text>
            </View>

            <View style={styles.metaDot} />

            {/* تعداد بازدید (View) */}
            <View style={styles.viewBadge}>
              <Eye size={12} color="#2dd4bf" />
              <Text style={styles.viewBadgeText}>{toFarsiDigits(Number(totalViews).toLocaleString('en-US'))} بازدید</Text>
            </View>

            <View style={styles.metaDot} />
            <Text style={styles.metaText}>
              {movie?.productionCountries || 'ایران'} ({toFarsiDigits(movie?.releaseYear || '۱۴۰۳')})
            </Text>
          </View>
        </View>
      </View>

      {/* دکمه تماشای رایگان فقط در صورت وجود فایل ویدیوی اصلی */}
      {hasMainVideo && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.playButton}
            activeOpacity={0.88}
            onPress={onPlayClick}
          >
            <Play size={18} color="#030712" fill="#030712" />
            <Text style={styles.playButtonText}>تماشای رایگان</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    backgroundColor: '#030712',
  },
  heroContainer: {
    position: 'relative',
    justifyContent: 'space-between',
    backgroundColor: '#030712',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  topBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBottomInfo: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  heroTitleFa: {
    color: '#ffffff',
    fontSize: 24,
    fontFamily: 'Ravi-Black',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    includeFontPadding: false,
  },
  heroTitleEn: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: -4,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaText: {
    color: '#f1f5f9',
    fontSize: 11,
    fontFamily: 'Ravi-Bold',
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
    includeFontPadding: false,
  },
  metaDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#94a3b8',
  },
  likeBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  likeBadgeText: {
    color: '#34d399',
    fontSize: 10,
    fontFamily: 'Ravi-Bold',
    includeFontPadding: false,
  },
  viewBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.35)',
  },
  viewBadgeText: {
    color: '#2dd4bf',
    fontSize: 10,
    fontFamily: 'Ravi-Bold',
    includeFontPadding: false,
  },
  actionContainer: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: '#030712',
  },
  playButton: {
    width: '100%',
    height: 48,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  playButtonText: {
    color: '#030712',
    fontSize: 14,
    fontFamily: 'Ravi-Black',
    includeFontPadding: false,
  },
});