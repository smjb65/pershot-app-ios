import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageSquare } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'expo-router';
import DirectList from '../direct/DirectList';

export default function DirectsTabContent() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore() as any;
  const router = useRouter();

  // استخراج شناسه کاربر جاری برای تفکیک پیام‌های ارسالی و دریافتی
  const currentUserId =
    user?.id ||
    user?.sub ||
    user?.userId ||
    user?.data?.id ||
    user?.data?.sub;

  const handleOpenChat = (selectedUser: any) => {
    const targetId = selectedUser?.id || selectedUser?.contactId;
    if (targetId) {
      router.push(`/(screens)/chat/${targetId}` as any);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>

      {/* نمایش مستقیم و بدون قفل لیست گفتگوها */}
      <DirectList
        currentUserId={currentUserId}
        onSelectUser={handleOpenChat}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
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
  headerRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 13.5,
    color: '#ffffff',
  },
  headerSubtitle: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'right',
  },
});