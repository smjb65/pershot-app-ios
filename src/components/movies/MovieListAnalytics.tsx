import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Eye, Heart, ChevronLeft, Film, Wallet } from 'lucide-react-native';
import { api, getMediaUrl, toFarsiDigits } from '../../api/axiosClient';

export interface MovieItem {
  id: string;
  title: string;
  titleFa?: string;
  posterUrl: string;
  views: number;
  likes: number;
  status: string | number;
  createdAt: string;
}

export default function MovieListAnalytics({ movies: initialMovies }: { movies?: MovieItem[] }) {
  const router = useRouter();
  const [movies, setMovies] = useState<MovieItem[]>(initialMovies || []);
  const [earningsMap, setEarningsMap] = useState<{ [id: string]: number }>({});
  const [loading, setLoading] = useState(!initialMovies);

  useEffect(() => {
    // 🟢 دریافت درآمد دونیت تک‌تک فیلم‌ها و نرمال‌سازی کلیدها
    api.get('/payments/wallet/my-movies-earnings')
      .then((res) => {
        const raw = res.data?.earningsByMovie || res.data?.data?.earningsByMovie || {};
        const normalized: { [id: string]: number } = {};
        Object.keys(raw).forEach((k) => {
          normalized[k.toLowerCase()] = Number(raw[k]) || 0;
          normalized[k] = Number(raw[k]) || 0;
        });
        setEarningsMap(normalized);
      })
      .catch(() => {});

    if (initialMovies) {
      setMovies(initialMovies);
      return;
    }

    api.get('/movies/my-movies')
      .then((res) => setMovies(res.data || []))
      .catch(() => setMovies([]))
      .finally(() => setLoading(false));
  }, [initialMovies]);

  const getStatusBadge = (status: string | number) => {
    const s = status?.toString()?.toLowerCase();
    if (s === 'draft' || s === '0') {
      return { label: 'پیش‌نویس (عدم تکمیل)', bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8' };
    }
    if (s === 'approved' || s === 'published' || s === '3') {
      return { label: 'تایید شده', bg: 'rgba(20, 184, 166, 0.15)', text: '#2dd4bf' };
    }
    if (s === 'pendingsuperadmin' || s === 'rejected' || s === '4') {
      return { label: 'رد شده / مهلت اصلاح', bg: 'rgba(244, 63, 94, 0.15)', text: '#f43f5e' };
    }
    return { label: 'در انتظار تایید ادمین', bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' };
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.loadingText}>در حال دریافت لیست فیلم‌های شما...</Text>
      </View>
    );
  }

  if (movies.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Film size={40} color="#334155" />
        <Text style={styles.emptyTitle}>هیچ فیلمی ثبت نشده است</Text>
        <Text style={styles.emptyDesc}>
          برای مشاهده آنالیز، ابتدا اولین فیلم خود را از تب «افزودن فیلم جدید» ثبت کنید.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {movies.map((movie) => {
        const badge = getStatusBadge(movie.status);
        const isDraft = String(movie.status).toLowerCase() === 'draft' || String(movie.status) === '0';
        
        // 🟢 استخراج دقیق درآمد دونیت فیلم با هر دو حالت کلید
        const targetId = (movie.id || '').toString();
        const movieEarnings = earningsMap[targetId.toLowerCase()] ?? earningsMap[targetId] ?? 0;

        return (
          <TouchableOpacity
            key={movie.id}
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => {
              router.push({
                pathname: `/(screens)/movies/${movie.id}`,
                params: isDraft ? { tab: 'edit' } : {},
              } as any);
            }}
          >
            <View style={styles.row}>
              <Image
                source={{ uri: getMediaUrl(movie.posterUrl) }}
                style={styles.poster}
                contentFit="cover"
              />

              <View style={styles.details}>
                <View style={styles.titleRow}>
                  <Text style={styles.titleText} numberOfLines={1}>
                    {movie.titleFa || movie.title}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>

                <Text style={styles.dateText}>{movie.createdAt}</Text>

                <View style={styles.metricsRow}>
                  <View style={styles.metricItem}>
                    <Eye size={12} color="#14b8a6" />
                    <Text style={styles.metricText}>{(movie.views || 0).toLocaleString('fa-IR')}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Heart size={12} color="#f43f5e" />
                    <Text style={styles.metricText}>{(movie.likes || 0).toLocaleString('fa-IR')}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Wallet size={12} color="#fbbf24" />
                    <Text style={[styles.metricText, { color: '#fbbf24' }]}>
                      {toFarsiDigits(movieEarnings.toLocaleString('en-US'))} ت
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.footerActionText}>
                {isDraft ? 'تکمیل مشخصات و آپلود فیلم' : 'مشاهده آنالیز و مدیریت اثر'}
              </Text>
              <ChevronLeft size={14} color="#14b8a6" />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  centerBox: { paddingVertical: 40, alignItems: 'center', gap: 8 },
  loadingText: { fontFamily: 'Ravi-Regular', fontSize: 11, color: '#94a3b8' },
  emptyBox: { paddingVertical: 40, alignItems: 'center', gap: 6 },
  emptyTitle: { fontFamily: 'Ravi-Bold', fontSize: 13, color: '#94a3b8' },
  emptyDesc: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#64748b', textAlign: 'center', paddingHorizontal: 20 },
  card: {
    backgroundColor: '#0d1520',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    gap: 10,
  },
  row: { flexDirection: 'row-reverse', gap: 12 },
  poster: { width: 55, height: 80, borderRadius: 12, backgroundColor: '#030712' },
  details: { flex: 1, justifyContent: 'space-between', gap: 4 },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  titleText: { fontFamily: 'Ravi-Bold', fontSize: 13, color: '#ffffff', flex: 1, textAlign: 'right' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontFamily: 'Ravi-Bold', fontSize: 9 },
  dateText: { fontFamily: 'monospace', fontSize: 9.5, color: '#64748b', textAlign: 'right' },
  metricsRow: { flexDirection: 'row-reverse', gap: 12 },
  metricItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  metricText: { fontFamily: 'monospace', fontSize: 10.5, color: '#cbd5e1' },
  footerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 8,
  },
  footerActionText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#14b8a6' },
});