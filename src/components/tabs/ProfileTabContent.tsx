import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { api } from '../../api/axiosClient';
import EditProfileModal from '../profile/EditProfileModal';
import FollowListModal from '../profile/FollowListModal';
import ProfileHeader from '../profile/ProfileHeader';
import ProfileTabs from '../profile/ProfileTabs';
import QuickActions from '../profile/QuickActions';

export default function ProfileTabContent() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null);

  const fetchMyProfile = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('pershot_token');
      // اگر کاربر لاگین نیست، درخواستی ارسال نکن
      if (!token) {
        setIsLoading(false);
        return;
      }

      const res = await api.get('/profile/me');
      if (res.data?.success || res.data?.data) {
        const fetchedProfile = res.data.data || res.data;
        setProfile(fetchedProfile);
      }
    } catch (err: any) {
      console.log('Error fetching profile details:', err?.response?.data || err.message);
      // اگر خطای ۴۰۱ نبود (مثلاً ۴۰۴ یا ۵۰۰)، خطا را نمایش بده
      if (err?.response?.status !== 401) {
        showToast('خطا در دریافت اطلاعات پروفایل');
      }
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
        message: `پروفایل «${profile.name || profile.username}» در برنامه پرشات:\nhttps://pershot.ir/user/${profile.id}\n\nدانلود برنامه پرشات از مایکت:\nhttps://myket.ir/app/com.pershot.app`,
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
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
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
        <ProfileHeader
          profile={profile}
          onEditClick={() => setIsEditing(true)}
          onShareClick={handleShare}
          onFollowClick={(type) => setFollowModal(type)}
        />

        <QuickActions
          roleCode={profile?.roleCode ?? profile?.RoleCode ?? profile?.role ?? profile?.Role}
          profile={profile}
        />
        <ProfileTabs profile={profile} />
      </ScrollView>

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

      {followModal && (
        <FollowListModal
          type={followModal}
          onClose={() => setFollowModal(null)}
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
    gap: 14,
    paddingBottom: 125,
  },
});