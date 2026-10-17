import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Image as ImageIcon, FileText, Trash2, Zap, Clock, AlertTriangle } from 'lucide-react-native';
import { toFarsiDigits } from '../../../api/axiosClient';

interface Props {
  formData: any;
  setFormData: (data: any) => void;
  errors: any;
  setErrors: (errors: any) => void;
  posterAssets: ImagePicker.ImagePickerAsset[];
  setPosterAssets: (assets: ImagePicker.ImagePickerAsset[]) => void;
  mainPosterIndex: number;
  setMainPosterIndex: (idx: number) => void;
  financialDocsAsset: DocumentPicker.DocumentPickerAsset | null;
  setFinancialDocsAsset: (a: DocumentPicker.DocumentPickerAsset | null) => void;
  submitting: boolean;
  uploadLabel: string;
  uploadProgress?: number;
  uploadSpeed?: string;
  uploadTimeRemaining?: string;
  existingFiles?: any;
  onBack: () => void;
  onSubmit: () => void;
}

export default function StepThreeBudget({
  formData,
  setFormData,
  errors,
  setErrors,
  posterAssets = [],
  setPosterAssets,
  mainPosterIndex,
  setMainPosterIndex,
  financialDocsAsset,
  setFinancialDocsAsset,
  submitting,
  uploadLabel,
  uploadProgress = 0,
  uploadSpeed = '',
  uploadTimeRemaining = '',
  existingFiles = {},
  onBack,
  onSubmit,
}: Props) {
  const stage = formData.currentStage || '';
  const isProdStage = stage.includes('تولید (Production)');
  const isPostProdStage = stage.includes('پس‌تولید');

  const isPreProdDisabled = isProdStage || isPostProdStage;
  const isProdDisabled = isPostProdStage;

  const preCost = isPreProdDisabled ? 0 : parseFloat(formData.costPreProduction || '0');
  const prodCost = isProdDisabled ? 0 : parseFloat(formData.costProduction || '0');
  const postCost = parseFloat(formData.costPostProduction || '0');
  const grandTotal = preCost + prodCost + postCost;

  const pickPosters = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (!res.canceled && res.assets) {
      setPosterAssets([...posterAssets, ...res.assets].slice(0, 5));
    }
  };

  const pickZip = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/zip', 'application/x-zip-compressed'],
      copyToCacheDirectory: true,
    });
    if (!res.canceled && res.assets && res.assets[0]) {
      setFinancialDocsAsset(res.assets[0]);
    }
  };

  const handleFormSubmit = () => {
    const newErrors: any = {};
    if (posterAssets.length === 0 && !existingFiles?.mainPosterUrl) {
      newErrors.poster = 'حداقل انتخاب یک پوستر برای کمپین الزامی است.';
    }
    if (grandTotal <= 0) {
      newErrors.budget = 'مجموع بودجه مورد نیاز کمپین باید بیشتر از صفر باشد.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    onSubmit();
  };

  return (
    <View style={styles.container}>
      {/* هزینه‌های ۳ گانه */}
      <View style={styles.budgetGrid}>
        <View style={[styles.budgetBox, isPreProdDisabled && styles.disabledBox]}>
          <Text style={[styles.budgetTitle, isPreProdDisabled && styles.disabledText]}>
            ۱. پیش‌تولید {isPreProdDisabled && '(انجام شده)'}
          </Text>
          <TextInput
            style={styles.budgetInput}
            keyboardType="numeric"
            editable={!isPreProdDisabled}
            placeholder={isPreProdDisabled ? 'تکمیل شده' : 'هزینه (تومان)'}
            placeholderTextColor="#64748b"
            value={isPreProdDisabled ? '' : formData.costPreProduction}
            onChangeText={(val) => setFormData({ ...formData, costPreProduction: val })}
          />
          <TextInput
            style={styles.budgetInput}
            keyboardType="numeric"
            editable={!isPreProdDisabled}
            placeholder={isPreProdDisabled ? 'تکمیل شده' : 'مدت (روز)'}
            placeholderTextColor="#64748b"
            value={isPreProdDisabled ? '' : formData.daysPreProduction}
            onChangeText={(val) => setFormData({ ...formData, daysPreProduction: val })}
          />
        </View>

        <View style={[styles.budgetBox, isProdDisabled && styles.disabledBox]}>
          <Text style={[styles.budgetTitle, isProdDisabled && styles.disabledText]}>
            ۲. تولید {isProdDisabled && '(انجام شده)'}
          </Text>
          <TextInput
            style={styles.budgetInput}
            keyboardType="numeric"
            editable={!isProdDisabled}
            placeholder={isProdDisabled ? 'تکمیل شده' : 'هزینه (تومان)'}
            placeholderTextColor="#64748b"
            value={isProdDisabled ? '' : formData.costProduction}
            onChangeText={(val) => setFormData({ ...formData, costProduction: val })}
          />
          <TextInput
            style={styles.budgetInput}
            keyboardType="numeric"
            editable={!isProdDisabled}
            placeholder={isProdDisabled ? 'تکمیل شده' : 'مدت (روز)'}
            placeholderTextColor="#64748b"
            value={isProdDisabled ? '' : formData.daysProduction}
            onChangeText={(val) => setFormData({ ...formData, daysProduction: val })}
          />
        </View>

        <View style={styles.budgetBox}>
          <Text style={styles.budgetTitle}>۳. پس‌تولید</Text>
          <TextInput
            style={styles.budgetInput}
            keyboardType="numeric"
            placeholder="هزینه (تومان)"
            placeholderTextColor="#64748b"
            value={formData.costPostProduction}
            onChangeText={(val) => setFormData({ ...formData, costPostProduction: val })}
          />
          <TextInput
            style={styles.budgetInput}
            keyboardType="numeric"
            placeholder="مدت (روز)"
            placeholderTextColor="#64748b"
            value={formData.daysPostProduction}
            onChangeText={(val) => setFormData({ ...formData, daysPostProduction: val })}
          />
        </View>
      </View>

      <View style={styles.totalBudgetCard}>
        <Text style={styles.totalBudgetLabel}>کل بودجه درخواستی کمپین:</Text>
        <Text style={styles.totalBudgetValue}>{grandTotal.toLocaleString('fa-IR')} تومان</Text>
        {errors?.budget && <Text style={styles.errorText}>{errors.budget}</Text>}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>پوسترهای کمپین (حداکثر ۵ عدد) *</Text>
        <TouchableOpacity style={styles.uploadBox} activeOpacity={0.8} onPress={pickPosters}>
          <ImageIcon size={24} color="#14b8a6" />
          <Text style={styles.uploadBoxText}>افزودن پوستر از گالری</Text>
        </TouchableOpacity>

        {posterAssets.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.postersRow}>
            {posterAssets.map((p, idx) => (
              <View key={idx} style={[styles.posterThumb, mainPosterIndex === idx && styles.posterThumbMain]}>
                <Image source={{ uri: p.uri }} style={styles.posterImg} contentFit="cover" />
                <TouchableOpacity style={styles.mainBadgeSelect} onPress={() => setMainPosterIndex(idx)}>
                  <Text style={styles.mainBadgeText}>
                    {mainPosterIndex === idx ? 'اصلی' : 'انتخاب اصلی'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deletePosterBtn}
                  onPress={() => setPosterAssets(posterAssets.filter((_, i) => i !== idx))}
                >
                  <Trash2 size={12} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
        {errors?.poster && <Text style={styles.errorText}>{errors.poster}</Text>}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>مدارک و ریز فاکتورهای مالی (ZIP اختیاری)</Text>
        <TouchableOpacity style={styles.uploadBox} activeOpacity={0.8} onPress={pickZip}>
          <FileText size={22} color="#f59e0b" />
          <Text style={styles.uploadBoxText} numberOfLines={1}>
            {financialDocsAsset ? financialDocsAsset.name : existingFiles?.financialDocumentsUrl ? 'فایل ZIP موجود است (لمس برای تغییر)' : 'آپلود فایل ZIP فاکتورها'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 🟢 کارت پیشرفت آپلود با تمامی جزئیات */}
      {submitting && uploadLabel ? (
        <View style={styles.uploadProgressCard}>
          <View style={styles.progressHeaderRow}>
            <View style={styles.progressTitleGroup}>
              <ActivityIndicator size="small" color="#14b8a6" />
              <Text style={styles.progressLabelText}>{uploadLabel}</Text>
            </View>
            <Text style={styles.progressPercentNumber}>
              {toFarsiDigits(uploadProgress)}٪
            </Text>
          </View>

          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Zap size={14} color="#14b8a6" />
              <Text style={styles.statLabel}>سرعت آپلود:</Text>
              <Text style={styles.statValue}>
                {toFarsiDigits(uploadSpeed || 'در حال محاسبه...')}
              </Text>
            </View>

            <View style={styles.statCol}>
              <Clock size={14} color="#f59e0b" />
              <Text style={styles.statLabel}>زمان تقریبی:</Text>
              <Text style={styles.statValue}>
                {toFarsiDigits(uploadTimeRemaining || 'در حال محاسبه...')}
              </Text>
            </View>
          </View>

          <View style={styles.warningContainer}>
            <AlertTriangle size={16} color="#f43f5e" />
            <Text style={styles.warningAlertText}>
              توجه: لطفاً تا ثبت نهایی کمپین، برنامه را نبندید و اتصال اینترنت خود را حفظ کنید.
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.backBtn} disabled={submitting} onPress={onBack}>
          <Text style={styles.backBtnText}>← قبلی</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.disabledBtn]}
          activeOpacity={0.8}
          disabled={submitting}
          onPress={handleFormSubmit}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#030712" />
          ) : (
            <Text style={styles.submitBtnText}>ثبت نهایی کمپین</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  budgetGrid: { flexDirection: 'row-reverse', gap: 6 },
  budgetBox: {
    flex: 1,
    backgroundColor: '#0d1520',
    borderRadius: 14,
    padding: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  disabledBox: { opacity: 0.4 },
  budgetTitle: { fontFamily: 'Ravi-Bold', fontSize: 10, color: '#14b8a6', textAlign: 'center' },
  disabledText: { color: '#64748b' },
  budgetInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingVertical: 5,
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#ffffff',
    textAlign: 'center',
  },
  totalBudgetCard: {
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  totalBudgetLabel: { fontFamily: 'Ravi-Regular', fontSize: 11, color: '#94a3b8' },
  totalBudgetValue: { fontFamily: 'Ravi-Bold', fontSize: 18, color: '#2dd4bf' },
  errorText: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#f43f5e', textAlign: 'right' },
  sectionCard: { backgroundColor: '#0d1520', borderRadius: 16, padding: 12, gap: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  cardTitle: { fontFamily: 'Ravi-Bold', fontSize: 11.5, color: '#ffffff', textAlign: 'right' },
  uploadBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  uploadBoxText: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#cbd5e1' },
  postersRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 4 },
  posterThumb: { width: 65, height: 95, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  posterThumbMain: { borderColor: '#14b8a6', borderWidth: 2 },
  posterImg: { width: '100%', height: '100%' },
  mainBadgeSelect: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', paddingVertical: 2, alignItems: 'center' },
  mainBadgeText: { fontFamily: 'Ravi-Bold', fontSize: 8, color: '#ffffff' },
  deletePosterBtn: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: '#f43f5e', alignItems: 'center', justifyContent: 'center' },

  uploadProgressCard: {
    backgroundColor: '#0b1320',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.35)',
    padding: 14,
    gap: 12,
    marginVertical: 4,
  },
  progressHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTitleGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  progressLabelText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11.5,
    color: '#e2e8f0',
    textAlign: 'right',
  },
  progressPercentNumber: {
    fontFamily: 'Ravi-Bold',
    fontSize: 15,
    color: '#14b8a6',
  },
  progressBarTrack: {
    width: '100%',
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#14b8a6',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 10,
  },
  statCol: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10,
    color: '#94a3b8',
  },
  statValue: {
    fontFamily: 'Ravi-Bold',
    fontSize: 10,
    color: '#ffffff',
  },
  warningContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
    borderRadius: 12,
    padding: 10,
  },
  warningAlertText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10.5,
    color: '#fca5a5',
    flex: 1,
    textAlign: 'right',
    lineHeight: 16,
  },

  btnRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 6 },
  backBtn: { flex: 1, height: 44, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.05)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontFamily: 'Ravi-Bold', fontSize: 11.5, color: '#94a3b8' },
  submitBtn: { flex: 2, height: 44, borderRadius: 14, backgroundColor: '#14b8a6', alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { fontFamily: 'Ravi-Bold', fontSize: 12, color: '#030712' },
  disabledBtn: { opacity: 0.5 },
});