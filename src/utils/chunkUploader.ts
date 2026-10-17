import { Platform } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { api } from '../api/axiosClient';

const CHUNK_SIZE = 4 * 1024 * 1024; // قطعات ۴ مگابایتی
const CONCURRENCY_LIMIT = 3; // ۳ کانکشن موازی هم‌زمان

export interface UploadProgressInfo {
  percent: number;
  speed: string;
  timeRemaining: string;
  loaded: number;
  total: number;
}

export class ParallelChunkUploader {
  private uploadId: string;
  private isCancelled: boolean = false;
  private channelId: string = 'pershot_upload_channel';

  constructor() {
    this.uploadId = 'up_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  }

  public cancel() {
    this.isCancelled = true;
    this.stopForegroundNotification().catch(() => {});
  }

  private async initNotificationChannel() {
    if (Platform.OS !== 'android') return;
    try {
      await notifee.createChannel({
        id: this.channelId,
        name: 'آپلود مدیا',
        importance: AndroidImportance.LOW,
      });
    } catch {}
  }

  private async updateNotification(percent: number, speed: string, timeRemaining: string) {
    if (Platform.OS !== 'android') return;
    try {
      await notifee.displayNotification({
        id: 'video_upload',
        title: 'در حال آپلود ویدیو...',
        body: `${percent}٪ - سرعت: ${speed} - باقیمانده: ${timeRemaining}`,
        android: {
          channelId: this.channelId,
          asForegroundService: true,
          ongoing: true,
          progress: { max: 100, current: percent },
        },
      });
    } catch {}
  }

  private async stopForegroundNotification() {
    if (Platform.OS !== 'android') return;
    try {
      await notifee.stopForegroundService();
      await notifee.cancelNotification('video_upload');
    } catch {}
  }

  public async upload(
    fileUri: string,
    fileName: string,
    folder: string = 'videos',
    onProgress?: (info: UploadProgressInfo) => void
  ): Promise<string> {
    await this.initNotificationChannel();

    // خواندن فایل به صورت باینری بلاب
    const fileRes = await fetch(fileUri);
    const blob = await fileRes.blob();
    const totalBytes = blob.size;
    const totalChunks = Math.ceil(totalBytes / CHUNK_SIZE);

    let acknowledgedBytes = 0;
    const startTime = Date.now();

    // ایجاد لیست تکه‌ها
    const chunksQueue: { index: number; start: number; end: number }[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalBytes);
      chunksQueue.push({ index: i, start, end });
    }

    const uploadSingleChunk = async (chunkItem: { index: number; start: number; end: number }) => {
      if (this.isCancelled) throw new Error('UPLOAD_CANCELLED');

      const chunkBlob = blob.slice(chunkItem.start, chunkItem.end);
      const formData = new FormData();
      formData.append('uploadId', this.uploadId);
      formData.append('chunkIndex', chunkItem.index.toString());
      formData.append('totalChunks', totalChunks.toString());
      formData.append('file', {
        uri: fileUri,
        name: `${chunkItem.index}.part`,
        type: 'application/octet-stream',
        // @ts-ignore
        blob: chunkBlob,
      } as any);

      await api.post('/upload/chunk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 0,
      });

      if (this.isCancelled) throw new Error('UPLOAD_CANCELLED');

      // محاسبه فقط با تایید واقعی سرور
      const chunkSize = chunkItem.end - chunkItem.start;
      acknowledgedBytes += chunkSize;

      const percent = Math.min(100, Math.round((acknowledgedBytes / totalBytes) * 100));
      const elapsedSec = Math.max(0.1, (Date.now() - startTime) / 1000);
      const speedBps = acknowledgedBytes / elapsedSec;

      let speedStr = `${(speedBps / 1024).toFixed(0)} KB/s`;
      if (speedBps > 1024 * 1024) {
        speedStr = `${(speedBps / (1024 * 1024)).toFixed(1)} MB/s`;
      }

      const remainingBytes = totalBytes - acknowledgedBytes;
      const remainingSec = Math.round(remainingBytes / Math.max(speedBps, 1));
      let timeRemainingStr = `${remainingSec} ثانیه`;
      if (remainingSec >= 60) {
        const m = Math.floor(remainingSec / 60);
        const s = remainingSec % 60;
        timeRemainingStr = `${m} دقیقه و ${s} ثانیه`;
      }

      if (onProgress) {
        onProgress({
          percent,
          speed: speedStr,
          timeRemaining: timeRemainingStr,
          loaded: acknowledgedBytes,
          total: totalBytes,
        });
      }

      this.updateNotification(percent, speedStr, timeRemainingStr).catch(() => {});
    };

    // اجرای ۳ ورکر موازی
    const workers = Array(Math.min(CONCURRENCY_LIMIT, totalChunks))
      .fill(null)
      .map(async () => {
        while (chunksQueue.length > 0) {
          if (this.isCancelled) throw new Error('UPLOAD_CANCELLED');
          const nextChunk = chunksQueue.shift();
          if (nextChunk) {
            await uploadSingleChunk(nextChunk);
          }
        }
      });

    await Promise.all(workers);

    // ادغام در سرور بلافاصله پس از دریافت ۱۰۰٪ واقعی
    const completeRes = await api.post('/upload/chunk/complete', {
      uploadId: this.uploadId,
      fileName,
      folder,
      totalChunks,
    });

    await this.stopForegroundNotification();

    const finalUrl = completeRes.data?.url;
    if (!finalUrl) throw new Error('خطا در ادغام تکه‌های ویدیویی روی سرور');

    return finalUrl;
  }
}