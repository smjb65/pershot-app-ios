import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight, UserX } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../src/api/axiosClient';

import PublicProfileHeader from '../../src/components/public-profile/PublicProfileHeader';
import PublicProfileTabs from '../../src/components/public-profile/PublicProfileTabs';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.get(`/profile/${id}`);
      if (res.data?.success || res.data?.data) {
        setProfile(res.data.data || res.data);
      } else {
        setProfile(res.data);
      }
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  // هدایت مستقیم به صفحه چت اختصاصی کاربر
  const handleMessageClick = () => {
    if (!profile?.id) return;
    router.push(`/(screens)/chat/${profile.id}` as any);
  };

  const handleShare = async () => {
    if (!profile) return;
    try {
      await Share.share({
        message: `مشاهده پروفایل «${profile.name || profile.username}» در پرشات:\nhttps://pershot.ir/user/${profile.username || profile.id}\n\nدانلود برنامه پرشات از مایکت:\nhttps://myket.ir/app/com.pershot.app`,
      });
    } catch { }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.notFoundBox}>
          <UserX size={44} color="#64748b" />
          <Text style={styles.notFoundTitle}>حساب کاربری یافت نشد</Text>
          <Text style={styles.notFoundDesc}>
            کاربری با این مشخصات یافت نشد یا حساب کاربری مربوطه حذف شده است.
          </Text>
          <TouchableOpacity
            style={styles.backHomeBtn}
            activeOpacity={0.8}
            onPress={() => router.back()}
          >
            <Text style={styles.backHomeBtnText}>بازگشت</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false, contentStyle: { backgroundColor: '#030712' } }} />

      {/* هدر بالای صفحه با دکمه بازگشت */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.75} onPress={() => router.back()}>
          <ArrowRight size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {profile?.name || `@${profile?.username}`}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchProfile();
            }}
            tintColor="#14b8a6"
            colors={['#14b8a6']}
            progressBackgroundColor="#0f172a"
          />
        }
      >
        {/* ۱. کارت اطلاعات، بیو، آواتار و دکمه‌های چت و اشتراک‌گذاری */}
        <PublicProfileHeader
          profile={profile}
          onMessageClick={handleMessageClick}
          onShareClick={handleShare}
        />

        {/* ۲. تب‌های فیلم‌ها، ریلز و کمپین‌های این کاربر */}
        <PublicProfileTabs userId={profile.id} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#030712',
  },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#030712',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Ravi-Bold',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#030712',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  notFoundBox: {
    alignItems: 'center',
    gap: 10,
  },
  notFoundTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Ravi-Bold',
  },
  notFoundDesc: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'Ravi-Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
  backHomeBtn: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 8,
  },
  backHomeBtnText: {
    color: '#030712',
    fontFamily: 'Ravi-Bold',
    fontSize: 12,
  },
});