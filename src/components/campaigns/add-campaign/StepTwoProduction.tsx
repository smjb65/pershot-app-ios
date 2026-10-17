import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Video, FileText, Plus, Trash2, Users, CheckCircle2, Zap, Clock, RefreshCw } from 'lucide-react-native';
import { uploadMediaFile } from '../../../utils/fileUploader';
import { toFarsiDigits, api } from '../../../api/axiosClient';

interface Props {
  formData: any;
  setFormData: (data: any) => void;
  errors: any;
  setErrors: (errors: any) => void;
  crewItems: any[];
  setCrewItems: (crew: any[]) => void;
  pitchAsset: ImagePicker.ImagePickerAsset | null;
  setPitchAsset: (a: ImagePicker.ImagePickerAsset | null) => void;
  scriptAsset: DocumentPicker.DocumentPickerAsset | null;
  setScriptAsset: (a: DocumentPicker.DocumentPickerAsset | null) => void;
  ideaAsset: DocumentPicker.DocumentPickerAsset | null;
  setIdeaAsset: (a: DocumentPicker.DocumentPickerAsset | null) => void;
  roughCutAsset: ImagePicker.ImagePickerAsset | null;
  setRoughCutAsset: (a: ImagePicker.ImagePickerAsset | null) => void;
  existingFiles?: any;
  onBack: () => void;
  onNext: () => void;
}

const stages = [
  'طرح (Idea Stage)',
  'فیلمنامه (Script Stage)',
  'پیش‌تولید (Pre-production)',
  'تولید (Production)',
  'پس‌تولید (Post-production)',
];

const crewRoles = ['کارگردان', 'تهیه‌کننده', 'نویسنده', 'مدیر فیلمبرداری', 'تدوین‌‌گر', 'بازیگر', 'سایر'];

