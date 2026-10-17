import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Share2, Play } from 'lucide-react-native';
import { getMediaUrl, toFarsiDigits } from '../../api/axiosClient';

interface CampaignHeroProps {
  campaign: any;
  onPlayPitch: () => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function CampaignHero({ campaign, onPlayPitch, onToast }: CampaignHeroProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // ارتفاع استاندارد هیرو برای نسبت کامل
  const heroHeight = windowHeight * 0.78;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `حمایت از کمپین «${campaign?.titleFa}» در پلتفرم پرشات:\nhttps://pershot.ir/campaigns/${campaign?.id}`,
        url: `https://pershot.ir/campaigns/${campaign?.id}`,
      });
      onToast('لینک کمپین با موفقیت کپی شد', 'success');
    } catch {}
  };

  return (
    <View style={[styles.heroContainer, { width: windowWidth, height: heroHeight }]}>
      {/* پوستر پس‌زمینه لبه‌به‌لبه بدون فاصله از بالا و چپ */}
      <Image
        source={{ uri: getMediaUrl(campaign?.mainPosterUrl) }}
        style={styles.heroImage}
        contentFit="cover"
        priority="high"
      />

      {/* گرادیانت شیشه‌ای ملایم */}
      <LinearGradient
        colors={[
          'rgba(3, 7, 18, 0.45)',
          'transparent',
          'rgba(3, 7, 18, 0.4)',
          'rgba(3, 7, 18, 0.88)',
          '#030712',
        ]}
        locations={[0, 0.35, 0.65, 0.88, 1]}
        style={styles.heroGradient}
      />

      {/* دکمه‌های ناوبری بالای تصویر */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.75} onPress={() => router.back()}>
          <ArrowRight size={20} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} activeOpacity={0.75} onPress={handleShare}>
          <Share2 size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* مشخصات هیرو در پایین */}
      <View style={styles.bottomInfo}>
        <Text style={styles.titleFa} numberOfLines={2}>
          {campaign?.titleFa}
        </Text>
        {campaign?.titleEn ? (
          <Text style={styles.titleEn} numberOfLines={1}>
            {campaign.titleEn}
          </Text>
        ) : null}

        {/* برچسب‌های متادیتا */}
        <View style={styles.metaRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{campaign?.category || 'فیلم کوتاه'}</Text>
          </View>
          <View style={styles.stageBadge}>
            <Text style={styles.stageBadgeText}>{campaign?.currentStage || 'طرح'}</Text>
          </View>
          {campaign?.durationMinutes ? (
            <>
              <View style={styles.metaDot} />
              <Text style={styles.metaText}>{toFarsiDigits(campaign.durationMinutes)} دقیقه</Text>
            </>
          ) : null}
          <View style={styles.metaDot} />
          <Text style={styles.metaText}>
            {Array.isArray(campaign?.productionLocations)
              ? campaign.productionLocations.join('، ')
              : campaign?.productionLocations || 'ایران'}
          </Text>
        </View>

        {/* دکمه پخش ویدیوی معرفی */}
        {campaign?.pitchVideoUrl ? (
          <TouchableOpacity style={styles.pitchBtn} activeOpacity={0.88} onPress={onPlayPitch}>
            <Play size={18} color="#030712" fill="#030712" />
            <Text style={styles.pitchBtnText}>مشاهده ویدیوی پیچ (Pitch Video)</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.noPitchBox}>
            <Text style={styles.noPitchText}>ویدیوی پیچ برای این کمپین بارگذاری نشده است.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    position: 'relative',
    justifyContent: 'space-between',
    backgroundColor: '#030712',
    margin: 0,
    padding: 0,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomInfo: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  titleFa: {
    color: '#ffffff',
    fontSize: 22,
    fontFamily: 'Ravi-Black',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  titleEn: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: -4,
  },
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryBadgeText: {
    color: '#2dd4bf',
    fontSize: 10,
    fontFamily: 'Ravi-Bold',
  },
  stageBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stageBadgeText: {
    color: '#fbbf24',
    fontSize: 10,
    fontFamily: 'Ravi-Bold',
  },
  metaDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#64748b',
  },
  metaText: {
    color: '#cbd5e1',
    fontSize: 10.5,
    fontFamily: 'Ravi-Regular',
  },
  pitchBtn: {
    width: '100%',
    height: 48,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  pitchBtnText: {
    color: '#030712',
    fontSize: 13,
    fontFamily: 'Ravi-Black',
  },
  noPitchBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 4,
  },
  noPitchText: {
    color: '#94a3b8',
    fontSize: 10.5,
    fontFamily: 'Ravi-Regular',
  },
});