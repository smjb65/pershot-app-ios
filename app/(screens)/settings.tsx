import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Platform,
  ToastAndroid,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Settings,
  ShieldCheck,
  Bell,
  LogOut,
  ChevronLeft,
  AlertTriangle,
} from 'lucide-react-native';
import { api } from '../../src/api/axiosClient';
import { useAuthStore } from '../../src/store/authStore';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const logout = useAuthStore((state) => state.logout);

  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    }
  };

  const executeLogout = async () => {
    try {
      setIsLoggingOut(true);

      // ۱. ابطال توکن در بک‌اند
      try {
        await api.post('/auth/logout');
      } catch {}

      // ۲. پاک‌سازی توکن از AsyncStorage و ریست استیت سراسری
      await logout();

      showToast('با موفقیت از حساب خارج شدید');
      setShowLogoutAlert(false);

      // ۳. روت دقیق لاگین طبق ساختار اکسپو روت
      router.replace('/(auth)/login' as any);

    } catch {
      showToast('خطا در فرایند خروج');
    } finally {
      setIsLoggingOut(false);
      setShowLogoutAlert(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* هدر صفحه */}
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <View style={styles.headerIconBox}>
            <Settings size={20} color="#94a3b8" />
          </View>
          <Text style={styles.headerTitle}>تنظیمات حساب کاربری</Text>
        </View>

        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <ChevronLeft size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* آیتم غیرفعال: امنیت و تغییر رمز عبور */}
          <TouchableOpacity
            style={[styles.itemBtn, styles.disabledItem]}
            activeOpacity={1}
            disabled={true}
          >
            <View style={styles.itemRight}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(20, 184, 166, 0.12)' }]}>
                <ShieldCheck size={18} color="#14b8a6" />
              </View>
              <View style={styles.titleContainer}>
                <Text style={[styles.itemTitle, styles.disabledText]}>
                  امنیت و تغییر رمز عبور
                </Text>
                <View style={styles.soonBadge}>
                  <Text style={styles.soonBadgeText}>به‌زودی</Text>
                </View>
              </View>
            </View>
            <ChevronLeft size={16} color="#334155" />
          </TouchableOpacity>

          {/* آیتم غیرفعال: تنظیمات اعلان‌ها */}
          <TouchableOpacity
            style={[styles.itemBtn, styles.disabledItem]}
            activeOpacity={1}
            disabled={true}
          >
            <View style={styles.itemRight}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                <Bell size={18} color="#f59e0b" />
              </View>
              <View style={styles.titleContainer}>
                <Text style={[styles.itemTitle, styles.disabledText]}>
                  تنظیمات اعلان‌ها
                </Text>
                <View style={styles.soonBadge}>
                  <Text style={styles.soonBadgeText}>به‌زودی</Text>
                </View>
              </View>
            </View>
            <ChevronLeft size={16} color="#334155" />
          </TouchableOpacity>

          {/* جداکننده */}
          <View style={styles.divider} />

          {/* دکمه خروج از حساب کاربری */}
          <TouchableOpacity
            style={styles.logoutBtn}
            activeOpacity={0.75}
            onPress={() => setShowLogoutAlert(true)}
            disabled={isLoggingOut}
          >
            <View style={styles.itemRight}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(244, 63, 94, 0.15)' }]}>
                <LogOut size={18} color="#f43f5e" />
              </View>
              <Text style={styles.logoutTitle}>خروج از حساب کاربری</Text>
            </View>
            <ChevronLeft size={16} color="#f43f5e" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* مدال تایید خروج (SweetAlert2 Style) */}
      <Modal
        visible={showLogoutAlert}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutAlert(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.swalCard}>
            <View style={styles.swalIconContainer}>
              <AlertTriangle size={36} color="#f59e0b" />
            </View>
            <Text style={styles.swalTitle}>خروج از حساب کاربری</Text>
            <Text style={styles.swalMessage}>آیا از خروج از حساب کاربری خود اطمینان دارید؟</Text>

            <View style={styles.swalButtonRow}>
              <TouchableOpacity
                style={styles.swalCancelBtn}
                activeOpacity={0.7}
                onPress={() => setShowLogoutAlert(false)}
                disabled={isLoggingOut}
              >
                <Text style={styles.swalCancelText}>انصراف</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.swalConfirmBtn}
                activeOpacity={0.8}
                onPress={executeLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.swalConfirmText}>بله، خارج شو</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(13, 21, 32, 0.85)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 14,
    color: '#ffffff',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#0d1520',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    gap: 8,
  },
  itemBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  disabledItem: {
    opacity: 0.5,
  },
  itemRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  itemTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 12.5,
    color: '#e2e8f0',
  },
  disabledText: {
    color: '#94a3b8',
  },
  soonBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  soonBadgeText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 9.5,
    color: '#64748b',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 6,
  },
  logoutBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
  },
  logoutTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 12.5,
    color: '#f43f5e',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  swalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#0d1520',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 22,
    alignItems: 'center',
  },
  swalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  swalTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 15,
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  swalMessage: {
    fontFamily: 'Ravi-Regular',
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  swalButtonRow: {
    flexDirection: 'row-reverse',
    width: '100%',
    gap: 10,
  },
  swalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swalCancelText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 12,
    color: '#94a3b8',
  },
  swalConfirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f43f5e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swalConfirmText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 12,
    color: '#ffffff',
  },
});