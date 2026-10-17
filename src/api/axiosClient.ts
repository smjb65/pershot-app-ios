import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ۱. آدرس پایه سرور به همراه پیشوند v1
export const BASE_URL = 'https://api.pershot.ir';
export const MOVIE_STREAM_URL = 'https://movie.pershot.ir';
export const API_URL = `${BASE_URL}/api/v1`;

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('pershot_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const getMediaUrl = (path?: string | null): string => {
  if (!path) return '';

  let finalUrl = '';

  // ۱. اگر آدرس از قبل کامل بود اما شامل فایل‌های ویدیویی HLS است،
  // دامنه api.pershot.ir را به movie.pershot.ir تغییر می‌دهیم
  if (path.startsWith('http://') || path.startsWith('https://')) {
    if (
      path.includes('/hls/') ||
      path.endsWith('.m3u8') ||
      path.endsWith('.ts')
    ) {
      finalUrl = path.replace(BASE_URL, MOVIE_STREAM_URL);
    } else {
      finalUrl = path;
    }
  } else {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    // ۲. استریم فایل‌های HLS از طریق ساب‌دامین CDN کش‌شده
    if (
      cleanPath.includes('/hls/') ||
      cleanPath.endsWith('.m3u8') ||
      cleanPath.endsWith('.ts')
    ) {
      finalUrl = `${MOVIE_STREAM_URL}${cleanPath}`;
    } else {
      finalUrl = `${BASE_URL}${cleanPath}`;
    }
  }

  // 🟢 لاگ کنسول برای نمایش آدرس نهایی که به پلیر داده می‌شود
  if (finalUrl.includes('/hls/') || finalUrl.endsWith('.m3u8')) {
    console.log('🎬 [VIDEO_STREAM_URL]:', {
      originalPath: path,
      resolvedUrl: finalUrl,
      isUsingMovieSubdomain: finalUrl.startsWith(MOVIE_STREAM_URL),
    });
  }

  return finalUrl;
};

export const toFarsiDigits = (num: number | string | undefined | null): string => {
  if (num === undefined || num === null) return '۰';
  const str = num.toString();
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (d) => farsiDigits[parseInt(d, 10)]);
};