import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  ToastAndroid,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../src/api/axiosClient';
import EditProfileModal from '../../src/components/profile/EditProfileModal';
import ProfileHeader from '../../src/components/profile/ProfileHeader';
import ProfileTabs from '../../src/components/profile/ProfileTabs';
import QuickActions from '../../src/components/profile/QuickActions';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const fetchMyProfile = useCallback(async () => {
    try {
      const res = await api.get('/profile/me');
      if (res.data?.success || res.data?.data) {
        setProfile(res.data.data || res.data);
      }
    } catch {
      showToast('خطا در دریافت اطلاعات پروفایل');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMyProfile();
  }, [fetchMyProfile]);

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  const handleShare = async () => {
    if (!profile) return;
    try {
      await Share.share({
        message: `مشاهده پروفایل «${profile.name || profile.username}» در پرشات:\nhttps://pershot.ir/user/${profile.id}\n\nدانلود برنامه پرشات از مایکت:\nhttps://myket.ir/app/com.pershot.app`,
      });
    } catch { }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchMyProfile();
            }}
            tintColor="#14b8a6"
          />
        }
      >
        {/* ۱. کارت اطلاعات کاربری */}
        <ProfileHeader
          profile={profile}
          onEditClick={() => setIsEditing(true)}
          onShareClick={handleShare}
        />

        {/* ۲. دسترسی سریع */}
        <QuickActions roleCode={profile?.roleCode || 0} />

        {/* ۳. تب‌های آثار، کمپین‌ها و ذخیره‌ها */}
        <ProfileTabs profile={profile} />
      </ScrollView>

      {/* مدال ویرایش مشخصات پروفایل */}
      {isEditing && (
        <EditProfileModal
          profile={profile}
          onClose={() => setIsEditing(false)}
          onSuccess={(updated) => {
            setProfile(updated);
            setIsEditing(false);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#030712',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#030712',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 16,
    paddingBottom: 40,
  },
});