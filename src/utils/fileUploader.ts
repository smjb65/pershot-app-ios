import { api, toFarsiDigits } from '../api/axiosClient';

let FileSystem: any;
try {
  FileSystem = require('expo-file-system/legacy');
} catch (e) {
  try {
    FileSystem = require('expo-file-system');
  } catch (err) {}
}

export interface UploadProgressInfo {
  percent: number;
  speed: string;
  timeRemaining: string;
}

/**
 * آپلود فوق‌سریع و هوشمند فایل‌ها با معماری ۲ کانکشنه موازی بدون پر کردن رم
 */
export async function uploadMediaFile(
  fileUri: string,
  fileName: string,
  mimeType: string,
  folder: string,
  onProgress?: (info: UploadProgressInfo) => void
): Promise<string> {
  const uploadId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  let rawBase = (api.defaults.baseURL || 'https://api.pershot.ir').replace(/\/$/, '');
  
  let chunkUrl = rawBase.endsWith('/api/v1') ? `${rawBase}/upload/parallel/chunk` : `${rawBase}/api/v1/upload/parallel/chunk`;
  let completeUrl = rawBase.endsWith('/api/v1') ? `${rawBase}/upload/parallel/complete` : `${rawBase}/api/v1/upload/parallel/complete`;

  const authHeader = (api.defaults.headers.common['Authorization'] || api.defaults.headers['Authorization']) as string | undefined;
  const uploadBinaryType = FileSystem?.FileSystemUploadType?.BINARY_CONTENT ?? 0;

  // سنجش حجم فایل
  let totalSize = 10 * 1024 * 1024;
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info?.size) totalSize = info.size;
  } catch (e) {}

  // ۱. برای فایل‌های خیلی کوچک (زیر ۳ مگابایت مثل PDFها و عکس‌ها) از تک استریم سریع استفاده می‌کنیم
  if (totalSize < 3 * 1024 * 1024) {
    let singleStreamUrl = rawBase.endsWith('/api/v1') ? `${rawBase}/upload/stream` : `${rawBase}/api/v1/upload/stream`;
    const startTime = Date.now();

    const task = FileSystem.createUploadTask(
      singleStreamUrl,
      fileUri,
      {
        uploadType: uploadBinaryType,
        headers: {
          'X-File-Name': encodeURIComponent(fileName),
          'X-Folder': folder,
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        httpMethod: 'POST',
      },
      (p: any) => {
        if (!onProgress || !p.totalBytesExpectedToSend) return;
        const percent = Math.min(99, Math.floor((p.totalBytesSent * 100) / p.totalBytesExpectedToSend));
        const elapsed = Math.max(0.2, (Date.now() - startTime) / 1000);
        const speedBps = p.totalBytesSent / elapsed;
        let speedStr = `${(speedBps / 1024).toFixed(0)} KB/s`;
        if (speedBps >= 1024 * 1024) speedStr = `${(speedBps / (1024 * 1024)).toFixed(1)} MB/s`;
        
        onProgress({
          percent,
          speed: speedStr,
          timeRemaining: `${Math.round((p.totalBytesExpectedToSend - p.totalBytesSent) / Math.max(speedBps, 1))} ثانیه`,
        });
      }
    );

    const res = await task.uploadAsync();
    const result = JSON.parse(res.body);
    if (onProgress) onProgress({ percent: 100, speed: 'تکمیل شد', timeRemaining: 'پایان' });
    return result.url;
  }

  // ۲. برای ویدیوها و فایل‌های سنگین: ایجاد ۲ کانکشن موازی
  const part0Path = `${FileSystem.cacheDirectory}part0_${uploadId}.tmp`;
  const part1Path = `${FileSystem.cacheDirectory}part1_${uploadId}.tmp`;

  await Promise.all([
    FileSystem.copyAsync({ from: fileUri, to: part0Path }),
    FileSystem.copyAsync({ from: fileUri, to: part1Path })
  ]);

  const bytesSent = [0, 0];
  const startTime = Date.now();

  const handleProgress = (index: number, sent: number) => {
    bytesSent[index] = sent;
    const totalSent = bytesSent[0] + bytesSent[1];
    const rawPercent = Math.floor((totalSent * 100) / totalSize);
    const displayPercent = Math.min(99, Math.max(0, rawPercent));

    const elapsedSec = Math.max(0.2, (Date.now() - startTime) / 1000);
    const speedBps = totalSent / elapsedSec;

    let speedStr = `${(speedBps / 1024).toFixed(0)} KB/s`;
    if (speedBps >= 1024 * 1024) speedStr = `${(speedBps / (1024 * 1024)).toFixed(1)} MB/s`;

    const remainingBytes = Math.max(0, totalSize - totalSent);
    const remainingSec = Math.round(remainingBytes / Math.max(speedBps, 1));
    let timeRemainingStr = `${toFarsiDigits(remainingSec)} ثانیه`;
    if (remainingSec >= 60) {
      const m = Math.floor(remainingSec / 60);
      const s = remainingSec % 60;
      timeRemainingStr = `${toFarsiDigits(m)} دقیقه و ${toFarsiDigits(s)} ثانیه`;
    }

    if (onProgress) {
      onProgress({
        percent: displayPercent,
        speed: speedStr,
        timeRemaining: rawPercent >= 100 ? 'در حال ادغام روی سرور...' : timeRemainingStr,
      });
    }
  };

  const task0 = FileSystem.createUploadTask(
    chunkUrl,
    part0Path,
    {
      uploadType: uploadBinaryType,
      headers: {
        'X-Upload-Id': uploadId,
        'X-Part-Index': '0',
        'X-Total-Parts': '2',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      httpMethod: 'POST',
    },
    (p: any) => handleProgress(0, p.totalBytesSent)
  );

  const task1 = FileSystem.createUploadTask(
    chunkUrl,
    part1Path,
    {
      uploadType: uploadBinaryType,
      headers: {
        'X-Upload-Id': uploadId,
        'X-Part-Index': '1',
        'X-Total-Parts': '2',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      httpMethod: 'POST',
    },
    (p: any) => handleProgress(1, p.totalBytesSent)
  );

  await Promise.all([task0.uploadAsync(), task1.uploadAsync()]);

  FileSystem.deleteAsync(part0Path, { idempotent: true }).catch(() => {});
  FileSystem.deleteAsync(part1Path, { idempotent: true }).catch(() => {});

  const completeRes = await api.post(completeUrl, {
    uploadId,
    fileName,
    folder,
    totalParts: 2,
  });

  if (onProgress) onProgress({ percent: 100, speed: 'تکمیل شد', timeRemaining: 'پایان' });
  return completeRes.data?.url;
}