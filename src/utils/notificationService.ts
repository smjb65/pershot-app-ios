import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '../api/axiosClient';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function setupNotificationChannelAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('chat-messages', {
      name: 'پیام‌های چت',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#14b8a6',
      enableVibrate: true,
      showBadge: true,
    });
  }
}

export async function showLocalNotificationAsync(title: string, body: string, data?: any) {
  try {
    await setupNotificationChannelAsync();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || 'پیام جدید در پرشات',
        body: body || 'یک پیام جدید دریافت کردید.',
        sound: true,
        data: data || {},
        ...(Platform.OS === 'android'
          ? {
              priority: Notifications.AndroidNotificationPriority.MAX,
              vibrate: [0, 250, 250, 250],
              channelId: 'chat-messages',
            }
          : {}),
      },
      trigger: null,
    });
  } catch (err) {
    console.error('❌ خطا در نمایش اعلان لوکال:', err);
  }
}

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
      await api.post('/chat/push-token', {
        token: pushToken,
        platform: Platform.OS,
      });
    }

    return pushToken;
  } catch (error: any) {
    console.warn('خطا در دریافت توکن Push:', error?.message);
    return null;
  }
}

export async function unregisterPushTokenAsync(): Promise<void> {
  try {
    await api.delete('/chat/push-token');
  } catch {}
}