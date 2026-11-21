import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, DeviceEventEmitter, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import * as Application from 'expo-application';
import * as NavigationBar from 'expo-navigation-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-reanimated';

import { ChatProvider } from '../src/context/ChatContext';
import { registerForPushNotificationsAsync } from '../src/utils/notificationService';
import { api } from '../src/api/axiosClient';
import UpdateModal from '../src/components/common/UpdateModal';

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  initialRouteName: '(auth)/login',
};

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [splashTimerDone, setSplashTimerDone] = useState(false);

  const [updateInfo, setUpdateInfo] = useState<any>(null);

  const [fontsLoaded, fontError] = useFonts({
    'Ravi-Regular': require('../assets/fonts/Ravi-Regular.ttf'),
    'Ravi-Bold': require('../assets/fonts/Ravi-Bold.ttf'),
    'Ravi-Black': require('../assets/fonts/Ravi-ExtraBlack.ttf'),
  });

  useEffect(() => {
    // قفل پیش‌فرض روی عمودی تا فقط پلیر ویدیو به افقی بچرخد
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});

    if (Platform.OS === 'android') {
      try {
        NavigationBar.setPositionAsync('absolute').catch(() => {});
        NavigationBar.setBackgroundColorAsync('#00000000').catch(() => {});
      } catch {}
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashTimerDone(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const currentVersionCode = Number(Application.nativeBuildVersion || 4);
        const res = await api.get('/chat/version-check');
        const data = res.data;

        if (data) {
          const isMinBroken = currentVersionCode < Number(data.minSupportedVersionCode);
          const hasNewerVersion = currentVersionCode < Number(data.latestVersionCode);
          const isForce = Boolean(data.isForceUpdate) || isMinBroken;

          if (isForce) {
            setUpdateInfo({ ...data, isForce: true });
          } else if (hasNewerVersion) {
            setUpdateInfo({ ...data, isForce: false });
          }
        }
      } catch {
        console.log('Version check offline or bypassed');
      }
    };

    checkVersion();
  }, []);

  const checkToken = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('pershot_token');
      const hasValidToken = Boolean(token);
      setIsAuthenticated(hasValidToken);
      return hasValidToken;
    } catch {
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    checkToken();
  }, [checkToken]);

  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotificationsAsync();
    }

    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const senderId = data?.senderId || data?.userId;
      if (senderId) {
        router.push(`/(screens)/chat/${senderId}` as any);
      }
    });

    return () => {
      responseListener.remove();
    };
  }, [isAuthenticated, router]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('AUTH_STATE_CHANGED', (status: boolean) => {
      setIsAuthenticated(status);
    });
    return () => sub.remove();
  }, []);

  const isAppReady = Boolean((fontsLoaded || fontError) && isAuthChecked && splashTimerDone);

  useEffect(() => {
    if (isAppReady) {
      SplashScreen.hideAsync().catch(() => {});

      if (!updateInfo?.isForce) {
        AsyncStorage.getItem('pershot_token').then((token) => {
          const inAuthGroup = segments[0] === '(auth)';
          if (!token && !inAuthGroup) {
            router.replace('/(auth)/login');
          } else if (token && inAuthGroup) {
            router.replace('/(tabs)');
          }
        });
      }
    }
  }, [isAppReady, updateInfo, segments, router]);

  return (
    <GestureHandlerRootView style={styles.rootContainer}>
      <SafeAreaProvider>
        <ChatProvider>
          <View style={styles.rootContainer}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#030712' },
                animation: Platform.OS === 'ios' ? 'default' : 'fade',
                ...(Platform.OS === 'android' ? { statusBarColor: '#030712' } : {}),
              }}
            >
              {!isAuthenticated ? (
                <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
              ) : (
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              )}
              <Stack.Screen name="(screens)/chat/[userId]" options={{ headerShown: false }} />
              <Stack.Screen name="(screens)/campaigns/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="category/[slug]" options={{ headerShown: false }} />
              <Stack.Screen name="movie/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="user/[id]" options={{ headerShown: false }} />
            </Stack>

            {updateInfo && (
              <UpdateModal
                visible={Boolean(updateInfo)}
                isForce={Boolean(updateInfo.isForce)}
                title={updateInfo.title}
                message={updateInfo.message}
                releaseNotes={updateInfo.releaseNotes}
                bazaarUrl={updateInfo.bazaarUrl}
                sibappUrl={updateInfo.sibappUrl}
                directDownloadUrl={updateInfo.directDownloadUrl}
                onDismiss={() => setUpdateInfo(null)}
              />
            )}
          </View>
          <StatusBar style="light" backgroundColor="#030712" />
        </ChatProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#030712',
  },
});