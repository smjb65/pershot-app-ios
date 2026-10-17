import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, StyleSheet, View } from 'react-native';
import PagerView from 'react-native-pager-view';

import CustomBottomBar from '../../src/components/navigation/CustomBottomBar';
import CampaignsTabContent from '../../src/components/tabs/CampaignsTabContent';
import DirectsTabContent from '../../src/components/tabs/DirectsTabContent';
import FilmsTabContent from '../../src/components/tabs/FilmsTabContent';
import ProfileTabContent from '../../src/components/tabs/ProfileTabContent';
import ReelsTabContent from '../../src/components/tabs/ReelsTabContent';

export default function MainSwipeableScreen() {
  const pagerRef = useRef<PagerView>(null);
  const [activeTab, setActiveTab] = useState(4); // تب پیش‌فرض: فیلم‌ها (خانه)
  const [isPagerScrollEnabled, setIsPagerScrollEnabled] = useState(true);

  const params = useLocalSearchParams<{ tab?: string; reelId?: string }>();
  const lastSwitchTimeRef = useRef<number>(0);

  // متد قطعی جابجایی تب با setPage
  const switchTab = useCallback((index: number) => {
    const now = Date.now();
    if (now - lastSwitchTimeRef.current < 150) {
      return;
    }
    lastSwitchTimeRef.current = now;

    setActiveTab(index);

    setTimeout(() => {
      try {
        pagerRef.current?.setPage(index);
      } catch (err) {
        console.warn('⚠️ [PagerView] خطا در جابجایی تب:', err);
      }
    }, 60);
  }, []);

  const handleTabChange = (index: number) => {
    if (index === activeTab) {
      if (index === 2) {
        DeviceEventEmitter.emit('RELOAD_REELS_TAB');
      }
      return;
    }

    switchTab(index);
  };

  useEffect(() => {
    if (params.tab !== undefined) {
      const targetTab = Number(params.tab);
      if (!isNaN(targetTab) && targetTab >= 0 && targetTab <= 4) {
        switchTab(targetTab);
      }
    }
  }, [params.tab, switchTab]);

  useEffect(() => {
    const subReels = DeviceEventEmitter.addListener('NAVIGATE_TO_REELS_TAB', (data?: any) => {
      switchTab(2);
    });

    const subSwitch = DeviceEventEmitter.addListener('SWITCH_TAB', (tabIndex: number) => {
      if (typeof tabIndex === 'number' && tabIndex >= 0 && tabIndex <= 4) {
        switchTab(tabIndex);
      }
    });

    // 🟢 قفل کامل سوایپ زمانی که کاربر روی هر اسلایدری دست می‌کشد
    const subSwipe = DeviceEventEmitter.addListener('SET_PAGER_SWIPE', (enabled: boolean) => {
      setIsPagerScrollEnabled(enabled);
    });

    return () => {
      subReels.remove();
      subSwitch.remove();
      subSwipe.remove();
    };
  }, [switchTab]);

  return (
    <View style={styles.container}>
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={4}
        /* 🟢 در تب فیلم‌ها (۴) سوایپ پیجر کاملاً خاموش است تا با اسلایدرها تداخل نکند */
        scrollEnabled={isPagerScrollEnabled && activeTab !== 4}
        onPageSelected={(e) => setActiveTab(e.nativeEvent.position)}
      >
        <View key="0" style={styles.page}>
          <ProfileTabContent />
        </View>

        <View key="1" style={styles.page}>
          <DirectsTabContent />
        </View>

        <View key="2" style={styles.page}>
          <ReelsTabContent isTabActive={activeTab === 2} />
        </View>

        <View key="3" style={styles.page}>
          <CampaignsTabContent />
        </View>

        <View key="4" style={styles.page}>
          <FilmsTabContent isTabActive={activeTab === 4} />
        </View>
      </PagerView>

      <CustomBottomBar activeTab={activeTab} onSelectTab={handleTabChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  pagerView: {
    flex: 1,
    backgroundColor: '#030712',
  },
  page: {
    flex: 1,
    backgroundColor: '#030712',
  },
});