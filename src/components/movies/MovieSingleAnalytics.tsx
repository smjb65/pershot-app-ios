import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Image } from 'expo-image';
import {
  Users,
  HardDrive,
  Heart,
  Clock,
  Calendar,
  AlertTriangle,
  Timer,
  Film,
  TrendingUp,
  Wallet,
} from 'lucide-react-native';
import { api, getMediaUrl, toFarsiDigits } from '../../api/axiosClient';

interface AnalyticsStats {
  totalViews: number;
  uniqueUsers: number;
  totalBandwidthMB: number;
  secondHeatmap: { second: number; views: number }[];
}

export default function MovieSingleAnalytics({ movie }: { movie: any }) {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [earnings, setEarnings] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [timeLeftStr, setTimeLeftStr] = useState('');

  const isRejected = movie?.status === 'Rejected' || movie?.status === 4;
  const movieId = movie?.id || movie?.movieId;

  useEffect(() => {
    if (!movieId) return;

    // ۱. دریافت آمار تماشا
    api.get(`/analytics/movie/${movieId}/stats`)
      .then((res) => setStats(res.data))
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false));

    // ۲. محاسبه مستقیم مجموع دونیت‌های جذب‌شده این فیلم از روی ولت ناشر
    api.get(`/payments/wallet/movie-earnings/${movieId}`)
      .then((res) => setEarnings(res.data?.earnings || 0))
      .catch(() => setEarnings(0));
  }, [movieId]);

  useEffect(() => {
    if (!isRejected || !movie.updatedAt) return;
    const updatedDate = new Date(movie.updatedAt).getTime();
    const expirationTime = updatedDate + 7 * 24 * 60 * 60 * 1000;

    const diffMs = Math.max(0, expirationTime - Date.now());
    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    setTimeLeftStr(`${days} روز و ${hours} ساعت`);
  }, [isRejected, movie?.updatedAt]);

  const formatBandwidth = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} گیگابایت`;
    return `${mb.toFixed(1)} مگابایت`;
  };

  return (
    <View style={styles.container}>
      {isRejected && (
        <View style={styles.rejectedBanner}>
          <View style={styles.rejectedHeader}>
            <AlertTriangle size={18} color="#f43f5e" />
            <Text style={styles.rejectedTitle}>این اثر رد شده است</Text>
            <View style={styles.timerBadge}>
              <Timer size={12} color="#f43f5e" />
              <Text style={styles.timerText}>مهلت اصلاح: {timeLeftStr}</Text>
            </View>
          </View>
          <Text style={styles.rejectionReason}>{movie.rejectionReason || 'دلیلی ذکر نشده است.'}</Text>
        </View>
      )}

      <View style={styles.movieOverviewCard}>
        <Image
          source={{ uri: getMediaUrl(movie.mainPosterUrl) }}
          style={styles.poster}
          contentFit="cover"
        />
        <View style={styles.movieDetails}>
          <Text style={styles.titleFa}>{movie.titleFa}</Text>
          {movie.titleEn ? <Text style={styles.titleEn}>{movie.titleEn}</Text> : null}
          <Text style={styles.synopsisText} numberOfLines={3}>
            {movie.synopsis}
          </Text>
        </View>
      </View>

      {/* ۵ کارت آماری شامل کارت مجموع دونیت جذب‌شده اثر */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.earningsCard]}>
          <Wallet size={18} color="#fbbf24" />
          <Text style={[styles.statLabel, { color: '#fde68a' }]}>حمایت جذب‌شده (دونیت)</Text>
          <Text style={[styles.statValue, { color: '#fbbf24' }]}>
            {toFarsiDigits(earnings.toLocaleString('en-US'))} تومان
          </Text>
        </View>

        <View style={styles.statCard}>
          <Users size={18} color="#38bdf8" />
          <Text style={styles.statLabel}>بینندگان یکتا</Text>
          <Text style={styles.statValue}>
            {loadingStats ? '...' : (stats?.uniqueUsers || 0).toLocaleString('fa-IR')}
          </Text>
        </View>

        <View style={styles.statCard}>
          <HardDrive size={18} color="#10b981" />
          <Text style={styles.statLabel}>ترافیک مصرفی</Text>
          <Text style={styles.statValue}>
            {loadingStats ? '...' : formatBandwidth(stats?.totalBandwidthMB || 0)}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Heart size={18} color="#f43f5e" />
          <Text style={styles.statLabel}>پسندها</Text>
          <Text style={styles.statValue}>
            {(movie.likeCount || movie.likesCount || 0).toLocaleString('fa-IR')}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Clock size={18} color="#f59e0b" />
          <Text style={styles.statLabel}>مدت زمان</Text>
          <Text style={styles.statValue}>{movie.durationMinutes || 0} د</Text>
        </View>
      </View>

      <View style={styles.heatmapCard}>
        <View style={styles.heatmapHeader}>
          <TrendingUp size={16} color="#14b8a6" />
          <Text style={styles.heatmapTitle}>روند ثانیه‌ای تماشا (نقاط اوج)</Text>
        </View>
        {loadingStats ? (
          <ActivityIndicator size="small" color="#14b8a6" />
        ) : stats?.secondHeatmap && stats.secondHeatmap.length > 0 ? (
          <View style={styles.heatmapBars}>
            {stats.secondHeatmap.slice(0, 12).map((item, idx) => (
              <View key={idx} style={styles.barCol}>
                <View style={[styles.bar, { height: Math.min(item.views * 4 + 10, 60) }]} />
                <Text style={styles.barText}>{item.second}ث</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noHeatmapText}>دیتای آماری ثانیه‌ای ثبت نشده است.</Text>
        )}
      </View>

      {movie.crew && movie.crew.length > 0 && (
        <View style={styles.crewSection}>
          <Text style={styles.sectionTitle}>عوامل ثبت شده در این اثر</Text>
          <View style={styles.crewGrid}>
            {movie.crew.map((cr: any, i: number) => (
              <View key={i} style={styles.crewCard}>
                <View style={styles.crewAvatar}>
                  <Text style={styles.crewAvatarText}>{cr.name?.[0] || 'ع'}</Text>
                </View>
                <View>
                  <Text style={styles.crewName}>{cr.name}</Text>
                  <Text style={styles.crewRole}>{cr.role}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  rejectedBanner: {
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },
  rejectedHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  rejectedTitle: { fontFamily: 'Ravi-Bold', fontSize: 11.5, color: '#f43f5e' },
  timerBadge: {
    marginRight: 'auto',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timerText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 9.5, color: '#f43f5e' },
  rejectionReason: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#fecdd3', textAlign: 'right' },
  movieOverviewCard: {
    flexDirection: 'row-reverse',
    backgroundColor: '#0d1520',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    gap: 12,
  },
  poster: { width: 65, height: 95, borderRadius: 12, backgroundColor: '#030712' },
  movieDetails: { flex: 1, justifyContent: 'center', gap: 3 },
  titleFa: { fontFamily: 'Ravi-Bold', fontSize: 13.5, color: '#ffffff', textAlign: 'right' },
  titleEn: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 10, color: '#64748b', textAlign: 'right' },
  synopsisText: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#cbd5e1', textAlign: 'right', lineHeight: 16 },
  statsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#0d1520',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  earningsCard: {
    minWidth: '100%',
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  statLabel: { fontFamily: 'Ravi-Regular', fontSize: 9.5, color: '#94a3b8' },
  statValue: { fontFamily: 'Ravi-Bold', fontSize: 15, color: '#ffffff' },
  heatmapCard: {
    backgroundColor: '#0d1520',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
    gap: 12,
  },
  heatmapHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  heatmapTitle: { fontFamily: 'Ravi-Bold', fontSize: 12, color: '#e2e8f0' },
  heatmapBars: { flexDirection: 'row-reverse', alignItems: 'flex-end', justifyContent: 'space-between', height: 70 },
  barCol: { alignItems: 'center', gap: 4 },
  bar: { width: 14, backgroundColor: '#14b8a6', borderRadius: 4 },
  barText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 8, color: '#64748b' },
  noHeatmapText: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#64748b', textAlign: 'center', paddingVertical: 16 },
  crewSection: { gap: 8 },
  sectionTitle: { fontFamily: 'Ravi-Bold', fontSize: 12, color: '#94a3b8', textAlign: 'right' },
  crewGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  crewCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0d1520',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    padding: 8,
    minWidth: '47%',
  },
  crewAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(20, 184, 166, 0.15)', alignItems: 'center', justifyContent: 'center' },
  crewAvatarText: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#2dd4bf' },
  crewName: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#ffffff', textAlign: 'right' },
  crewRole: { fontFamily: 'Ravi-Regular', fontSize: 9.5, color: '#14b8a6', textAlign: 'right' },
});