export default function StepTwoProduction({
  formData,
  setFormData,
  errors,
  setErrors,
  crewItems = [],
  setCrewItems,
  pitchAsset,
  setPitchAsset,
  scriptAsset,
  setScriptAsset,
  ideaAsset,
  setIdeaAsset,
  roughCutAsset,
  setRoughCutAsset,
  existingFiles = {},
  onBack,
  onNext,
}: Props) {
  const stage = formData.currentStage || 'طرح (Idea Stage)';
  const isIdeaStage = stage.includes('طرح');
  const isScriptStage = stage.includes('فیلمنامه');
  const isPreProdStage = stage.includes('پیش‌تولید');
  const isProdStage = stage.includes('تولید (Production)');
  const isPostProdStage = stage.includes('پس‌تولید');

  const [crewName, setCrewName] = useState('');
  const [crewRole, setCrewRole] = useState('کارگردان');

  // استیت‌های آپلود آنی پیچ ویدیو
  const [pitchUploadStatus, setPitchUploadStatus] = useState<'idle' | 'uploading' | 'completed' | 'error'>('idle');
  const [pitchProgress, setPitchProgress] = useState(0);
  const [pitchSpeed, setPitchSpeed] = useState('');
  const [pitchTimeRemaining, setPitchTimeRemaining] = useState('');
  const [uploadedPitchUrl, setUploadedPitchUrl] = useState<string | null>(existingFiles?.pitchVideoUrl || null);

  // استیت‌های آپلود آنی راف‌کات
  const [roughCutUploadStatus, setRoughCutUploadStatus] = useState<'idle' | 'uploading' | 'completed' | 'error'>('idle');
  const [roughCutProgress, setRoughCutProgress] = useState(0);
  const [roughCutSpeed, setRoughCutSpeed] = useState('');
  const [roughCutTimeRemaining, setRoughCutTimeRemaining] = useState('');
  const [uploadedRoughCutUrl, setUploadedRoughCutUrl] = useState<string | null>(existingFiles?.roughCutUrl || null);

  // استیت‌های آپلود اسناد PDF
  const [scriptUploadStatus, setScriptUploadStatus] = useState<'idle' | 'uploading' | 'completed'>('idle');
  const [ideaUploadStatus, setIdeaUploadStatus] = useState<'idle' | 'uploading' | 'completed'>('idle');

  const addCrewMember = () => {
    if (!crewName.trim()) return;
    setCrewItems([...crewItems, { name: crewName.trim(), role: crewRole }]);
    setCrewName('');
  };

  // شروع آنی استریم ۲ کانکشنه پیچ ویدیو
  const startOptimisticPitchUpload = async (asset: ImagePicker.ImagePickerAsset) => {
    setPitchAsset(asset);
    setPitchUploadStatus('uploading');
    setPitchProgress(0);
    setPitchSpeed('برقراری ۲ کانکشن...');
    setPitchTimeRemaining('---');
    if (errors.pitchFile) setErrors({ ...errors, pitchFile: null });

    const fileName = asset.uri.split('/').pop() || 'pitch.mp4';
    try {
      const url = await uploadMediaFile(
        asset.uri,
        fileName,
        'video/mp4',
        'campaigns/pitches',
        (info) => {
          setPitchProgress(info.percent);
          setPitchSpeed(info.speed);
          setPitchTimeRemaining(info.timeRemaining);
        }
      );
      setUploadedPitchUrl(url);
      setPitchUploadStatus('completed');
      setFormData({ ...formData, pitchVideoUrl: url });
    } catch (err: any) {
      setPitchUploadStatus('error');
      Alert.alert('خطا در آپلود ویدیوی معرفی', err.message || 'خطا در ارتباط با سرور.');
    }
  };

  // شروع آنی استریم ۲ کانکشنه راف‌کات
  const startOptimisticRoughCutUpload = async (asset: ImagePicker.ImagePickerAsset) => {
    setRoughCutAsset(asset);
    setRoughCutUploadStatus('uploading');
    setRoughCutProgress(0);
    setRoughCutSpeed('برقراری ۲ کانکشن...');
    setRoughCutTimeRemaining('---');
    if (errors.roughCutFile) setErrors({ ...errors, roughCutFile: null });

    const fileName = asset.uri.split('/').pop() || 'roughcut.mp4';
    try {
      const url = await uploadMediaFile(
        asset.uri,
        fileName,
        'video/mp4',
        'campaigns/roughcuts',
        (info) => {
          setRoughCutProgress(info.percent);
          setRoughCutSpeed(info.speed);
          setRoughCutTimeRemaining(info.timeRemaining);
        }
      );
      setUploadedRoughCutUrl(url);
      setRoughCutUploadStatus('completed');
      setFormData({ ...formData, roughCutUrl: url });
    } catch (err: any) {
      setRoughCutUploadStatus('error');
      Alert.alert('خطا در آپلود راف‌کات', err.message || 'خطا در ارتباط با سرور.');
    }
  };

  // آپلود فوری PDF فیلمنامه
  const handlePickScriptPdf = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (!res.canceled && res.assets && res.assets[0]) {
      const doc = res.assets[0];
      setScriptAsset(doc);
      setScriptUploadStatus('uploading');
      try {
        const url = await uploadMediaFile(doc.uri, doc.name, 'application/pdf', 'campaigns/scripts');
        setFormData({ ...formData, scriptFileUrl: url });
        setScriptUploadStatus('completed');
        if (errors.scriptFile) setErrors({ ...errors, scriptFile: null });
      } catch {
        setScriptUploadStatus('idle');
      }
    }
  };

  // آپلود فوری PDF طرح
  const handlePickIdeaPdf = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (!res.canceled && res.assets && res.assets[0]) {
      const doc = res.assets[0];
      setIdeaAsset(doc);
      setIdeaUploadStatus('uploading');
      try {
        const url = await uploadMediaFile(doc.uri, doc.name, 'application/pdf', 'campaigns/ideas');
        setFormData({ ...formData, ideaFileUrl: url });
        setIdeaUploadStatus('completed');
        if (errors.ideaFile) setErrors({ ...errors, ideaFile: null });
      } catch {
        setIdeaUploadStatus('idle');
      }
    }
  };

  const handleNext = () => {
    const newErrors: any = {};
    if (!uploadedPitchUrl && !pitchAsset && !existingFiles?.pitchVideoUrl) {
      newErrors.pitchFile = 'آپلود ویدیوی پیچ الزامی است.';
    }
    if (isIdeaStage) {
      if (!formData.ideaRegistrationNumber?.trim()) newErrors.ideaReg = 'شماره ثبت طرح الزامی است.';
      if (!formData.ideaFileUrl && !ideaAsset && !existingFiles?.ideaFileUrl) newErrors.ideaFile = 'آپلود PDF طرح الزامی است.';
    }
    if (isScriptStage || isPreProdStage || isProdStage || isPostProdStage) {
      if (!formData.scriptRegistrationNumber?.trim()) newErrors.scriptReg = 'شماره ثبت فیلمنامه الزامی است.';
      if (!formData.scriptFileUrl && !scriptAsset && !existingFiles?.scriptFileUrl) newErrors.scriptFile = 'آپلود PDF فیلمنامه الزامی است.';
    }
    if (isPostProdStage && !uploadedRoughCutUrl && !roughCutAsset && !existingFiles?.roughCutUrl) {
      newErrors.roughCutFile = 'آپلود فایل ویدیویی راف‌کات برای پروژه‌های فاز پس‌تولید الزامی است.';
    }

    if (pitchUploadStatus === 'uploading' || roughCutUploadStatus === 'uploading') {
      Alert.alert('صبر کنید', 'آپلود ویدیوهای این مرحله هنوز به پایان نرسیده است.');
      return;
    }

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
        <Text style={styles.label}>وضعیت فعلی پروژه *</Text>
        <View style={styles.stagesWrap}>
          {stages.map((st) => (
            <TouchableOpacity
              key={st}
              style={[styles.stageBtn, stage === st && styles.stageBtnActive]}
              onPress={() => {
                setFormData({ ...formData, currentStage: st });
                setErrors({});
              }}
            >
              <Text style={[styles.stageBtnText, stage === st && styles.stageBtnTextActive]}>
                {st}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ۱. ویدیوی معرفی اثر (پیچ ویدیو با استریم ۲ کانکشنه) */}
      <View style={[styles.uploadCard, errors.pitchFile && styles.errorCardBorder]}>
        <Text style={styles.cardTitle}>ویدیوی معرفی اثر (Pitch Video) *</Text>
        
        {pitchUploadStatus === 'uploading' ? (
          <View style={styles.optimisticCard}>
            <View style={styles.optimisticHeaderRow}>
              <View style={styles.optimisticFileMeta}>
                <ActivityIndicator size="small" color="#14b8a6" />
                <Text style={styles.optimisticFileName} numberOfLines={1}>
                  {pitchAsset?.uri.split('/').pop() || 'در حال ارسال ۲ کانکشن موازی...'}
                </Text>
              </View>
              <Text style={styles.optimisticPercentText}>{toFarsiDigits(pitchProgress)}٪</Text>
            </View>

            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${pitchProgress}%` }]} />
            </View>

            <View style={styles.separatedStatsBox}>
              <View style={styles.statSingleLine}>
                <View style={styles.statLabelWrap}>
                  <Zap size={14} color="#14b8a6" />
                  <Text style={styles.statLineLabel}>مجموع سرعت آپلود:</Text>
                </View>
                <Text style={styles.statLineValue}>{toFarsiDigits(pitchSpeed)}</Text>
              </View>

              <View style={styles.statSingleLine}>
                <View style={styles.statLabelWrap}>
                  <Clock size={14} color="#f59e0b" />
                  <Text style={styles.statLineLabel}>زمان باقی‌مانده:</Text>
                </View>
                <Text style={styles.statLineValue}>{toFarsiDigits(pitchTimeRemaining)}</Text>
              </View>
            </View>
          </View>
        ) : uploadedPitchUrl ? (
          <View style={styles.completedCard}>
            <View style={styles.completedRight}>
              <CheckCircle2 size={18} color="#2dd4bf" />
              <Text style={styles.completedTitle} numberOfLines={1}>ویدیوی معرفی با موفقیت ذخیره شد ✓</Text>
            </View>
            <TouchableOpacity
              style={styles.replaceBtn}
              onPress={async () => {
                const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
                if (!res.canceled && res.assets[0]) startOptimisticPitchUpload(res.assets[0]);
              }}
            >
              <RefreshCw size={12} color="#f43f5e" />
              <Text style={styles.replaceBtnText}>تغییر ویدیو</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadBox}
            activeOpacity={0.8}
            onPress={async () => {
              const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
              if (!res.canceled && res.assets[0]) startOptimisticPitchUpload(res.assets[0]);
            }}
          >
            <Video size={24} color="#14b8a6" />
            <Text style={styles.uploadBoxText}>انتخاب فایل ویدیویی معرفی (MP4)</Text>
            <Text style={styles.uploadBoxSubText}>آپلود آنی با ۲ کانکشن موازی</Text>
          </TouchableOpacity>
        )}
        {errors.pitchFile && <Text style={styles.errorText}>{errors.pitchFile}</Text>}
      </View>

      {/* ۲. عوامل */}
      <View style={styles.crewSection}>
        <View style={styles.crewHeader}>
          <Users size={16} color="#14b8a6" />
          <Text style={styles.cardTitle}>عوامل اصلی پروژه</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rolesScroll}>
          {crewRoles.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, crewRole === r && styles.roleBtnActive]}
              onPress={() => setCrewRole(r)}
            >
              <Text style={[styles.roleBtnText, crewRole === r && styles.roleBtnTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.crewInputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="نام همکار..."
            placeholderTextColor="#64748b"
            value={crewName}
            onChangeText={setCrewName}
          />
          <TouchableOpacity style={styles.addCrewBtn} onPress={addCrewMember}>
            <Plus size={18} color="#030712" />
          </TouchableOpacity>
        </View>

        {crewItems.length > 0 && (
          <View style={styles.crewList}>
            {crewItems.map((item, idx) => (
              <View key={idx} style={styles.crewItemCard}>
                <View>
                  <Text style={styles.crewName}>{item.name}</Text>
                  <Text style={styles.crewRole}>{item.role}</Text>
                </View>
                <TouchableOpacity onPress={() => setCrewItems(crewItems.filter((_, i) => i !== idx))}>
                  <Trash2 size={14} color="#f43f5e" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ۳. اسناد طرح */}
      {isIdeaStage && (
        <View style={styles.stageDocsCard}>
          <Text style={styles.cardTitle}>مدارک مربوط به طرح (ایده)</Text>
          <TextInput
            style={[styles.input, errors.ideaReg && styles.inputError]}
            placeholder="شماره ثبت طرح در خانه سینما..."
            placeholderTextColor="#64748b"
            value={formData.ideaRegistrationNumber}
            onChangeText={(val) => setFormData({ ...formData, ideaRegistrationNumber: val })}
          />
          {errors.ideaReg && <Text style={styles.errorText}>{errors.ideaReg}</Text>}

          <TouchableOpacity style={[styles.uploadBox, errors.ideaFile && styles.errorCardBorder]} activeOpacity={0.8} onPress={handlePickIdeaPdf}>
            {ideaUploadStatus === 'uploading' ? (
              <ActivityIndicator size="small" color="#14b8a6" />
            ) : ideaUploadStatus === 'completed' || formData.ideaFileUrl ? (
              <CheckCircle2 size={20} color="#2dd4bf" />
            ) : (
              <FileText size={20} color="#14b8a6" />
            )}
            <Text style={styles.uploadBoxText} numberOfLines={1}>
              {ideaAsset ? ideaAsset.name : formData.ideaFileUrl ? 'فایل طرح ذخیره شد ✓' : 'آپلود فوری PDF طرح *'}
            </Text>
          </TouchableOpacity>
          {errors.ideaFile && <Text style={styles.errorText}>{errors.ideaFile}</Text>}
        </View>
      )}

      {/* ۴. اسناد فیلمنامه */}
      {(isScriptStage || isPreProdStage || isProdStage || isPostProdStage) && (
        <View style={styles.stageDocsCard}>
          <Text style={styles.cardTitle}>مدارک و ثبت فیلمنامه</Text>
          <TextInput
            style={[styles.input, errors.scriptReg && styles.inputError]}
            placeholder="شماره ثبت فیلمنامه در خانه سینما..."
            placeholderTextColor="#64748b"
            value={formData.scriptRegistrationNumber}
            onChangeText={(val) => setFormData({ ...formData, scriptRegistrationNumber: val })}
          />
          {errors.scriptReg && <Text style={styles.errorText}>{errors.scriptReg}</Text>}

          <TouchableOpacity style={[styles.uploadBox, errors.scriptFile && styles.errorCardBorder]} activeOpacity={0.8} onPress={handlePickScriptPdf}>
            {scriptUploadStatus === 'uploading' ? (
              <ActivityIndicator size="small" color="#14b8a6" />
            ) : scriptUploadStatus === 'completed' || formData.scriptFileUrl ? (
              <CheckCircle2 size={20} color="#2dd4bf" />
            ) : (
              <FileText size={20} color="#14b8a6" />
            )}
            <Text style={styles.uploadBoxText} numberOfLines={1}>
              {scriptAsset ? scriptAsset.name : formData.scriptFileUrl ? 'فیلمنامه ذخیره شد ✓' : 'آپلود کامل فیلمنامه (PDF) *'}
            </Text>
          </TouchableOpacity>
          {errors.scriptFile && <Text style={styles.errorText}>{errors.scriptFile}</Text>}
        </View>
      )}

      {/* ۵. راف‌کات در پس‌تولید (با استریم ۲ کانکشنه و آنی) */}
      {isPostProdStage && (
        <View style={[styles.uploadCard, errors.roughCutFile && styles.errorCardBorder]}>
          <Text style={styles.cardTitle}>
            آپلود راف‌کات (Rough Cut) * <Text style={styles.requiredStar}>(الزامی در فاز پس‌تولید)</Text>
          </Text>

          {roughCutUploadStatus === 'uploading' ? (
            <View style={styles.optimisticCard}>
              <View style={styles.optimisticHeaderRow}>
                <View style={styles.optimisticFileMeta}>
                  <ActivityIndicator size="small" color="#f59e0b" />
                  <Text style={styles.optimisticFileName} numberOfLines={1}>
                    {roughCutAsset?.uri.split('/').pop() || 'در حال ارسال ۲ کانکشن موازی...'}
                  </Text>
                </View>
                <Text style={[styles.optimisticPercentText, { color: '#f59e0b' }]}>{toFarsiDigits(roughCutProgress)}٪</Text>
              </View>

              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${roughCutProgress}%`, backgroundColor: '#f59e0b' }]} />
              </View>

              <View style={styles.separatedStatsBox}>
                <View style={styles.statSingleLine}>
                  <View style={styles.statLabelWrap}>
                    <Zap size={14} color="#f59e0b" />
                    <Text style={styles.statLineLabel}>مجموع سرعت آپلود:</Text>
                  </View>
                  <Text style={styles.statLineValue}>{toFarsiDigits(roughCutSpeed)}</Text>
                </View>

                <View style={styles.statSingleLine}>
                  <View style={styles.statLabelWrap}>
                    <Clock size={14} color="#f59e0b" />
                    <Text style={styles.statLineLabel}>زمان باقی‌مانده:</Text>
                  </View>
                  <Text style={styles.statLineValue}>{toFarsiDigits(roughCutTimeRemaining)}</Text>
                </View>
              </View>
            </View>
          ) : uploadedRoughCutUrl ? (
            <View style={styles.completedCard}>
              <View style={styles.completedRight}>
                <CheckCircle2 size={18} color="#f59e0b" />
                <Text style={styles.completedTitle} numberOfLines={1}>راف‌کات با موفقیت ذخیره شد ✓</Text>
              </View>
              <TouchableOpacity
                style={styles.replaceBtn}
                onPress={async () => {
                  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
                  if (!res.canceled && res.assets[0]) startOptimisticRoughCutUpload(res.assets[0]);
                }}
              >
                <RefreshCw size={12} color="#f43f5e" />
                <Text style={styles.replaceBtnText}>تغییر راف‌کات</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadBox}
              activeOpacity={0.8}
              onPress={async () => {
                const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
                if (!res.canceled && res.assets[0]) startOptimisticRoughCutUpload(res.assets[0]);
              }}
            >
              <Video size={24} color="#f59e0b" />
              <Text style={styles.uploadBoxText}>انتخاب فایل ویدیویی راف‌کات (MP4)</Text>
              <Text style={styles.uploadBoxSubText}>آپلود آنی با ۲ کانکشن موازی</Text>
            </TouchableOpacity>
          )}
          {errors.roughCutFile && <Text style={styles.errorText}>{errors.roughCutFile}</Text>}
        </View>
      )}

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← قبلی</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>مرحله بعد ←</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  inputGroup: { gap: 4 },
  label: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#94a3b8', textAlign: 'right' },
  cardTitle: { fontFamily: 'Ravi-Bold', fontSize: 11.5, color: '#ffffff', textAlign: 'right' },
  requiredStar: { color: '#f43f5e', fontSize: 10 },
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
  errorCardBorder: { borderColor: '#f43f5e', borderWidth: 1.5 },
  errorText: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#f43f5e', textAlign: 'right' },
  stagesWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  stageBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stageBtnActive: { backgroundColor: 'rgba(20, 184, 166, 0.15)', borderColor: '#14b8a6' },
  stageBtnText: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#94a3b8' },
  stageBtnTextActive: { fontFamily: 'Ravi-Bold', color: '#2dd4bf' },
  uploadCard: { backgroundColor: '#0d1520', borderRadius: 16, padding: 12, gap: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  uploadBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  uploadBoxText: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#cbd5e1' },
  uploadBoxSubText: { fontFamily: 'Ravi-Regular', fontSize: 9, color: '#14b8a6' },

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
  progressBarTrack: { width: '100%', height: 6, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#14b8a6', borderRadius: 3 },
  separatedStatsBox: { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 6 },
  statSingleLine: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  statLabelWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  statLineLabel: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#94a3b8' },
  statLineValue: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#ffffff', direction: 'ltr' },

  completedCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.3)',
    borderRadius: 12,
    padding: 10,
  },
  completedRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flex: 1 },
  completedTitle: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#2dd4bf', textAlign: 'right', flex: 1 },
  replaceBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: 'rgba(244, 63, 94, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  replaceBtnText: { fontFamily: 'Ravi-Bold', fontSize: 9.5, color: '#f43f5e' },

  crewSection: { backgroundColor: '#0d1520', borderRadius: 16, padding: 12, gap: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  crewHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  rolesScroll: { flexDirection: 'row-reverse', gap: 6, paddingVertical: 2 },
  roleBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255, 255, 255, 0.04)' },
  roleBtnActive: { backgroundColor: '#14b8a6' },
  roleBtnText: { fontFamily: 'Ravi-Regular', fontSize: 9.5, color: '#94a3b8' },
  roleBtnTextActive: { fontFamily: 'Ravi-Bold', color: '#030712' },
  crewInputRow: { flexDirection: 'row-reverse', gap: 6 },
  addCrewBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#14b8a6', alignItems: 'center', justifyContent: 'center' },
  crewList: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  crewItemCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 8,
    minWidth: '48%',
    flex: 1,
  },
  crewName: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#ffffff', textAlign: 'right' },
  crewRole: { fontFamily: 'Ravi-Regular', fontSize: 9, color: '#14b8a6', textAlign: 'right' },
  stageDocsCard: { backgroundColor: '#0d1520', borderRadius: 16, padding: 12, gap: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  btnRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 6 },
  backBtn: { flex: 1, height: 44, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.05)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontFamily: 'Ravi-Bold', fontSize: 11.5, color: '#94a3b8' },
  nextBtn: { flex: 2, height: 44, borderRadius: 14, backgroundColor: '#14b8a6', alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { fontFamily: 'Ravi-Bold', fontSize: 12, color: '#030712' },
});