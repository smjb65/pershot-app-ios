import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  ToastAndroid,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  Plus,
  Check,
  X,
  Globe,
  Calendar,
  Video,
  FileText,
  Trash2,
  Users,
  Image as ImageIcon,
  AlertTriangle,
  Zap,
  Clock,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react-native';
import { api, toFarsiDigits } from '../../api/axiosClient';
import { uploadMediaFile } from '../../utils/fileUploader';

interface Props {
  onSuccess?: () => void;
}

const availableGenres = ['درام', 'کمدی', 'اجتماعی', 'ترسناک', 'جنایی', 'علمی تخیلی', 'فانتزی', 'اکشن', 'موزیکال', 'سایر'];
const durationOptions = [30, 45, 60, 90, 120];
const stages = [
  'طرح (Idea Stage)',
  'فیلمنامه (Script Stage)',
  'پیش‌تولید (Pre-production)',
  'تولید (Production)',
  'پس‌تولید (Post-production)',
];
const crewRoles = ['کارگردان', 'تهیه‌کننده', 'نویسنده', 'مدیر فیلمبرداری', 'تدوین‌گر', 'بازیگر', 'سایر'];

// توابع کمکی دقیق جهت جلوگیری از تداخل نیم‌فاصله
const isIdeaStage = (s: string) => s?.includes('Idea') || s?.includes('طرح');
const isScriptStage = (s: string) => s?.includes('Script') || s?.includes('فیلمنامه');
const isPreProdStage = (s: string) => s?.includes('Pre-production') || s?.includes('پیش‌تولید');
const isProdStage = (s: string) => s?.includes('Production') || s?.includes('تولید');
const isPostProdStage = (s: string) => s?.includes('Post-production') || s?.includes('پس‌تولید') || s?.replace(/\s+/g, '').includes('پس‌تولید');

