import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '../api/axiosClient';

// تنظیم رفتار نمایش اعلان هنگام باز بودن برنامه
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ساخت کانال نوتیفیکیشن اندروید با بالاترین اولویت صدا و ویبره
export async function setupNotificationChannelAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('chat-messages', {
      name: 'پیام‌های چت',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#14b8a6',
      enableVibrate: true,
      showBadge: true,
      // حذف رشته sound: 'default' برای جلوگیری از خطای فایل صوتی
    });
  }
}

// نمایش بنر اعلان فوری بالای صفحه
export async function showLocalNotificationAsync(title: string, body: string, data?: any) {
  try {
    await setupNotificationChannelAsync();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || 'پیام جدید در پرشات',
        body: body || 'یک پیام جدید دریافت کردید.',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 250, 250, 250],
        data: data || {},
        ...(Platform.OS === 'android' ? { channelId: 'chat-messages' } : {}),
      },
      trigger: null,
    });
    console.log('🔔 [Local Notification] بنر اعلان با موفقیت روی صفحه پرتاب شد');
  } catch (err) {
    console.error('❌ خطا در نمایش اعلان لوکال:', err);
  }
}

// دریافت توکن مستقیم FCM فایربیس و ارسال به بک‌اند
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return null;
  }

  await setupNotificationChannelAsync();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  try {
    const tokenResponse = await Notifications.getDevicePushTokenAsync();
    const pushToken = tokenResponse.data;

    if (pushToken) {
      console.log('🔥 [FCM Device Token]:', pushToken);
      await api.post('/chat/push-token', { token: pushToken });
      console.log('✅ [Push Token] با موفقیت در سرور ثبت شد');
    }

    return pushToken;
  } catch (error: any) {
    console.warn('خطا در دریافت توکن FCM:', error?.message);
    return null;
  }
}

export async function unregisterPushTokenAsync(): Promise<void> {
  try {
    await api.delete('/chat/push-token');
  } catch {}
}