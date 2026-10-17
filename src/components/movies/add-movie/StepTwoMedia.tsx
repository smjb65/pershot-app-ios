import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
  Alert,
  Linking,
  Image as RNImage,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle } from 'react-native-svg';
import {
  Upload,
  Video,
  Film,
  Trash2,
  CheckCircle2,
  Layers,
  Sparkles,
  Lock,
  AlertCircle,
  Zap,
  Clock,
  FolderOpen,
  Images,
  X,
  RefreshCw,
  Pause,
  Play,
  HelpCircle,
  RectangleVertical,
  RectangleHorizontal,
  CheckSquare,
  Square,
  ShieldCheck,
  ExternalLink,
  Globe,
} from 'lucide-react-native';
import { api, getMediaUrl, toFarsiDigits } from '../../../../src/api/axiosClient';

let FileSystem: any;
try {
  FileSystem = require('expo-file-system/legacy');
} catch {
  try {
    FileSystem = require('expo-file-system');
  } catch {}
}

let notifeeModule: any = null;
try {
  notifeeModule = require('@notifee/react-native').default;
} catch {}

// 🟢 آیکون اختصاصی SVG کروم (جلوگیری از کرش ناشی از undefined بودن آیکون در lucide)
function ChromeIcon({ size = 18, color = '#f59e0b' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Circle cx="12" cy="12" r="4" />
      <Path d="M21.17 8H12" />
      <Path d="M3.95 6.06L8.54 14" />
      <Path d="M10.88 21.94L15.46 14" />
    </Svg>
  );
}

// تبدیل ایمن Base64 یک قطعه ۲ مگابایتی به آرایه باینری بدون پر کردن رم
function base64ToUint8Array(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const clean = base64.replace(/[\r\n]+/g, '');
  let padding = 0;
  if (clean.endsWith('==')) padding = 2;
  else if (clean.endsWith('=')) padding = 1;

  const byteLength = (clean.length * 3) / 4 - padding;
  const bytes = new Uint8Array(byteLength);
  let p = 0;

  for (let i = 0; i < clean.length; i += 4) {
    const enc1 = chars.indexOf(clean.charAt(i));
    const enc2 = chars.indexOf(clean.charAt(i + 1));
    const enc3 = chars.indexOf(clean.charAt(i + 2));
    const enc4 = chars.indexOf(clean.charAt(i + 3));

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    bytes[p++] = chr1;
    if (enc3 !== 64 && p < byteLength) bytes[p++] = chr2;
    if (enc4 !== 64 && p < byteLength) bytes[p++] = chr3;
  }
  return bytes;
}

type PickerTarget =
  | 'video'
  | 'videoResume'
  | 'trailer'
  | 'trailerResume'
  | 'posterVertical'
  | 'posterHorizontal'
  | 'behind';

interface StepTwoProps {
  movieId?: string | null;
  videoAsset: any | null;
  setVideoAsset: (asset: any | null) => void;
  trailerAsset: any | null;
  setTrailerAsset: (asset: any | null) => void;
  posterVerticalAsset: any | null;
  setPosterVerticalAsset: (asset: any | null) => void;
  posterHorizontalAsset: any | null;
  setPosterHorizontalAsset: (asset: any | null) => void;
  behindVideoAsset?: any | null;
  setBehindVideoAsset?: (asset: any | null) => void;
  behindImages: any[];
  setBehindImages: (assets: any[]) => void;
  existingMedia?: {
    videoUrl?: string | null;
    trailerUrl?: string | null;
    posters?: string[];
    mainPosterUrl?: string;
    behindSceneVideoUrl?: string | null;
    behindSceneImages?: string[];
  };
  setExistingMedia?: (media: any) => void;
  isVideoLocked?: boolean;
  isRejected?: boolean;
  errors: any;
  setErrors: (errors: any) => void;
  submitting: boolean;
  uploadLabel?: string;
  onBack: () => void;
  onSubmit: () => void;
}

const CHUNK_SIZE = 2 * 1024 * 1024; // قطعات ۲ مگابایتی

