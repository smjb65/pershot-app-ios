import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { api, getMediaUrl } from '../../../api/axiosClient';

interface TabSimilarProps {
  movieId: string;
  movie: any;
  onLayoutHeight?: (height: number) => void;
}

export default function TabSimilar({ movieId, movie, onLayoutHeight }: TabSimilarProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const CARD_WIDTH = (width - 44) / 2;

  const [similar, setSimilar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSimilar = async () => {
      try {
        setLoading(true);
        const searchDoc = {
          id: movieId,
          titleFa: movie?.titleFa || '',
          category: movie?.category || '',
          genre: Array.isArray(movie?.genres) ? movie.genres.join(', ') : movie?.genre || '',
          tags: movie?.tags || [],
          ownerId: movie?.ownerId || '',
          itemType: 'Movie',
        };
        const res = await api.post('/search/similar?limit=10', searchDoc);
        if (res.data?.items) {
          setSimilar(res.data.items.filter((item: any) => item.id !== movieId));
        }
      } catch {
        setSimilar([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSimilar();
  }, [movieId, movie]);

  const handleItemPress = (item: any) => {
    const targetId = item.id || item._id || item.targetId;
    if (!targetId) {
      console.warn('⚠️ شناسه آیتم برای انتقال یافت نشد:', item);
      return;
    }

    const isCampaign =
      String(item.itemType || item.type || '').toLowerCase() === 'campaign' ||
      Boolean(item.isCampaign);

    if (isCampaign) {
      // 🟢 اصلاح شد: با s در انتهای campaigns
      router.push(`/campaigns/${targetId}` as any);
    } else {
      router.push(`/movie/${targetId}` as any);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="small" color="#14b8a6" />
      </View>
    );
  }

  if (similar.length === 0) {
    return (
      <View
        style={styles.emptyContainer}
        onLayout={(e) => onLayoutHeight?.(e.nativeEvent.layout.height)}
      >
        <Text style={styles.emptyText}>مورد مشابهی یافت نشد.</Text>
      </View>
    );
  }

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
      <View style={styles.grid}>
        {similar.map((item) => (
          <TouchableOpacity
            key={item.id || item._id}
            style={[styles.card, { width: CARD_WIDTH }]}
            activeOpacity={0.85}
            onPress={() => handleItemPress(item)}
          >
            <View style={[styles.posterWrapper, { height: CARD_WIDTH * 1.45 }]}>
              <Image
                source={{ uri: getMediaUrl(item.mainPosterUrl || item.posterUrl || item.coverUrl) }}
                style={styles.poster}
                contentFit="cover"
                transition={150}
              />
            </View>

            <View style={styles.metaContainer}>
              <Text numberOfLines={1} style={styles.title}>
                {item.titleFa || item.title || 'بدون عنوان'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 24,
  },
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    gap: 6,
  },
  posterWrapper: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  metaContainer: {
    paddingHorizontal: 2,
  },
  title: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  centerContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
  },
});