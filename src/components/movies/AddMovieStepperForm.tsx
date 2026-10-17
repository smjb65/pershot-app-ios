import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ToastAndroid,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../../src/api/axiosClient';
import StepOneInfo from './add-movie/StepOneInfo';
import StepTwoMedia from './add-movie/StepTwoMedia';

interface Props {
  onSuccess?: () => void;
  initialMovie?: any;
}

export default function AddMovieStepperForm({ onSuccess, initialMovie }: Props) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<0 | 1>(0);
  const [submitting, setSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [createdMovieId, setCreatedMovieId] = useState<string | null>(initialMovie?.id || null);
  const [errors, setErrors] = useState<any>({});
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
    titleFa: initialMovie?.titleFa || '',
    titleEn: initialMovie?.titleEn || '',
    synopsis: initialMovie?.synopsis || '',
    category: initialMovie?.category || 'فیلم کوتاه داستانی',
    durationMinutes: initialMovie?.durationMinutes ? initialMovie.durationMinutes.toString() : '',
    releaseYear: initialMovie?.releaseYear ? initialMovie.releaseYear.toString() : '',
    enableDonation: initialMovie?.enableDonation ?? true,
    donationAmounts:
      initialMovie?.donationAmounts && initialMovie.donationAmounts.length === 4
        ? initialMovie.donationAmounts
        : [50000, 100000, 200000, 500000],
  });

  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialMovie?.genres || []);
  const [countriesList, setCountriesList] = useState<string[]>(initialMovie?.productionCountries || []);
  const [keywordsList, setKeywordsList] = useState<string[]>(initialMovie?.keywords || []);
  const [crewItems, setCrewItems] = useState<any[]>(initialMovie?.crew || []);

  const [videoAsset, setVideoAsset] = useState<any | null>(null);
  const [trailerAsset, setTrailerAsset] = useState<any | null>(null);
  const [posterVerticalAsset, setPosterVerticalAsset] = useState<any | null>(null);
  const [posterHorizontalAsset, setPosterHorizontalAsset] = useState<any | null>(null);
  const [behindVideoAsset, setBehindVideoAsset] = useState<any | null>(null);
  const [behindImages, setBehindImages] = useState<any[]>([]);

  const [existingMedia, setExistingMedia] = useState({
    videoUrl: initialMovie?.videoUrl || null,
    trailerUrl: initialMovie?.trailerUrl || null,
    posters: initialMovie?.posters || [],
    mainPosterUrl: initialMovie?.mainPosterUrl || '',
    behindSceneVideoUrl: null,
    behindSceneImages: initialMovie?.behindSceneImages || [],
  });

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
        movieId: createdMovieId,
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

      const res = await api.post('/movies/draft', draftPayload, { timeout: 0 });
      const savedId = res.data?.movieId || res.data?.id || res.data?.data?.id;

      if (savedId) {
        setCreatedMovieId(savedId);
        showToast('مشخصات مرحله اول ذخیره شد');
        setActiveStep(1);
      } else {
        showToast('خطا در دریافت شناسه اثر از سرور');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ثبت پیش‌نویس');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmitFinal = async () => {
    if (!createdMovieId) {
      showToast('شناسه اثر یافت نشد. لطفاً مرحله اول را دوباره ذخیره کنید.');
      setActiveStep(0);
      return;
    }

    try {
      setSubmitting(true);

      // ویدیو و تیزر قبلاً در StepTwoMedia از طریق آپلود تکه‌ای (Resumable) آپلود شده‌اند
      const videoUrl = existingMedia.videoUrl;
      const trailerUrl = existingMedia.trailerUrl;

      // ۱. آپلود پوستر عمودی (اجباری)
      let mainPosterUrl = existingMedia.mainPosterUrl;
      if (posterVerticalAsset) {
        mainPosterUrl = await uploadSingleImageFile(posterVerticalAsset, 'posters');
      }

      // ۲. آپلود پوستر افقی (اختیاری - در خانه اول آرایه posters)
      const finalPosters = [...(existingMedia.posters || [])];
      if (posterHorizontalAsset) {
        const horizontalUrl = await uploadSingleImageFile(posterHorizontalAsset, 'posters');
        finalPosters[0] = horizontalUrl;
      }

      // ۳. آپلود تصاویر پشت صحنه
      const finalBehindImgs = [...(existingMedia.behindSceneImages || [])];
      for (let i = 0; i < behindImages.length; i++) {
        const bUrl = await uploadSingleImageFile(behindImages[i], 'behind-scenes/images');
        finalBehindImgs.push(bUrl);
      }

      const payload = {
        movieId: createdMovieId,
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
        trailerUrl: trailerUrl,
        mainPosterUrl: mainPosterUrl,
        posters: finalPosters,
        behindSceneVideoUrl: null,
        behindSceneImages: finalBehindImgs,
        enableDonation: formData.enableDonation,
        donationAmounts: formData.donationAmounts,
      };

      await api.put(`/movies/${createdMovieId}`, payload, { timeout: 0 });
      showToast('فیلم تکمیل شد و برای تایید به صف ادمین ارسال گردید');
      if (onSuccess) onSuccess();

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
      style={[styles.container, { paddingBottom: Platform.OS === 'android' ? keyboardOffset : 0 }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
        contentContainerStyle={{ paddingBottom: 35 }}
      >
        {activeStep === 0 ? (
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
            onNext={handleSaveStepOneAsDraft}
          />
        ) : (
          <StepTwoMedia
            movieId={createdMovieId}
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
  container: {
    flex: 1,
    gap: 10,
  },
});