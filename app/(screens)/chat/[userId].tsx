import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight, UserX } from 'lucide-react-native';
import { api } from '../../../src/api/axiosClient';
import { useAuthStore } from '../../../src/store/authStore';
import { useChatStore } from '../../../src/store/chatStore';
import ChatRoom from '../../../src/components/direct/ChatRoom';

export default function DirectChatScreen() {
  const params = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { user } = useAuthStore() as any;
  const recentChats = useChatStore((state) => state.recentChats);

  const rawUserId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const currentUserId = user?.id || user?.sub || user?.userId;

  // 🟢 استخراج فوری مشخصات از کش لیست دایرکت برای صفر کردن زمان باز شدن
  const cachedContact = useMemo(() => {
    if (!rawUserId) return null;
    return recentChats.find(
      (c) => String(c.id || c.contactId).toLowerCase() === String(rawUserId).toLowerCase()
    );
  }, [rawUserId, recentChats]);

  const [targetUser, setTargetUser] = useState<any>(cachedContact || { id: rawUserId });

  // جلوگیری از چت با خود
  useEffect(() => {
    if (
      rawUserId &&
      currentUserId &&
      String(rawUserId).toLowerCase() === String(currentUserId).toLowerCase()
    ) {
      Alert.alert('پیام‌رسان پرشات', 'امکان ارسال پیام و گفتگو با حساب کاربری خودتان وجود ندارد.', [
        { text: 'متوجه شدم', onPress: () => router.back() },
      ]);
    }
  }, [rawUserId, currentUserId, router]);

  // دریافت اطلاعات تکمیلی در پس‌زمینه بدون مسدود کردن صفحه
  const syncTargetUserProfile = useCallback(async () => {
    if (!rawUserId) return;

    try {
      const res = await api.post('/profile/users/batch', [rawUserId]);
      const userList = Array.isArray(res.data)
        ? res.data
        : res.data?.data || res.data?.items || [];

      if (userList.length > 0 && userList[0]?.id) {
        setTargetUser((prev: any) => ({ ...prev, ...userList[0] }));
      } else {
        const singleRes = await api.get(`/profile/${rawUserId}`);
        const singleUser = singleRes.data?.data || singleRes.data;
        if (singleUser && (singleUser.id || singleUser.userId)) {
          setTargetUser((prev: any) => ({ ...prev, ...singleUser }));
        }
      }
    } catch {
      // در صورت خطا همان کش قبلی حفظ می‌شود
    }
  }, [rawUserId]);

  useEffect(() => {
    syncTargetUserProfile();
  }, [syncTargetUserProfile]);

  if (!rawUserId) {
    return (
      <View style={styles.centerContainer}>
        <UserX size={40} color="#64748b" />
        <Text style={styles.errorText}>کاربر مورد نظر یافت نشد.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronRight size={18} color="#030712" />
          <Text style={styles.backBtnText}>بازگشت</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 🟢 حذف کامل صفحه لودینگ و رندر فوری چت‌روم
  return (
    <View style={styles.container}>
      <ChatRoom
        selectedUser={targetUser}
        currentUserId={currentUserId}
        onBack={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070c14',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#070c14',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  errorText: {
    color: '#cbd5e1',
    fontFamily: 'Ravi-Bold',
    fontSize: 13,
  },
  backBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#14b8a6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 8,
  },
  backBtnText: {
    color: '#030712',
    fontFamily: 'Ravi-Bold',
    fontSize: 12,
  },
});