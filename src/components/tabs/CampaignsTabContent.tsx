import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X, Rocket, Sparkles } from 'lucide-react-native';
import { api, getMediaUrl, toFarsiDigits } from '../../api/axiosClient';

export default function CampaignsTabContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // سیستم جستجو
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSearch, setActiveSearch] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const isFetchingRef = useRef(false);

  const fetchCampaigns = useCallback(
    async (currentPage: number, searchStr: string, isReset = false) => {
      if (isFetchingRef.current) return;
      try {
        isFetchingRef.current = true;
        setLoading(true);

        const res = await api.get('/projects/explore', {
          params: { page: currentPage, limit: 10, search: searchStr },
        });

        const newItems = res.data?.items || [];
        setCampaigns((prev) => (isReset ? newItems : [...prev, ...newItems]));
        setHasMore(res.data?.hasMore ?? newItems.length >= 10);
      } catch (err) {
        console.error('Error fetching campaigns:', err);
        setHasMore(false);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
        isFetchingRef.current = false;
      }
    },
    []
  );

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchCampaigns(1, '', true);
  }, [fetchCampaigns]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setPage(1);
    setHasMore(true);
    fetchCampaigns(1, activeSearch, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore && !isFetchingRef.current) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchCampaigns(nextPage, activeSearch, false);
    }
  };

  const handleExecuteSearch = () => {
    const q = searchQuery.trim();
    setActiveSearch(q);
    setPage(1);
    setHasMore(true);
    fetchCampaigns(1, q, true);
    setIsSearchOpen(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
    setPage(1);
    setHasMore(true);
    fetchCampaigns(1, '', true);
  };

  useEffect(() => {
    if (isSearchOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  const renderItem = ({ item }: { item: any }) => {
    const fundingPercent = item.fundingGoal
      ? Math.min(Math.round(((item.currentFunding || 0) / item.fundingGoal) * 100), 100)
      : 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => router.push(`/(screens)/campaigns/${item.id}` as any)}
      >
        <View style={styles.posterWrapper}>
          <Image
            source={{ uri: getMediaUrl(item.mainPosterUrl) }}
            style={styles.poster}
            contentFit="cover"
            transition={150}
          />
          {item.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category}</Text>
            </View>
          )}
          {item.currentStage && (
            <View style={styles.stageBadge}>
              <Text style={styles.stageBadgeText}>{item.currentStage}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.title} numberOfLines={1}>
            {item.titleFa}
          </Text>
          <Text numberOfLines={2} style={styles.synopsis}>
            {item.shortSynopsis || 'خلاصه‌ای برای این اثر ثبت نشده است.'}
          </Text>

          {/* نوار پیشرفت جذب سرمایه */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTopRow}>
              <Text style={styles.progressLabel}>پیشرفت جذب سرمایه</Text>
              <Text style={styles.progressPercentText}>{toFarsiDigits(fundingPercent)}٪</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${fundingPercent}%` }]} />
            </View>
            <View style={styles.progressBottomRow}>
              <Text style={styles.currentFundingText}>
                {toFarsiDigits((item.currentFunding || 0).toLocaleString('fa-IR'))} تومان
              </Text>
              <Text style={styles.goalText}>
                هدف: {toFarsiDigits((item.fundingGoal || 0).toLocaleString('fa-IR'))} تومان
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      {/* هدر بالای صفحه */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.topSearchBtn}
          activeOpacity={0.8}
          onPress={() => setIsSearchOpen(true)}
        >
          <Search size={18} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>کمپین‌های جذب سرمایه</Text>
          <Text style={styles.headerSubtitle}>تامین مالی جمعی پروژه‌های سینمای مستقل</Text>
        </View>
      </View>

      {/* بنر وضعیت جستجوی فعال */}
      {activeSearch ? (
        <View style={styles.activeSearchBanner}>
          <Text style={styles.activeSearchText} numberOfLines={1}>
            نتایج جستجو برای: <Text style={styles.activeSearchWord}>«{activeSearch}»</Text>
          </Text>
          <TouchableOpacity
            style={styles.clearSearchBtn}
            activeOpacity={0.75}
            onPress={handleClearSearch}
          >
            <Text style={styles.clearSearchBtnText}>پاکسازی</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* لیست کمپین‌ها با اسکرول بی‌نهایت */}
      <FlatList
        data={campaigns}
        keyExtractor={(item, idx) => item.id || idx.toString()}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#14b8a6"
            colors={['#14b8a6']}
            progressBackgroundColor="#0f172a"
          />
        }
        ListFooterComponent={
          loading && page > 1 ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#14b8a6" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Rocket size={44} color="#334155" />
              <Text style={styles.emptyTitle}>کمپینی یافت نشد</Text>
              <Text style={styles.emptySubtitle}>
                {activeSearch
                  ? 'موردی مطابق با عبارت جستجوی شما وجود ندارد.'
                  : 'در حال حاضر کمپین فعالی ثبت نشده است.'}
              </Text>
            </View>
          ) : (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#14b8a6" />
            </View>
          )
        }
      />

      {/* مدال جستجوی پاپ‌آپ */}
      <Modal
        visible={isSearchOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSearchOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.searchModalBackdrop}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsSearchOpen(false)}
          />
          <View style={[styles.searchBarCard, { marginTop: insets.top + 14 }]}>
            <View style={styles.inputSearchBox}>
              <Search size={18} color="#14b8a6" />
              <TextInput
                ref={searchInputRef}
                style={styles.searchTextInput}
                placeholder="جستجو در بین کمپین‌های تامین مالی..."
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                onSubmitEditing={handleExecuteSearch}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                  <X size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.searchActionBtn,
                !searchQuery.trim() && styles.searchActionBtnDisabled,
              ]}
              activeOpacity={0.8}
              disabled={!searchQuery.trim()}
              onPress={handleExecuteSearch}
            >
              <Text style={styles.searchActionBtnText}>جستجو</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeSearchBtn}
              activeOpacity={0.7}
              onPress={() => setIsSearchOpen(false)}
            >
              <X size={18} color="#cbd5e1" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#030712',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitleBox: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Ravi-Black',
    textAlign: 'right',
  },
  headerSubtitle: {
    color: '#64748b',
    fontSize: 10,
    fontFamily: 'Ravi-Regular',
    marginTop: 2,
    textAlign: 'right',
  },
  topSearchBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSearchBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  activeSearchText: {
    color: '#5eead4',
    fontFamily: 'Ravi-Regular',
    fontSize: 11,
    flex: 1,
    textAlign: 'right',
  },
  activeSearchWord: {
    color: '#ffffff',
    fontFamily: 'Ravi-Bold',
  },
  clearSearchBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 6,
  },
  clearSearchBtnText: {
    color: '#e2e8f0',
    fontFamily: 'Ravi-Bold',
    fontSize: 10,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#0d1520',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  posterWrapper: {
    width: '100%',
    aspectRatio: 16 / 10,
    position: 'relative',
    backgroundColor: '#080d14',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(3, 7, 18, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.4)',
  },
  categoryBadgeText: {
    color: '#2dd4bf',
    fontFamily: 'Ravi-Bold',
    fontSize: 9.5,
  },
  stageBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(3, 7, 18, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  stageBadgeText: {
    color: '#fbbf24',
    fontFamily: 'Ravi-Bold',
    fontSize: 9.5,
  },
  cardBody: {
    padding: 14,
    gap: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Ravi-Bold',
    textAlign: 'right',
  },
  synopsis: {
    color: '#94a3b8',
    fontSize: 11.5,
    fontFamily: 'Ravi-Regular',
    textAlign: 'right',
    lineHeight: 18,
  },
  progressContainer: {
    gap: 5,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  progressTopRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    color: '#cbd5e1',
    fontSize: 10,
    fontFamily: 'Ravi-Regular',
  },
  progressPercentText: {
    color: '#2dd4bf',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: 'bold',
  },
  progressBar: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#14b8a6',
  },
  progressBottomRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  currentFundingText: {
    color: '#2dd4bf',
    fontSize: 10,
    fontFamily: 'Ravi-Bold',
  },
  goalText: {
    color: '#64748b',
    fontSize: 9.5,
    fontFamily: 'Ravi-Regular',
  },
  centerContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Ravi-Bold',
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'Ravi-Regular',
  },
  searchModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  searchBarCard: {
    width: '100%',
    backgroundColor: '#080d14',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.4)',
    borderRadius: 20,
    padding: 8,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  inputSearchBox: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    height: 44,
    gap: 8,
  },
  searchTextInput: {
    flex: 1,
    color: '#ffffff',
    fontFamily: 'Ravi-Regular',
    fontSize: 12,
    textAlign: 'right',
    height: '100%',
  },
  searchActionBtn: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchActionBtnDisabled: {
    opacity: 0.5,
  },
  searchActionBtnText: {
    color: '#030712',
    fontFamily: 'Ravi-Bold',
    fontSize: 12,
  },
  closeSearchBtn: {
    width: 38,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
});