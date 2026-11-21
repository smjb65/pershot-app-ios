import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ToastAndroid,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Eye,
  Heart,
  MousePointerClick,
  Trash2,
  AlertTriangle,
  Play,
  PlaySquare,
  Link as LinkIcon,
} from 'lucide-react-native';
import { api, getMediaUrl } from '../../api/axiosClient';
import VideoPreviewModal from '../common/VideoPreviewModal';

interface ReelItem {
  id: string;
  videoUrl: string;
  posterUrl?: string;
  caption?: string;
  status: number | string;
  viewsCount?: number;
  likesCount?: number;
  linkedClicksCount?: number;
  linkedEntityTitle?: string;
  rejectionReason?: string;
}

export default function MyReelsList({
  reels,
  onRefresh,
}: {
  reels: ReelItem[];
  onRefresh: () => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'حذف ریلز',
      'آیا از حذف این ریلز مطمئن هستید؟ فایل‌های ویدیویی آن کاملاً پاک خواهند شد.',
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(id);
              await api.delete(`/reels/${id}`);
              showToast('ریلز و فایل‌های آن حذف شدند');
              DeviceEventEmitter.emit('REEL_DELETED', id);
              onRefresh();
            } catch (err: any) {
              showToast(err.response?.data?.message || 'خطا در حذف ریلز');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const getStatusBadge = (status: number | string) => {
    if (status === 3 || status === 'Approved' || status === 'published') {
      return { label: 'منتشر شده', bg: 'rgba(20, 184, 166, 0.15)', text: '#2dd4bf' };
    }
    if (status === 2 || status === 'PendingSuperAdmin') {
      return { label: 'بررسی سوپر ادمین', bg: 'rgba(244, 63, 94, 0.15)', text: '#f43f5e' };
    }
    if (status === 4 || status === 'Rejected') {
      return { label: 'رد نهایی', bg: 'rgba(244, 63, 94, 0.3)', text: '#ffffff' };
    }
    return { label: 'در انتظار ادمین', bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' };
  };

  if (reels.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <PlaySquare size={44} color="#334155" />
        <Text style={styles.emptyTitle}>هیچ ریلزی منتشر نکرده‌اید</Text>
        <Text style={styles.emptyDesc}>
          از تب «ثبت ریلز جدید» می‌توانید ویدیوهای کوتاه مستقل یا متصل به آثار و کمپین‌های خود را بارگذاری کنید.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {reels.map((reel) => {
        const badge = getStatusBadge(reel.status);
        const isLinked = Boolean(reel.linkedEntityTitle);

        return (
          <View key={reel.id} style={styles.card}>
            <TouchableOpacity
              style={styles.thumbnailWrapper}
              activeOpacity={0.85}
              onPress={() => setPreviewVideoUrl(getMediaUrl(reel.videoUrl))}
            >
              {reel.posterUrl ? (
                <Image
                  source={{ uri: getMediaUrl(reel.posterUrl) }}
                  style={styles.thumbnailImg}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.placeholderThumbnail}>
                  <PlaySquare size={36} color="#64748b" />
                </View>
              )}

              <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
              </View>

              <View style={styles.playCenterCircle}>
                <Play size={18} color="#ffffff" fill="#ffffff" />
              </View>

              {reel.rejectionReason && (
                <View style={styles.rejectionOverlay}>
                  <View style={styles.rejectionTitleRow}>
                    <AlertTriangle size={12} color="#f43f5e" />
                    <Text style={styles.rejectionTitle}>علت عدم تایید:</Text>
                  </View>
                  <Text style={styles.rejectionText} numberOfLines={2}>
                    {reel.rejectionReason}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.detailsBox}>
              <View style={styles.linkedRow}>
                <LinkIcon size={12} color={isLinked ? '#2dd4bf' : '#64748b'} />
                <Text style={[styles.linkedTitle, !isLinked && styles.unlinkedTitle]} numberOfLines={1}>
                  {isLinked ? `متصل به: ${reel.linkedEntityTitle}` : 'ریلز مستقل (بدون اثر مرتبط)'}
                </Text>
              </View>

              <Text style={styles.captionText} numberOfLines={2}>
                {reel.caption || 'بدون توضیحات'}
              </Text>
            </View>

            <View style={styles.footerRow}>
              <View style={styles.metricsGroup}>
                <View style={styles.metricItem}>
                  <Eye size={12} color="#38bdf8" />
                  <Text style={styles.metricVal}>{(reel.viewsCount || 0).toLocaleString('fa-IR')}</Text>
                </View>

                <View style={styles.metricItem}>
                  <Heart size={12} color="#f43f5e" />
                  <Text style={styles.metricVal}>{(reel.likesCount || 0).toLocaleString('fa-IR')}</Text>
                </View>

                {isLinked && (
                  <View style={styles.metricItem}>
                    <MousePointerClick size={12} color="#f59e0b" />
                    <Text style={[styles.metricVal, { color: '#fbbf24' }]}>
                      {(reel.linkedClicksCount || 0).toLocaleString('fa-IR')}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.deleteBtn}
                activeOpacity={0.75}
                disabled={deletingId === reel.id}
                onPress={() => handleDelete(reel.id)}
              >
                {deletingId === reel.id ? (
                  <ActivityIndicator size="small" color="#f43f5e" />
                ) : (
                  <Trash2 size={15} color="#f43f5e" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <VideoPreviewModal
        visible={!!previewVideoUrl}
        videoUrl={previewVideoUrl}
        onClose={() => setPreviewVideoUrl(null)}
        title="پیش‌نمایش ویدیو ریلز"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 14,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0d1520',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  emptyDesc: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#0d1520',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    gap: 10,
  },
  thumbnailWrapper: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#030712',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050b14',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 9.5,
  },
  playCenterCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 184, 166, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  rejectionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(3, 7, 18, 0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(244, 63, 94, 0.4)',
    padding: 8,
    gap: 2,
  },
  rejectionTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  rejectionTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 9.5,
    color: '#f43f5e',
  },
  rejectionText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 9.5,
    color: '#fecdd3',
    textAlign: 'right',
    lineHeight: 14,
  },
  detailsBox: {
    gap: 4,
  },
  linkedRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
  },
  linkedTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11.5,
    color: '#2dd4bf',
    flex: 1,
    textAlign: 'right',
  },
  unlinkedTitle: {
    color: '#64748b',
    fontFamily: 'Ravi-Regular',
  },
  captionText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11,
    color: '#cbd5e1',
    textAlign: 'right',
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 8,
  },
  metricsGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  metricItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  metricVal: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10.5,
    color: '#94a3b8',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});