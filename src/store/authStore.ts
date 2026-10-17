import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/axiosClient';
import { useChatStore } from './chatStore';

interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar: string;
  roleCode?: number;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  
  login: async (token, userData) => {
    await AsyncStorage.setItem('pershot_token', token);
    set({ token, user: userData, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    // 🟢 ۱. قبل از پاک کردن توکن لوکال، صراحتاً به سرور دستور می‌دهیم توکن نوتیفیکیشن این کاربر را از ردیس حذف کند
    try {
      await api.delete('/chat/push-token');
    } catch (err) {
      console.log('Failed to delete push token from server:', err);
    }

    // 🟢 ۲. پس از تایید سرور، حافظه کش چت‌ها را به طور کامل پاک می‌کنیم تا پیام‌های اکانت قبلی دیده نشوند
    try {
      await AsyncStorage.removeItem('pershot_chat_storage');
      useChatStore.setState({ messagesByContact: {}, recentChats: [], activeContactId: null });
    } catch {}

    // 🟢 ۳. در نهایت توکن احراز هویت را از گوشی حذف کرده و کاربر را خارج می‌کنیم
    await AsyncStorage.removeItem('pershot_token');
    set({ token: null, user: null, isAuthenticated: false, isLoading: false });
  },

  loadStoredAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('pershot_token');
      if (token) {
        const res = await api.get('/profile/me');
        if (res.data?.success || res.data?.data) {
          set({ token, user: res.data.data, isAuthenticated: true, isLoading: false });
          return;
        }
      }
    } catch {
      await AsyncStorage.removeItem('pershot_token');
    }
    set({ token: null, user: null, isAuthenticated: false, isLoading: false });
  },
}));