export default function StepTwoMedia({
  movieId,
  videoAsset,
  setVideoAsset,
  trailerAsset,
  setTrailerAsset,
  posterVerticalAsset,
  setPosterVerticalAsset,
  posterHorizontalAsset,
  setPosterHorizontalAsset,
  behindImages,
  setBehindImages,
  existingMedia,
  setExistingMedia,
  isVideoLocked = false,
  isRejected = false,
  errors,
  setErrors,
  submitting,
  onBack,
  onSubmit,
}: StepTwoProps) {
  const [isTrailerOnly, setIsTrailerOnly] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // استیت مدال راهنمای آپلود در وب و مرورگر کروم
  const [webUploadAlertVisible, setWebUploadAlertVisible] = useState(false);

  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [activeTarget, setActiveTarget] = useState<PickerTarget | null>(null);

  // استیت‌های ویدیوی اصلی (Resumable)
  const [optimisticVideoStatus, setOptimisticVideoStatus] = useState<
    'idle' | 'uploading' | 'paused' | 'merging' | 'completed' | 'error'
  >('idle');
  const [optimisticVideoProgress, setOptimisticVideoProgress] = useState(0);
  const [videoUploadedBytes, setVideoUploadedBytes] = useState(0);
  const [videoTotalBytes, setVideoTotalBytes] = useState(0);
  const [optimisticVideoSpeed, setOptimisticVideoSpeed] = useState('');
  const [optimisticVideoTimeRemaining, setOptimisticVideoTimeRemaining] = useState('');
  const [optimisticVideoUploadedUrl, setOptimisticVideoUploadedUrl] = useState<string | null>(null);
  const [pendingVideoMeta, setPendingVideoMeta] = useState<{
    uploadId: string;
    fileName: string;
    fileSize: number;
    uri?: string;
  } | null>(null);

  // استیت‌های تیزر (Resumable)
  const [optimisticTrailerStatus, setOptimisticTrailerStatus] = useState<
    'idle' | 'uploading' | 'paused' | 'merging' | 'completed' | 'error'
  >('idle');
  const [optimisticTrailerProgress, setOptimisticTrailerProgress] = useState(0);
  const [trailerUploadedBytes, setTrailerUploadedBytes] = useState(0);
  const [trailerTotalBytes, setTrailerTotalBytes] = useState(0);
  const [optimisticTrailerSpeed, setOptimisticTrailerSpeed] = useState('');
  const [optimisticTrailerTimeRemaining, setOptimisticTrailerTimeRemaining] = useState('');
  const [optimisticTrailerUploadedUrl, setOptimisticTrailerUploadedUrl] = useState<string | null>(null);
  const [pendingTrailerMeta, setPendingTrailerMeta] = useState<{
    uploadId: string;
    fileName: string;
    fileSize: number;
    uri?: string;
  } | null>(null);

  const videoPauseFlagRef = useRef(false);
  const videoAbortXhrRef = useRef<XMLHttpRequest | null>(null);
  const isVideoLoopRunningRef = useRef(false);

  const trailerPauseFlagRef = useRef(false);
  const trailerAbortXhrRef = useRef<XMLHttpRequest | null>(null);
  const isTrailerLoopRunningRef = useRef(false);

  const existingBehindImgs = existingMedia?.behindSceneImages || [];
  const existingVerticalPoster = existingMedia?.mainPosterUrl || '';
  const existingHorizontalPoster =
    existingMedia?.posters && existingMedia.posters.length > 0 ? existingMedia.posters[0] : '';

  const storageKeyVideo = `pershot_pending_video_${movieId || 'draft'}`;
  const storageKeyTrailer = `pershot_pending_trailer_${movieId || 'draft'}`;

  // نمایش مدال توصیه به وب در هنگام ورود به صفحه
  useEffect(() => {
    const timer = setTimeout(() => {
      setWebUploadAlertVisible(true);
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  // بررسی وضعیت فایل‌های آپلود نشده قبلی
  useEffect(() => {
    const checkPendingUploads = async () => {
      try {
        const savedVideoStr = await AsyncStorage.getItem(storageKeyVideo);
        if (savedVideoStr && !existingMedia?.videoUrl) {
          const meta = JSON.parse(savedVideoStr);
          const res = await api.get(`/upload/resumable/status/${meta.uploadId}`);
          const chunks: number[] = res.data?.uploadedChunks || [];
          if (chunks.length > 0 && meta.fileSize > 0) {
            const uploaded = chunks.reduce((acc, idx) => {
              const start = idx * CHUNK_SIZE;
              const end = Math.min(start + CHUNK_SIZE, meta.fileSize);
              return acc + (end - start);
            }, 0);
            const percent = Math.min(99, Math.floor((uploaded / meta.fileSize) * 100));
            setPendingVideoMeta(meta);
            setVideoTotalBytes(meta.fileSize);
            setVideoUploadedBytes(uploaded);
            setOptimisticVideoProgress(percent);
            setOptimisticVideoStatus('paused');
          } else {
            await AsyncStorage.removeItem(storageKeyVideo);
          }
        }
      } catch {
        await AsyncStorage.removeItem(storageKeyVideo).catch(() => {});
      }

      try {
        const savedTrailerStr = await AsyncStorage.getItem(storageKeyTrailer);
        if (savedTrailerStr && !existingMedia?.trailerUrl) {
          const meta = JSON.parse(savedTrailerStr);
          const res = await api.get(`/upload/resumable/status/${meta.uploadId}`);
          const chunks: number[] = res.data?.uploadedChunks || [];
          if (chunks.length > 0 && meta.fileSize > 0) {
            const uploaded = chunks.reduce((acc, idx) => {
              const start = idx * CHUNK_SIZE;
              const end = Math.min(start + CHUNK_SIZE, meta.fileSize);
              return acc + (end - start);
            }, 0);
            const percent = Math.min(99, Math.floor((uploaded / meta.fileSize) * 100));
            setPendingTrailerMeta(meta);
            setTrailerTotalBytes(meta.fileSize);
            setTrailerUploadedBytes(uploaded);
            setOptimisticTrailerProgress(percent);
            setOptimisticTrailerStatus('paused');
          } else {
            await AsyncStorage.removeItem(storageKeyTrailer);
          }
        }
      } catch {
        await AsyncStorage.removeItem(storageKeyTrailer).catch(() => {});
      }
    };

    checkPendingUploads();

    return () => {
      videoPauseFlagRef.current = true;
      trailerPauseFlagRef.current = true;
      if (videoAbortXhrRef.current) videoAbortXhrRef.current.abort();
      if (trailerAbortXhrRef.current) trailerAbortXhrRef.current.abort();
      cancelNotification('pershot_video_upload_notif');
      cancelNotification('pershot_trailer_upload_notif');
    };
  }, []);

  const updateNotification = async (notifId: string, title: string, percent: number, speed: string, timeRemaining: string) => {
    if (Platform.OS !== 'android' || !notifeeModule) return;
    try {
      await notifeeModule.createChannel({
        id: 'pershot_media_channel',
        name: 'آپلود رسانه‌های پرشات',
        importance: 2,
      });

      await notifeeModule.displayNotification({
        id: notifId,
        title,
        body: `${toFarsiDigits(percent)}٪ • سرعت: ${speed} • باقیمانده: ${timeRemaining}`,
        android: {
          channelId: 'pershot_media_channel',
          ongoing: percent < 100,
          onlyAlertOnce: true,
          progress: { max: 100, current: percent },
        },
      });
    } catch {}
  };

  const cancelNotification = async (notifId: string) => {
    if (Platform.OS !== 'android' || !notifeeModule) return;
    try {
      await notifeeModule.cancelNotification(notifId);
    } catch {}
  };

  const formatBytesFa = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '۰ مگابایت';
    const mb = (bytes / (1024 * 1024)).toFixed(1);
    return `${toFarsiDigits(mb)} مگابایت`;
  };

  const generateUploadId = (fileName: string, fileSize: number) => {
    const cleanName = (fileName || 'video').replace(/[^a-zA-Z0-9_-]/g, '');
    return `mob_${cleanName}_${fileSize}`;
  };

  const sendChunkBinary = (
    url: string,
    payloadBody: any,
    uploadId: string,
    chunkIndex: number,
    authToken: string | undefined,
    xhrRef: React.MutableRefObject<XMLHttpRequest | null>
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.setRequestHeader('X-Upload-Id', uploadId);
      xhr.setRequestHeader('X-Chunk-Index', chunkIndex.toString());
      if (authToken) {
        xhr.setRequestHeader('Authorization', authToken);
      }

      xhr.onload = () => {
        xhrRef.current = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`HTTP_${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        xhrRef.current = null;
        reject(new Error('NETWORK_ERROR'));
      };

      xhr.onabort = () => {
        xhrRef.current = null;
        reject(new Error('UPLOAD_PAUSED'));
      };

      xhr.send(payloadBody);
    });
  };

  // 🚀 موتور آپلود تکه‌ای بدون مصرف رم (خواندن ۲ مگابایت در هر مرحله مستقیماً از دیسک)
  const executeResumableUpload = async (
    asset: any,
    folder: 'videos' | 'trailers',
    mediaType: 'video' | 'trailer',
    storageKey: string,
    onProgress: (percent: number, loaded: number, total: number, speed: string, remaining: string) => void,
    xhrRef: React.MutableRefObject<XMLHttpRequest | null>,
    pauseFlagRef: React.MutableRefObject<boolean>,
    loopRunningRef: React.MutableRefObject<boolean>,
    setStatus: (s: 'idle' | 'uploading' | 'paused' | 'merging' | 'completed' | 'error') => void
  ): Promise<string> => {
    // اگر حلقه قبلی هنوز در حال بسته شدن است، کمی صبر می‌کنیم تا تداخل ایجاد نشود
    if (loopRunningRef.current) {
      await new Promise((r) => setTimeout(r, 350));
    }

    loopRunningRef.current = true;
    pauseFlagRef.current = false;
    setStatus('uploading');

    try {
      let totalBytes = asset.size || asset.fileSize || 0;
      if (!totalBytes && FileSystem?.getInfoAsync) {
        try {
          const info = await FileSystem.getInfoAsync(asset.uri, { size: true });
          if (info?.size) totalBytes = info.size;
        } catch {}
      }

      const fileName = asset.name || asset.fileName || asset.uri.split('/').pop() || `${mediaType}.mp4`;
      const totalChunks = Math.ceil(totalBytes / CHUNK_SIZE);
      const uploadId = generateUploadId(fileName, totalBytes);

      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify({
          uploadId,
          fileName,
          fileSize: totalBytes,
          uri: asset.uri,
        })
      );

      let uploadedChunks: number[] = [];
      try {
        const statusRes = await api.get(`/upload/resumable/status/${uploadId}`);
        uploadedChunks = statusRes.data?.uploadedChunks || [];
      } catch {
        uploadedChunks = [];
      }

      let totalUploadedBytes = uploadedChunks.reduce((acc, idx) => {
        const start = idx * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalBytes);
        return acc + (end - start);
      }, 0);

      const initialPercent = Math.min(99, Math.floor((totalUploadedBytes / Math.max(totalBytes, 1)) * 100));
      onProgress(initialPercent, totalUploadedBytes, totalBytes, 'آماده‌سازی...', '---');

      let rawBase = (api.defaults.baseURL || 'https://api.pershot.ir').replace(/\/$/, '');
      const chunkEndpoint = rawBase.endsWith('/api/v1')
        ? `${rawBase}/upload/resumable/chunk`
        : `${rawBase}/api/v1/upload/resumable/chunk`;

      const authHeader =
        (api.defaults.headers.common['Authorization'] as string) ||
        (await AsyncStorage.getItem('pershot_token').then((t) => (t ? `Bearer ${t}` : undefined)));

      const startTime = Date.now();
      let sessionBytesUploaded = 0;

      for (let i = 0; i < totalChunks; i++) {
        if (pauseFlagRef.current) {
          setStatus('paused');
          throw new Error('UPLOAD_PAUSED');
        }

        if (uploadedChunks.includes(i)) continue;

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalBytes);
        const chunkBytesLength = end - start;

        // خواندن فقط همین تکه ۲ مگابایتی از روی حافظه گوشی (بدون بارگذاری کل ویدیو در رم!)
        const chunkBase64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: 'base64',
          position: start,
          length: chunkBytesLength,
        });

        if (pauseFlagRef.current) {
          setStatus('paused');
          throw new Error('UPLOAD_PAUSED');
        }

        const binaryBuffer = base64ToUint8Array(chunkBase64);

        try {
          await sendChunkBinary(chunkEndpoint, binaryBuffer.buffer, uploadId, i, authHeader, xhrRef);
        } catch (err: any) {
          if (err?.message === 'UPLOAD_PAUSED' || pauseFlagRef.current) {
            setStatus('paused');
            throw new Error('UPLOAD_PAUSED');
          }
          setStatus('error');
          throw err;
        }

        uploadedChunks.push(i);
        totalUploadedBytes += chunkBytesLength;
        sessionBytesUploaded += chunkBytesLength;

        const elapsedSec = Math.max(0.3, (Date.now() - startTime) / 1000);
        const speedBps = sessionBytesUploaded / elapsedSec;

        let speedStr = `${toFarsiDigits((speedBps / 1024).toFixed(0))} کیلوبایت/ثانیه`;
        if (speedBps >= 1024 * 1024) {
          speedStr = `${toFarsiDigits((speedBps / (1024 * 1024)).toFixed(1))} مگابایت/ثانیه`;
        }

        const remainingBytes = Math.max(0, totalBytes - totalUploadedBytes);
        const remainingSec = Math.round(remainingBytes / Math.max(speedBps, 1));
        let timeRemainingStr = `${toFarsiDigits(remainingSec)} ثانیه`;
        if (remainingSec >= 60) {
          timeRemainingStr = `${toFarsiDigits(Math.floor(remainingSec / 60))} دقیقه و ${toFarsiDigits(remainingSec % 60)} ثانیه`;
        }

        const percent = Math.min(99, Math.floor((totalUploadedBytes / totalBytes) * 100));
        onProgress(percent, totalUploadedBytes, totalBytes, speedStr, timeRemainingStr);
      }

      setStatus('merging');
      const mergeRes = await api.post('/upload/resumable/merge', {
        uploadId,
        fileName,
        folder,
        totalParts: totalChunks,
        movieId: movieId || null,
        mediaType,
      });

      await AsyncStorage.removeItem(storageKey);
      return mergeRes.data?.url;
    } finally {
      loopRunningRef.current = false;
    }
  };

  const startVideoUpload = async (asset: any) => {
    videoPauseFlagRef.current = false;
    setVideoAsset(asset);
    setPendingVideoMeta(null);
    setOptimisticVideoStatus('uploading');
    if (errors.video) setErrors({ ...errors, video: null });

    try {
      const finalUrl = await executeResumableUpload(
        asset,
        'videos',
        'video',
        storageKeyVideo,
        (p, l, t, s, rem) => {
          setOptimisticVideoProgress(p);
          setVideoUploadedBytes(l);
          setVideoTotalBytes(t);
          setOptimisticVideoSpeed(s);
          setOptimisticVideoTimeRemaining(rem);
          updateNotification('pershot_video_upload_notif', 'آپلود ویدیوی اصلی اثر...', p, s, rem);
        },
        videoAbortXhrRef,
        videoPauseFlagRef,
        isVideoLoopRunningRef,
        setOptimisticVideoStatus
      );

      if (finalUrl) {
        setOptimisticVideoUploadedUrl(finalUrl);
        setOptimisticVideoStatus('completed');
        setOptimisticVideoProgress(100);
        cancelNotification('pershot_video_upload_notif');

        if (movieId) {
          api.patch(`/movies/${movieId}/media`, { videoUrl: finalUrl }).catch(() => {});
        }
        if (setExistingMedia) {
          setExistingMedia((prev: any) => ({ ...prev, videoUrl: finalUrl }));
        }
      }
    } catch (err: any) {
      cancelNotification('pershot_video_upload_notif');
      if (err?.message === 'UPLOAD_PAUSED') {
        setOptimisticVideoStatus('paused');
      } else {
        setOptimisticVideoStatus('error');
      }
    }
  };

  const handlePauseVideo = () => {
    videoPauseFlagRef.current = true;
    if (videoAbortXhrRef.current) {
      try {
        videoAbortXhrRef.current.abort();
      } catch {}
      videoAbortXhrRef.current = null;
    }
    setOptimisticVideoStatus('paused');
    cancelNotification('pershot_video_upload_notif');
  };

  const handleResumeVideo = async () => {
    videoPauseFlagRef.current = false;

    if (videoAsset?.uri && FileSystem?.getInfoAsync) {
      try {
        const info = await FileSystem.getInfoAsync(videoAsset.uri, { size: true });
        if (info?.exists) {
          startVideoUpload({ ...videoAsset, size: videoAsset.size || info.size });
          return;
        }
      } catch {}
    }

    if (pendingVideoMeta?.uri && FileSystem?.getInfoAsync) {
      try {
        const info = await FileSystem.getInfoAsync(pendingVideoMeta.uri, { size: true });
        if (info?.exists) {
          startVideoUpload({
            uri: pendingVideoMeta.uri,
            name: pendingVideoMeta.fileName,
            size: pendingVideoMeta.fileSize || info.size,
          });
          return;
        }
      } catch {}
    }

    openPickerModal('videoResume');
  };

  const handleCancelAndReplaceVideo = async () => {
    videoPauseFlagRef.current = true;
    if (videoAbortXhrRef.current) {
      try {
        videoAbortXhrRef.current.abort();
      } catch {}
      videoAbortXhrRef.current = null;
    }

    await AsyncStorage.removeItem(storageKeyVideo).catch(() => {});
    setPendingVideoMeta(null);

    const urlToDelete = optimisticVideoUploadedUrl || existingMedia?.videoUrl;
    if (urlToDelete) {
      try {
        await api.delete('/upload/file', {
          params: { url: urlToDelete, movieId: movieId || null, mediaType: 'video' },
        });
      } catch {}
    }

    if (movieId) {
      api.patch(`/movies/${movieId}/media`, { clearVideo: true }).catch(() => {});
    }

    cancelNotification('pershot_video_upload_notif');
    setOptimisticVideoStatus('idle');
    setOptimisticVideoProgress(0);
    setVideoUploadedBytes(0);
    setVideoTotalBytes(0);
    setOptimisticVideoSpeed('');
    setOptimisticVideoTimeRemaining('');
    setOptimisticVideoUploadedUrl(null);
    setVideoAsset(null);
    if (setExistingMedia) {
      setExistingMedia((prev: any) => ({ ...prev, videoUrl: null }));
    }
  };

  const startTrailerUpload = async (asset: any) => {
    trailerPauseFlagRef.current = false;
    setTrailerAsset(asset);
    setPendingTrailerMeta(null);
    setOptimisticTrailerStatus('uploading');
    if (errors.trailer) setErrors({ ...errors, trailer: null });

    try {
      const finalUrl = await executeResumableUpload(
        asset,
        'trailers',
        'trailer',
        storageKeyTrailer,
        (p, l, t, s, rem) => {
          setOptimisticTrailerProgress(p);
          setTrailerUploadedBytes(l);
          setTrailerTotalBytes(t);
          setOptimisticTrailerSpeed(s);
          setOptimisticTrailerTimeRemaining(rem);
          updateNotification('pershot_trailer_upload_notif', 'آپلود تیزر اثر...', p, s, rem);
        },
        trailerAbortXhrRef,
        trailerPauseFlagRef,
        isTrailerLoopRunningRef,
        setOptimisticTrailerStatus
      );

      if (finalUrl) {
        setOptimisticTrailerUploadedUrl(finalUrl);
        setOptimisticTrailerStatus('completed');
        setOptimisticTrailerProgress(100);
        cancelNotification('pershot_trailer_upload_notif');

        if (movieId) {
          api.patch(`/movies/${movieId}/media`, { trailerUrl: finalUrl }).catch(() => {});
        }
        if (setExistingMedia) {
          setExistingMedia((prev: any) => ({ ...prev, trailerUrl: finalUrl }));
        }
      }
    } catch (err: any) {
      cancelNotification('pershot_trailer_upload_notif');
      if (err?.message === 'UPLOAD_PAUSED') {
        setOptimisticTrailerStatus('paused');
      } else {
        setOptimisticTrailerStatus('error');
      }
    }
  };

  const handlePauseTrailer = () => {
    trailerPauseFlagRef.current = true;
    if (trailerAbortXhrRef.current) {
      try {
        trailerAbortXhrRef.current.abort();
      } catch {}
      trailerAbortXhrRef.current = null;
    }
    setOptimisticTrailerStatus('paused');
    cancelNotification('pershot_trailer_upload_notif');
  };

  const handleResumeTrailer = async () => {
    trailerPauseFlagRef.current = false;

    if (trailerAsset?.uri && FileSystem?.getInfoAsync) {
      try {
        const info = await FileSystem.getInfoAsync(trailerAsset.uri, { size: true });
        if (info?.exists) {
          startTrailerUpload({ ...trailerAsset, size: trailerAsset.size || info.size });
          return;
        }
      } catch {}
    }

    if (pendingTrailerMeta?.uri && FileSystem?.getInfoAsync) {
      try {
        const info = await FileSystem.getInfoAsync(pendingTrailerMeta.uri, { size: true });
        if (info?.exists) {
          startTrailerUpload({
            uri: pendingTrailerMeta.uri,
            name: pendingTrailerMeta.fileName,
            size: pendingTrailerMeta.fileSize || info.size,
          });
          return;
        }
      } catch {}
    }

    openPickerModal('trailerResume');
  };

  const handleCancelAndReplaceTrailer = async () => {
    trailerPauseFlagRef.current = true;
    if (trailerAbortXhrRef.current) {
      try {
        trailerAbortXhrRef.current.abort();
      } catch {}
      trailerAbortXhrRef.current = null;
    }

    await AsyncStorage.removeItem(storageKeyTrailer).catch(() => {});
    setPendingTrailerMeta(null);

    const urlToDelete = optimisticTrailerUploadedUrl || existingMedia?.trailerUrl;
    if (urlToDelete) {
      try {
        await api.delete('/upload/file', {
          params: { url: urlToDelete, movieId: movieId || null, mediaType: 'trailer' },
        });
      } catch {}
    }

    if (movieId) {
      api.patch(`/movies/${movieId}/media`, { clearTrailer: true }).catch(() => {});
    }

    cancelNotification('pershot_trailer_upload_notif');
    setOptimisticTrailerStatus('idle');
    setOptimisticTrailerProgress(0);
    setTrailerUploadedBytes(0);
    setTrailerTotalBytes(0);
    setOptimisticTrailerSpeed('');
    setOptimisticTrailerTimeRemaining('');
    setOptimisticTrailerUploadedUrl(null);
    setTrailerAsset(null);
    if (setExistingMedia) {
      setExistingMedia((prev: any) => ({ ...prev, trailerUrl: null }));
    }
  };

  const openPickerModal = (target: PickerTarget) => {
    setActiveTarget(target);
    setPickerModalVisible(true);
  };

  const closePickerModal = () => {
    setPickerModalVisible(false);
    setActiveTarget(null);
  };

  const getImageDimensions = (asset: any): Promise<{ width: number; height: number }> => {
    if (asset.width && asset.height) {
      return Promise.resolve({ width: asset.width, height: asset.height });
    }
    return new Promise((resolve) => {
      RNImage.getSize(
        asset.uri,
        (w, h) => resolve({ width: w, height: h }),
        () => resolve({ width: 0, height: 0 })
      );
    });
  };

  const pickVideoAsset = async (source: 'gallery' | 'fileManager') => {
    if (source === 'gallery') {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
      if (!res.canceled && res.assets?.[0]) {
        const a = res.assets[0];
        let size = a.fileSize || 0;
        if (!size && FileSystem?.getInfoAsync) {
          try {
            const info = await FileSystem.getInfoAsync(a.uri, { size: true });
            size = info?.size || 0;
          } catch {}
        }
        return {
          uri: a.uri,
          name: a.fileName || a.uri.split('/').pop(),
          size,
          mimeType: a.mimeType || 'video/mp4',
        };
      }
      return null;
    } else {
      const res = await DocumentPicker.getDocumentAsync({ type: ['video/*'], copyToCacheDirectory: true });
      if (!res.canceled && res.assets?.[0]) {
        const a = res.assets[0];
        let size = a.size || 0;
        if (!size && FileSystem?.getInfoAsync) {
          try {
            const info = await FileSystem.getInfoAsync(a.uri, { size: true });
            size = info?.size || 0;
          } catch {}
        }
        return {
          uri: a.uri,
          name: a.name || a.uri.split('/').pop(),
          size,
          mimeType: a.mimeType || 'video/mp4',
        };
      }
      return null;
    }
  };

  const pickSingleImageAsset = async (source: 'gallery' | 'fileManager') => {
    if (source === 'gallery') {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
      if (!res.canceled && res.assets?.[0]) {
        const a = res.assets[0];
        return {
          uri: a.uri,
          name: a.fileName || a.uri.split('/').pop() || 'poster.jpg',
          mimeType: a.mimeType || 'image/jpeg',
          width: a.width,
          height: a.height,
        };
      }
      return null;
    } else {
      const res = await DocumentPicker.getDocumentAsync({ type: ['image/*'], copyToCacheDirectory: true });
      if (!res.canceled && res.assets?.[0]) {
        const a = res.assets[0];
        return {
          uri: a.uri,
          name: a.name || a.uri.split('/').pop() || 'poster.jpg',
          mimeType: a.mimeType || 'image/jpeg',
        };
      }
      return null;
    }
  };

  const handleSelectSource = async (source: 'gallery' | 'fileManager') => {
    const target = activeTarget;
    closePickerModal();
    if (!target) return;

    if (target === 'video') {
      const asset = await pickVideoAsset(source);
      if (asset) startVideoUpload(asset);
    } else if (target === 'videoResume') {
      const asset = await pickVideoAsset(source);
      if (!asset) return;

      if (
        pendingVideoMeta &&
        (asset.name !== pendingVideoMeta.fileName ||
          (asset.size && pendingVideoMeta.fileSize && asset.size !== pendingVideoMeta.fileSize))
      ) {
        Alert.alert(
          'فایل انتخابی متفاوت است!',
          `ویدیویی که قبلاً تا ${toFarsiDigits(optimisticVideoProgress)}٪ آپلود شده بود:\n${pendingVideoMeta.fileName}\n\nاما فایل فعلی:\n${asset.name}\n\nچگونه مایلید ادامه دهید؟`,
          [
            { text: 'انصراف', style: 'cancel' },
            {
              text: 'انتخاب مجدد فایل قبلی',
              onPress: () => openPickerModal('videoResume'),
            },
            {
              text: 'آپلود همین فایل از اول',
              style: 'destructive',
              onPress: async () => {
                await handleCancelAndReplaceVideo();
                startVideoUpload(asset);
              },
            },
          ]
        );
        return;
      }
      startVideoUpload(asset);
    } else if (target === 'trailer') {
      const asset = await pickVideoAsset(source);
      if (asset) startTrailerUpload(asset);
    } else if (target === 'trailerResume') {
      const asset = await pickVideoAsset(source);
      if (!asset) return;

      if (
        pendingTrailerMeta &&
        (asset.name !== pendingTrailerMeta.fileName ||
          (asset.size && pendingTrailerMeta.fileSize && asset.size !== pendingTrailerMeta.fileSize))
      ) {
        Alert.alert(
          'فایل تیزر متفاوت است!',
          `تیزری که قبلاً تا ${toFarsiDigits(optimisticTrailerProgress)}٪ آپلود شده بود:\n${pendingTrailerMeta.fileName}\n\nاما فایل فعلی:\n${asset.name}`,
          [
            { text: 'انصراف', style: 'cancel' },
            {
              text: 'انتخاب مجدد فایل قبلی',
              onPress: () => openPickerModal('trailerResume'),
            },
            {
              text: 'آپلود همین فایل از اول',
              style: 'destructive',
              onPress: async () => {
                await handleCancelAndReplaceTrailer();
                startTrailerUpload(asset);
              },
            },
          ]
        );
        return;
      }
      startTrailerUpload(asset);
    } else if (target === 'posterVertical') {
      const asset = await pickSingleImageAsset(source);
      if (!asset) return;
      const dims = await getImageDimensions(asset);
      if (dims.width > 0 && dims.height > 0 && dims.height <= dims.width) {
        Alert.alert(
          'خطا در نسبت تصویر پوستر عمودی',
          'پوستر عمودی (One-Sheet) باید عمودی باشد (ارتفاع تصویر باید بیشتر از عرض آن باشد). لطفاً تصویر مناسب را انتخاب کنید.'
        );
        return;
      }
      setPosterVerticalAsset(asset);
      if (errors.posterVertical) setErrors({ ...errors, posterVertical: null });
    } else if (target === 'posterHorizontal') {
      const asset = await pickSingleImageAsset(source);
      if (!asset) return;
      const dims = await getImageDimensions(asset);
      if (dims.width > 0 && dims.height > 0 && dims.width <= dims.height) {
        Alert.alert(
          'خطا در نسبت تصویر پوستر افقی',
          'پوستر افقی (بنر عریض / لابی‌کارت) باید افقی باشد (عرض تصویر باید بیشتر از ارتفاع آن باشد). لطفاً تصویر مناسب را انتخاب کنید.'
        );
        return;
      }
      setPosterHorizontalAsset(asset);
      if (errors.posterHorizontal) setErrors({ ...errors, posterHorizontal: null });
    } else if (target === 'behind') {
      const remaining = 15 - (existingBehindImgs.length + behindImages.length);
      if (remaining <= 0) return;

      if (source === 'gallery') {
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          quality: 0.85,
        });
        if (!res.canceled && res.assets) {
          setBehindImages([...behindImages, ...res.assets.slice(0, remaining)]);
        }
      } else {
        const res = await DocumentPicker.getDocumentAsync({
          type: ['image/*'],
          multiple: true,
          copyToCacheDirectory: true,
        });
        if (!res.canceled && res.assets) {
          setBehindImages([...behindImages, ...res.assets.slice(0, remaining)]);
        }
      }
    }
  };

  // 🌐 باز کردن آدرس در مرورگر گوگل کروم
  const openInChromeBrowser = async (url: string) => {
    try {
      if (Platform.OS === 'android') {
        const chromeIntentUrl = `googlechrome://navigate?url=${encodeURIComponent(url)}`;
        const canOpenChrome = await Linking.canOpenURL(chromeIntentUrl);
        if (canOpenChrome) {
          await Linking.openURL(chromeIntentUrl);
          return;
        }
      }
      await WebBrowser.openBrowserAsync(url, {
        toolbarColor: '#030712',
        controlsColor: '#14b8a6',
        secondaryToolbarColor: '#0c1222',
        enableBarCollapsing: true,
        showTitle: true,
      });
    } catch {
      Linking.openURL(url).catch(() => {});
    }
  };

  const handleOpenCommunityGuideline = () => {
    openInChromeBrowser('https://pershot.ir/community-guideline');
  };

  const handleOpenWebPlatform = () => {
    setWebUploadAlertVisible(false);
    openInChromeBrowser('https://pershot.ir/profile/movies');
  };

  const handleFormSubmit = () => {
    const newErrors: any = {};
    const hasVideo = isVideoLocked || optimisticVideoStatus === 'completed' || existingMedia?.videoUrl;
    const hasTrailer = optimisticTrailerStatus === 'completed' || trailerAsset || existingMedia?.trailerUrl;
    const hasVerticalPoster = Boolean(posterVerticalAsset || existingVerticalPoster);

    if (!isTrailerOnly && !hasVideo) newErrors.video = 'انتخاب یا وجود فایل اصلی فیلم الزامی است.';
    if (isTrailerOnly && !hasTrailer) newErrors.trailer = 'انتخاب یا وجود فایل تیزر الزامی است.';
    if (!hasVerticalPoster) newErrors.posterVertical = 'بارگذاری پوستر عمودی (One-Sheet) الزامی است.';
    if (!acceptedTerms) newErrors.terms = 'تایید قوانین و ضوابط جامعه پرشات الزامی است.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert('نقص اطلاعات', Object.values(newErrors)[0] as string);
      return;
    }

    if (
      optimisticVideoStatus === 'uploading' ||
      optimisticVideoStatus === 'merging' ||
      optimisticTrailerStatus === 'uploading' ||
      optimisticTrailerStatus === 'merging'
    ) {
      Alert.alert('صبر کنید', 'لطفاً تا اتمام کامل ارسال و پردازش فایل‌های ویدیویی منتظر بمانید.');
      return;
    }

    if (optimisticVideoStatus === 'paused' || optimisticTrailerStatus === 'paused') {
      Alert.alert('فایل متوقف شده', 'یکی از ویدیوها در حالت توقف است. لطفاً آن را ادامه داده یا حذف نمایید.');
      return;
    }

    setErrors({});
    onSubmit();
  };

  const isAnyBusy =
    optimisticVideoStatus === 'uploading' ||
    optimisticVideoStatus === 'merging' ||
    optimisticTrailerStatus === 'uploading' ||
    optimisticTrailerStatus === 'merging';

  return (
    <View style={styles.container}>
      {isVideoLocked ? (
        <View style={styles.lockInfoBanner}>
          <Lock size={18} color="#fbbf24" />
          <Text style={styles.lockInfoText}>
            این اثر تایید شده است؛ امکان تغییر فایل اصلی ویدیو وجود ندارد اما تیزر و پوسترها قابل ویرایش هستند.
          </Text>
        </View>
      ) : isRejected ? (
        <View style={styles.rejectedUnlockBanner}>
          <AlertCircle size={18} color="#f43f5e" />
          <Text style={styles.rejectedUnlockText}>
            این اثر رد شده است (مهلت اصلاح ۷ روزه). می‌توانید فایل ویدیوی اصلی را نیز اصلاح و مجدداً آپلود کنید.
          </Text>
        </View>
      ) : null}

      {!isVideoLocked && (
        <View style={styles.presentationCard}>
          <View style={styles.presentationHeader}>
            <Sparkles size={16} color="#f59e0b" />
            <Text style={styles.presentationTitle}>نوع ارائه ویدیوی اثر را انتخاب کنید:</Text>
          </View>

          <View style={styles.presentationRow}>
            <TouchableOpacity
              style={[styles.presBtn, !isTrailerOnly && styles.presBtnActive]}
              activeOpacity={0.8}
              onPress={() => {
                setIsTrailerOnly(false);
                if (errors.trailer) setErrors({ ...errors, trailer: null });
              }}
            >
              <CheckCircle2 size={16} color={!isTrailerOnly ? '#14b8a6' : '#64748b'} />
              <Text style={[styles.presBtnTitle, !isTrailerOnly && styles.presBtnTitleActive]}>
                نسخه کامل اثر + تیزر
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presBtn, isTrailerOnly && styles.presBtnActiveAmber]}
              activeOpacity={0.8}
              onPress={() => {
                setIsTrailerOnly(true);
                handleCancelAndReplaceVideo();
                if (errors.video) setErrors({ ...errors, video: null });
              }}
            >
              <CheckCircle2 size={16} color={isTrailerOnly ? '#f59e0b' : '#64748b'} />
              <Text style={[styles.presBtnTitle, isTrailerOnly && styles.presBtnTitleActiveAmber]}>
                صرفاً تیزر / آنونس
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ۱. فایل اصلی فیلم (Resumable Chunked Upload) */}
      {!isTrailerOnly && (
        <View style={[styles.mediaCard, errors.video && styles.mediaCardError]}>
          <View style={styles.mediaCardHeader}>
            <Video size={16} color="#14b8a6" />
            <Text style={styles.mediaCardTitle}>
              فایل اصلی فیلم {!isVideoLocked && <Text style={styles.requiredStar}>*</Text>}
            </Text>
          </View>

          {isVideoLocked ? (
            <View style={styles.lockedVideoBox}>
              <View style={styles.lockedVideoRight}>
                <Lock size={16} color="#94a3b8" />
                <Text style={styles.lockedVideoText} numberOfLines={1}>
                  {existingMedia?.videoUrl || 'ویدیوی تایید شده'}
                </Text>
              </View>
              <Text style={styles.lockedBadge}>قفل شده</Text>
            </View>
          ) : optimisticVideoStatus === 'uploading' ||
            optimisticVideoStatus === 'paused' ||
            optimisticVideoStatus === 'merging' ||
            optimisticVideoStatus === 'error' ? (
            <View
              style={[
                styles.optimisticCard,
                optimisticVideoStatus === 'paused' && { borderColor: 'rgba(245, 158, 11, 0.45)' },
                optimisticVideoStatus === 'error' && { borderColor: 'rgba(244, 63, 94, 0.45)' },
              ]}
            >
              <View style={styles.optimisticHeaderRow}>
                <View style={styles.optimisticFileMeta}>
                  {optimisticVideoStatus === 'uploading' || optimisticVideoStatus === 'merging' ? (
                    <ActivityIndicator size="small" color="#14b8a6" />
                  ) : optimisticVideoStatus === 'paused' ? (
                    <Pause size={16} color="#fbbf24" />
                  ) : (
                    <AlertCircle size={16} color="#f43f5e" />
                  )}
                  <Text style={styles.optimisticFileName} numberOfLines={1}>
                    {videoAsset?.name || pendingVideoMeta?.fileName || 'ویدیوی اصلی'}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.optimisticPercentText,
                    optimisticVideoStatus === 'paused' && { color: '#fbbf24' },
                  ]}
                >
                  {toFarsiDigits(optimisticVideoProgress)}٪
                </Text>
              </View>

              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${optimisticVideoProgress}%` },
                    optimisticVideoStatus === 'paused' && { backgroundColor: '#f59e0b' },
                    optimisticVideoStatus === 'error' && { backgroundColor: '#f43f5e' },
                  ]}
                />
              </View>

              <View style={styles.bytesStatusRow}>
                <Text style={styles.bytesLoadedText}>
                  {formatBytesFa(videoUploadedBytes)} از {formatBytesFa(videoTotalBytes)}
                </Text>
                <Text style={styles.statusLabelText}>
                  {optimisticVideoStatus === 'merging'
                    ? 'در حال نهایی‌سازی و ادغام در سرور...'
                    : optimisticVideoStatus === 'paused'
                    ? 'ارسال متوقف شد'
                    : optimisticVideoStatus === 'error'
                    ? 'ارتباط موقتاً قطع شد'
                    : 'در حال ارسال امن...'}
                </Text>
              </View>

              {(optimisticVideoStatus === 'paused' || optimisticVideoStatus === 'error') && (
                <View style={styles.resumeHelpBox}>
                  <View style={styles.resumeHelpHeader}>
                    <HelpCircle size={15} color="#fcd34d" />
                    <Text style={styles.resumeHelpTitle}>راهنمای ادامه ارسال:</Text>
                  </View>
                  <Text style={styles.resumeHelpText}>
                    تا این لحظه {formatBytesFa(videoUploadedBytes)} با موفقیت در سرور ذخیره شده است. کافی است دکمه «ادامه آپلود» را بزنید تا ادامه فایل از همان‌جا ارسال شود.
                  </Text>
                </View>
              )}

              {optimisticVideoStatus === 'uploading' && (
                <View style={styles.separatedStatsBox}>
                  <View style={styles.statSingleLine}>
                    <View style={styles.statLabelWrap}>
                      <Zap size={13} color="#14b8a6" />
                      <Text style={styles.statLineLabel}>سرعت ارسال:</Text>
                    </View>
                    <Text style={styles.statLineValue}>{optimisticVideoSpeed}</Text>
                  </View>
                  <View style={styles.statSingleLine}>
                    <View style={styles.statLabelWrap}>
                      <Clock size={13} color="#f59e0b" />
                      <Text style={styles.statLineLabel}>زمان تخمینی:</Text>
                    </View>
                    <Text style={styles.statLineValue}>{optimisticVideoTimeRemaining}</Text>
                  </View>
                </View>
              )}

              <View style={styles.optimisticFooterRow}>
                <TouchableOpacity style={styles.cancelUploadBtn} onPress={handleCancelAndReplaceVideo}>
                  <Trash2 size={13} color="#f43f5e" />
                  <Text style={styles.cancelUploadBtnText}>حذف و انتخاب فایل دیگر</Text>
                </TouchableOpacity>

                {optimisticVideoStatus === 'uploading' ? (
                  <TouchableOpacity style={styles.pauseBtn} onPress={handlePauseVideo}>
                    <Pause size={13} color="#fcd34d" />
                    <Text style={styles.pauseBtnText}>توقف موقت</Text>
                  </TouchableOpacity>
                ) : optimisticVideoStatus !== 'merging' ? (
                  <TouchableOpacity style={styles.resumeBtn} onPress={handleResumeVideo}>
                    <Play size={13} color="#030712" fill="#030712" />
                    <Text style={styles.resumeBtnText}>ادامه آپلود</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : optimisticVideoStatus === 'completed' || (existingMedia?.videoUrl && !videoAsset) ? (
            <View style={styles.completedVideoCard}>
              <View style={styles.completedVideoRight}>
                <CheckCircle2 size={18} color="#2dd4bf" />
                <View style={styles.completedVideoMeta}>
                  <Text style={styles.completedVideoTitle} numberOfLines={1}>
                    {videoAsset?.name || existingMedia?.videoUrl?.split('/').pop() || 'ویدیوی اصلی'}
                  </Text>
                  <Text style={styles.completedVideoBadge}>ویدیو با موفقیت بارگذاری و ذخیره شد ✓</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.replaceBtn} onPress={handleCancelAndReplaceVideo}>
                <RefreshCw size={13} color="#f43f5e" />
                <Text style={styles.replaceBtnText}>تغییر یا حذف</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadDashedBox}
              activeOpacity={0.8}
              onPress={() => openPickerModal('video')}
            >
              <Upload size={22} color="#14b8a6" />
              <Text style={styles.uploadBoxText}>انتخاب فایل ویدیویی فیلم (از گالری یا پوشه فایل‌ها)</Text>
              <Text style={styles.uploadBoxSubText}>
                پشتیبانی از MP4، MKV، MOV با قابلیت توقف و ادامه هوشمند
              </Text>
            </TouchableOpacity>
          )}
          {errors.video && <Text style={styles.errorText}>{errors.video}</Text>}
        </View>
      )}

      {/* ۲. تیزر تبلیغاتی (Resumable Chunked Upload) */}
      <View style={[styles.mediaCard, errors.trailer && styles.mediaCardError]}>
        <View style={styles.mediaCardHeader}>
          <Film size={16} color="#f59e0b" />
          <Text style={styles.mediaCardTitle}>
            تیزر تبلیغاتی {isTrailerOnly ? <Text style={styles.requiredStar}>* (الزامی)</Text> : '(اختیاری)'}
          </Text>
        </View>

        {optimisticTrailerStatus === 'uploading' ||
        optimisticTrailerStatus === 'paused' ||
        optimisticTrailerStatus === 'merging' ||
        optimisticTrailerStatus === 'error' ? (
          <View
            style={[
              styles.optimisticCard,
              { borderColor: 'rgba(245, 158, 11, 0.4)' },
              optimisticTrailerStatus === 'error' && { borderColor: 'rgba(244, 63, 94, 0.45)' },
            ]}
          >
            <View style={styles.optimisticHeaderRow}>
              <View style={styles.optimisticFileMeta}>
                {optimisticTrailerStatus === 'uploading' || optimisticTrailerStatus === 'merging' ? (
                  <ActivityIndicator size="small" color="#f59e0b" />
                ) : optimisticTrailerStatus === 'paused' ? (
                  <Pause size={16} color="#fbbf24" />
                ) : (
                  <AlertCircle size={16} color="#f43f5e" />
                )}
                <Text style={styles.optimisticFileName} numberOfLines={1}>
                  {trailerAsset?.name || pendingTrailerMeta?.fileName || 'تیزر تبلیغاتی'}
                </Text>
              </View>
              <Text style={[styles.optimisticPercentText, { color: '#fbbf24' }]}>
                {toFarsiDigits(optimisticTrailerProgress)}٪
              </Text>
            </View>

            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${optimisticTrailerProgress}%`, backgroundColor: '#f59e0b' },
                ]}
              />
            </View>

            <View style={styles.bytesStatusRow}>
              <Text style={[styles.bytesLoadedText, { color: '#fcd34d' }]}>
                {formatBytesFa(trailerUploadedBytes)} از {formatBytesFa(trailerTotalBytes)}
              </Text>
              <Text style={styles.statusLabelText}>
                {optimisticTrailerStatus === 'merging'
                  ? 'در حال نهایی‌سازی تیزر...'
                  : optimisticTrailerStatus === 'paused'
                  ? 'ارسال تیزر متوقف شد'
                  : optimisticTrailerStatus === 'error'
                  ? 'ارتباط موقتاً قطع شد'
                  : 'در حال ارسال امن...'}
              </Text>
            </View>

            {optimisticTrailerStatus === 'uploading' && (
              <View style={styles.separatedStatsBox}>
                <View style={styles.statSingleLine}>
                  <View style={styles.statLabelWrap}>
                    <Zap size={13} color="#f59e0b" />
                    <Text style={styles.statLineLabel}>سرعت ارسال:</Text>
                  </View>
                  <Text style={styles.statLineValue}>{optimisticTrailerSpeed}</Text>
                </View>
                <View style={styles.statSingleLine}>
                  <View style={styles.statLabelWrap}>
                    <Clock size={13} color="#f59e0b" />
                    <Text style={styles.statLineLabel}>زمان تخمینی:</Text>
                  </View>
                  <Text style={styles.statLineValue}>{optimisticTrailerTimeRemaining}</Text>
                </View>
              </View>
            )}

            <View style={styles.optimisticFooterRow}>
              <TouchableOpacity style={styles.cancelUploadBtn} onPress={handleCancelAndReplaceTrailer}>
                <Trash2 size={13} color="#f43f5e" />
                <Text style={styles.cancelUploadBtnText}>حذف و انتخاب فایل دیگر</Text>
              </TouchableOpacity>

              {optimisticTrailerStatus === 'uploading' ? (
                <TouchableOpacity style={styles.pauseBtn} onPress={handlePauseTrailer}>
                  <Pause size={13} color="#fcd34d" />
                  <Text style={styles.pauseBtnText}>توقف موقت</Text>
                </TouchableOpacity>
              ) : optimisticTrailerStatus !== 'merging' ? (
                <TouchableOpacity
                  style={[styles.resumeBtn, { backgroundColor: '#f59e0b' }]}
                  onPress={handleResumeTrailer}
                >
                  <Play size={13} color="#030712" fill="#030712" />
                  <Text style={styles.resumeBtnText}>ادامه آپلود</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : optimisticTrailerStatus === 'completed' || (existingMedia?.trailerUrl && !trailerAsset) ? (
          <View style={styles.completedVideoCard}>
            <View style={styles.completedVideoRight}>
              <CheckCircle2 size={18} color="#f59e0b" />
              <View style={styles.completedVideoMeta}>
                <Text style={styles.completedVideoTitle} numberOfLines={1}>
                  {trailerAsset?.name || existingMedia?.trailerUrl?.split('/').pop() || 'تیزر انتخابی'}
                </Text>
                <Text style={[styles.completedVideoBadge, { color: '#fbbf24' }]}>تیزر با موفقیت ذخیره شد ✓</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.replaceBtn} onPress={handleCancelAndReplaceTrailer}>
              <RefreshCw size={13} color="#f43f5e" />
              <Text style={styles.replaceBtnText}>تغییر یا حذف</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadDashedBox}
            activeOpacity={0.8}
            onPress={() => openPickerModal('trailer')}
          >
            <Upload size={22} color="#f59e0b" />
            <Text style={styles.uploadBoxText}>انتخاب فایل تیزر جدید (از گالری یا مدیریت فایل)</Text>
            <Text style={[styles.uploadBoxSubText, { color: '#f59e0b' }]}>
              با قابلیت توقف و ادامه هوشمند
            </Text>
          </TouchableOpacity>
        )}
        {errors.trailer && <Text style={styles.errorText}>{errors.trailer}</Text>}
      </View>

      {/* ۳. پوسترهای رسمی اثر (عمودی اجباری و افقی اختیاری) */}
      <View style={styles.mediaCard}>
        <View style={styles.mediaCardHeader}>
          <Film size={16} color="#14b8a6" />
          <Text style={styles.mediaCardTitle}>پوسترهای رسمی اثر</Text>
        </View>
        <Text style={styles.posterSubDescription}>
          بارگذاری پوستر عمودی (One-Sheet) الزامی بوده و پوستر افقی (Landscape Banner) اختیاری می‌باشد.
        </Text>

        {/* الف) پوستر عمودی (One-Sheet - اجباری) */}
        <View style={[styles.posterSlotBox, errors.posterVertical && styles.mediaCardError]}>
          <View style={styles.posterSlotHeader}>
            <View style={styles.posterSlotTitleRow}>
              <RectangleVertical size={16} color="#14b8a6" />
              <Text style={styles.posterSlotTitle}>
                پوستر عمودی (One-Sheet سینمایی) <Text style={styles.requiredStar}>*</Text>
              </Text>
            </View>
            <Text style={styles.posterRatioHint}>ارتفاع {'>'} عرض</Text>
          </View>

          {posterVerticalAsset || existingVerticalPoster ? (
            <View style={styles.verticalPosterPreviewWrap}>
              <Image
                source={{
                  uri: posterVerticalAsset ? posterVerticalAsset.uri : getMediaUrl(existingVerticalPoster),
                }}
                style={styles.verticalPosterImg}
                contentFit="cover"
              />
              <TouchableOpacity
                style={styles.deletePosterBtn}
                onPress={() => {
                  setPosterVerticalAsset(null);
                  if (existingMedia && setExistingMedia) {
                    setExistingMedia({ ...existingMedia, mainPosterUrl: '' });
                  }
                }}
              >
                <Trash2 size={13} color="#ffffff" />
              </TouchableOpacity>
              <View style={styles.verticalPosterLabelBadge}>
                <Text style={styles.verticalPosterLabelText}>پوستر اصلی عمودی</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadDashedBox}
              activeOpacity={0.8}
              onPress={() => openPickerModal('posterVertical')}
            >
              <Upload size={22} color="#14b8a6" />
              <Text style={styles.uploadBoxText}>انتخاب پوستر عمودی اثر</Text>
              <Text style={styles.uploadBoxSubText}>نسبت ۲:۳ عمودی (One-Sheet)</Text>
            </TouchableOpacity>
          )}
          {errors.posterVertical && <Text style={styles.errorText}>{errors.posterVertical}</Text>}
        </View>

        {/* ب) پوستر افقی (Landscape Banner - اختیاری) */}
        <View style={styles.posterSlotBox}>
          <View style={styles.posterSlotHeader}>
            <View style={styles.posterSlotTitleRow}>
              <RectangleHorizontal size={16} color="#f59e0b" />
              <Text style={styles.posterSlotTitle}>
                پوستر افقی (بنر عریض / لابی‌کارت) <Text style={{ color: '#94a3b8', fontSize: 9.5 }}>(اختیاری)</Text>
              </Text>
            </View>
            <Text style={styles.posterRatioHint}>عرض {'>'} ارتفاع</Text>
          </View>

          {posterHorizontalAsset || existingHorizontalPoster ? (
            <View style={styles.horizontalPosterPreviewWrap}>
              <Image
                source={{
                  uri: posterHorizontalAsset ? posterHorizontalAsset.uri : getMediaUrl(existingHorizontalPoster),
                }}
                style={styles.horizontalPosterImg}
                contentFit="cover"
              />
              <TouchableOpacity
                style={styles.deletePosterBtn}
                onPress={() => {
                  setPosterHorizontalAsset(null);
                  if (existingMedia && setExistingMedia) {
                    setExistingMedia({ ...existingMedia, posters: [] });
                  }
                }}
              >
                <Trash2 size={13} color="#ffffff" />
              </TouchableOpacity>
              <View style={[styles.verticalPosterLabelBadge, { backgroundColor: '#f59e0b' }]}>
                <Text style={styles.verticalPosterLabelText}>پوستر لابی‌کارت افقی</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadDashedBox}
              activeOpacity={0.8}
              onPress={() => openPickerModal('posterHorizontal')}
            >
              <Upload size={22} color="#f59e0b" />
              <Text style={styles.uploadBoxText}>انتخاب پوستر افقی اثر (اختیاری)</Text>
              <Text style={[styles.uploadBoxSubText, { color: '#f59e0b' }]}>نسبت ۱۶:۹ افقی (Landscape)</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ۴. تصاویر پشت صحنه */}
      <View style={styles.mediaCard}>
        <View style={styles.mediaCardHeader}>
          <Layers size={16} color="#2dd4bf" />
          <Text style={styles.mediaCardTitle}>
            تصاویر پشت صحنه ({toFarsiDigits(existingBehindImgs.length + behindImages.length)} از ۱۵)
          </Text>
        </View>

        {existingBehindImgs.length + behindImages.length < 15 && (
          <TouchableOpacity
            style={styles.uploadDashedBox}
            activeOpacity={0.8}
            onPress={() => openPickerModal('behind')}
          >
            <Upload size={22} color="#2dd4bf" />
            <Text style={styles.uploadBoxText}>افزودن تصاویر پشت صحنه (از گالری یا فایل‌منیجر)</Text>
          </TouchableOpacity>
        )}

        {(existingBehindImgs.length > 0 || behindImages.length > 0) && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.postersRow}>
            {existingBehindImgs.map((bUrl, idx) => (
              <View key={`exist-b-${idx}`} style={styles.behindImgBox}>
                <Image source={{ uri: getMediaUrl(bUrl) }} style={styles.posterImg} contentFit="cover" />
                <TouchableOpacity
                  style={styles.deletePosterBtn}
                  onPress={() => {
                    if (setExistingMedia) {
                      setExistingMedia((prev: any) => ({
                        ...prev,
                        behindSceneImages: existingBehindImgs.filter((_, i) => i !== idx),
                      }));
                    }
                  }}
                >
                  <Trash2 size={12} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ))}
            {behindImages.map((b, idx) => (
              <View key={`new-b-${idx}`} style={styles.behindImgBox}>
                <Image source={{ uri: b.uri }} style={styles.posterImg} contentFit="cover" />
                <TouchableOpacity
                  style={styles.deletePosterBtn}
                  onPress={() => setBehindImages(behindImages.filter((_, i) => i !== idx))}
                >
                  <Trash2 size={12} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* ۵. تایید قوانین و مقررات جامعه پرشات (با باز شدن مستقیم در مرورگر کروم) */}
      <View
        style={[
          styles.termsCard,
          errors.terms && styles.mediaCardError,
          acceptedTerms && { borderColor: 'rgba(20, 184, 166, 0.35)', backgroundColor: 'rgba(20, 184, 166, 0.08)' },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.termsCheckRow}
          onPress={() => {
            setAcceptedTerms(!acceptedTerms);
            if (errors.terms) setErrors({ ...errors, terms: null });
          }}
        >
          {acceptedTerms ? (
            <CheckSquare size={20} color="#14b8a6" />
          ) : (
            <Square size={20} color="#64748b" />
          )}
          <View style={styles.termsTextCol}>
            <Text style={styles.termsMainText}>
              قوانین و ضوابط جامعه پرشات را مطالعه کرده‌ام و کلیه مفاد آن را می‌پذیرم.{' '}
              <Text style={styles.requiredStar}>*</Text>
            </Text>
            <Text style={styles.termsSubText}>
              تایید مسئولیت کپی‌رایت، اصالت اثر و تعهد به منشور اخلاقی پلتفرم
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.termsLinkBtn}
          activeOpacity={0.8}
          onPress={handleOpenCommunityGuideline}
        >
          <ShieldCheck size={14} color="#2dd4bf" />
          <Text style={styles.termsLinkText}>مطالعه قوانین جامعه پرشات</Text>
          <ExternalLink size={12} color="#94a3b8" />
        </TouchableOpacity>

        {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}
      </View>

      {/* دکمه‌های ناوبری */}
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.backBtn} disabled={submitting || isAnyBusy} onPress={onBack}>
          <Text style={styles.backBtnText}>← بازگشت</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitBtn, (submitting || isAnyBusy) && styles.disabledBtn]}
          activeOpacity={0.8}
          disabled={submitting || isAnyBusy}
          onPress={handleFormSubmit}
        >
          {submitting || isAnyBusy ? (
            <View style={styles.submitBtnContent}>
              <ActivityIndicator size="small" color="#030712" />
              <Text style={styles.submitBtnText}>
                {optimisticVideoStatus === 'merging'
                  ? 'در حال نهایی‌سازی ویدیو...'
                  : optimisticVideoStatus === 'uploading'
                  ? 'در حال آپلود ویدیوی اصلی...'
                  : optimisticTrailerStatus === 'uploading'
                  ? 'در حال آپلود تیزر...'
                  : 'در حال ثبت نهایی...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.submitBtnText}>ثبت نهایی تغییرات اثر</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 🟢 مدال SweetAlert2: توصیه به استفاده از نسخه وب با مرورگر گوگل کروم */}
      <Modal
        visible={webUploadAlertVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWebUploadAlertVisible(false)}
      >
        <View style={styles.swalBackdrop}>
          <View style={styles.swalCard}>
            <View style={styles.swalIconContainer}>
              <Globe size={32} color="#14b8a6" />
            </View>

            <Text style={styles.swalTitle}>پیشنهاد برای آپلود فیلم‌های حجیم</Text>

            <Text style={styles.swalMessage}>
              توصیه ما این است که برای آپلود فیلم‌های باکیفیت و حجیم، از نسخه وب پلتفرم پرشات به آدرس{' '}
              <Text style={styles.swalHighlightUrl}>pershot.ir</Text> استفاده نمایید تا با سرعت و امکانات پایدارتری اثر خود را آپلود کنید.
            </Text>

            <View style={styles.chromeRecommendationBox}>
              <ChromeIcon size={18} color="#f59e0b" />
              <Text style={styles.chromeRecommendationText}>
                توصیه ما این هست تا از مرورگر گوگل کروم (Google Chrome) استفاده کنید.
              </Text>
            </View>

            <View style={styles.swalButtonStack}>
              <TouchableOpacity
                style={styles.swalWebButton}
                activeOpacity={0.85}
                onPress={handleOpenWebPlatform}
              >
                <ChromeIcon size={18} color="#030712" />
                <Text style={styles.swalWebButtonText}>ادامه با نسخه وب (باز شدن در کروم)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.swalDismissButton}
                activeOpacity={0.8}
                onPress={() => setWebUploadAlertVisible(false)}
              >
                <Text style={styles.swalDismissButtonText}>ادامه در همین اپلیکیشن</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* مدال انتخاب منبع فایل */}
      <Modal visible={pickerModalVisible} transparent animationType="fade" onRequestClose={closePickerModal}>
        <Pressable style={styles.modalOverlay} onPress={closePickerModal}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>انتخاب منبع فایل</Text>
              <TouchableOpacity onPress={closePickerModal}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>روش انتخاب فایل مورد نظر خود را تعیین کنید:</Text>
            <View style={styles.modalButtonsGroup}>
              <TouchableOpacity
                style={styles.modalOptionBtn}
                activeOpacity={0.8}
                onPress={() => handleSelectSource('gallery')}
              >
                <View style={[styles.modalOptionIconBox, { backgroundColor: 'rgba(20, 184, 166, 0.15)' }]}>
                  <Images size={22} color="#14b8a6" />
                </View>
                <View style={styles.modalOptionTexts}>
                  <Text style={styles.modalOptionTitle}>گالری دستگاه</Text>
                  <Text style={styles.modalOptionDesc}>مشاهده پیش‌نمایش آلبوم‌ها، تصاویر و ویدیوها</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalOptionBtn}
                activeOpacity={0.8}
                onPress={() => handleSelectSource('fileManager')}
              >
                <View style={[styles.modalOptionIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <FolderOpen size={22} color="#f59e0b" />
                </View>
                <View style={styles.modalOptionTexts}>
                  <Text style={styles.modalOptionTitle}>مدیریت فایل‌ها (فایل‌منیجر)</Text>
                  <Text style={styles.modalOptionDesc}>پوشه دانلودها، حافظه داخلی و کارت حافظه</Text>
                </View>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={closePickerModal}>
              <Text style={styles.modalCancelBtnText}>انصراف</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  lockInfoBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 14,
    padding: 10,
  },
  lockInfoText: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#fde68a', flex: 1, textAlign: 'right', lineHeight: 16 },
  rejectedUnlockBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
    borderRadius: 14,
    padding: 10,
  },
  rejectedUnlockText: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#fca5a5', flex: 1, textAlign: 'right', lineHeight: 16 },
  presentationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    gap: 8,
  },
  presentationHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  presentationTitle: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#e2e8f0' },
  presentationRow: { flexDirection: 'row-reverse', gap: 8 },
  presBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 10,
  },
  presBtnActive: { backgroundColor: 'rgba(20, 184, 166, 0.15)', borderColor: '#14b8a6' },
  presBtnActiveAmber: { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: '#f59e0b' },
  presBtnTitle: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#94a3b8', flex: 1, textAlign: 'right' },
  presBtnTitleActive: { fontFamily: 'Ravi-Bold', color: '#2dd4bf' },
  presBtnTitleActiveAmber: { fontFamily: 'Ravi-Bold', color: '#fbbf24' },
  mediaCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    gap: 10,
  },
  mediaCardError: { borderColor: '#f43f5e' },
  mediaCardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  mediaCardTitle: { fontFamily: 'Ravi-Bold', fontSize: 11.5, color: '#ffffff' },
  posterSubDescription: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#94a3b8', textAlign: 'right', marginTop: -4 },
  requiredStar: { color: '#f43f5e' },
  errorText: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#f43f5e', textAlign: 'right' },
  lockedVideoBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
  },
  lockedVideoRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flex: 1 },
  lockedVideoText: { fontFamily: 'monospace', fontSize: 10, color: '#94a3b8', flex: 1, textAlign: 'left' },
  lockedBadge: {
    fontFamily: 'Ravi-Bold',
    fontSize: 9.5,
    color: '#fbbf24',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  uploadDashedBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  uploadBoxText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#e2e8f0', textAlign: 'center' },
  uploadBoxSubText: { fontFamily: 'Ravi-Regular', fontSize: 9.5, color: '#14b8a6', textAlign: 'center' },
  optimisticCard: {
    backgroundColor: '#0c1322',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.35)',
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  optimisticHeaderRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  optimisticFileMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flex: 1 },
  optimisticFileName: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#ffffff', flex: 1, textAlign: 'right' },
  optimisticPercentText: { fontFamily: 'Ravi-Bold', fontSize: 14, color: '#14b8a6' },
  progressBarTrack: { width: '100%', height: 8, borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#14b8a6', borderRadius: 4 },
  bytesStatusRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  bytesLoadedText: { fontFamily: 'Ravi-Bold', fontSize: 10, color: '#5eead4' },
  statusLabelText: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#94a3b8' },
  resumeHelpBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  resumeHelpHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  resumeHelpTitle: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#fcd34d' },
  resumeHelpText: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#fde68a', textAlign: 'right', lineHeight: 16 },
  separatedStatsBox: { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 6 },
  statSingleLine: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  statLabelWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  statLineLabel: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#94a3b8' },
  statLineValue: { fontFamily: 'Ravi-Bold', fontSize: 10, color: '#ffffff' },
  optimisticFooterRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
  },
  cancelUploadBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cancelUploadBtnText: { fontFamily: 'Ravi-Bold', fontSize: 10, color: '#f43f5e' },
  pauseBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pauseBtnText: { fontFamily: 'Ravi-Bold', fontSize: 10, color: '#fcd34d' },
  resumeBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#14b8a6',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  resumeBtnText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#030712' },
  completedVideoCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.3)',
    borderRadius: 14,
    padding: 10,
    gap: 8,
  },
  completedVideoRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flex: 1 },
  completedVideoMeta: { flex: 1, gap: 2 },
  completedVideoTitle: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#ffffff', textAlign: 'right' },
  completedVideoBadge: { fontFamily: 'Ravi-Regular', fontSize: 9.5, color: '#2dd4bf', textAlign: 'right' },
  replaceBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  replaceBtnText: { fontFamily: 'Ravi-Bold', fontSize: 9.5, color: '#f43f5e' },
  posterSlotBox: {
    backgroundColor: 'rgba(3, 7, 18, 0.45)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    gap: 10,
  },
  posterSlotHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  posterSlotTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  posterSlotTitle: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#ffffff' },
  posterRatioHint: { fontFamily: 'monospace', fontSize: 9.5, color: '#94a3b8' },
  verticalPosterPreviewWrap: {
    width: 150,
    height: 225,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#14b8a6',
    alignSelf: 'center',
    position: 'relative',
    backgroundColor: '#000',
  },
  verticalPosterImg: { width: '100%', height: '100%' },
  verticalPosterLabelBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    backgroundColor: 'rgba(20, 184, 166, 0.92)',
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
  },
  verticalPosterLabelText: { fontFamily: 'Ravi-Bold', fontSize: 9.5, color: '#030712' },
  horizontalPosterPreviewWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    position: 'relative',
    backgroundColor: '#000',
  },
  horizontalPosterImg: { width: '100%', height: '100%' },
  postersRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 4 },
  behindImgBox: {
    width: 76,
    height: 76,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  posterImg: { width: '100%', height: '100%' },
  deletePosterBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(225, 29, 72, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  termsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    gap: 10,
  },
  termsCheckRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 },
  termsTextCol: { flex: 1, gap: 2 },
  termsMainText: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#ffffff', textAlign: 'right', lineHeight: 18 },
  termsSubText: { fontFamily: 'Ravi-Regular', fontSize: 9.5, color: '#94a3b8', textAlign: 'right' },
  termsLinkBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  termsLinkText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#5eead4' },
  navRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 6 },
  backBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontFamily: 'Ravi-Bold', fontSize: 11.5, color: '#94a3b8' },
  submitBtn: {
    flex: 2,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnContent: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  submitBtnText: { fontFamily: 'Ravi-Bold', fontSize: 12, color: '#030712' },
  disabledBtn: { opacity: 0.6 },

  /* 🟢 استایل مدال SweetAlert2 */
  swalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 100,
  },
  swalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0c1322',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.35)',
    padding: 24,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 15,
  },
  swalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(20, 184, 166, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  swalTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 15,
    color: '#ffffff',
    textAlign: 'center',
  },
  swalMessage: {
    fontFamily: 'Ravi-Regular',
    fontSize: 12,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 22,
  },
  swalHighlightUrl: {
    fontFamily: 'Ravi-Bold',
    color: '#2dd4bf',
    fontWeight: 'bold',
  },
  chromeRecommendationBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    width: '100%',
  },
  chromeRecommendationText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11,
    color: '#fbbf24',
    flex: 1,
    textAlign: 'right',
    lineHeight: 18,
  },
  swalButtonStack: {
    width: '100%',
    gap: 8,
    marginTop: 6,
  },
  swalWebButton: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    backgroundColor: '#14b8a6',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  swalWebButtonText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 12.5,
    color: '#030712',
  },
  swalDismissButton: {
    width: '100%',
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swalDismissButtonText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11.5,
    color: '#94a3b8',
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(3, 7, 18, 0.75)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#0d1520',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    gap: 14,
  },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontFamily: 'Ravi-Bold', fontSize: 14, color: '#ffffff', textAlign: 'right' },
  modalSubtitle: { fontFamily: 'Ravi-Regular', fontSize: 11, color: '#94a3b8', textAlign: 'right' },
  modalButtonsGroup: { gap: 10, marginVertical: 4 },
  modalOptionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 14,
  },
  modalOptionIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalOptionTexts: { flex: 1, gap: 3 },
  modalOptionTitle: { fontFamily: 'Ravi-Bold', fontSize: 12.5, color: '#ffffff', textAlign: 'right' },
  modalOptionDesc: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#64748b', textAlign: 'right' },
  modalCancelBtn: {
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  modalCancelBtnText: { fontFamily: 'Ravi-Bold', fontSize: 12, color: '#94a3b8' },
});