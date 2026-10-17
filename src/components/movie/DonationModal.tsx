import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Heart, X, CreditCard, Gift, Wallet, CheckSquare, Square, Check } from 'lucide-react-native';
import { api, toFarsiDigits } from '../../api/axiosClient';

const MIN_DONATION_AMOUNT = 50000;
const DEFAULT_PRESETS = [50000, 100000, 200000, 500000];

// تابع نرمال‌سازی ارقام فارسی و عربی به انگلیسی
const toEnglishDigits = (str: string): string => {
  if (!str) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = str;
  for (let i = 0; i < 10; i++) {
    res = res.split(persianDigits[i]).join(i.toString());
    res = res.split(arabicDigits[i]).join(i.toString());
  }
  return res.replace(/[^0-9]/g, '');
};

// تابع جداسازی ۳ رقمی با ارقام فارسی
const formatNumberWithCommas = (value: string | number): string => {
  if (!value) return '';
  const rawDigits = toEnglishDigits(value.toString());
  if (!rawDigits) return '';
  const separated = rawDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return toFarsiDigits(separated);
};

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType?: 'Movie' | 'Campaign';
  targetId: string;
  targetTitle: string;
  targetPosterUrl?: string;
  ownerUserId?: string;
  presetAmounts?: number[];
  onSuccess?: () => void;
}