export default function AddCampaignStepperForm({ onSuccess }: Props) {
  const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0);
  const [submitting, setSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftCampaignId, setDraftCampaignId] = useState<string | null>(null);
  const [errors, setErrors] = useState<any>({});
  
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('');
  const [uploadTimeRemaining, setUploadTimeRemaining] = useState('');
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardOffset(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardOffset(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const [formData, setFormData] = useState({
    titleFa: '',
    titleEn: '',
    durationMinutes: '',
    language: 'فارسی',
    category: 'فیلم کوتاه داستانی',
    shortSynopsis: '',
    synopsis: '',
    logline: '',
    currentStage: 'طرح (Idea Stage)',
    yearMiladi: '',
    yearShamsi: '',
    scriptRegistrationNumber: '',
    ideaRegistrationNumber: '',
    campaignDurationDays: 60,
    costPreProduction: '',
    costProduction: '',
    costPostProduction: '',
    daysPreProduction: '',
    daysProduction: '',
    daysPostProduction: '',
  });

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [locationsList, setLocationsList] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState('');

  const [crewItems, setCrewItems] = useState<any[]>([]);
  const [crewName, setCrewName] = useState('');
  const [crewRole, setCrewRole] = useState('کارگردان');

  // استیت‌های آپلود آنی ویدیوی معرفی (پیچ)
  const [pitchAsset, setPitchAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [pitchUploadStatus, setPitchUploadStatus] = useState<'idle' | 'uploading' | 'completed' | 'error'>('idle');
  const [pitchProgress, setPitchProgress] = useState(0);
  const [pitchSpeed, setPitchSpeed] = useState('');
  const [pitchTimeRemaining, setPitchTimeRemaining] = useState('');
  const [uploadedPitchUrl, setUploadedPitchUrl] = useState<string | null>(null);

  // استیت‌های آپلود آنی راف‌کات
  const [roughCutAsset, setRoughCutAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [roughCutUploadStatus, setRoughCutUploadStatus] = useState<'idle' | 'uploading' | 'completed' | 'error'>('idle');
  const [roughCutProgress, setRoughCutProgress] = useState(0);
  const [roughCutSpeed, setRoughCutSpeed] = useState('');
  const [roughCutTimeRemaining, setRoughCutTimeRemaining] = useState('');
  const [uploadedRoughCutUrl, setUploadedRoughCutUrl] = useState<string | null>(null);

  // استیت‌های اسناد PDF
  const [scriptAsset, setScriptAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [scriptUploadStatus, setScriptUploadStatus] = useState<'idle' | 'uploading' | 'completed'>('idle');
  const [uploadedScriptUrl, setUploadedScriptUrl] = useState<string | null>(null);

  const [ideaAsset, setIdeaAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [ideaUploadStatus, setIdeaUploadStatus] = useState<'idle' | 'uploading' | 'completed'>('idle');
  const [uploadedIdeaUrl, setUploadedIdeaUrl] = useState<string | null>(null);

  // استیت‌های مرحله ۳
  const [posterAssets, setPosterAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [mainPosterIndex, setMainPosterIndex] = useState(0);
  const [financialDocsAsset, setFinancialDocsAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
    else Alert.alert('', msg);
  };

  const toggleGenre = (g: string) => {
    if (selectedGenres.includes(g)) {
      setSelectedGenres(selectedGenres.filter((item) => item !== g));
    } else {
      if (selectedGenres.length >= 3) return;
      setSelectedGenres([...selectedGenres, g]);
    }
  };

  const addLocation = () => {
    if (!locationInput.trim() || locationsList.includes(locationInput.trim())) return;
    setLocationsList([...locationsList, locationInput.trim()]);
    setLocationInput('');
  };

  const addCrewMember = () => {
    if (!crewName.trim()) return;
    setCrewItems([...crewItems, { name: crewName.trim(), role: crewRole }]);
    setCrewName('');
  };

  // شروع استریم آنی پیچ ویدیو
  const handlePickPitchVideo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
    if (!res.canceled && res.assets[0]) {
      const asset = res.assets[0];
      setPitchAsset(asset);
      setPitchUploadStatus('uploading');
      setPitchProgress(0);
      setPitchSpeed('در حال اتصال...');
      setPitchTimeRemaining('---');
      if (errors.pitchFile) setErrors((prev: any) => ({ ...prev, pitchFile: null }));

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
      } catch (err: any) {
        setPitchUploadStatus('error');
        Alert.alert('خطا در آپلود ویدیوی معرفی', err.message || 'خطا در ارتباط با سرور.');
      }
    }
  };

  // شروع استریم آنی راف‌کات
  const handlePickRoughCutVideo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
    if (!res.canceled && res.assets[0]) {
      const asset = res.assets[0];
      setRoughCutAsset(asset);
      setRoughCutUploadStatus('uploading');
      setRoughCutProgress(0);
      setRoughCutSpeed('در حال اتصال...');
      setRoughCutTimeRemaining('---');
      if (errors.roughCutFile) setErrors((prev: any) => ({ ...prev, roughCutFile: null }));

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
      } catch (err: any) {
        setRoughCutUploadStatus('error');
        Alert.alert('خطا در آپلود راف‌کات', err.message || 'خطا در ارتباط با سرور.');
      }
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
        setUploadedScriptUrl(url);
        setScriptUploadStatus('completed');
        if (errors.scriptFile) setErrors((prev: any) => ({ ...prev, scriptFile: null }));
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
        setUploadedIdeaUrl(url);
        setIdeaUploadStatus('completed');
        if (errors.ideaFile) setErrors((prev: any) => ({ ...prev, ideaFile: null }));
      } catch {
        setIdeaUploadStatus('idle');
      }
    }
  };

  const handleSaveStepOneDraft = async () => {
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

    try {
      setIsSavingDraft(true);
      const draftPayload = {
        id: draftCampaignId,
        titleFa: formData.titleFa.trim(),
        titleEn: formData.titleEn.trim() || null,
        category: formData.category,
        genres: selectedGenres,
        durationMinutes: parseInt(formData.durationMinutes || '0', 10),
        language: formData.language,
        productionLocations: locationsList,
        currentStage: formData.currentStage,
        shortSynopsis: formData.shortSynopsis.trim(),
        synopsis: formData.synopsis.trim() || null,
        logline: formData.logline.trim() || null,
        campaignDurationDays: Number(formData.campaignDurationDays) || 60,
        releaseYear: formData.yearMiladi ? parseInt(formData.yearMiladi, 10) : null,
      };

      const res = await api.post('/projects/draft', draftPayload, { timeout: 0 });
      const id = res.data?.id || res.data?.campaignId;
      if (id) setDraftCampaignId(id);

      showToast('پیش‌نویس مشخصات کمپین ثبت شد');
      setActiveStep(1);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ثبت پیش‌نویس');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleStepTwoNext = () => {
    const newErrors: any = {};
    const stage = formData.currentStage;

    if (!uploadedPitchUrl && !pitchAsset) {
      newErrors.pitchFile = 'آپلود ویدیوی معرفی (پیچ) الزامی است.';
    }
    if (isIdeaStage(stage)) {
      if (!formData.ideaRegistrationNumber?.trim()) newErrors.ideaReg = 'شماره ثبت طرح الزامی است.';
      if (!uploadedIdeaUrl && !ideaAsset) newErrors.ideaFile = 'آپلود فایل PDF طرح الزامی است.';
    }
    if ((isScriptStage(stage) || isPreProdStage(stage) || isProdStage(stage) || isPostProdStage(stage))) {
      if (!formData.scriptRegistrationNumber?.trim()) newErrors.scriptReg = 'شماره ثبت فیلمنامه الزامی است.';
      if (!uploadedScriptUrl && !scriptAsset) newErrors.scriptFile = 'شماره ثبت یا فایل PDF فیلمنامه الزامی است.';
    }

    // 🟢 راف‌کات برای فاز پس‌تولید کاملاً اجباری است
    if (isPostProdStage(stage) && !uploadedRoughCutUrl && !roughCutAsset) {
      newErrors.roughCutFile = 'آپلود فایل ویدیویی راف‌کات برای پروژه‌های فاز پس‌تولید الزامی است.';
    }

    if (pitchUploadStatus === 'uploading' || roughCutUploadStatus === 'uploading') {
      Alert.alert('صبر کنید', 'آپلود ویدیوهای این مرحله هنوز به اتمام نرسیده است.');
      return;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setActiveStep(2);
  };

  const handleSubmitFinal = async () => {
    const preCost = parseFloat(formData.costPreProduction || '0');
    const prodCost = parseFloat(formData.costProduction || '0');
    const postCost = parseFloat(formData.costPostProduction || '0');
    const grandTotal = preCost + prodCost + postCost;

    if (posterAssets.length === 0) {
      showToast('حداقل انتخاب یک پوستر برای کمپین الزامی است.');
      return;
    }
    if (grandTotal <= 0) {
      showToast('مجموع بودجه مورد نیاز کمپین باید بیشتر از صفر باشد.');
      return;
    }

    try {
      setSubmitting(true);

      const uploadedPosters: string[] = [];
      for (let i = 0; i < posterAssets.length; i++) {
        setUploadProgress(0);
        setUploadLabel(`در حال آپلود پوستر ${toFarsiDigits(i + 1)} از ${toFarsiDigits(posterAssets.length)}...`);
        const p = posterAssets[i];
        const pUrl = await uploadMediaFile(
          p.uri,
          p.uri.split('/').pop() || 'poster.jpg',
          'image/jpeg',
          'campaigns/posters',
          (prog) => {
            setUploadProgress(prog.percent);
            setUploadSpeed(prog.speed);
            setUploadTimeRemaining(prog.timeRemaining);
          }
        );
        uploadedPosters.push(pUrl);
      }
      const mainPosterUrl = uploadedPosters[mainPosterIndex] || uploadedPosters[0] || '';

      let financialUrl = '';
      if (financialDocsAsset) {
        setUploadProgress(0);
        setUploadLabel('در حال آپلود فایل اسناد مالی (ZIP)...');
        financialUrl = await uploadMediaFile(
          financialDocsAsset.uri,
          financialDocsAsset.name || 'financials.zip',
          'application/zip',
          'campaigns/financials',
          (prog) => {
            setUploadProgress(prog.percent);
            setUploadSpeed(prog.speed);
            setUploadTimeRemaining(prog.timeRemaining);
          }
        );
      }

      setUploadProgress(100);
      setUploadLabel('در حال نهایی‌سازی کمپین و ارسال به کارشناسان...');

      const payload = {
        id: draftCampaignId,
        titleFa: formData.titleFa.trim(),
        titleEn: formData.titleEn.trim() || null,
        category: formData.category,
        genres: selectedGenres,
        durationMinutes: parseInt(formData.durationMinutes || '0', 10),
        language: formData.language,
        productionLocations: locationsList,
        currentStage: formData.currentStage,
        shortSynopsis: formData.shortSynopsis.trim(),
        synopsis: formData.synopsis.trim() || null,
        logline: formData.logline.trim() || null,
        campaignDurationDays: Number(formData.campaignDurationDays) || 60,
        releaseYear: formData.yearMiladi ? parseInt(formData.yearMiladi, 10) : null,
        scriptRegistrationNumber: formData.scriptRegistrationNumber || null,
        ideaRegistrationNumber: formData.ideaRegistrationNumber || null,
        crew: crewItems,
        mainPosterUrl,
        supplementUrls: uploadedPosters,
        pitchVideoUrl: uploadedPitchUrl,
        scriptFileUrl: uploadedScriptUrl,
        ideaFileUrl: uploadedIdeaUrl,
        roughCutUrl: uploadedRoughCutUrl,
        financialDocumentsUrl: financialUrl || null,
        costDetails: {
          preProductionCost: preCost,
          productionCost: prodCost,
          postProductionCost: postCost,
          grandTotal: grandTotal,
        },
        timeDetails: {
          preProductionDays: parseInt(formData.daysPreProduction || '0', 10),
          productionDays: parseInt(formData.daysProduction || '0', 10),
          postProductionDays: parseInt(formData.daysPostProduction || '0', 10),
          totalDuration:
            parseInt(formData.daysPreProduction || '0', 10) +
            parseInt(formData.daysProduction || '0', 10) +
            parseInt(formData.daysPostProduction || '0', 10),
        },
      };

      await api.post('/projects', payload, { timeout: 0 });
      showToast('کمپین با موفقیت تکمیل و جهت بررسی به ادمین ارسال شد');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ثبت نهایی کمپین');
    } finally {
      setSubmitting(false);
      setUploadLabel('');
      setUploadProgress(0);
      setUploadSpeed('');
      setUploadTimeRemaining('');
    }
  };

  const isCurrentPostProd = isPostProdStage(formData.currentStage);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { paddingBottom: Platform.OS === 'android' ? keyboardOffset : 0 }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 35 }}
      >
        <View style={styles.stepperHeader}>
          <View style={[styles.stepTab, activeStep === 0 && styles.activeStepTab]}>
            <Text style={[styles.stepTabText, activeStep === 0 && styles.activeStepTabText]}>۱. شناسنامه</Text>
          </View>
          <View style={[styles.stepTab, activeStep === 1 && styles.activeStepTab]}>
            <Text style={[styles.stepTabText, activeStep === 1 && styles.activeStepTabText]}>۲. مدارک و عوامل</Text>
          </View>
          <View style={[styles.stepTab, activeStep === 2 && styles.activeStepTab]}>
            <Text style={[styles.stepTabText, activeStep === 2 && styles.activeStepTabText]}>۳. بودجه و پوستر</Text>
          </View>
        </View>

        {activeStep === 0 && (
          <View style={styles.stepContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>عنوان فارسی *</Text>
              <TextInput
                style={[styles.input, errors.titleFa && styles.inputError]}
                placeholder="مثال: رویای سرخ"
                placeholderTextColor="#64748b"
                value={formData.titleFa}
                onChangeText={(val) => setFormData({ ...formData, titleFa: val })}
              />
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>مدت فعالیت کمپین *</Text>
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
                      {toFarsiDigits(days)} روز
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>ژانرهای اثر (حداکثر ۳ مورد) *</Text>
              <View style={styles.genresWrap}>
                {availableGenres.map((g) => {
                  const isSelected = selectedGenres.includes(g);
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genreBtn, isSelected && styles.genreBtnActive]}
                      onPress={() => toggleGenre(g)}
                    >
                      {isSelected ? <Check size={12} color="#030712" /> : null}
                      <Text style={[styles.genreBtnText, isSelected && styles.genreBtnTextActive]}>{g}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>مدت زمان (دقیقه) *</Text>
                <TextInput
                  style={[styles.input, styles.centerInput]}
                  keyboardType="numeric"
                  placeholder="۴۵"
                  placeholderTextColor="#64748b"
                  value={formData.durationMinutes}
                  onChangeText={(val) => setFormData({ ...formData, durationMinutes: val })}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>زبان اثر</Text>
                <TextInput
                  style={[styles.input, styles.centerInput]}
                  value={formData.language}
                  onChangeText={(val) => setFormData({ ...formData, language: val })}
                />
              </View>
            </View>

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
                placeholder="خلاصه تک‌‌جمله‌ای کلیدی اثر..."
                placeholderTextColor="#64748b"
                value={formData.logline}
                onChangeText={(val) => setFormData({ ...formData, logline: val })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>خلاصه کوتاه معرفی پروژه *</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                multiline
                numberOfLines={3}
                placeholder="توضیحاتی برای جذب سرمایه‌گذاران..."
                placeholderTextColor="#64748b"
                value={formData.shortSynopsis}
                onChangeText={(val) => setFormData({ ...formData, shortSynopsis: val })}
              />
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
              style={[styles.actionBtn, isSavingDraft && styles.btnDisabled]}
              disabled={isSavingDraft}
              onPress={handleSaveStepOneDraft}
            >
              {isSavingDraft ? (
                <ActivityIndicator size="small" color="#030712" />
              ) : (
                <Text style={styles.actionBtnText}>ثبت پیش‌نویس و رفتن به مرحله بعد ←</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {activeStep === 1 && (
          <View style={styles.stepContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>وضعیت کنونی پروژه *</Text>
              <View style={styles.stagesWrap}>
                {stages.map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.stageBtn, formData.currentStage === st && styles.stageBtnActive]}
                    onPress={() => {
                      setFormData({ ...formData, currentStage: st });
                      setErrors({});
                    }}
                  >
                    <Text style={[styles.stageBtnText, formData.currentStage === st && styles.stageBtnTextActive]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ویدیوی معرفی (پیچ ویدیو با استریم آنی) */}
            <View style={[styles.cardBox, errors.pitchFile && styles.errorCardBorder]}>
              <Text style={styles.label}>ویدیوی معرفی اثر (Pitch Video) *</Text>

              {pitchUploadStatus === 'uploading' ? (
                <View style={styles.optimisticCard}>
                  <View style={styles.optimisticHeaderRow}>
                    <View style={styles.optimisticFileMeta}>
                      <ActivityIndicator size="small" color="#14b8a6" />
                      <Text style={styles.optimisticFileName} numberOfLines={1}>
                        {pitchAsset?.uri.split('/').pop() || 'در حال ارسال ویدیو...'}
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
                        <Text style={styles.statLineLabel}>سرعت آپلود:</Text>
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
                    <Text style={styles.completedTitle} numberOfLines={1}>ویدیوی معرفی ذخیره شد ✓</Text>
                  </View>
                  <TouchableOpacity style={styles.replaceBtn} onPress={handlePickPitchVideo}>
                    <RefreshCw size={12} color="#f43f5e" />
                    <Text style={styles.replaceBtnText}>تغییر ویدیو</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.uploadDashed} onPress={handlePickPitchVideo}>
                  <Video size={22} color="#14b8a6" />
                  <Text style={styles.uploadDashedText}>انتخاب فایل ویدیویی معرفی (MP4)</Text>
                  <Text style={styles.uploadDashedSubText}>آپلود پرسرعت به محض انتخاب فایل</Text>
                </TouchableOpacity>
              )}
              {errors.pitchFile && <Text style={styles.errorText}>{errors.pitchFile}</Text>}
            </View>

            {/* عوامل */}
            <View style={styles.cardBox}>
              <Text style={styles.label}>افزودن همکاران و عوامل</Text>
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

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="نام همکار..."
                  placeholderTextColor="#64748b"
                  value={crewName}
                  onChangeText={setCrewName}
                />
                <TouchableOpacity style={styles.smallAddBtn} onPress={addCrewMember}>
                  <Plus size={18} color="#030712" />
                </TouchableOpacity>
              </View>

              {crewItems.length > 0 ? (
                <View style={styles.crewList}>
                  {crewItems.map((c, i) => (
                    <View key={i} style={styles.crewItem}>
                      <Text style={styles.crewText}>{c.name} ({c.role})</Text>
                      <TouchableOpacity onPress={() => setCrewItems(crewItems.filter((_, idx) => idx !== i))}>
                        <Trash2 size={13} color="#f43f5e" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {/* مدارک طرح */}
            {isIdeaStage(formData.currentStage) && (
              <View style={styles.cardBox}>
                <Text style={styles.label}>مدارک مربوط به طرح (ایده)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="شماره ثبت طرح در خانه سینما..."
                  placeholderTextColor="#64748b"
                  value={formData.ideaRegistrationNumber}
                  onChangeText={(val) => setFormData({ ...formData, ideaRegistrationNumber: val })}
                />
                <TouchableOpacity style={[styles.uploadDashed, { marginTop: 6 }]} onPress={handlePickIdeaPdf}>
                  {ideaUploadStatus === 'uploading' ? (
                    <ActivityIndicator size="small" color="#14b8a6" />
                  ) : uploadedIdeaUrl ? (
                    <CheckCircle2 size={20} color="#2dd4bf" />
                  ) : (
                    <FileText size={20} color="#14b8a6" />
                  )}
                  <Text style={styles.uploadDashedText}>
                    {ideaAsset ? ideaAsset.name : uploadedIdeaUrl ? 'فایل طرح ذخیره شد ✓' : 'آپلود فایل PDF طرح'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* مدارک فیلمنامه */}
            {(isScriptStage(formData.currentStage) ||
              isPreProdStage(formData.currentStage) ||
              isProdStage(formData.currentStage) ||
              isCurrentPostProd) && (
              <View style={styles.cardBox}>
                <Text style={styles.label}>مدارک و ثبت فیلمنامه</Text>
                <TextInput
                  style={styles.input}
                  placeholder="شماره ثبت فیلمنامه در خانه سینما..."
                  placeholderTextColor="#64748b"
                  value={formData.scriptRegistrationNumber}
                  onChangeText={(val) => setFormData({ ...formData, scriptRegistrationNumber: val })}
                />
                <TouchableOpacity style={[styles.uploadDashed, { marginTop: 6 }]} onPress={handlePickScriptPdf}>
                  {scriptUploadStatus === 'uploading' ? (
                    <ActivityIndicator size="small" color="#14b8a6" />
                  ) : uploadedScriptUrl ? (
                    <CheckCircle2 size={20} color="#2dd4bf" />
                  ) : (
                    <FileText size={20} color="#14b8a6" />
                  )}
                  <Text style={styles.uploadDashedText}>
                    {scriptAsset ? scriptAsset.name : uploadedScriptUrl ? 'فایل فیلمنامه ذخیره شد ✓' : 'آپلود فایل PDF فیلمنامه *'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* سال ساخت */}
            {(isProdStage(formData.currentStage) || isCurrentPostProd) && (
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>سال ساخت (میلادی)</Text>
                  <TextInput
                    style={[styles.input, styles.centerInput]}
                    keyboardType="numeric"
                    placeholder="2024"
                    placeholderTextColor="#64748b"
                    value={formData.yearMiladi}
                    onChangeText={(val) => setFormData({ ...formData, yearMiladi: val })}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>سال ساخت (شمسی)</Text>
                  <TextInput
                    style={[styles.input, styles.centerInput]}
                    keyboardType="numeric"
                    placeholder="۱۴۰۳"
                    placeholderTextColor="#64748b"
                    value={formData.yearShamsi}
                    onChangeText={(val) => setFormData({ ...formData, yearShamsi: val })}
                  />
                </View>
              </View>
            )}

            {/* 🟢 نمایش قطعی و اجباری راف‌کات در فاز پس‌تولید */}
            {isCurrentPostProd && (
              <View style={[styles.cardBox, errors.roughCutFile && styles.errorCardBorder]}>
                <Text style={styles.label}>
                  آپلود راف‌کات (Rough Cut) * <Text style={styles.requiredStar}>(الزامی در فاز پس‌تولید)</Text>
                </Text>

                {roughCutUploadStatus === 'uploading' ? (
                  <View style={styles.optimisticCard}>
                    <View style={styles.optimisticHeaderRow}>
                      <View style={styles.optimisticFileMeta}>
                        <ActivityIndicator size="small" color="#f59e0b" />
                        <Text style={styles.optimisticFileName} numberOfLines={1}>
                          {roughCutAsset?.uri.split('/').pop() || 'در حال ارسال ویدیو...'}
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
                          <Text style={styles.statLineLabel}>سرعت آپلود:</Text>
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
                      <Text style={styles.completedTitle} numberOfLines={1}>راف‌کات ذخیره شد ✓</Text>
                    </View>
                    <TouchableOpacity style={styles.replaceBtn} onPress={handlePickRoughCutVideo}>
                      <RefreshCw size={12} color="#f43f5e" />
                      <Text style={styles.replaceBtnText}>تغییر ویدیو</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.uploadDashed} onPress={handlePickRoughCutVideo}>
                    <Video size={22} color="#f59e0b" />
                    <Text style={styles.uploadDashedText}>انتخاب فایل ویدیویی راف‌کات (MP4)</Text>
                    <Text style={styles.uploadDashedSubText}>آپلود پرسرعت به محض انتخاب فایل</Text>
                  </TouchableOpacity>
                )}
                {errors.roughCutFile && <Text style={styles.errorText}>{errors.roughCutFile}</Text>}
              </View>
            )}

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.backBtn} onPress={() => setActiveStep(0)}>
                <Text style={styles.backBtnText}>← قبلی</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextBtn} onPress={handleStepTwoNext}>
                <Text style={styles.nextBtnText}>مرحله بعد ←</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeStep === 2 && (
          <View style={styles.stepContent}>
            <View style={styles.cardBox}>
              <Text style={styles.label}>شکست هزینه‌ها و روزهای پروژه (تومان):</Text>
              <View style={styles.budgetGrid}>
                <View style={[styles.budgetBox, (isProdStage(formData.currentStage) || isCurrentPostProd) && styles.disabledBox]}>
                  <Text style={styles.budgetTitle}>۱. پیش‌تولید</Text>
                  <TextInput
                    style={styles.budgetInput}
                    keyboardType="numeric"
                    placeholder="هزینه"
                    placeholderTextColor="#64748b"
                    value={formData.costPreProduction}
                    onChangeText={(val) => setFormData({ ...formData, costPreProduction: val })}
                  />
                  <TextInput
                    style={styles.budgetInput}
                    keyboardType="numeric"
                    placeholder="روز"
                    placeholderTextColor="#64748b"
                    value={formData.daysPreProduction}
                    onChangeText={(val) => setFormData({ ...formData, daysPreProduction: val })}
                  />
                </View>

                <View style={[styles.budgetBox, isCurrentPostProd && styles.disabledBox]}>
                  <Text style={styles.budgetTitle}>۲. تولید</Text>
                  <TextInput
                    style={styles.budgetInput}
                    keyboardType="numeric"
                    placeholder="هزینه"
                    placeholderTextColor="#64748b"
                    value={formData.costProduction}
                    onChangeText={(val) => setFormData({ ...formData, costProduction: val })}
                  />
                  <TextInput
                    style={styles.budgetInput}
                    keyboardType="numeric"
                    placeholder="روز"
                    placeholderTextColor="#64748b"
                    value={formData.daysProduction}
                    onChangeText={(val) => setFormData({ ...formData, daysProduction: val })}
                  />
                </View>

                <View style={styles.budgetBox}>
                  <Text style={styles.budgetTitle}>۳. پس‌تولید</Text>
                  <TextInput
                    style={styles.budgetInput}
                    keyboardType="numeric"
                    placeholder="هزینه"
                    placeholderTextColor="#64748b"
                    value={formData.costPostProduction}
                    onChangeText={(val) => setFormData({ ...formData, costPostProduction: val })}
                  />
                  <TextInput
                    style={styles.budgetInput}
                    keyboardType="numeric"
                    placeholder="روز"
                    placeholderTextColor="#64748b"
                    value={formData.daysPostProduction}
                    onChangeText={(val) => setFormData({ ...formData, daysPostProduction: val })}
                  />
                </View>
              </View>

              <View style={styles.totalBudgetCard}>
                <Text style={styles.totalBudgetLabel}>کل بودجه درخواستی:</Text>
                <Text style={styles.totalBudgetValue}>
                  {(
                    (parseFloat(formData.costPreProduction || '0')) +
                    (parseFloat(formData.costProduction || '0')) +
                    (parseFloat(formData.costPostProduction || '0'))
                  ).toLocaleString('fa-IR')}{' '}
                  تومان
                </Text>
              </View>
            </View>

            <View style={styles.cardBox}>
              <Text style={styles.label}>پوسترهای کمپین (حداکثر ۵ عدد) *</Text>
              <TouchableOpacity
                style={styles.uploadDashed}
                onPress={async () => {
                  const res = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsMultipleSelection: true,
                    quality: 0.85,
                  });
                  if (!res.canceled && res.assets) setPosterAssets(res.assets.slice(0, 5));
                }}
              >
                <ImageIcon size={22} color="#14b8a6" />
                <Text style={styles.uploadDashedText}>
                  {posterAssets.length > 0 ? `${toFarsiDigits(posterAssets.length)} تصویر انتخاب شد` : 'انتخاب پوستر از گالری'}
                </Text>
              </TouchableOpacity>

              {posterAssets.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.postersRow}>
                  {posterAssets.map((p, idx) => (
                    <View key={idx} style={[styles.posterThumb, mainPosterIndex === idx && styles.posterThumbMain]}>
                      <Image source={{ uri: p.uri }} style={styles.posterImg} contentFit="cover" />
                      <TouchableOpacity style={styles.mainBadgeSelect} onPress={() => setMainPosterIndex(idx)}>
                        <Text style={styles.mainBadgeText}>{mainPosterIndex === idx ? 'اصلی' : 'انتخاب اصلی'}</Text>
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
            </View>

            <View style={styles.cardBox}>
              <Text style={styles.label}>مدارک و ریز فاکتورهای مالی (ZIP اختیاری)</Text>
              <TouchableOpacity
                style={styles.uploadDashed}
                onPress={async () => {
                  const res = await DocumentPicker.getDocumentAsync({
                    type: ['application/zip', 'application/x-zip-compressed'],
                    copyToCacheDirectory: true,
                  });
                  if (!res.canceled && res.assets && res.assets[0]) setFinancialDocsAsset(res.assets[0]);
                }}
              >
                <FileText size={20} color="#f59e0b" />
                <Text style={styles.uploadDashedText}>
                  {financialDocsAsset ? financialDocsAsset.name : 'آپلود فایل ZIP فاکتورها'}
                </Text>
              </TouchableOpacity>
            </View>

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
                    توجه: لطفاً تا اتمام بارگذاری کامل و ارسال کمپین، از برنامه خارج نشوید.
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.backBtn} disabled={submitting} onPress={() => setActiveStep(1)}>
                <Text style={styles.backBtnText}>← قبلی</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, submitting && styles.btnDisabled]}
                disabled={submitting}
                onPress={handleSubmitFinal}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#030712" />
                ) : (
                  <Text style={styles.nextBtnText}>ثبت نهایی و ارسال به ادمین</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 12 },
  stepperHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 4,
    gap: 4,
    marginBottom: 10,
  },
  stepTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  activeStepTab: { backgroundColor: '#14b8a6' },
  stepTabText: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#94a3b8' },
  activeStepTabText: { fontFamily: 'Ravi-Bold', color: '#030712' },
  stepContent: { gap: 12 },
  inputGroup: { gap: 4 },
  label: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#94a3b8', textAlign: 'right' },
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
  centerInput: { textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  ltrInput: { textAlign: 'left', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  textarea: { height: 70, textAlignVertical: 'top' },
  textareaLarge: { height: 85, textAlignVertical: 'top' },
  row: { flexDirection: 'row-reverse', gap: 8 },
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
  cardBox: {
    backgroundColor: '#0d1520',
    borderRadius: 16,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  uploadDashed: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  uploadDashedText: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#cbd5e1' },
  uploadDashedSubText: { fontFamily: 'Ravi-Regular', fontSize: 9, color: '#14b8a6' },

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

  rolesScroll: { flexDirection: 'row-reverse', gap: 6, paddingVertical: 2 },
  roleBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255, 255, 255, 0.04)' },
  roleBtnActive: { backgroundColor: '#14b8a6' },
  roleBtnText: { fontFamily: 'Ravi-Regular', fontSize: 9.5, color: '#94a3b8' },
  roleBtnTextActive: { fontFamily: 'Ravi-Bold', color: '#030712' },
  smallAddBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#14b8a6', alignItems: 'center', justifyContent: 'center' },
  crewList: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  crewItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  crewText: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#cbd5e1' },
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
  budgetInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingVertical: 5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
    marginTop: 4,
  },
  totalBudgetLabel: { fontFamily: 'Ravi-Regular', fontSize: 11, color: '#94a3b8' },
  totalBudgetValue: { fontFamily: 'Ravi-Bold', fontSize: 18, color: '#2dd4bf' },
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

  btnRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 4 },
  backBtn: { flex: 1, height: 44, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.05)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontFamily: 'Ravi-Bold', fontSize: 11.5, color: '#94a3b8' },
  nextBtn: { flex: 2, height: 44, borderRadius: 14, backgroundColor: '#14b8a6', alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { fontFamily: 'Ravi-Bold', fontSize: 12, color: '#030712' },
  actionBtn: { height: 44, borderRadius: 14, backgroundColor: '#14b8a6', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  actionBtnText: { fontFamily: 'Ravi-Bold', fontSize: 12, color: '#030712' },
  btnDisabled: { opacity: 0.5 },
});