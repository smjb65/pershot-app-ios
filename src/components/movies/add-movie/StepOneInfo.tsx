import React, { useState, useEffect } from 'react';
import { View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Switch, Platform } from 'react-native';
import { Image } from 'expo-image';
import {
  Trash2,
  Globe,
  Tag,
  Film,
  Search,
  Check,
  X,
  UserCheck,
  Heart,
} from 'lucide-react-native';
import { api, getMediaUrl, toFarsiDigits } from '../../../../src/api/axiosClient';

interface StepOneProps {
  formData: any;
  setFormData: (data: any) => void;
  errors: any;
  setErrors: (errors: any) => void;
  selectedGenres: string[];
  setSelectedGenres: (genres: string[]) => void;
  countriesList: string[];
  setCountriesList: (countries: string[]) => void;
  keywordsList: string[];
  setKeywordsList: (keywords: string[]) => void;
  crewItems: any[];
  setCrewItems: (crew: any[]) => void;
  onNext: () => void;
  isSavingDraft?: boolean;
}

const categories = [
  'فیلم کوتاه داستانی',
  'فیلم کوتاه تجربی',
  'فیلم کوتاه مستند',
  'فیلم کوتاه انیمیشن',
];

const availableGenres = [
  'درام', 'کمدی', 'اجتماعی', 'خانوادگی', 'ترسناک', 'جنایی',
  'علمی تخیلی', 'فانتزی', 'اکشن', 'ماجراجویی', 'موزیکال', 'زندگینامه', 'ورزشی', 'سایر',
];

const crewRoles = [
  'کارگردان', 'نویسنده', 'بازیگر', 'تهیه‌کننده',
  'مدیر فیلمبرداری', 'تدوین', 'آهنگساز', 'صدابردار', 'طراح صحنه',
];

const DEFAULT_DONATION_AMOUNTS = [50000, 100000, 200000, 500000];

