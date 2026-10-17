import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/axiosClient';

interface MovieState {
  banners: any[];
  newestMovies: any[];
  shortFilms: any[];
  animations: any[];
  isLoading: boolean;
  isBackgroundSyncing: boolean;
  lastFetchedAt: number | null;
  fetchMovies: (isBackground?: boolean) => Promise<void>;
}

export const useMovieStore = create<MovieState>()(
  persist(
    (set, get) => ({
      banners: [],
      newestMovies: [],
      shortFilms: [],
      animations: [],
      isLoading: false,
      isBackgroundSyncing: false,
      lastFetchedAt: null,

      fetchMovies: async (isBackground = false) => {
        const { banners, newestMovies } = get();
        const hasCachedData = banners.length > 0 || newestMovies.length > 0;

        // اگر کش قبلی وجود نداشت، لودینگ اصلی فعال شود؛ در غیر این صورت فقط در پس‌زمینه کار کند
        if (!hasCachedData && !isBackground) {
          set({ isLoading: true });
        } else {
          set({ isBackgroundSyncing: true });
        }

        try {
          const [bannersRes, newestRes, shortsRes, animRes] = await Promise.allSettled([
            api.get('/movies/banners'),
            api.get('/movies/category/newest?page=1&pageSize=10'),
            api.get('/movies/category/short-film?page=1&pageSize=10'),
            api.get('/movies/category/animation?page=1&pageSize=10'),
          ]);

          const updates: Partial<MovieState> = {
            lastFetchedAt: Date.now(),
            isLoading: false,
            isBackgroundSyncing: false,
          };

          if (bannersRes.status === 'fulfilled') {
            updates.banners = bannersRes.value.data || [];
          }
          if (newestRes.status === 'fulfilled') {
            const data = newestRes.value.data;
            updates.newestMovies = Array.isArray(data) ? data : data?.items || [];
          }
          if (shortsRes.status === 'fulfilled') {
            const data = shortsRes.value.data;
            updates.shortFilms = Array.isArray(data) ? data : data?.items || [];
          }
          if (animRes.status === 'fulfilled') {
            const data = animRes.value.data;
            updates.animations = Array.isArray(data) ? data : data?.items || [];
          }

          set(updates);
        } catch (err) {
          console.error('Background sync failed:', err);
          set({ isLoading: false, isBackgroundSyncing: false });
        }
      },
    }),
    {
      name: 'pershot_movies_cache',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        banners: state.banners,
        newestMovies: state.newestMovies,
        shortFilms: state.shortFilms,
        animations: state.animations,
        lastFetchedAt: state.lastFetchedAt,
      }),
    }
  )
);