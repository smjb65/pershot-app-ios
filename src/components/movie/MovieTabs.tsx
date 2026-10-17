import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import PagerView from 'react-native-pager-view';
import TabInfo from './tabs/TabInfo';
import TabSimilar from './tabs/TabSimilar';
import TabComments from './tabs/TabComments';

interface MovieTabsProps {
  movieId: string;
  movie: any;
  movieOwner: any;
  crewUsers: any[];
  onOpenImage: (url: string) => void;
  onPlayTrailer: () => void;
  onPlayBehindScene?: () => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function MovieTabs({
  movieId,
  movie,
  movieOwner,
  crewUsers,
  onOpenImage,
  onPlayTrailer,
  onPlayBehindScene,
  onToast,
}: MovieTabsProps) {
  const pagerRef = useRef<PagerView>(null);
  const [activeTab, setActiveTab] = useState(0);

  // نگهداری ارتفاع زنده و مجزای هر تب
  const [tabHeights, setTabHeights] = useState<{ [key: number]: number }>({
    0: 450,
    1: 450,
    2: 300,
  });

  const handleTabPress = (index: number) => {
    setActiveTab(index);
    pagerRef.current?.setPage(index);
  };

  const handleUpdateHeight = useCallback((index: number, height: number) => {
    if (height > 0) {
      setTabHeights((prev) => {
        // جلوگیری از ری‌رندرهای پی‌درپی با تفاوت‌های ناچیز
        if (Math.abs((prev[index] || 0) - height) < 5) return prev;
        return { ...prev, [index]: Math.ceil(height) };
      });
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* هدر تب‌ها */}
      <View style={styles.tabsHeader}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 0 && styles.tabButtonActive]}
          onPress={() => handleTabPress(0)}
        >
          <Text style={[styles.tabButtonText, activeTab === 0 && styles.tabButtonTextActive]}>
            داستان و اطلاعات
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 1 && styles.tabButtonActive]}
          onPress={() => handleTabPress(1)}
        >
          <Text style={[styles.tabButtonText, activeTab === 1 && styles.tabButtonTextActive]}>
            فیلم‌های مشابه
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 2 && styles.tabButtonActive]}
          onPress={() => handleTabPress(2)}
        >
          <Text style={[styles.tabButtonText, activeTab === 2 && styles.tabButtonTextActive]}>
            دیدگاه‌ها
          </Text>
        </TouchableOpacity>
      </View>

      {/* پیجر تب‌ها با ارتفاع داینامیک منطبق بر تب فعال */}
      <PagerView
        ref={pagerRef}
        style={[styles.pagerView, { height: tabHeights[activeTab] || 450 }]}
        initialPage={0}
        layoutDirection="rtl"
        onPageSelected={(e) => setActiveTab(e.nativeEvent.position)}
      >
        <View key="0" style={styles.pageWrapper}>
          <TabInfo
            movie={movie}
            movieOwner={movieOwner}
            crewUsers={crewUsers}
            onOpenImage={onOpenImage}
            onPlayTrailer={onPlayTrailer}
            onPlayBehindScene={onPlayBehindScene}
            onLayoutHeight={(h) => handleUpdateHeight(0, h)}
          />
        </View>

        <View key="1" style={styles.pageWrapper}>
          <TabSimilar
            movieId={movieId}
            movie={movie}
            onLayoutHeight={(h) => handleUpdateHeight(1, h)}
          />
        </View>

        <View key="2" style={styles.pageWrapper}>
          <TabComments
            movieId={movieId}
            onToast={onToast}
            onLayoutHeight={(h) => handleUpdateHeight(2, h)}
          />
        </View>
      </PagerView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
  },
  tabsHeader: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#14b8a6',
  },
  tabButtonText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabButtonTextActive: {
    color: '#14b8a6',
  },
  pagerView: {
    width: '100%',
    overflow: 'hidden',
  },
  pageWrapper: {
    width: '100%',
  },
});