export default function DonationModal({
  isOpen,
  onClose,
  targetType = 'Movie',
  targetId,
  targetTitle,
  targetPosterUrl = '',
  ownerUserId = '',
  presetAmounts = DEFAULT_PRESETS,
  onSuccess,
}: DonationModalProps) {
  // فیلتر کردن مبالغ زیر ۵۰ هزار تومان (حتی اگر از دیتابیس قدیمی بیاید)
  const validPresets = Array.isArray(presetAmounts)
    ? presetAmounts.filter((amt) => Number(amt) >= MIN_DONATION_AMOUNT)
    : [];
  const finalPresets = validPresets.length > 0 ? validPresets : DEFAULT_PRESETS;

  const [selectedAmount, setSelectedAmount] = useState<number | null>(finalPresets[0] || MIN_DONATION_AMOUNT);
  const [rawAmount, setRawAmount] = useState<string>('');
  const [displayAmount, setDisplayAmount] = useState<string>('');

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [useWalletBalance, setUseWalletBalance] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedAmount(finalPresets[0] || MIN_DONATION_AMOUNT);
      setRawAmount('');
      setDisplayAmount('');

      api.get('/payments/wallet/me')
        .then((res) => {
          if (res.data?.success || res.data?.balance !== undefined) {
            setWalletBalance(res.data.balance ?? Math.floor((res.data.balanceRials || 0) / 10));
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalAmount = selectedAmount || (rawAmount ? parseInt(rawAmount, 10) : 0);

  // محاسبه سهم کیف پول و سهم درگاه
  const walletDeduction = useWalletBalance ? Math.min(walletBalance, totalAmount) : 0;
  const gatewayPayable = Math.max(0, totalAmount - walletDeduction);

  // بررسی معتبر بودن مبلغ (حداقل ۵۰,۰۰۰ تومان برای کل دونیت و حداقل ۵۰,۰۰۰ تومان برای ورود به درگاه)
  const isAmountValid =
    totalAmount >= MIN_DONATION_AMOUNT &&
    (gatewayPayable === 0 || gatewayPayable >= MIN_DONATION_AMOUNT);

  const handleSelectPreset = (amount: number) => {
    setSelectedAmount(amount);
    setRawAmount('');
    setDisplayAmount('');
  };

  const handleAmountChange = (text: string) => {
    const englishOnly = toEnglishDigits(text);
    const cleaned = englishOnly.replace(/^0+(?=\d)/, '');
    setRawAmount(cleaned);
    setDisplayAmount(formatNumberWithCommas(cleaned));
    setSelectedAmount(null);
  };

  const handleProcessPayment = async () => {
    if (!totalAmount || totalAmount < MIN_DONATION_AMOUNT) {
      Alert.alert(
        'حداقل مبلغ حمایت',
        `حداقل مبلغ حمایت مالی ${toFarsiDigits(MIN_DONATION_AMOUNT.toLocaleString('en-US'))} تومان می‌باشد.`
      );
      return;
    }

    if (gatewayPayable > 0 && gatewayPayable < MIN_DONATION_AMOUNT) {
      Alert.alert(
        'مبلغ درگاه بانکی',
        `حداقل مبلغ قابل پرداخت در درگاه بانکی ${toFarsiDigits(MIN_DONATION_AMOUNT.toLocaleString('en-US'))} تومان است. لطفاً مبلغ کل را افزایش دهید یا تیک کسر از کیف پول را بردارید.`
      );
      return;
    }

    try {
      setIsSubmitting(true);

      // حالت اول: پرداخت کامل از موجودی کیف پول
      if (gatewayPayable === 0) {
        const res = await api.post('/payments/donate', {
          targetType: targetType === 'Movie' ? 1 : 2,
          targetId,
          targetTitle,
          targetPosterUrl,
          ownerUserId,
          amount: totalAmount,
          amountRials: totalAmount * 10,
        });

        if (res.data?.success) {
          Alert.alert(
            'حمایت با موفقیت ثبت شد',
            `با تشکر از شما! مبلغ ${toFarsiDigits(totalAmount.toLocaleString('en-US'))} تومان از کیف پول شما کسر و به حساب سازنده منظور شد.`
          );
          onClose();
          onSuccess?.();
        } else {
          Alert.alert('خطا', res.data?.message || 'خطا در ثبت حمایت');
        }
      }
      // حالت دوم: انتقال به درگاه بانکی (حداقل ۵۰,۰۰۰ تومان تضمین شده)
      else {
        const chargeRes = await api.post('/payments/charge-wallet', {
          amount: gatewayPayable,
          amountRials: gatewayPayable * 10,
          targetId,
          targetType: targetType === 'Movie' ? 1 : 2,
        });

        if (chargeRes.data?.success && chargeRes.data?.paymentUrl) {
          Alert.alert(
            'اتصال به درگاه بانکی',
            walletDeduction > 0
              ? `مبلغ ${toFarsiDigits(walletDeduction.toLocaleString('en-US'))} تومان از کیف پول کسر می‌شود و جهت پرداخت مابه‌التفاوت (${toFarsiDigits(gatewayPayable.toLocaleString('en-US'))} تومان) به درگاه بانکی هدایت می‌شوید.`
              : `جهت پرداخت مبلغ ${toFarsiDigits(gatewayPayable.toLocaleString('en-US'))} تومان به درگاه بانکی هدایت می‌شوید.`,
            [
              { text: 'انصراف', style: 'cancel' },
              {
                text: 'ورود به درگاه',
                onPress: async () => {
                  onClose();
                  const bridgeUrl = `https://pershot.ir/payment/gateway?url=${encodeURIComponent(chargeRes.data.paymentUrl)}`;
                  await Linking.openURL(bridgeUrl);
                },
              },
            ]
          );
        } else {
          Alert.alert('خطا', chargeRes.data?.message || 'خطا در اتصال به درگاه پرداخت');
        }
      }
    } catch (err: any) {
      Alert.alert('خطا', err.response?.data?.message || 'خطا در ارتباط با سرور پرداخت');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
          >
            <View style={styles.modalCard}>
              {/* ۱. هدر ثابت بالای مدال */}
              <View style={styles.headerFixed}>
                <View style={styles.headerRow}>
                  <View style={styles.heartIconBox}>
                    <Heart size={22} color="#f59e0b" fill="#f59e0b" />
                  </View>
                  <View style={styles.headerInfo}>
                    <View style={styles.titleRow}>
                      <Text style={styles.modalTitle}>
                        {targetType === 'Campaign' ? 'حمایت مالی از کمپین' : 'حمایت از سازندگان اثر'}
                      </Text>
                      <View style={styles.donationBadge}>
                        <Text style={styles.donationBadgeText}>دونیت اختیاری</Text>
                      </View>
                    </View>
                    <Text style={styles.movieTitleText} numberOfLines={1}>
                      {targetTitle}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.closeBtn} activeOpacity={0.7} onPress={onClose}>
                  <X size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* ۲. بدنه اسکرول‌خور میانی */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollBody}
              >
                {/* مبالغ پیشنهادی */}
                <View style={styles.sectionBlock}>
                  <View style={styles.labelRow}>
                    <Gift size={14} color="#f59e0b" />
                    <Text style={styles.labelTitle}>انتخاب مبلغ حمایت:</Text>
                  </View>

                  <View style={styles.presetsGrid}>
                    {finalPresets.map((amount) => {
                      const isSelected = selectedAmount === amount;
                      return (
                        <TouchableOpacity
                          key={amount}
                          activeOpacity={0.8}
                          onPress={() => handleSelectPreset(amount)}
                          style={[styles.presetCard, isSelected && styles.presetCardActive]}
                        >
                          <View style={styles.presetTopRow}>
                            <Text style={[styles.presetAmountText, isSelected && styles.presetAmountTextActive]}>
                              {toFarsiDigits(amount.toLocaleString('en-US'))}
                            </Text>
                            <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
                              {isSelected && <Check size={11} color="#030712" strokeWidth={3} />}
                            </View>
                          </View>
                          <Text style={styles.currencyLabel}>تومان</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* ورودی مبلغ دلخواه */}
                <View style={styles.sectionBlock}>
                  <View style={styles.customAmountHeader}>
                    <Text style={styles.labelTitle}>یا مبلغ دلخواه:</Text>
                    <Text style={styles.minLimitNotice}>حداقل ۵۰,۰۰۰ تومان</Text>
                  </View>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.inputField}
                      placeholder="۰"
                      placeholderTextColor="#475569"
                      keyboardType="number-pad"
                      value={displayAmount}
                      onChangeText={handleAmountChange}
                    />
                    <Text style={styles.fixedCurrencyText}>تومان</Text>
                  </View>
                </View>

                {/* استفاده از کیف پول */}
                <TouchableOpacity
                  style={styles.walletBox}
                  activeOpacity={0.8}
                  onPress={() => setUseWalletBalance((prev) => !prev)}
                >
                  <View style={styles.walletRight}>
                    {useWalletBalance ? (
                      <CheckSquare size={18} color="#14b8a6" />
                    ) : (
                      <Square size={18} color="#64748b" />
                    )}
                    <View style={styles.walletMeta}>
                      <Text style={styles.walletTitle}>کسر از موجودی کیف پول</Text>
                      <Text style={styles.walletBalanceText}>
                        موجودی شما: {toFarsiDigits(walletBalance.toLocaleString('en-US'))} تومان
                      </Text>
                    </View>
                  </View>
                  <Wallet size={18} color="#14b8a6" />
                </TouchableOpacity>

                {/* ریزپرداخت */}
                {totalAmount > 0 && (
                  <View style={styles.breakdownCard}>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>مبلغ کل دونیت:</Text>
                      <Text style={styles.breakdownVal}>
                        {toFarsiDigits(totalAmount.toLocaleString('en-US'))} تومان
                      </Text>
                    </View>
                    {walletDeduction > 0 && (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>کسر از کیف پول:</Text>
                        <Text style={[styles.breakdownVal, { color: '#10b981' }]}>
                          -{toFarsiDigits(walletDeduction.toLocaleString('en-US'))} تومان
                        </Text>
                      </View>
                    )}
                    {gatewayPayable > 0 && (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>پرداخت مستقیم درگاه:</Text>
                        <Text style={[styles.breakdownVal, { color: '#fbbf24' }]}>
                          {toFarsiDigits(gatewayPayable.toLocaleString('en-US'))} تومان
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>

              {/* ۳. فوتر ثابت پایین مدال */}
              <View style={styles.footerFixed}>
                <TouchableOpacity
                  style={[styles.payBtn, (!isAmountValid || isSubmitting) && styles.payBtnDisabled]}
                  activeOpacity={0.85}
                  disabled={!isAmountValid || isSubmitting}
                  onPress={handleProcessPayment}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#030712" />
                  ) : (
                    <>
                      <CreditCard size={18} color="#030712" />
                      <Text style={styles.payBtnText}>
                        {totalAmount < MIN_DONATION_AMOUNT
                          ? 'حداقل مبلغ ۵۰,۰۰۰ تومان است'
                          : gatewayPayable > 0 && gatewayPayable < MIN_DONATION_AMOUNT
                          ? 'مبلغ درگاه نباید زیر ۵۰,۰۰۰ تومان باشد'
                          : gatewayPayable === 0
                          ? `پرداخت ${toFarsiDigits(totalAmount.toLocaleString('en-US'))} تومان از کیف پول`
                          : walletDeduction > 0
                          ? `پرداخت مابه‌التفاوت (${toFarsiDigits(gatewayPayable.toLocaleString('en-US'))} تومان)`
                          : `پرداخت آنلاین (${toFarsiDigits(totalAmount.toLocaleString('en-US'))} تومان)`}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardView: {
    width: '100%',
    maxWidth: 390,
    maxHeight: '90%',
  },
  modalCard: {
    backgroundColor: '#0d1520',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    maxHeight: '100%',
  },
  headerFixed: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  heartIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  modalTitle: { fontFamily: 'Ravi-Bold', fontSize: 13.5, color: '#ffffff' },
  donationBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  donationBadgeText: { fontFamily: 'Ravi-Bold', fontSize: 9, color: '#fbbf24' },
  movieTitleText: { fontFamily: 'Ravi-Regular', fontSize: 11, color: '#94a3b8', textAlign: 'right' },
  scrollBody: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
  },
  sectionBlock: { gap: 6 },
  labelRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  customAmountHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  minLimitNotice: {
    fontFamily: 'Ravi-Bold',
    fontSize: 9.5,
    color: '#fbbf24',
  },
  labelTitle: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#cbd5e1', textAlign: 'right' },
  presetsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  presetCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 9,
    gap: 2,
  },
  presetCardActive: { borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.15)' },
  presetTopRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  presetAmountText: { fontFamily: 'Ravi-Bold', fontSize: 13.5, color: '#cbd5e1' },
  presetAmountTextActive: { color: '#ffffff' },
  checkCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  currencyLabel: { fontFamily: 'Ravi-Regular', fontSize: 9.5, color: '#94a3b8', textAlign: 'right' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    borderRadius: 18,
    paddingHorizontal: 14,
  },
  inputField: {
    flex: 1,
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'Ravi-Bold',
    textAlign: 'right',
    paddingVertical: 10,
  },
  fixedCurrencyText: {
    color: '#f59e0b',
    fontSize: 13,
    fontFamily: 'Ravi-Bold',
    marginLeft: 8,
  },
  walletBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
    borderRadius: 14,
    padding: 10,
    marginTop: 2,
  },
  walletRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  walletMeta: { gap: 1 },
  walletTitle: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#ffffff', textAlign: 'right' },
  walletBalanceText: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#2dd4bf', textAlign: 'right' },
  breakdownCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 12,
    padding: 9,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  breakdownRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  breakdownLabel: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#94a3b8' },
  breakdownVal: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#ffffff' },
  footerFixed: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: '#080d14',
  },
  payBtn: {
    height: 46,
    backgroundColor: '#f59e0b',
    borderRadius: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payBtnDisabled: {
    opacity: 0.45,
  },
  payBtnText: { fontFamily: 'Ravi-Bold', fontSize: 12.5, color: '#030712' },
});