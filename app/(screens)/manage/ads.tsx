import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  ToastAndroid,
  Platform,
  Alert,
  Linking,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  Megaphone,
  Search,
  Plus,
  BarChart2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  UploadCloud,
  X,
  ChevronLeft,
  Eye,
  MousePointerClick,
  Clock,
  Video,
  ImageIcon,
} from 'lucide-react-native';
import { api, getMediaUrl } from '../../../src/api/axiosClient';

interface AdItem {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  posterUrl?: string;
  targetUrl: string;
  skipOffsetSeconds: number;
  durationSeconds: number;
  isActive: boolean;
  isTranscoding: boolean;
  viewsCount: number;
  clicksCount: number;
  createdAt: string;
}

export default function AdsManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [ads, setAds] = useState<AdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // استیت‌های مدال ایجاد تبلیغ
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoAsset, setVideoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [posterAsset, setPosterAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetUrl: '',
    skipOffsetSeconds: 5,
    durationSeconds: 15,
  });

  // استیت مدال آنالیز عملکرد
  const [analyticsAd, setAnalyticsAd] = useState<AdItem | null>(null);

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  const fetchAds = useCallback(async (query = '') => {
    try {
      setLoading(true);
      const res = await api.get('/ads', {
        params: { page: 1, pageSize: 50, search: query },
      });
      setAds(res.data?.items || res.data || []);
    } catch {
      showToast('خطا در دریافت لیست تبلیغات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAds(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, fetchAds]);

  const handleToggleStatus = async (id: string) => {
    try {
      setActionLoadingId(id);
      const res = await api.post(`/ads/${id}/toggle-status`);
      if (res.data?.success || res.status === 200) {
        setAds((prev) =>
          prev.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a))
        );
        showToast('وضعیت پخش تبلیغ تغییر کرد');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در تغییر وضعیت تبلیغ');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'حذف کامل تبلیغ',
      'تمامی فایل‌های ویدیو، HLS و داده‌های تحلیلی این تبلیغ کلاً پاک خواهند شد. آیا مطمئن هستید؟',
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'حذف کامل',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoadingId(id);
              await api.delete(`/ads/${id}`);
              showToast('تبلیغ با موفقیت حذف شد');
              setAds((prev) => prev.filter((a) => a.id !== id));
            } catch (err: any) {
              showToast(err.response?.data?.message || 'خطا در حذف تبلیغ');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  // انتخاب ویدیو از گالری
  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setVideoAsset(result.assets[0]);
      }
    } catch {
      showToast('خطا در انتخاب ویدیوی تبلیغاتی');
    }
  };

  // انتخاب پوستر از گالری
  const pickPoster = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]) {
        setPosterAsset(result.assets[0]);
      }
    } catch {
      showToast('خطا در انتخاب تصویر کاور');
    }
  };

  const handleCreateAd = async () => {
    if (!formData.title.trim()) {
      showToast('عنوان تبلیغ الزامی است');
      return;
    }
    if (!formData.targetUrl.trim()) {
      showToast('لینک مقصد تبلیغ الزامی است');
      return;
    }
    if (!videoAsset) {
      showToast('انتخاب فایل ویدیوی تبلیغاتی الزامی است');
      return;
    }

    try {
      setIsSubmitting(true);
      const data = new FormData();
      data.append('Title', formData.title.trim());
      data.append('Description', formData.description.trim());
      data.append('TargetUrl', formData.targetUrl.trim());
      data.append('SkipOffsetSeconds', formData.skipOffsetSeconds.toString());
      data.append('DurationSeconds', formData.durationSeconds.toString());

      const vFilename = videoAsset.uri.split('/').pop() || 'ad_video.mp4';
      data.append('VideoFile', {
        uri: videoAsset.uri,
        name: vFilename,
        type: 'video/mp4',
      } as any);

      if (posterAsset) {
        const pFilename = posterAsset.uri.split('/').pop() || 'ad_poster.jpg';
        data.append('PosterFile', {
          uri: posterAsset.uri,
          name: pFilename,
          type: 'image/jpeg',
        } as any);
      }

      await api.post('/ads', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showToast('تبلیغ با موفقیت ثبت شد و در صف HLS قرار گرفت');
      setIsCreateModalOpen(false);
      setFormData({
        title: '',
        description: '',
        targetUrl: '',
        skipOffsetSeconds: 5,
        durationSeconds: 15,
      });
      setVideoAsset(null);
      setPosterAsset(null);
      fetchAds(search);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در آپلود و ثبت تبلیغ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalViews = ads.reduce((acc, curr) => acc + (curr.viewsCount || 0), 0);
  const totalClicks = ads.reduce((acc, curr) => acc + (curr.clicksCount || 0), 0);
  const overallCtr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* هدر صفحه */}
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <View style={styles.headerIconBox}>
            <Megaphone size={20} color="#f59e0b" />
          </View>
          <View>
            <Text style={styles.headerTitle}>مدیریت تبلیغات ویدیویی</Text>
            <Text style={styles.headerSubtitle}>استریم HLS و آمار بازدید/کلیک</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.backBtn} activeOpacity={0.7} onPress={() => router.back()}>
          <ChevronLeft size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* کارت‌های آماری */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>کل تبلیغات</Text>
            <Text style={[styles.statCardValue, { color: '#ffffff' }]}>{ads.length}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>کل بازدیدها</Text>
            <Text style={[styles.statCardValue, { color: '#14b8a6' }]}>
              {totalViews.toLocaleString('fa-IR')}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>کل کلیک‌ها</Text>
            <Text style={[styles.statCardValue, { color: '#f59e0b' }]}>
              {totalClicks.toLocaleString('fa-IR')}
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>میانگین CTR</Text>
            <Text style={[styles.statCardValue, { color: '#c084fc' }]}>{overallCtr}٪</Text>
          </View>
        </View>

        {/* دکمه افزودن تبلیغ جدید */}
        <TouchableOpacity
          style={styles.addAdBtn}
          activeOpacity={0.8}
          onPress={() => setIsCreateModalOpen(true)}
        >
          <Plus size={18} color="#030712" />
          <Text style={styles.addAdBtnText}>افزودن تبلیغ جدید</Text>
        </TouchableOpacity>

        {/* فیلد جستجو */}
        <View style={styles.searchBox}>
          <Search size={16} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="جستجوی عنوان تبلیغ..."
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* لیست تبلیغات */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#f59e0b" />
          </View>
        ) : ads.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>هیچ تبلیغی ثبت نشده است.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {ads.map((ad) => {
              const ctr =
                ad.viewsCount > 0
                  ? ((ad.clicksCount / ad.viewsCount) * 100).toFixed(1)
                  : '0';

              return (
                <View key={ad.id} style={styles.adCard}>
                  {/* اطلاعات اولیه و تصویر */}
                  <View style={styles.cardTopRow}>
                    {ad.posterUrl ? (
                      <Image
                        source={{ uri: getMediaUrl(ad.posterUrl) }}
                        style={styles.adPoster}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.adPosterPlaceholder}>
                        <Video size={20} color="#64748b" />
                      </View>
                    )}

                    <View style={styles.adDetails}>
                      <Text style={styles.adTitle} numberOfLines={1}>
                        {ad.title}
                      </Text>

                      <TouchableOpacity
                        style={styles.targetLinkRow}
                        activeOpacity={0.7}
                        onPress={() => Linking.openURL(ad.targetUrl).catch(() => {})}
                      >
                        <ExternalLink size={12} color="#14b8a6" />
                        <Text style={styles.targetLinkText} numberOfLines={1}>
                          {ad.targetUrl}
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.timingRow}>
                        <View style={styles.timingBadge}>
                          <Clock size={11} color="#94a3b8" />
                          <Text style={styles.timingText}>{ad.durationSeconds} ثانیه</Text>
                        </View>
                        <Text style={styles.skipText}>رد بعد از {ad.skipOffsetSeconds} ثانیه</Text>
                      </View>
                    </View>
                  </View>

                  {/* وضعیت HLS و استریم */}
                  <View style={styles.statusBadgesRow}>
                    <View
                      style={[
                        styles.hlsBadge,
                        ad.isTranscoding ? styles.hlsTranscoding : styles.hlsReady,
                      ]}
                    >
                      <Text
                        style={[
                          styles.hlsText,
                          { color: ad.isTranscoding ? '#818cf8' : '#2dd4bf' },
                        ]}
                      >
                        {ad.isTranscoding ? 'در حال تبدیل HLS' : 'آماده پخش HLS'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.activeBadge,
                        ad.isActive ? styles.activeBadgeOn : styles.activeBadgeOff,
                      ]}
                    >
                      <Text
                        style={[
                          styles.activeBadgeText,
                          { color: ad.isActive ? '#10b981' : '#94a3b8' },
                        ]}
                      >
                        {ad.isActive ? 'فعال در سیستم' : 'غیرفعال'}
                      </Text>
                    </View>
                  </View>

                  {/* آمار و دکمه‌های کنترلی */}
                  <View style={styles.cardBottomRow}>
                    <View style={styles.adStats}>
                      <View style={styles.adStatItem}>
                        <Eye size={12} color="#14b8a6" />
                        <Text style={styles.adStatText}>{ad.viewsCount}</Text>
                      </View>
                      <View style={styles.adStatItem}>
                        <MousePointerClick size={12} color="#f59e0b" />
                        <Text style={styles.adStatText}>{ad.clicksCount}</Text>
                      </View>
                      <Text style={styles.adCtrText}>CTR: {ctr}٪</Text>
                    </View>

                    <View style={styles.actions}>
                      {/* دکمه آنالیز */}
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        activeOpacity={0.75}
                        onPress={() => setAnalyticsAd(ad)}
                      >
                        <BarChart2 size={16} color="#c084fc" />
                      </TouchableOpacity>

                      {/* دکمه فعال / غیرفعال */}
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        activeOpacity={0.75}
                        disabled={actionLoadingId === ad.id}
                        onPress={() => handleToggleStatus(ad.id)}
                      >
                        {ad.isActive ? (
                          <ToggleRight size={22} color="#10b981" />
                        ) : (
                          <ToggleLeft size={22} color="#64748b" />
                        )}
                      </TouchableOpacity>

                      {/* دکمه حذف */}
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        activeOpacity={0.75}
                        disabled={actionLoadingId === ad.id}
                        onPress={() => handleDelete(ad.id)}
                      >
                        <Trash2 size={16} color="#f43f5e" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* 🟢 مدال ایجاد تبلیغ جدید */}
      <Modal visible={isCreateModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardBox}
          >
            <View style={styles.createModalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>افزودن ویدیوی تبلیغاتی جدید</Text>
                <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
                  <X size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>عنوان تبلیغ *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="مثال: معرفی پلتفرم پرشات"
                    placeholderTextColor="#64748b"
                    value={formData.title}
                    onChangeText={(val) => setFormData((prev) => ({ ...prev, title: val }))}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>لینک مقصد (کلیک کاربر) *</Text>
                  <TextInput
                    style={[styles.modalInput, styles.ltrInput]}
                    placeholder="https://example.com"
                    placeholderTextColor="#64748b"
                    value={formData.targetUrl}
                    onChangeText={(val) => setFormData((prev) => ({ ...prev, targetUrl: val }))}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>مدت کل ویدیو (ثانیه)</Text>
                    <TextInput
                      style={[styles.modalInput, styles.centerInput]}
                      keyboardType="numeric"
                      value={formData.durationSeconds.toString()}
                      onChangeText={(val) =>
                        setFormData((prev) => ({
                          ...prev,
                          durationSeconds: parseInt(val, 10) || 15,
                        }))
                      }
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>امکان رد کردن بعد از (ثانیه)</Text>
                    <TextInput
                      style={[styles.modalInput, styles.centerInput]}
                      keyboardType="numeric"
                      value={formData.skipOffsetSeconds.toString()}
                      onChangeText={(val) =>
                        setFormData((prev) => ({
                          ...prev,
                          skipOffsetSeconds: parseInt(val, 10) || 5,
                        }))
                      }
                    />
                  </View>
                </View>

                {/* انتخاب ویدیو */}
                <TouchableOpacity style={styles.filePicker} activeOpacity={0.8} onPress={pickVideo}>
                  <Video size={20} color="#f59e0b" />
                  <Text style={styles.filePickerText}>
                    {videoAsset ? 'ویدیو انتخاب شد' : 'انتخاب فایل ویدیوی تبلیغاتی (MP4) *'}
                  </Text>
                  {videoAsset && <CheckCircle2 size={16} color="#10b981" />}
                </TouchableOpacity>

                {/* انتخاب پوستر */}
                <TouchableOpacity
                  style={[styles.filePicker, { marginTop: 8 }]}
                  activeOpacity={0.8}
                  onPress={pickPoster}
                >
                  <ImageIcon size={20} color="#14b8a6" />
                  <Text style={styles.filePickerText}>
                    {posterAsset ? 'کاور انتخاب شد' : 'انتخاب تصویر کاور (اختیاری)'}
                  </Text>
                  {posterAsset && <CheckCircle2 size={16} color="#10b981" />}
                </TouchableOpacity>

                {/* دکمه ارسال */}
                <TouchableOpacity
                  style={[styles.submitAdBtn, isSubmitting && styles.disabledBtn]}
                  activeOpacity={0.8}
                  disabled={isSubmitting}
                  onPress={handleCreateAd}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#030712" />
                  ) : (
                    <>
                      <UploadCloud size={18} color="#030712" />
                      <Text style={styles.submitAdBtnText}>ثبت و ارسال به صف تبدیل HLS</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* 🟢 مدال آنالیز عملکرد و آمار */}
      {analyticsAd && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.analyticsCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>آنالیز عملکرد: {analyticsAd.title}</Text>
                <TouchableOpacity onPress={() => setAnalyticsAd(null)}>
                  <X size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <View style={styles.analyticsStatsGrid}>
                <View style={styles.analyticsStatBox}>
                  <Text style={styles.analyticsStatLabel}>دفعات نمایش کامل</Text>
                  <Text style={[styles.analyticsStatVal, { color: '#14b8a6' }]}>
                    {analyticsAd.viewsCount.toLocaleString('fa-IR')}
                  </Text>
                </View>

                <View style={styles.analyticsStatBox}>
                  <Text style={styles.analyticsStatLabel}>تعداد کلیک کاربران</Text>
                  <Text style={[styles.analyticsStatVal, { color: '#f59e0b' }]}>
                    {analyticsAd.clicksCount.toLocaleString('fa-IR')}
                  </Text>
                </View>
              </View>

              <View style={styles.ctrHighlightBox}>
                <Text style={styles.ctrHighlightLabel}>نرخ تبدیل کلیک (CTR)</Text>
                <Text style={styles.ctrHighlightVal}>
                  {analyticsAd.viewsCount > 0
                    ? ((analyticsAd.clicksCount / analyticsAd.viewsCount) * 100).toFixed(2)
                    : '0.00'}
                  ٪
                </Text>
              </View>

              <View style={styles.analyticsLinks}>
                <Text style={styles.analyticsLinkLabel}>لینک مقصد:</Text>
                <Text style={styles.analyticsLinkVal} numberOfLines={1}>
                  {analyticsAd.targetUrl}
                </Text>

                <Text style={[styles.analyticsLinkLabel, { marginTop: 6 }]}>مسیر استریم:</Text>
                <Text style={styles.analyticsLinkVal} numberOfLines={1}>
                  {analyticsAd.videoUrl || 'در حال آماده‌سازی HLS'}
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  scrollContent: { paddingBottom: 40 },
  centerContainer: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: 'Ravi-Regular', fontSize: 12, color: '#64748b' },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(13, 21, 32, 0.85)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: 'Ravi-Bold', fontSize: 13.5, color: '#ffffff' },
  headerSubtitle: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#94a3b8', textAlign: 'right' },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#0d1520',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    gap: 4,
  },
  statCardLabel: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#94a3b8', textAlign: 'right' },
  statCardValue: { fontFamily: 'Ravi-Bold', fontSize: 15, textAlign: 'right' },
  addAdBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    borderRadius: 16,
    height: 44,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 6,
  },
  addAdBtnText: { fontFamily: 'Ravi-Bold', fontSize: 12.5, color: '#030712' },
  searchBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: { flex: 1, fontFamily: 'Ravi-Regular', fontSize: 12, color: '#ffffff', textAlign: 'right' },
  listContainer: { paddingHorizontal: 16, gap: 12 },
  adCard: {
    backgroundColor: '#0d1520',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
    gap: 10,
  },
  cardTopRow: { flexDirection: 'row-reverse', gap: 12 },
  adPoster: { width: 60, height: 80, borderRadius: 12, backgroundColor: '#030712' },
  adPosterPlaceholder: {
    width: 60,
    height: 80,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adDetails: { flex: 1, gap: 4, justifyContent: 'center' },
  adTitle: { fontFamily: 'Ravi-Bold', fontSize: 13, color: '#ffffff', textAlign: 'right' },
  targetLinkRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  targetLinkText: { fontFamily: 'monospace', fontSize: 9.5, color: '#14b8a6', flex: 1, textAlign: 'right' },
  timingRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 2 },
  timingBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timingText: { fontFamily: 'monospace', fontSize: 9, color: '#cbd5e1' },
  skipText: { fontFamily: 'Ravi-Regular', fontSize: 9, color: '#94a3b8' },
  statusBadgesRow: { flexDirection: 'row-reverse', gap: 8 },
  hlsBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  hlsReady: { backgroundColor: 'rgba(45, 212, 191, 0.12)' },
  hlsTranscoding: { backgroundColor: 'rgba(99, 102, 241, 0.12)' },
  hlsText: { fontFamily: 'Ravi-Bold', fontSize: 9.5 },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  activeBadgeOn: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
  activeBadgeOff: { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  activeBadgeText: { fontFamily: 'Ravi-Bold', fontSize: 9.5 },
  cardBottomRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
  },
  adStats: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  adStatItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 3 },
  adStatText: { fontFamily: 'monospace', fontSize: 10.5, color: '#cbd5e1' },
  adCtrText: { fontFamily: 'monospace', fontSize: 10, color: '#c084fc' },
  actions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  actionIconBtn: { padding: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalKeyboardBox: { width: '100%', maxWidth: 360 },
  createModalCard: {
    backgroundColor: '#0c1222',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 18,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 10,
    marginBottom: 12,
  },
  modalHeaderTitle: { fontFamily: 'Ravi-Bold', fontSize: 13.5, color: '#ffffff' },
  modalScroll: { maxHeight: 420 },
  inputGroup: { marginBottom: 10 },
  inputRow: { flexDirection: 'row-reverse', gap: 8 },
  inputLabel: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#94a3b8', marginBottom: 4, textAlign: 'right' },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: 'Ravi-Regular',
    fontSize: 11.5,
    color: '#ffffff',
    textAlign: 'right',
  },
  ltrInput: { textAlign: 'left', fontFamily: 'monospace' },
  centerInput: { textAlign: 'center', fontFamily: 'monospace' },
  filePicker: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    padding: 12,
  },
  filePickerText: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#cbd5e1' },
  submitAdBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    borderRadius: 14,
    height: 44,
    marginTop: 14,
    gap: 6,
  },
  submitAdBtnText: { fontFamily: 'Ravi-Bold', fontSize: 12, color: '#030712' },
  disabledBtn: { opacity: 0.5 },
  analyticsCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#0c1222',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 18,
    gap: 12,
  },
  analyticsStatsGrid: { flexDirection: 'row-reverse', gap: 8 },
  analyticsStatBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  analyticsStatLabel: { fontFamily: 'Ravi-Regular', fontSize: 9.5, color: '#94a3b8' },
  analyticsStatVal: { fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold' },
  ctrHighlightBox: {
    backgroundColor: 'rgba(192, 132, 252, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.25)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  ctrHighlightLabel: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#d8b4fe' },
  ctrHighlightVal: { fontFamily: 'monospace', fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  analyticsLinks: { gap: 2, backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: 10, borderRadius: 12 },
  analyticsLinkLabel: { fontFamily: 'Ravi-Bold', fontSize: 9.5, color: '#94a3b8', textAlign: 'right' },
  analyticsLinkVal: { fontFamily: 'monospace', fontSize: 9, color: '#38bdf8', textAlign: 'left' },
});