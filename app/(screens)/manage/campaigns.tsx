import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  ToastAndroid,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Layers, Search, ChevronLeft } from 'lucide-react-native';
import { api, getMediaUrl } from '../../../src/api/axiosClient';

interface CampaignManageItem {
  id: string;
  titleFa: string;
  mainPosterUrl: string;
  fundingGoal: number;
  currentFunding: number;
  createdAt: string;
}

export default function ManageCampaignsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [campaigns, setCampaigns] = useState<CampaignManageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  const fetchCampaigns = useCallback(async (searchQuery = '') => {
    try {
      setLoading(true);
      const res = await api.get('/projects/manage-list', {
        params: { search: searchQuery, page: 1, pageSize: 50 },
      });
      setCampaigns(res.data?.items || res.data || []);
    } catch {
      showToast('خطا در دریافت لیست کمپین‌ها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCampaigns(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, fetchCampaigns]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <View style={styles.headerIconBox}>
            <Layers size={20} color="#38bdf8" />
          </View>
          <View>
            <Text style={styles.headerTitle}>لیست کل کمپین‌ها</Text>
            <Text style={styles.headerSubtitle}>مدیریت وضعیت پیشرفت مالی</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.backBtn} activeOpacity={0.7} onPress={() => router.back()}>
          <ChevronLeft size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Search size={16} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="جستجوی عنوان کمپین..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#38bdf8" />
        </View>
      ) : campaigns.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>کمپینی یافت نشد.</Text>
        </View>
      ) : (
        <FlatList
          data={campaigns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const percent = item.fundingGoal
              ? Math.min(Math.round(((item.currentFunding || 0) / item.fundingGoal) * 100), 100)
              : 0;

            return (
              <View style={styles.card}>
                <Image
                  source={{ uri: getMediaUrl(item.mainPosterUrl) }}
                  style={styles.poster}
                  contentFit="cover"
                />

                <View style={styles.details}>
                  <Text style={styles.titleText}>{item.titleFa}</Text>
                  <Text style={styles.goalText}>
                    هدف: {(item.fundingGoal || 0).toLocaleString('fa-IR')} تومان
                  </Text>

                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${percent}%` }]} />
                    </View>
                    <Text style={styles.percentText}>{percent}٪</Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: 'Ravi-Regular', fontSize: 12, color: '#64748b' },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(13, 21, 32, 0.85)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: 'Ravi-Bold', fontSize: 13.5, color: '#ffffff' },
  headerSubtitle: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#94a3b8', textAlign: 'right' },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: { flex: 1, fontFamily: 'Ravi-Regular', fontSize: 12, color: '#ffffff', textAlign: 'right' },
  listContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#0d1520',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    gap: 12,
  },
  poster: { width: 50, height: 70, borderRadius: 12, backgroundColor: '#030712' },
  details: { flex: 1, gap: 4 },
  titleText: { fontFamily: 'Ravi-Bold', fontSize: 12.5, color: '#ffffff', textAlign: 'right' },
  goalText: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#94a3b8', textAlign: 'right' },
  progressContainer: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 2 },
  progressBar: { flex: 1, height: 5, backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#38bdf8', borderRadius: 3 },
  percentText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 10, color: '#38bdf8' },
});