export default function StepOneInfo({
  formData,
  setFormData,
  errors,
  setErrors,
  selectedGenres,
  setSelectedGenres,
  countriesList,
  setCountriesList,
  keywordsList,
  setKeywordsList,
  crewItems,
  setCrewItems,
  onNext,
  isSavingDraft = false,
}: StepOneProps) {
  const [countryInput, setCountryInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');

  const [crewRole, setCrewRole] = useState('کارگردان');
  const [crewSearchText, setCrewSearchText] = useState('');
  const [searchUsers, setSearchUsers] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // مقداردهی قطعی مبالغ پیش‌فرض دونیت (۵۰، ۱۰۰، ۲۰۰ و ۵۰۰ هزار تومان) در بدو ورود
  useEffect(() => {
    if (
      !formData.donationAmounts ||
      formData.donationAmounts.length !== 4 ||
      formData.donationAmounts.some((amt: number) => amt < 50000)
    ) {
      setFormData((prev: any) => ({
        ...prev,
        donationAmounts: DEFAULT_DONATION_AMOUNTS,
      }));
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (crewSearchText.trim()) {
        loadUsers(crewSearchText);
      } else {
        setSearchUsers([]);
        setShowUserDropdown(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [crewSearchText]);

  const loadUsers = async (search: string) => {
    try {
      setIsSearchingUsers(true);
      const res = await api.get('/profile/crew-users', {
        params: { page: 1, pageSize: 12, search },
      });
      if (res.data?.items) {
        setSearchUsers(res.data.items);
        setShowUserDropdown(true);
      } else {
        setSearchUsers([]);
      }
    } catch {
      setSearchUsers([]);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const toggleGenre = (g: string) => {
    if (selectedGenres.includes(g)) {
      setSelectedGenres(selectedGenres.filter((item) => item !== g));
    } else {
      if (selectedGenres.length >= 3) return;
      setSelectedGenres([...selectedGenres, g]);
    }
    if (errors.genres) setErrors({ ...errors, genres: null });
  };

  const addCountry = () => {
    if (!countryInput.trim() || countriesList.includes(countryInput.trim())) return;
    setCountriesList([...countriesList, countryInput.trim()]);
    setCountryInput('');
    if (errors.countries) setErrors({ ...errors, countries: null });
  };

  const addKeyword = () => {
    if (!keywordInput.trim() || keywordsList.includes(keywordInput.trim())) return;
    setKeywordsList([...keywordsList, keywordInput.trim()]);
    setKeywordInput('');
    if (errors.keywords) setErrors({ ...errors, keywords: null });
  };

  const selectUserForCrew = (user: any) => {
    const alreadyAdded = crewItems.some((c) => c.userId === user.id && c.role === crewRole);
    if (alreadyAdded) {
      alert('این کاربر قبلاً با این نقش به لیست اضافه شده است.');
      return;
    }

    setCrewItems([
      ...crewItems,
      {
        role: crewRole,
        userId: user.id,
        name: user.name || user.userName || user.username,
        userName: user.userName || user.username,
        avatar: user.avatar,
      },
    ]);
    setCrewSearchText('');
    setShowUserDropdown(false);
  };

  const handleDonationAmountChange = (index: number, val: string) => {
    const num = parseInt(val.replace(/[^0-9]/g, ''), 10) || 0;
    const currentAmounts =
      formData.donationAmounts && formData.donationAmounts.length === 4
        ? [...formData.donationAmounts]
        : [...DEFAULT_DONATION_AMOUNTS];
    currentAmounts[index] = num;
    setFormData({ ...formData, donationAmounts: currentAmounts });
    if (errors.donation) setErrors({ ...errors, donation: null });
  };

  const isExperimental = formData.category?.includes('تجربی');

  const handleNextStep = () => {
    const newErrors: any = {};
    if (!formData.titleFa?.trim()) newErrors.titleFa = 'وارد کردن عنوان فارسی الزامی است.';

    if (!isExperimental && selectedGenres.length === 0) {
      newErrors.genres = 'انتخاب حداقل یک ژانر الزامی است.';
    }

    if (!formData.durationMinutes) newErrors.durationMinutes = 'وارد کردن مدت زمان فیلم الزامی است.';
    if (!formData.synopsis?.trim()) newErrors.synopsis = 'وارد کردن خلاصه داستان الزامی است.';
    if (countriesList.length === 0) newErrors.countries = 'افزودن حداقل یک کشور یا شهر تولیدکننده الزامی است.';
    if (keywordsList.length === 0) newErrors.keywords = 'افزودن حداقل یک برچسب الزامی است.';

    if (formData.enableDonation ?? true) {
      const amounts = formData.donationAmounts || DEFAULT_DONATION_AMOUNTS;
      const hasInvalidAmount = amounts.some((a: number) => !a || a < 50000);
      if (hasInvalidAmount) {
        newErrors.donation = 'حداقل مبلغ پیشنهادی برای هر گزینه دونیت ۵۰٬۰۰۰ تومان است.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onNext();
  };

  const currentDonationAmounts =
    formData.donationAmounts && formData.donationAmounts.length === 4
      ? formData.donationAmounts
      : DEFAULT_DONATION_AMOUNTS;

  return (
    <View style={styles.container}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          عنوان فارسی <Text style={styles.requiredStar}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, errors.titleFa && styles.inputError]}
          placeholder="مثال: رویای پاییزی"
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
          placeholder="e.g. Autumn Dream"
          placeholderTextColor="#64748b"
          value={formData.titleEn}
          onChangeText={(val) => {
            const cleanValue = val.replace(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g, '');
            setFormData({ ...formData, titleEn: cleanValue });
          }}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>دسته‌بندی اثر</Text>
        <View style={styles.categoriesGrid}>
          {categories.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.categoryBtn, formData.category === c && styles.categoryBtnActive]}
              onPress={() => setFormData({ ...formData, category: c })}
            >
              <Text style={[styles.categoryBtnText, formData.category === c && styles.categoryBtnTextActive]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            ژانرهای اثر (حداکثر ۳ مورد){' '}
            {!isExperimental ? (
              <Text style={styles.requiredStar}>*</Text>
            ) : (
              <Text style={{ color: '#2dd4bf', fontSize: 9.5 }}>(اختیاری برای تجربی)</Text>
            )}
          </Text>
          <Text style={styles.counterText}>{toFarsiDigits(selectedGenres.length)} از ۳</Text>
        </View>
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
                <Text style={[styles.genreBtnText, isSelected && styles.genreBtnTextActive]}>{g}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {errors.genres && <Text style={styles.errorText}>{errors.genres}</Text>}
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>
            مدت زمان (دقیقه) <Text style={styles.requiredStar}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.centerInput, errors.durationMinutes && styles.inputError]}
            keyboardType="numeric"
            placeholder="مثال: ۱۸"
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
          <Text style={styles.label}>سال ساخت</Text>
          <TextInput
            style={[styles.input, styles.centerInput]}
            keyboardType="numeric"
            placeholder="مثال: ۱۴۰۳"
            placeholderTextColor="#64748b"
            value={formData.releaseYear}
            onChangeText={(val) => setFormData({ ...formData, releaseYear: val })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          خلاصه داستان <Text style={styles.requiredStar}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.textarea, errors.synopsis && styles.inputError]}
          multiline
          numberOfLines={4}
          placeholder="شرحی کوتاه و جذاب درباره داستان فیلم..."
          placeholderTextColor="#64748b"
          value={formData.synopsis}
          onChangeText={(val) => {
            setFormData({ ...formData, synopsis: val });
            if (errors.synopsis) setErrors({ ...errors, synopsis: null });
          }}
        />
        {errors.synopsis && <Text style={styles.errorText}>{errors.synopsis}</Text>}
      </View>

      <View style={[styles.tagCard, errors.countries && styles.inputError]}>
        <View style={styles.cardHeader}>
          <Globe size={16} color="#14b8a6" />
          <Text style={styles.cardHeaderTitle}>
            کشور / شهر تولیدکننده <Text style={styles.requiredStar}>*</Text>
          </Text>
        </View>
        <View style={styles.tagInputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="نام کشور یا شهر..."
            placeholderTextColor="#64748b"
            value={countryInput}
            onChangeText={setCountryInput}
          />
          <TouchableOpacity style={styles.addTagBtn} onPress={addCountry}>
            <Check size={18} color="#030712" />
          </TouchableOpacity>
        </View>
        {errors.countries && <Text style={styles.errorText}>{errors.countries}</Text>}
        {countriesList.length > 0 && (
          <View style={styles.tagsContainer}>
            {countriesList.map((c, idx) => (
              <View key={idx} style={styles.tagPill}>
                <Text style={styles.tagPillText}>{c}</Text>
                <TouchableOpacity onPress={() => setCountriesList(countriesList.filter((_, i) => i !== idx))}>
                  <X size={13} color="#f43f5e" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.tagCard, errors.keywords && styles.inputError]}>
        <View style={styles.cardHeader}>
          <Tag size={16} color="#f59e0b" />
          <Text style={styles.cardHeaderTitle}>
            کلیدواژه‌ها (برچسب‌ها) <Text style={styles.requiredStar}>*</Text>
          </Text>
        </View>
        <View style={styles.tagInputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="برچسب مورد نظر..."
            placeholderTextColor="#64748b"
            value={keywordInput}
            onChangeText={setKeywordInput}
          />
          <TouchableOpacity style={[styles.addTagBtn, { backgroundColor: '#f59e0b' }]} onPress={addKeyword}>
            <Check size={18} color="#030712" />
          </TouchableOpacity>
        </View>
        {errors.keywords && <Text style={styles.errorText}>{errors.keywords}</Text>}
        {keywordsList.length > 0 && (
          <View style={styles.tagsContainer}>
            {keywordsList.map((kw, idx) => (
              <View key={idx} style={[styles.tagPill, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                <Text style={[styles.tagPillText, { color: '#fbbf24' }]}>#{kw}</Text>
                <TouchableOpacity onPress={() => setKeywordsList(keywordsList.filter((_, i) => i !== idx))}>
                  <X size={13} color="#f43f5e" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.crewCardSection}>
        <View style={styles.cardHeader}>
          <Film size={16} color="#14b8a6" />
          <Text style={styles.cardHeaderTitle}>عوامل و سازندگان (فقط کاربران ثبت‌نام‌شده)</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rolesScroll}>
          {crewRoles.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleSelectBtn, crewRole === r && styles.roleSelectBtnActive]}
              onPress={() => setCrewRole(r)}
            >
              <Text style={[styles.roleSelectBtnText, crewRole === r && styles.roleSelectBtnTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.crewSearchRow}>
          <View style={styles.crewSearchInputWrapper}>
            <Search size={16} color="#14b8a6" style={styles.searchIcon} />
            <TextInput
              style={styles.crewSearchInput}
              placeholder="جستجو بر اساس نام یا نام کاربری..."
              placeholderTextColor="#64748b"
              value={crewSearchText}
              onChangeText={setCrewSearchText}
              onFocus={() => {
                if (searchUsers.length > 0) setShowUserDropdown(true);
              }}
            />
          </View>
        </View>

        {showUserDropdown && (
          <View style={styles.userSuggestDropdown}>
            {isSearchingUsers ? (
              <View style={styles.dropdownLoading}>
                <ActivityIndicator size="small" color="#14b8a6" />
                <Text style={styles.dropdownLoadingText}>در حال جستجو...</Text>
              </View>
            ) : searchUsers.length === 0 ? (
              <Text style={styles.noUserFoundText}>کاربری با این مشخصات یافت نشد.</Text>
            ) : (
              searchUsers.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={styles.suggestUserItem}
                  activeOpacity={0.7}
                  onPress={() => selectUserForCrew(u)}
                >
                  <Image
                    source={{ uri: getMediaUrl(u.avatar) }}
                    style={styles.suggestUserAvatar}
                    contentFit="cover"
                  />
                  <View style={styles.suggestUserMeta}>
                    <Text style={styles.suggestUserName}>{u.name || u.userName}</Text>
                    <Text style={styles.suggestUserHandle}>@{u.userName || u.username}</Text>
                  </View>
                  <UserCheck size={16} color="#14b8a6" />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {crewItems.length > 0 && (
          <View style={styles.addedCrewList}>
            {crewItems.map((item, index) => (
              <View key={index} style={styles.addedCrewCard}>
                <View style={styles.addedCrewRight}>
                  {item.avatar ? (
                    <Image source={{ uri: getMediaUrl(item.avatar) }} style={styles.crewItemAvatar} />
                  ) : (
                    <View style={styles.crewAvatarPlaceholder}>
                      <Text style={styles.crewAvatarInitial}>{item.name?.[0] || 'ع'}</Text>
                    </View>
                  )}
                  <View style={styles.crewMetaTexts}>
                    <Text style={styles.crewItemName}>{item.name}</Text>
                    <Text style={styles.crewItemRole}>{item.role}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setCrewItems(crewItems.filter((_, i) => i !== index))}>
                  <Trash2 size={15} color="#f43f5e" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* بخش حمایت مالی و دونیت (حداقل ۵۰٬۰۰۰ تومان) */}
      <View style={styles.donationCard}>
        <View style={styles.switchRowHeader}>
          <View style={styles.switchTextContainer}>
            <View style={styles.cardHeader}>
              <Heart size={16} color="#f43f5e" fill="#f43f5e" />
              <Text style={styles.cardHeaderTitle}>حمایت مالی مخاطبان (دونیت)</Text>
            </View>
            <Text style={styles.sectionDesc}>
              امکان پرداخت پاداش و دونیت اختیاری توسط تماشاگران پس از پایان تماشای اثر
            </Text>
          </View>
          <Switch
            value={formData.enableDonation ?? true}
            onValueChange={(val) => setFormData({ ...formData, enableDonation: val })}
            thumbColor={(formData.enableDonation ?? true) ? '#14b8a6' : '#64748b'}
            trackColor={{ false: 'rgba(255, 255, 255, 0.08)', true: 'rgba(20, 184, 166, 0.35)' }}
          />
        </View>

        {(formData.enableDonation ?? true) && (
          <View style={styles.donationAmountsBox}>
            <View style={styles.donationHeaderRow}>
              <Text style={styles.donationAmountsTitle}>۴ گزینه پیشنهادی پیش‌فرض (تومان):</Text>
              <Text style={styles.donationMinBadge}>حداقل هر گزینه: ۵۰٬۰۰۰ تومان</Text>
            </View>
            <View style={styles.amountsGrid}>
              {[0, 1, 2, 3].map((idx) => (
                <View key={idx} style={styles.amountInputCol}>
                  <Text style={styles.amountInputLabel}>گزینه {toFarsiDigits(idx + 1)}</Text>
                  <TextInput
                    style={[styles.input, styles.centerInput, styles.amountInput]}
                    keyboardType="numeric"
                    placeholder="50000"
                    placeholderTextColor="#64748b"
                    value={currentDonationAmounts[idx]?.toString() || ''}
                    onChangeText={(val) => handleDonationAmountChange(idx, val)}
                  />
                </View>
              ))}
            </View>
            {errors.donation && <Text style={styles.errorText}>{errors.donation}</Text>}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.nextStepBtn, isSavingDraft && { opacity: 0.6 }]}
        activeOpacity={0.8}
        disabled={isSavingDraft}
        onPress={handleNextStep}
      >
        {isSavingDraft ? (
          <ActivityIndicator size="small" color="#030712" />
        ) : (
          <Text style={styles.nextStepBtnText}>ثبت پیش‌‌نویس و ادامه به مرحله آپلود ←</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  inputGroup: { gap: 4 },
  label: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#94a3b8', textAlign: 'right' },
  requiredStar: { color: '#f43f5e' },
  labelRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  counterText: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#64748b' },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Ravi-Regular',
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'right',
  },
  inputError: { borderColor: '#f43f5e' },
  errorText: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#f43f5e', textAlign: 'right' },
  ltrInput: { textAlign: 'left', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  centerInput: { textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  textarea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row-reverse', gap: 8 },
  categoriesGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  categoryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryBtnActive: { backgroundColor: 'rgba(20, 184, 166, 0.15)', borderColor: '#14b8a6' },
  categoryBtnText: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#94a3b8' },
  categoryBtnTextActive: { fontFamily: 'Ravi-Bold', color: '#2dd4bf' },
  genresWrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
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
  tagCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  cardHeaderTitle: { fontFamily: 'Ravi-Bold', fontSize: 11.5, color: '#ffffff' },
  tagInputRow: { flexDirection: 'row-reverse', gap: 6 },
  addTagBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
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
  crewCardSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    gap: 10,
  },
  rolesScroll: { flexDirection: 'row-reverse', gap: 6, paddingVertical: 2 },
  roleSelectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  roleSelectBtnActive: { backgroundColor: 'rgba(20, 184, 166, 0.15)', borderColor: '#14b8a6' },
  roleSelectBtnText: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#94a3b8' },
  roleSelectBtnTextActive: { fontFamily: 'Ravi-Bold', color: '#2dd4bf' },
  crewSearchRow: { flexDirection: 'row-reverse' },
  crewSearchInputWrapper: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 44,
  },
  searchIcon: { marginLeft: 8 },
  crewSearchInput: { flex: 1, fontFamily: 'Ravi-Regular', fontSize: 11.5, color: '#ffffff', textAlign: 'right' },
  userSuggestDropdown: {
    backgroundColor: '#0c1222',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.4)',
    padding: 6,
    gap: 4,
    maxHeight: 200,
  },
  dropdownLoading: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', padding: 12, gap: 6 },
  dropdownLoadingText: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#94a3b8' },
  noUserFoundText: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#94a3b8', textAlign: 'center', padding: 8 },
  suggestUserItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  suggestUserAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#030712' },
  suggestUserMeta: { flex: 1 },
  suggestUserName: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#ffffff', textAlign: 'right' },
  suggestUserHandle: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 9.5, color: '#2dd4bf', textAlign: 'left' },
  addedCrewList: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  addedCrewCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0d1520',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 8,
    minWidth: '48%',
    flex: 1,
  },
  addedCrewRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, flex: 1 },
  crewItemAvatar: { width: 26, height: 26, borderRadius: 13 },
  crewAvatarPlaceholder: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crewAvatarInitial: { fontFamily: 'Ravi-Bold', fontSize: 10, color: '#2dd4bf' },
  crewMetaTexts: { flex: 1 },
  crewItemName: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#ffffff', textAlign: 'right' },
  crewItemRole: { fontFamily: 'Ravi-Regular', fontSize: 9, color: '#14b8a6', textAlign: 'right' },
  donationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
    padding: 12,
    gap: 10,
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
  sectionDesc: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'right',
    lineHeight: 14,
  },
  donationAmountsBox: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
    gap: 8,
  },
  donationHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  donationAmountsTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 10.5,
    color: '#cbd5e1',
  },
  donationMinBadge: {
    fontFamily: 'Ravi-Bold',
    fontSize: 9.5,
    color: '#fbbf24',
  },
  amountsGrid: {
    flexDirection: 'row-reverse',
    gap: 6,
  },
  amountInputCol: {
    flex: 1,
    gap: 4,
  },
  amountInputLabel: {
    fontFamily: 'Ravi-Regular',
    fontSize: 9.5,
    color: '#94a3b8',
    textAlign: 'center',
  },
  amountInput: {
    paddingHorizontal: 4,
    fontSize: 11,
    color: '#fcd34d',
  },
  nextStepBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  nextStepBtnText: { fontFamily: 'Ravi-Bold', fontSize: 12.5, color: '#030712' },
});