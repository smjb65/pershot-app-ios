import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  ActivityIndicator,
  ToastAndroid,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  Video,
  Image as ImageIcon,
  CheckCircle2,
  Film,
  Rocket,
  Upload,
} from 'lucide-react-native';
import { api, getMediaUrl } from '../../api/axiosClient';

interface Props {
  onSuccess: () => void;
}

export default function AddReelForm({ onSuccess }: Props) {
  const [myMovies, setMyMovies] = useState<any[]>([]);
  const [myCampaigns, setMyCampaigns] = useState<any[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(true);

  // 🟢 اتصال به اثر پیش‌فرض خاموش (اختیاری) است
  const [isLinked, setIsLinked] = useState(false);
  const [linkedType, setLinkedType] = useState<'Movie' | 'Campaign'>('Movie');
  const [selectedEntityId, setSelectedEntityId] = useState('');

  const [videoAsset, setVideoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [posterAsset, setPosterAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [isCommentsEnabled, setIsCommentsEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  useEffect(() => {
    Promise.all([
      api.get('/movies/my-movies'),
      api.get('/projects/my-campaigns'),
    ])
      .then(([moviesRes, campaignsRes]) => {
        setMyMovies(
          moviesRes.data?.filter(
            (m: any) => m.status === 'Approved' || m.status === 'published'
          ) || []
        );
        setMyCampaigns(
          campaignsRes.data?.filter(
            (c: any) => c.status === 'Approved' || c.status === 'published'
          ) || []
        );
      })
      .catch(() => {})
      .finally(() => setLoadingEntities(false));
  }, []);

  const pickVideo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (!res.canceled && res.assets[0]) {
      setVideoAsset(res.assets[0]);
    }
  };

  const pickPoster = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      aspect: [9, 16],
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]) {
      setPosterAsset(res.assets[0]);
    }
  };

  const currentOptions = linkedType === 'Movie' ? myMovies : myCampaigns;

  const handleCreate = async () => {
    if (!videoAsset) {
      showToast('انتخاب فایل ویدیو الزامی است');
      return;
    }

    // 🟢 اگر کاربر اتصال را روشن کرده باشد ولی اثری انتخاب نکرده باشد، هشدار می‌دهیم
    if (isLinked && !selectedEntityId) {
      showToast('لطفاً اثر مدنظر را انتخاب کنید یا کلید اتصال را خاموش کنید');
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();

      const vFilename = videoAsset.uri.split('/').pop() || 'reel_video.mp4';
      formData.append('VideoFile', {
        uri: videoAsset.uri,
        name: vFilename,
        type: 'video/mp4',
      } as any);

      if (posterAsset) {
        const pFilename = posterAsset.uri.split('/').pop() || 'reel_poster.jpg';
        formData.append('PosterFile', {
          uri: posterAsset.uri,
          name: pFilename,
          type: 'image/jpeg',
        } as any);
      }

      if (caption.trim()) formData.append('Caption', caption.trim());
      formData.append('IsCommentsEnabled', isCommentsEnabled.toString());

      // 🟢 فقط در صورت فعال بودن سوییچ و انتخاب اثر، اطلاعات مرتبط ارسال می‌شود
      if (isLinked && selectedEntityId) {
        const selectedEntity = currentOptions.find((o) => o.id === selectedEntityId);
        if (selectedEntity) {
          formData.append('LinkedEntityType', linkedType);
          formData.append('LinkedEntityId', selectedEntityId);
          formData.append(
            'LinkedEntityTitle',
            selectedEntity.title || selectedEntity.titleFa || ''
          );
        }
      }

      await api.post('/reels', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showToast('ریلز با موفقیت ارسال شد و در صف تایید قرار گرفت');
      onSuccess();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ثبت ریلز');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.formContainer}>
      {/* انتخاب فایل ویدیو و پوستر */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>بارگذاری فایل ویدیو و پوستر</Text>

        <View style={styles.uploadRow}>
          {/* ویدیو */}
          <TouchableOpacity style={styles.uploadBox} activeOpacity={0.8} onPress={pickVideo}>
            <Video size={24} color="#14b8a6" />
            <Text style={styles.uploadBoxText} numberOfLines={1}>
              {videoAsset ? videoAsset.uri.split('/').pop() : 'انتخاب ویدیو (الزامی) *'}
            </Text>
          </TouchableOpacity>

          {/* پوستر */}
          <TouchableOpacity style={styles.uploadBox} activeOpacity={0.8} onPress={pickPoster}>
            <ImageIcon size={24} color="#f59e0b" />
            <Text style={styles.uploadBoxText} numberOfLines={1}>
              {posterAsset ? posterAsset.uri.split('/').pop() : 'کاور اختیاری'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* اتصال اختیاری به فیلم یا کمپین */}
      <View style={styles.sectionCard}>
        <View style={styles.switchRowHeader}>
          <View style={styles.switchTextContainer}>
            <Text style={styles.sectionTitle}>اتصال به فیلم یا کمپین (اختیاری)</Text>
            <Text style={styles.sectionDesc}>
              می‌توانید این ریلز را به عنوان تیزر یکی از آثار یا کمپین‌های خود متصل کنید.
            </Text>
          </View>
          <Switch
            value={isLinked}
            onValueChange={(val) => {
              setIsLinked(val);
              if (!val) setSelectedEntityId('');
            }}
            thumbColor={isLinked ? '#14b8a6' : '#64748b'}
            trackColor={{ false: 'rgba(255, 255, 255, 0.08)', true: 'rgba(20, 184, 166, 0.35)' }}
          />
        </View>

        {isLinked && (
          <View style={styles.linkedContentContainer}>
            <View style={styles.typeSelectorRow}>
              <TouchableOpacity
                style={[styles.typeBtn, linkedType === 'Movie' && styles.typeBtnActive]}
                activeOpacity={0.8}
                onPress={() => {
                  setLinkedType('Movie');
                  setSelectedEntityId('');
                }}
              >
                <Film size={15} color={linkedType === 'Movie' ? '#14b8a6' : '#94a3b8'} />
                <Text style={[styles.typeBtnText, linkedType === 'Movie' && styles.typeBtnTextActive]}>
                  اتصال به فیلم ({myMovies.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeBtn, linkedType === 'Campaign' && styles.typeBtnActiveAmber]}
                activeOpacity={0.8}
                onPress={() => {
                  setLinkedType('Campaign');
                  setSelectedEntityId('');
                }}
              >
                <Rocket size={15} color={linkedType === 'Campaign' ? '#f59e0b' : '#94a3b8'} />
                <Text style={[styles.typeBtnText, linkedType === 'Campaign' && styles.typeBtnTextActiveAmber]}>
                  اتصال به کمپین ({myCampaigns.length})
                </Text>
              </TouchableOpacity>
            </View>

            {loadingEntities ? (
              <ActivityIndicator size="small" color="#14b8a6" style={{ marginVertical: 10 }} />
            ) : currentOptions.length === 0 ? (
              <Text style={styles.noEntityText}>
                {linkedType === 'Movie'
                  ? 'شما هیچ فیلم تاییدشده‌ای برای اتصال ندارید.'
                  : 'شما هیچ کمپین تاییدشده‌ای برای اتصال ندارید.'}
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.entitiesScroll}
              >
                {currentOptions.map((item) => {
                  const isSelected = selectedEntityId === item.id;
                  const poster = item.posterUrl || item.mainPosterUrl;

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.entityCard, isSelected && styles.entityCardSelected]}
                      activeOpacity={0.8}
                      onPress={() => setSelectedEntityId(isSelected ? '' : item.id)}
                    >
                      <Image
                        source={{ uri: getMediaUrl(poster) }}
                        style={styles.entityPoster}
                        contentFit="cover"
                      />
                      <Text style={styles.entityTitle} numberOfLines={1}>
                        {item.title || item.titleFa}
                      </Text>
                      {isSelected && (
                        <View style={styles.entityCheckBadge}>
                          <CheckCircle2 size={12} color="#030712" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}
      </View>

      {/* توضیحات و تنظیمات دیدگاه */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>کپشن / توضیحات ریلز</Text>
        <TextInput
          style={styles.captionInput}
          multiline
          numberOfLines={3}
          placeholder="توضیحاتی برای این ریلز بنویسید..."
          placeholderTextColor="#64748b"
          value={caption}
          onChangeText={setCaption}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>بخش دیدگاه‌ها برای این ریلز باز باشد</Text>
          <Switch
            value={isCommentsEnabled}
            onValueChange={setIsCommentsEnabled}
            thumbColor={isCommentsEnabled ? '#14b8a6' : '#64748b'}
            trackColor={{ false: 'rgba(255, 255, 255, 0.08)', true: 'rgba(20, 184, 166, 0.35)' }}
          />
        </View>
      </View>

      {/* دکمه ارسال */}
      <TouchableOpacity
        style={[styles.submitBtn, isSubmitting && styles.disabledBtn]}
        activeOpacity={0.8}
        disabled={isSubmitting}
        onPress={handleCreate}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#030712" />
        ) : (
          <Text style={styles.submitBtnText}>ارسال ریلز جهت بررسی و انتشار</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    gap: 12,
  },
  sectionCard: {
    backgroundColor: '#0d1520',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'right',
  },
  sectionDesc: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'right',
    lineHeight: 14,
  },
  switchRowHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  switchTextContainer: {
    flex: 1,
    gap: 3,
  },
  linkedContentContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
    gap: 8,
  },
  typeSelectorRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  typeBtnActive: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderColor: '#14b8a6',
  },
  typeBtnActiveAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
  },
  typeBtnText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10.5,
    color: '#94a3b8',
  },
  typeBtnTextActive: {
    fontFamily: 'Ravi-Bold',
    color: '#2dd4bf',
  },
  typeBtnTextActiveAmber: {
    fontFamily: 'Ravi-Bold',
    color: '#fbbf24',
  },
  noEntityText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10.5,
    color: '#f43f5e',
    textAlign: 'right',
    paddingVertical: 6,
  },
  entitiesScroll: {
    flexDirection: 'row-reverse',
    gap: 8,
    paddingVertical: 4,
  },
  entityCard: {
    width: 85,
    alignItems: 'center',
    gap: 4,
    padding: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    position: 'relative',
  },
  entityCardSelected: {
    borderColor: '#14b8a6',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
  },
  entityPoster: {
    width: 70,
    height: 95,
    borderRadius: 10,
    backgroundColor: '#030712',
  },
  entityTitle: {
    fontFamily: 'Ravi-Regular',
    fontSize: 9.5,
    color: '#ffffff',
    textAlign: 'center',
    width: '100%',
  },
  entityCheckBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 4,
  },
  uploadBox: {
    flex: 1,
    height: 90,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 6,
  },
  uploadBoxText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10,
    color: '#cbd5e1',
    textAlign: 'center',
  },
  captionInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 10,
    fontFamily: 'Ravi-Regular',
    fontSize: 11.5,
    color: '#ffffff',
    textAlign: 'right',
    height: 70,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 8,
  },
  switchLabel: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10.5,
    color: '#cbd5e1',
  },
  submitBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 12,
    color: '#030712',
  },
  disabledBtn: {
    opacity: 0.5,
  },
});