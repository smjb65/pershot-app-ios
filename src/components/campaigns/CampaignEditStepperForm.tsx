import React, { useState } from 'react';
import { View, Text, StyleSheet, ToastAndroid, Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { api, toFarsiDigits } from '../../api/axiosClient';
import { uploadMediaFile } from '../../utils/fileUploader';
import StepOneInfo from './add-campaign/StepOneInfo';
import StepTwoProduction from './add-campaign/StepTwoProduction';
import StepThreeBudget from './add-campaign/StepThreeBudget';

interface Props {
  campaign: any;
  onSuccess: () => void;
}

export default function CampaignEditStepperForm({ campaign, onSuccess }: Props) {
  const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<any>({});
  
  // 🟢 استیت‌های مانیتورینگ
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState('');
  const [uploadTimeRemaining, setUploadTimeRemaining] = useState('');

  const [formData, setFormData] = useState({
    titleFa: campaign.titleFa || '',
    titleEn: campaign.titleEn || '',
    durationMinutes: campaign.durationMinutes ? campaign.durationMinutes.toString() : '',
    language: campaign.language || 'فارسی',
    category: campaign.category || 'فیلم کوتاه داستانی',
    shortSynopsis: campaign.shortSynopsis || '',
    synopsis: campaign.synopsis || '',
    logline: campaign.logline || '',
    currentStage: campaign.currentStage || 'طرح (Idea Stage)',
    yearMiladi: campaign.releaseYear ? campaign.releaseYear.toString() : '',
    yearShamsi: '',
    scriptRegistrationNumber: campaign.scriptRegistrationNumber || '',
    ideaRegistrationNumber: campaign.ideaRegistrationNumber || '',
    campaignDurationDays: campaign.campaignDurationDays || 60,
    costPreProduction: campaign.costDetails?.preProductionCost?.toString() || '',
    costProduction: campaign.costDetails?.productionCost?.toString() || '',
    costPostProduction: campaign.costDetails?.postProductionCost?.toString() || '',
    daysPreProduction: campaign.timeDetails?.preProductionDays?.toString() || '',
    daysProduction: campaign.timeDetails?.productionDays?.toString() || '',
    daysPostProduction: campaign.timeDetails?.postProductionDays?.toString() || '',
  });

  const [selectedGenres, setSelectedGenres] = useState<string[]>(campaign.genres || []);
  const [locationsList, setLocationsList] = useState<string[]>(campaign.productionLocations || []);
  const [crewItems, setCrewItems] = useState<any[]>(campaign.crew || []);

  const [posterAssets, setPosterAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [mainPosterIndex, setMainPosterIndex] = useState(0);
  const [pitchAsset, setPitchAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [scriptAsset, setScriptAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [ideaAsset, setIdeaAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [roughCutAsset, setRoughCutAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [financialDocsAsset, setFinancialDocsAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // ۱. آپلود پوسترها
      let mainPosterUrl = campaign.mainPosterUrl;
      let finalPosters = campaign.supplementUrls || [];

      if (posterAssets.length > 0) {
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
        finalPosters = uploadedPosters;
        mainPosterUrl = uploadedPosters[mainPosterIndex] || uploadedPosters[0];
      }

      // ۲. آپلود پیچ ویدیو
      let pitchUrl = campaign.pitchVideoUrl;
      if (pitchAsset) {
        setUploadProgress(0);
        setUploadLabel('در حال آپلود ویدیوی معرفی اثر (پیچ ویدیو)...');
        pitchUrl = await uploadMediaFile(
          pitchAsset.uri,
          pitchAsset.uri.split('/').pop() || 'pitch.mp4',
          'video/mp4',
          'campaigns/pitches',
          (prog) => {
            setUploadProgress(prog.percent);
            setUploadSpeed(prog.speed);
            setUploadTimeRemaining(prog.timeRemaining);
          }
        );
      }

      // ۳. آپلود فیلمنامه
      let scriptUrl = campaign.scriptFileUrl;
      if (scriptAsset) {
        setUploadProgress(0);
        setUploadLabel('در حال آپلود فایل فیلمنامه (PDF)...');
        scriptUrl = await uploadMediaFile(
          scriptAsset.uri,
          scriptAsset.name || 'script.pdf',
          scriptAsset.mimeType || 'application/pdf',
          'campaigns/scripts',
          (prog) => {
            setUploadProgress(prog.percent);
            setUploadSpeed(prog.speed);
            setUploadTimeRemaining(prog.timeRemaining);
          }
        );
      }

      // ۴. آپلود طرح
      let ideaUrl = campaign.ideaFileUrl;
      if (ideaAsset) {
        setUploadProgress(0);
        setUploadLabel('در حال آپلود فایل طرح (PDF)...');
        ideaUrl = await uploadMediaFile(
          ideaAsset.uri,
          ideaAsset.name || 'idea.pdf',
          ideaAsset.mimeType || 'application/pdf',
          'campaigns/ideas',
          (prog) => {
            setUploadProgress(prog.percent);
            setUploadSpeed(prog.speed);
            setUploadTimeRemaining(prog.timeRemaining);
          }
        );
      }

      // ۵. آپلود راف‌کات
      let roughCutUrl = campaign.roughCutUrl;
      if (roughCutAsset) {
        setUploadProgress(0);
        setUploadLabel('در حال آپلود ویدیوی راف‌کات...');
        roughCutUrl = await uploadMediaFile(
          roughCutAsset.uri,
          roughCutAsset.uri.split('/').pop() || 'roughcut.mp4',
          'video/mp4',
          'campaigns/roughcuts',
          (prog) => {
            setUploadProgress(prog.percent);
            setUploadSpeed(prog.speed);
            setUploadTimeRemaining(prog.timeRemaining);
          }
        );
      }

      // ۶. آپلود اسناد مالی
      let financialUrl = campaign.financialDocumentsUrl;
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
      setUploadLabel('در حال ذخیره‌سازی تغییرات کمپین...');
      setUploadSpeed('');
      setUploadTimeRemaining('');

      const preProdCost = parseFloat(formData.costPreProduction || '0');
      const prodCost = parseFloat(formData.costProduction || '0');
      const postProdCost = parseFloat(formData.costPostProduction || '0');

      const payload = {
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
        supplementUrls: finalPosters,
        pitchVideoUrl: pitchUrl,
        scriptFileUrl: scriptUrl,
        ideaFileUrl: ideaUrl,
        roughCutUrl: roughCutUrl || null,
        financialDocumentsUrl: financialUrl || null,
        costDetails: {
          preProductionCost: preProdCost,
          productionCost: prodCost,
          postProductionCost: postProdCost,
          grandTotal: preProdCost + prodCost + postProdCost,
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

      await api.put(`/projects/${campaign.id}`, payload, { timeout: 0 });
      showToast('اطلاعات کمپین با موفقیت بروزرسانی شد');
      onSuccess();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ویرایش کمپین');
    } finally {
      setSubmitting(false);
      setUploadLabel('');
      setUploadProgress(0);
      setUploadSpeed('');
      setUploadTimeRemaining('');
    }
  };

  return (
    <View style={styles.container}>
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
        <StepOneInfo
          formData={formData}
          setFormData={setFormData}
          errors={errors}
          setErrors={setErrors}
          selectedGenres={selectedGenres}
          setSelectedGenres={setSelectedGenres}
          locationsList={locationsList}
          setLocationsList={setLocationsList}
          onNext={() => setActiveStep(1)}
        />
      )}

      {activeStep === 1 && (
        <StepTwoProduction
          formData={formData}
          setFormData={setFormData}
          errors={errors}
          setErrors={setErrors}
          crewItems={crewItems}
          setCrewItems={setCrewItems}
          pitchAsset={pitchAsset}
          setPitchAsset={setPitchAsset}
          scriptAsset={scriptAsset}
          setScriptAsset={setScriptAsset}
          ideaAsset={ideaAsset}
          setIdeaAsset={setIdeaAsset}
          roughCutAsset={roughCutAsset}
          setRoughCutAsset={setRoughCutAsset}
          existingFiles={campaign}
          onBack={() => setActiveStep(0)}
          onNext={() => setActiveStep(2)}
        />
      )}

      {activeStep === 2 && (
        <StepThreeBudget
          formData={formData}
          setFormData={setFormData}
          errors={errors}
          setErrors={setErrors}
          posterAssets={posterAssets}
          setPosterAssets={setPosterAssets}
          mainPosterIndex={mainPosterIndex}
          setMainPosterIndex={setMainPosterIndex}
          financialDocsAsset={financialDocsAsset}
          setFinancialDocsAsset={setFinancialDocsAsset}
          submitting={submitting}
          uploadLabel={uploadLabel}
          uploadProgress={uploadProgress}
          uploadSpeed={uploadSpeed}
          uploadTimeRemaining={uploadTimeRemaining}
          existingFiles={campaign}
          onBack={() => setActiveStep(1)}
          onSubmit={handleSubmit}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  stepperHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  stepTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  activeStepTab: { backgroundColor: '#14b8a6' },
  stepTabText: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#94a3b8' },
  activeStepTabText: { fontFamily: 'Ravi-Bold', color: '#030712' },
});