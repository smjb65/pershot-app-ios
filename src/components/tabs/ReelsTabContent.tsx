import { useLocalSearchParams, useNavigation, usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DeviceEventEmitter,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, getMediaUrl } from '../../api/axiosClient';
import ReelCommentsModal from '../reels/ReelCommentsModal';
import ReelPlayer from '../reels/ReelPlayer';
import ReelSkeleton from '../reels/ReelSkeleton';

let FileSystem: any = null;
try {
  FileSystem = require('expo-file-system');
} catch {}

interface ReelsTabContentProps {
  isTabActive?: boolean;
}

export default function ReelsTabContent({ isTabActive = true }: ReelsTabContentProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const navigation = useNavigation();
  const { reelId: priorityReelId } = useLocalSearchParams<{ reelId?: string }>();

  // محاسبه ارتفاع نوار تب پایین
  const safeBottom = insets.bottom > 0 ? insets.bottom : 4;
  const barHeight = 52 + safeBottom;

  // 🟢 استیت ارتفاع دقیق بدون گِرد شدن
  const [containerHeight, setContainerHeight] = useState<number>(0);

  const isScreenActive =
    !pathname.includes('/movie') &&
    !pathname.includes('/campaign') &&
    !pathname.includes('/user') &&
    !pathname.includes('/chat');

  const isCurrentlyInReels = isTabActive && isScreenActive;

  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [activeReelIndex, setActiveReelIndex] = useState(0);

  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [selectedReelForComments, setSelectedReelForComments] = useState<any | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const isFetchingRef = useRef(false);

  const fetchReels = async (pageNum: number, targetId?: string | null) => {
    if (isFetchingRef.current && !targetId) return;
    try {
      isFetchingRef.current = true;
      const res = await api.get('/reels/feed', {
        params: { page: pageNum, pageSize: 5 },
      });
      const items: any[] = res.data?.items || [];

      if (pageNum === 1) {
        let finalItems = [...items];
        if (targetId) {
          const exists = finalItems.some((r) => r.id === targetId);
          if (!exists) {
            try {
              const singleRes = await api.get(`/reels/${targetId}`);
              const singleItem = singleRes.data?.data || singleRes.data;
              if (singleItem && (singleItem.id || singleItem.videoUrl)) {
                finalItems = [singleItem, ...finalItems];
              }
            } catch { }
          } else {
            const targetIdx = finalItems.findIndex((r) => r.id === targetId);
            const targetItem = finalItems.splice(targetIdx, 1)[0];
            finalItems.unshift(targetItem);
          }
        }
        setReels(finalItems);
        setActiveReelIndex(0);
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
        }, 50);
      } else {
        const newItems = items.map((r: any) => ({
          ...r,
          uniqueKey: `${r.id}-${pageNum}-${Math.random()}`,
        }));
        setReels((prev) => [...prev, ...newItems]);
      }
    } catch (err) {
      console.log('Error fetching reels:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchReels(1, priorityReelId);
  }, [priorityReelId]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('NAVIGATE_TO_REELS_TAB', ({ reelId }) => {
      if (reelId) {
        fetchReels(1, reelId);
      }
    });
    return () => sub.remove();
  }, []);

  // دانلود آفلاین ریلز در پس‌زمینه
  useEffect(() => {
    if (!reels.length || !FileSystem?.cacheDirectory) return;

    const cacheDir = `${FileSystem.cacheDirectory}reels_cache/`;

    const preloadNextReels = async () => {
      try {
        const dirInfo = await FileSystem.getInfoAsync(cacheDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
        }

        const nextTen = reels.slice(activeReelIndex + 1, activeReelIndex + 11);
        for (const item of nextTen) {
          if (!item?.id || !item?.videoUrl) continue;
          const targetFile = `${cacheDir}${item.id}.mp4`;
          const fileInfo = await FileSystem.getInfoAsync(targetFile);
          if (!fileInfo.exists) {
            FileSystem.downloadAsync(getMediaUrl(item.videoUrl), targetFile).catch(() => {});
          }
        }
      } catch {}
    };

    preloadNextReels();
  }, [activeReelIndex, reels]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchReels(1, null);
  }, []);

  useEffect(() => {
    if (!navigation) return;

    const unsubscribe = navigation.addListener('tabPress' as any, () => {
      if (isTabActive) {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        onRefresh();
      }
    });

    const eventSub = DeviceEventEmitter.addListener('RELOAD_REELS_TAB', () => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      onRefresh();
    });

    return () => {
      unsubscribe();
      eventSub.remove();
    };
  }, [navigation, isTabActive, onRefresh]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null && viewableItems[0].index !== undefined) {
        setActiveReelIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const handleEndReached = () => {
    if (!loading && !isFetchingRef.current && !refreshing) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchReels(nextPage, null);
    }
  };

  // 🟢 استخراج خالص و اعشاری ارتفاع برای جلوگیری قطعی از انباشتگی خطا
  const handleLayout = useCallback((e: any) => {
    const measured = e.nativeEvent.layout.height; // بدون هیچ‌گونه رند کردن (Math.floor حذف شد)
    if (measured > 0 && Math.abs(measured - containerHeight) > 0.1) {
      setContainerHeight(measured);
    }
  }, [containerHeight]);

  if (loading || containerHeight === 0) {
    return (
      <View style={[styles.container, { marginBottom: barHeight }]} onLayout={handleLayout}>
        <ReelSkeleton />
      </View>
    );
  }

  return (
    <View style={[styles.container, { marginBottom: barHeight }]} onLayout={handleLayout}>
      <FlatList
        ref={flatListRef}
        data={reels}
        keyExtractor={(item, index) => item.uniqueKey || `${item.id}-${index}`}
        pagingEnabled={true} // 🟢 فعال‌سازی اسکرول صفحه‌ای نیتیو در هر دو سیستم‌عامل
        snapToInterval={containerHeight} // 🟢 استفاده از ارتفاع دقیق و اعشاری
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum={true}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        windowSize={3}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        removeClippedSubviews={Platform.OS === 'android'}
        getItemLayout={(_, index) => ({
          length: containerHeight,
          offset: containerHeight * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#14b8a6"
            colors={['#14b8a6']}
            progressBackgroundColor="#0f172a"
          />
        }
        renderItem={({ item, index }) => (
          // 🟢 اعمال دقیق ارتفاع به کانتینر هر ریلز
          <View style={{ height: containerHeight, width: '100%', overflow: 'hidden' }}>
            <ReelPlayer
              reel={item}
              isActive={index === activeReelIndex}
              isFocused={isCurrentlyInReels}
              onOpenComments={() => {
                setSelectedReelForComments(item);
                setCommentsModalOpen(true);
              }}
            />
          </View>
        )}
      />

      {selectedReelForComments && (
        <ReelCommentsModal
          isOpen={commentsModalOpen}
          reelId={selectedReelForComments.id}
          onClose={() => {
            setCommentsModalOpen(false);
            setSelectedReelForComments(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
});