import * as FileSystem from 'expo-file-system';

const CACHE_DIR = `${FileSystem.cacheDirectory}reels_video_cache/`;
const CACHE_EXPIRY_MS = 10 * 60 * 1000; // ۱۰ دقیقه

export const getCachedVideoUri = async (remoteUrl: string): Promise<string> => {
  if (!remoteUrl || typeof remoteUrl !== 'string') return '';
  if (!remoteUrl.startsWith('http')) return remoteUrl;

  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }

    const fileName = remoteUrl.split('/').pop()?.split('?')[0] || `reel_${Date.now()}.mp4`;
    const localFileUri = `${CACHE_DIR}${fileName}`;
    const fileInfo = await FileSystem.getInfoAsync(localFileUri);

    if (fileInfo.exists && fileInfo.modificationTime) {
      const fileAge = Date.now() - fileInfo.modificationTime * 1000;
      if (fileAge < CACHE_EXPIRY_MS) {
        return localFileUri;
      } else {
        await FileSystem.deleteAsync(localFileUri, { idempotent: true });
      }
    }

    const downloadRes = await FileSystem.downloadAsync(remoteUrl, localFileUri);
    if (downloadRes?.uri) {
      return downloadRes.uri;
    }
    return remoteUrl;
  } catch (error) {
    return remoteUrl;
  }
};