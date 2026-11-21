import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { Plus, Check, X, Globe, Calendar } from 'lucide-react-native';

interface Props {
  formData: any;
  setFormData: (data: any) => void;
  errors: any;
  setErrors: (errors: any) => void;
  selectedGenres: string[];
  setSelectedGenres: (genres: string[]) => void;
  locationsList: string[];
  setLocationsList: (locations: string[]) => void;
  onNext: () => void;
  isSavingDraft?: boolean;
}

const availableGenres = ['درام', 'کمدی', 'اجتماعی', 'ترسناک', 'جنایی', 'علمی تخیلی', 'فانتزی', 'اکشن', 'موزیکال', 'سایر'];
const durationOptions = [30, 45, 60, 90, 120];

export default function StepOneInfo({
  formData,
  setFormData,
  errors,
  setErrors,
  selectedGenres,
  setSelectedGenres,
  locationsList,
  setLocationsList,
  onNext,
  isSavingDraft = false,
}: Props) {
  const [locationInput, setLocationInput] = useState('');

  const toggleGenre = (g: string) => {
    if (selectedGenres.includes(g)) {
      setSelectedGenres(selectedGenres.filter((item) => item !== g));
    } else {
      if (selectedGenres.length >= 3) return;
      setSelectedGenres([...selectedGenres, g]);
    }
    if (errors.genres) setErrors({ ...errors, genres: null });
  };

  const addLocation = () => {
    if (!locationInput.trim() || locationsList.includes(locationInput.trim())) return;
    setLocationsList([...locationsList, locationInput.trim()]);
    setLocationInput('');
  };

  const handleNext = () => {
    const newErrors: any = {};
    if (!formData.titleFa?.trim()) newErrors.titleFa = 'عنوان فارسی الزامی است.';
    if (selectedGenres.length === 0) newErrors.genres = 'حداقل یک ژانر انتخاب کنید.';
    if (!formData.durationMinutes) newErrors.durationMinutes = 'مدت زمان اثر الزامی است.';
    if (!formData.shortSynopsis?.trim()) newErrors.shortSynopsis = 'خلاصه کوتاه الزامی است.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    onNext();
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>عنوان فارسی *</Text>
        <TextInput
          style={[styles.input, errors.titleFa && styles.inputError]}
          placeholder="مثال: رویای سرخ"
          placeholderTextColor="#64748b"
          value={formData.titleFa}
          onChangeText={(val) => {
            setFormData({ ...formData, titleFa: val });
            if (errors.titleFa) setErrors({ ...errors, titleFa: null });
          }}
        />
        {errors.titleFa && <Text style={styles.errorText}>{errors.titleFa}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>عنوان انگلیسی (English Title)</Text>
        <TextInput
          style={[styles.input, styles.ltrInput]}
          placeholder="e.g. Red Dream"
          placeholderTextColor="#64748b"
          value={formData.titleEn}
          onChangeText={(val) => setFormData({ ...formData, titleEn: val })}
        />
      </View>

      {/* مدت زمان فعالیت کمپین */}
      <View style={styles.durationCard}>
        <View style={styles.durationHeader}>
          <Calendar size={16} color="#14b8a6" />
          <Text style={styles.durationTitle}>مدت فعالیت کمپین جهت جذب سرمایه *</Text>
        </View>

        <View style={styles.durationBtnsRow}>
          {durationOptions.map((days) => (
            <TouchableOpacity
              key={days}
              style={[
                styles.durationBtn,
                (formData.campaignDurationDays || 60) === days && styles.durationBtnActive,
              ]}
              onPress={() => setFormData({ ...formData, campaignDurationDays: days })}
            >
              <Text
                style={[
                  styles.durationBtnText,
                  (formData.campaignDurationDays || 60) === days && styles.durationBtnTextActive,
                ]}
              >
                {days} روز
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ژانرها */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>ژانرهای اثر (حداکثر ۳ مورد) *</Text>
        <View style={[styles.genresWrap, errors.genres && styles.inputError]}>
          {availableGenres.map((g) => {
            const isSelected = selectedGenres.includes(g);
            return (
              <TouchableOpacity
                key={g}
                style={[styles.genreBtn, isSelected && styles.genreBtnActive]}
                onPress={() => toggleGenre(g)}
              >
                {isSelected && <Check size={12} color="#030712" />}
                <Text style={[styles.genreBtnText, isSelected && styles.genreBtnTextActive]}>
                  {g}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {errors.genres && <Text style={styles.errorText}>{errors.genres}</Text>}
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>مدت زمان (دقیقه) *</Text>
          <TextInput
            style={[styles.input, styles.centerInput, errors.durationMinutes && styles.inputError]}
            keyboardType="numeric"
            placeholder="مثال: ۴۵"
            placeholderTextColor="#64748b"
            value={formData.durationMinutes}
            onChangeText={(val) => {
              setFormData({ ...formData, durationMinutes: val });
              if (errors.durationMinutes) setErrors({ ...errors, durationMinutes: null });
            }}
          />
          {errors.durationMinutes && <Text style={styles.errorText}>{errors.durationMinutes}</Text>}
        </View>

        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>زبان اثر</Text>
          <TextInput
            style={[styles.input, styles.centerInput]}
            value={formData.language || 'فارسی'}
            onChangeText={(val) => setFormData({ ...formData, language: val })}
          />
        </View>
      </View>

      {/* لوکیشن‌ها */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>محل تولید / لوکیشن‌ها</Text>
        <View style={styles.tagInputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="شهر یا کشور..."
            placeholderTextColor="#64748b"
            value={locationInput}
            onChangeText={setLocationInput}
          />
          <TouchableOpacity style={styles.addTagBtn} onPress={addLocation}>
            <Plus size={18} color="#030712" />
          </TouchableOpacity>
        </View>
        {locationsList.length > 0 && (
          <View style={styles.tagsContainer}>
            {locationsList.map((loc, idx) => (
              <View key={idx} style={styles.tagPill}>
                <Globe size={11} color="#14b8a6" />
                <Text style={styles.tagPillText}>{loc}</Text>
                <TouchableOpacity onPress={() => setLocationsList(locationsList.filter((_, i) => i !== idx))}>
                  <X size={12} color="#f43f5e" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>لاگ‌لاین (Logline)</Text>
        <TextInput
          style={styles.input}
          placeholder="خلاصه تک‌جمله‌ای کلیدی اثر..."
          placeholderTextColor="#64748b"
          value={formData.logline}
          onChangeText={(val) => setFormData({ ...formData, logline: val })}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>خلاصه کوتاه کارت (سه‌خطی) *</Text>
        <TextInput
          style={[styles.input, styles.textarea, errors.shortSynopsis && styles.inputError]}
          multiline
          numberOfLines={3}
          placeholder="خلاصه‌ای کوتاه برای نمایش روی کارت کمپین..."
          placeholderTextColor="#64748b"
          value={formData.shortSynopsis}
          onChangeText={(val) => {
            setFormData({ ...formData, shortSynopsis: val });
            if (errors.shortSynopsis) setErrors({ ...errors, shortSynopsis: null });
          }}
        />
        {errors.shortSynopsis && <Text style={styles.errorText}>{errors.shortSynopsis}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>خلاصه داستان کامل (Synopsis)</Text>
        <TextInput
          style={[styles.input, styles.textareaLarge]}
          multiline
          numberOfLines={4}
          placeholder="شرح و خلاصه کامل داستان فیلم..."
          placeholderTextColor="#64748b"
          value={formData.synopsis}
          onChangeText={(val) => setFormData({ ...formData, synopsis: val })}
        />
      </View>

      <TouchableOpacity
        style={[styles.nextBtn, isSavingDraft && styles.btnDisabled]}
        activeOpacity={0.8}
        disabled={isSavingDraft}
        onPress={handleNext}
      >
        {isSavingDraft ? (
          <ActivityIndicator size="small" color="#030712" />
        ) : (
          <Text style={styles.nextBtnText}>ثبت پیش‌نویس و مرحله بعد ←</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  inputGroup: { gap: 4 },
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
  inputError: { borderColor: '#f43f5e' },
  errorText: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#f43f5e', textAlign: 'right' },
  ltrInput: { textAlign: 'left', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  centerInput: { textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  textarea: { height: 65, textAlignVertical: 'top' },
  textareaLarge: { height: 85, textAlignVertical: 'top' },
  row: { flexDirection: 'row-reverse', gap: 8 },
  durationCard: {
    backgroundColor: 'rgba(20, 184, 166, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
    borderRadius: 14,
    padding: 10,
    gap: 8,
  },
  durationHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  durationTitle: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#2dd4bf' },
  durationBtnsRow: { flexDirection: 'row-reverse', gap: 6 },
  durationBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
  },
  durationBtnActive: { backgroundColor: '#14b8a6' },
  durationBtnText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 10.5, color: '#cbd5e1' },
  durationBtnTextActive: { fontFamily: 'Ravi-Bold', color: '#030712' },
  genresWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, padding: 8, backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 12 },
  genreBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  genreBtnActive: { backgroundColor: '#14b8a6' },
  genreBtnText: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#cbd5e1' },
  genreBtnTextActive: { fontFamily: 'Ravi-Bold', color: '#030712' },
  tagInputRow: { flexDirection: 'row-reverse', gap: 6 },
  addTagBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#14b8a6', alignItems: 'center', justifyContent: 'center' },
  tagsContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tagPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagPillText: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#2dd4bf' },
  nextBtn: { height: 44, borderRadius: 14, backgroundColor: '#14b8a6', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  nextBtnText: { fontFamily: 'Ravi-Bold', fontSize: 12.5, color: '#030712' },
  btnDisabled: { opacity: 0.5 },
});