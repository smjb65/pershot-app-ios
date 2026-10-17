import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ToastAndroid,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, AlertCircle, Save, ArrowLeft } from 'lucide-react-native';
import { api } from '../../../src/api/axiosClient';
import StepOneInfo from './add-movie/StepOneInfo';
import StepTwoMedia from './add-movie/StepTwoMedia';

interface Props {
  movie: any;
  onSuccess: () => void;
}

export default function MovieEditStepperForm({ movie, onSuccess }: Props) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<0 | 1>(0);
  const [submitting, setSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const isApproved = movie.status === 'Approved' || movie.status === 'published' || movie.status === 3;
  const isRejected = movie.status === 'Rejected' || movie.status === 'PendingSuperAdmin' || movie.status === 4;
  const isDraft = movie.status === 'Draft' || movie.status === 0 || String(movie.status).toLowerCase() === 'draft';
  const isVideoLocked = false; // دقیقاً مشابه وب

  const [formData, setFormData] = useState({
    titleFa: movie.titleFa || '',
    titleEn: movie.titleEn || '',
    synopsis: movie.synopsis || '',
    category: movie.category || 'فیلم کوتاه داستانی',
    durationMinutes: movie.durationMinutes ? movie.durationMinutes.toString() : '',
    releaseYear: movie.releaseYear ? movie.releaseYear.toString() : '',
    enableDonation: movie.enableDonation ?? true,
    donationAmounts:
      movie.donationAmounts && movie.donationAmounts.length === 4
        ? movie.donationAmounts
        : [50000, 100000, 200000, 500000],
  });

  const [selectedGenres, setSelectedGenres] = useState<string[]>(movie.genres || []);
  const [countriesList, setCountriesList] = useState<string[]>(movie.productionCountries || []);
  const [keywordsList, setKeywordsList] = useState<string[]>(movie.keywords || []);
  const [crewItems, setCrewItems] = useState<any[]>(movie.crew || []);

  const [existingMedia, setExistingMedia] = useState({
    videoUrl: movie.videoUrl || null,
    trailerUrl: movie.trailerUrl || null,
    posters: movie.posters || [],
    mainPosterUrl: movie.mainPosterUrl || '',
    behindSceneVideoUrl: movie.behindSceneVideoUrl || null,
    behindSceneImages: movie.behindSceneImages || [],
  });

  const [videoAsset, setVideoAsset] = useState<any | null>(null);
  const [trailerAsset, setTrailerAsset] = useState<any | null>(null);
  const [posterVerticalAsset, setPosterVerticalAsset] = useState<any | null>(null);
  const [posterHorizontalAsset, setPosterHorizontalAsset] = useState<any | null>(null);
  const [behindVideoAsset, setBehindVideoAsset] = useState<any | null>(null);
  const [behindImages, setBehindImages] = useState<any[]>([]);

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  const uploadSingleImageFile = async (asset: any, folder: string): Promise<string> => {
    const formDataFile = new FormData();
    const filename = asset.name || asset.fileName || asset.uri.split('/').pop() || 'image.jpg';
    formDataFile.append('file', {
      uri: asset.uri,
      name: filename,
      type: asset.mimeType || 'image/jpeg',
    } as any);
    formDataFile.append('folder', folder);

    const response = await api.post('/upload/media', formDataFile, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 0,
    });

    return response.data.url as string;
  };

  const handleSaveStepOneAsDraft = async () => {
    try {
      setIsSavingDraft(true);
      const draftPayload = {
        movieId: movie.id,
        titleFa: formData.titleFa.trim(),
        titleEn: formData.titleEn.trim() || null,
        synopsis: formData.synopsis.trim(),
        category: formData.category,
        genres: selectedGenres,
        keywords: keywordsList,
        crew: crewItems.map((c) => ({
          userId: c.userId || null,
          name: c.name,
          role: c.role,
          avatar: c.avatar || null,
        })),
        productionCountries: countriesList,
        releaseYear: formData.releaseYear ? parseInt(formData.releaseYear, 10) : null,
        durationMinutes: parseInt(formData.durationMinutes, 10),
        isDraft: true,
      };

      await api.post('/movies/draft', draftPayload, { timeout: 0 });
      showToast('پیش‌نویس مشخصات ذخیره شد');
      setActiveStep(1);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ثبت پیش‌نویس');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // ذخیره سریع مشخصات بدون نیاز به تغییر مدیا (حفظ وضعیت تایید مشابه وب)
  const handleSaveInfoOnly = async () => {
    const isExperimental = formData.category?.includes('تجربی');
    const newErrors: any = {};
    if (!formData.titleFa?.trim()) newErrors.titleFa = 'وارد کردن عنوان فارسی الزامی است.';
    if (!isExperimental && selectedGenres.length === 0) newErrors.genres = 'انتخاب حداقل یک ژانر الزامی است.';
    if (!formData.durationMinutes) newErrors.durationMinutes = 'وارد کردن مدت زمان فیلم الزامی است.';
    if (!formData.synopsis?.trim()) newErrors.synopsis = 'وارد کردن خلاصه داستان الزامی است.';
    if (countriesList.length === 0) newErrors.countries = 'افزودن حداقل یک کشور یا شهر تولیدکننده الزامی است.';
    if (keywordsList.length === 0) newErrors.keywords = 'افزودن حداقل یک برچسب الزامی است.';

    if (formData.enableDonation ?? true) {
      const amounts = formData.donationAmounts || [50000, 100000, 200000, 500000];
      if (amounts.some((a: number) => !a || a < 50000)) {
        newErrors.donation = 'حداقل مبلغ پیشنهادی برای دونیت ۵۰٬۰۰۰ تومان است.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('لطفاً فیلدهای الزامی مشخصات را کامل کنید.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        movieId: movie.id,
        titleFa: formData.titleFa.trim(),
        titleEn: formData.titleEn.trim() || null,
        synopsis: formData.synopsis.trim(),
        category: formData.category,
        genres: selectedGenres,
        keywords: keywordsList,
        crew: crewItems.map((c) => ({
          userId: c.userId || null,
          name: c.name,
          role: c.role,
          avatar: c.avatar || null,
        })),
        productionCountries: countriesList,
        releaseYear: formData.releaseYear ? parseInt(formData.releaseYear, 10) : null,
        durationMinutes: parseInt(formData.durationMinutes, 10),
        newVideoUrl: movie.videoUrl || null,
        trailerUrl: movie.trailerUrl || null,
        mainPosterUrl: movie.mainPosterUrl || '',
        posters: movie.posters || [],
        behindSceneVideoUrl: movie.behindSceneVideoUrl || null,
        behindSceneImages: movie.behindSceneImages || [],
        enableDonation: formData.enableDonation,
        donationAmounts: formData.donationAmounts,
      };

      const res = await api.put(`/movies/${movie.id}`, payload, { timeout: 0 });
      if (res.data?.isMediaChanged) {
        showToast('مشخصات اثر ثبت و جهت تایید به ادمین ارسال گردید.');
      } else {
        showToast('مشخصات اثر با موفقیت به‌روزرسانی شد (وضعیت تایید حفظ گردید).');
      }
      onSuccess();
      router.replace({
        pathname: '/(screens)/movies',
        params: { refresh: Date.now().toString() },
      } as any);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'خطا در ثبت مشخصات اثر');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFinal = async () => {
    try {
      setSubmitting(true);

      const videoUrl = existingMedia.videoUrl;
      const trailerUrl = existingMedia.trailerUrl;

      // ۱. آپلود پوستر عمودی در صورت تغییر
      let mainPosterUrl = existingMedia.mainPosterUrl;
      if (posterVerticalAsset) {
        mainPosterUrl = await uploadSingleImageFile(posterVerticalAsset, 'posters');
      }

      // ۲. آپلود پوستر افقی در صورت تغییر
      const finalPosters = [...(existingMedia.posters || [])];
      if (posterHorizontalAsset) {
        const horizontalUrl = await uploadSingleImageFile(posterHorizontalAsset, 'posters');
        finalPosters[0] = horizontalUrl;
      }

      // ۳. آپلود تصاویر پشت صحنه جدید
      const finalBehindImgs = [...(existingMedia.behindSceneImages || [])];
      for (let i = 0; i < behindImages.length; i++) {
        const bUrl = await uploadSingleImageFile(behindImages[i], 'behind-scenes/images');
        finalBehindImgs.push(bUrl);
      }

      const payload = {
        movieId: movie.id,
        titleFa: formData.titleFa.trim(),
        titleEn: formData.titleEn.trim() || null,
        synopsis: formData.synopsis.trim(),
        category: formData.category,
        genres: selectedGenres,
        keywords: keywordsList,
        crew: crewItems.map((c) => ({
          userId: c.userId || null,
          name: c.name,
          role: c.role,
          avatar: c.avatar || null,
        })),
        productionCountries: countriesList,
        releaseYear: formData.releaseYear ? parseInt(formData.releaseYear, 10) : null,
        durationMinutes: parseInt(formData.durationMinutes, 10),
        newVideoUrl: videoUrl,
        trailerUrl: trailerUrl ?? null,
        mainPosterUrl: mainPosterUrl,
        posters: finalPosters,
        behindSceneVideoUrl: existingMedia.behindSceneVideoUrl || null,
        behindSceneImages: finalBehindImgs,
        enableDonation: formData.enableDonation,
        donationAmounts: formData.donationAmounts,
      };

      const res = await api.put(`/movies/${movie.id}`, payload, { timeout: 0 });
      if (res.data?.isMediaChanged) {
        showToast('فایل‌های مدیا تغییر کرد و اثر جهت تایید مجدد به صف ادمین ارسال گردید.');
      } else {
        showToast('مشخصات اثر با موفقیت به‌روزرسانی شد (وضعیت تایید حفظ گردید).');
      }

      onSuccess();
      router.replace({
        pathname: '/(screens)/movies',
        params: { refresh: Date.now().toString() },
      } as any);
    } catch (error: any) {
      Alert.alert(
        'خطا در ثبت',
        error.response?.data?.message || error.message || 'مشکلی در ثبت نهایی رخ داد.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }]}
    >
      {isApproved && (
        <View style={styles.approvedBanner}>
          <Sparkles size={18} color="#2dd4bf" />
          <Text style={styles.approvedBannerText}>
            این اثر تایید شده است. در صورت ویرایش مشخصات شناسنامه‌ای، وضعیت اثر همچنان «تایید شده» باقی می‌ماند. تنها در صورت تغییر فایل‌های مدیا، اثر جهت بررسی مجدد به صف ادمین ارسال می‌شود.
          </Text>
        </View>
      )}

      {isRejected && (
        <View style={styles.rejectedBanner}>
          <AlertCircle size={18} color="#f43f5e" />
          <Text style={styles.rejectedBannerText}>
            این اثر رد شده است (مهلت اصلاح ۷ روزه). می‌توانید مشخصات یا ویدیوی اصلی را اصلاح کرده و جهت بررسی مجدد ارسال فرمایید.
          </Text>
        </View>
      )}

      <View style={styles.stepperHeader}>
        <TouchableOpacity
          style={[styles.stepTab, activeStep === 0 && styles.activeStepTab]}
          onPress={() => setActiveStep(0)}
        >
          <Text style={[styles.stepTabText, activeStep === 0 && styles.activeStepTabText]}>
            ۱. شناسنامه و عوامل
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.stepTab, activeStep === 1 && styles.activeStepTab]}
          onPress={() => setActiveStep(1)}
        >
          <Text style={[styles.stepTabText, activeStep === 1 && styles.activeStepTabText]}>
            ۲. مدیا و پوسترها
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {activeStep === 0 ? (
          <View style={{ gap: 12 }}>
            <StepOneInfo
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              setErrors={setErrors}
              selectedGenres={selectedGenres}
              setSelectedGenres={setSelectedGenres}
              countriesList={countriesList}
              setCountriesList={setCountriesList}
              keywordsList={keywordsList}
              setKeywordsList={setKeywordsList}
              crewItems={crewItems}
              setCrewItems={setCrewItems}
              isSavingDraft={isSavingDraft}
              onNext={isDraft ? handleSaveStepOneAsDraft : () => setActiveStep(1)}
            />

            {!isDraft && (
              <View style={styles.quickSaveBox}>
                <TouchableOpacity
                  style={[styles.saveInfoOnlyBtn, submitting && { opacity: 0.5 }]}
                  disabled={submitting}
                  activeOpacity={0.8}
                  onPress={handleSaveInfoOnly}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#2dd4bf" />
                  ) : (
                    <>
                      <Save size={16} color="#2dd4bf" />
                      <Text style={styles.saveInfoOnlyBtnText}>
                        ذخیره مشخصات اثر (بدون نیاز به تغییر فایل‌های مدیا)
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <StepTwoMedia
            movieId={movie.id}
            videoAsset={videoAsset}
            setVideoAsset={setVideoAsset}
            trailerAsset={trailerAsset}
            setTrailerAsset={setTrailerAsset}
            posterVerticalAsset={posterVerticalAsset}
            setPosterVerticalAsset={setPosterVerticalAsset}
            posterHorizontalAsset={posterHorizontalAsset}
            setPosterHorizontalAsset={setPosterHorizontalAsset}
            behindVideoAsset={behindVideoAsset}
            setBehindVideoAsset={setBehindVideoAsset}
            behindImages={behindImages}
            setBehindImages={setBehindImages}
            existingMedia={existingMedia}
            setExistingMedia={setExistingMedia}
            isVideoLocked={isVideoLocked}
            isRejected={isRejected}
            errors={errors}
            setErrors={setErrors}
            submitting={submitting}
            onBack={() => setActiveStep(0)}
            onSubmit={handleSubmitFinal}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  approvedBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },
  approvedBannerText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 10,
    color: '#5eead4',
    flex: 1,
    textAlign: 'right',
    lineHeight: 16,
  },
  rejectedBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },
  rejectedBannerText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 10,
    color: '#fda4af',
    flex: 1,
    textAlign: 'right',
    lineHeight: 16,
  },
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
  stepTabText: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#94a3b8' },
  activeStepTabText: { fontFamily: 'Ravi-Bold', color: '#030712' },
  quickSaveBox: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 10,
  },
  saveInfoOnlyBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.35)',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveInfoOnlyBtnText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11,
    color: '#2dd4bf',
  },
});