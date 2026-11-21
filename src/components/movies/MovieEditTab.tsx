import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ToastAndroid,
  Platform,
  Alert,
} from 'react-native';
import { Lock, AlertCircle, Save } from 'lucide-react-native';
import { api } from '../../api/axiosClient';

export default function MovieEditTab({ movie, onRefresh }: { movie: any; onRefresh: () => void }) {
  const isApproved = movie.status === 'Approved' || movie.status === 3;

  const [titleFa, setTitleFa] = useState(movie.titleFa || '');
  const [titleEn, setTitleEn] = useState(movie.titleEn || '');
  const [synopsis, setSynopsis] = useState(movie.synopsis || '');
  const [durationMinutes, setDurationMinutes] = useState(movie.durationMinutes?.toString() || '');
  const [releaseYear, setReleaseYear] = useState(movie.releaseYear?.toString() || '');
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  const handleSave = async () => {
    if (!titleFa.trim() || !synopsis.trim() || !durationMinutes) {
      showToast('لطفاً فیلدهای الزامی را تکمیل کنید');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        movieId: movie.id,
        titleFa,
        titleEn: titleEn || null,
        synopsis,
        category: movie.category,
        genres: movie.genres || [],
        keywords: movie.keywords || [],
        crew: movie.crew || [],
        countries: movie.productionCountries || [],
        releaseYear: releaseYear ? parseInt(releaseYear, 10) : null,
        durationMinutes: parseInt(durationMinutes, 10),
        newVideoUrl: isApproved ? null : movie.videoUrl,
        trailerUrl: movie.trailerUrl,
        mainPosterUrl: movie.mainPosterUrl,
        posters: movie.posters || [],
        behindSceneVideoUrl: null,
        behindSceneImages: movie.behindSceneImages || [],
      };

      await api.put(`/movies/${movie.id}`, payload);
      showToast('تغییرات با موفقیت ذخیره شد');
      onRefresh();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ویرایش فیلم');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {isApproved ? (
        <View style={styles.infoBanner}>
          <Lock size={16} color="#fbbf24" />
          <Text style={styles.infoText}>
            این فیلم تایید شده است؛ ویرایش مشخصات امکان‌پذیر است اما فایل ویدیوی اصلی قفل می‌باشد.
          </Text>
        </View>
      ) : (
        <View style={[styles.infoBanner, { borderColor: 'rgba(20, 184, 166, 0.3)', backgroundColor: 'rgba(20, 184, 166, 0.08)' }]}>
          <AlertCircle size={16} color="#2dd4bf" />
          <Text style={[styles.infoText, { color: '#99f6e4' }]}>
            پس از ذخیره تغییرات، فیلم مجدداً در صف تایید ادمین قرار خواهد گرفت.
          </Text>
        </View>
      )}

      <View style={styles.formCard}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>عنوان فارسی *</Text>
          <TextInput
            style={styles.input}
            value={titleFa}
            onChangeText={setTitleFa}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>عنوان انگلیسی</Text>
          <TextInput
            style={[styles.input, styles.ltrInput]}
            value={titleEn}
            onChangeText={setTitleEn}
          />
        </View>

        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>مدت زمان (دقیقه) *</Text>
            <TextInput
              style={[styles.input, styles.centerInput]}
              keyboardType="numeric"
              value={durationMinutes}
              onChangeText={setDurationMinutes}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>سال ساخت</Text>
            <TextInput
              style={[styles.input, styles.centerInput]}
              keyboardType="numeric"
              value={releaseYear}
              onChangeText={setReleaseYear}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>خلاصه داستان *</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            multiline
            numberOfLines={4}
            value={synopsis}
            onChangeText={setSynopsis}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, submitting && styles.disabledBtn]}
          activeOpacity={0.8}
          disabled={submitting}
          onPress={handleSave}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#030712" />
          ) : (
            <>
              <Save size={16} color="#030712" />
              <Text style={styles.saveBtnText}>ذخیره تغییرات</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  infoBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 14,
    padding: 10,
  },
  infoText: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#fde68a', flex: 1, textAlign: 'right' },
  formCard: {
    backgroundColor: '#0d1520',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
    gap: 10,
  },
  inputGroup: { gap: 4 },
  inputRow: { flexDirection: 'row-reverse', gap: 8 },
  label: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#94a3b8', textAlign: 'right' },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: 'Ravi-Regular',
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'right',
  },
  ltrInput: { textAlign: 'left', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  centerInput: { textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  textarea: { height: 80, textAlignVertical: 'top' },
  saveBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: '#14b8a6',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
  },
  saveBtnText: { fontFamily: 'Ravi-Bold', fontSize: 12, color: '#030712' },
  disabledBtn: { opacity: 0.5 },
});