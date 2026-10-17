import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../src/api/axiosClient';

// تابع تبدیل امن ارقام فارسی و عربی به انگلیسی جهت جلوگیری از پاک شدن اعداد و صفرها
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

const toFarsiDigits = (num: number | string | undefined | null): string => {
  if (num === undefined || num === null) return '';
  const str = num.toString();
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (d) => farsiDigits[parseInt(d, 10)]);
};

const formatNumberWithCommas = (value: string | number): string => {
  if (!value) return '';
  const rawDigits = toEnglishDigits(value.toString());
  if (!rawDigits) return '';
  const separated = rawDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return toFarsiDigits(separated);
};

interface LedgerItem {
  id: string;
  amount: number;
  balanceAfter: number;
  entryType: number | string;
  description: string;
  targetType?: string;
  targetId?: string;
  targetTitle?: string;
  targetPosterUrl?: string;
  donationRole?: 'donor' | 'creator' | 'normal';
  createdAt: string;
}

interface WalletData {
  id: string;
  balance: number;
  isLocked: boolean;
  ledgers?: LedgerItem[];
  history?: LedgerItem[];
}

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000];

export default function WalletScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{
    status?: string;
    trackingCode?: string;
    amount?: string;
  }>();

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // استیت‌های مدال افزایش موجودی
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [rawAmount, setRawAmount] = useState<string>('');
  const [displayAmount, setDisplayAmount] = useState<string>('');
  const [charging, setCharging] = useState<boolean>(false);

  // استیت ارتفاع کیبورد برای بالا آوردن مدال در اندروید
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const inputRef = useRef<TextInput>(null);

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

  const fetchWallet = useCallback(async () => {
    try {
      const res = await api.get('/payments/wallet/me');
      if (res.data?.success || res.data?.data) {
        setWallet(res.data.data || res.data);
      }
    } catch (err: any) {
      console.error('Error fetching wallet:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  useEffect(() => {
    if (searchParams.status === 'success') {
      Alert.alert(
        'پرداخت موفق',
        `کیف پول با موفقیت شارژ شد.\nکد رهگیری: ${toFarsiDigits(searchParams.trackingCode || '-')}`
      );
      fetchWallet();
    } else if (searchParams.status === 'failed') {
      Alert.alert('پرداخت ناموفق', 'عملیات پرداخت بانکی انجام نشد یا توسط کاربر لغو گردید.');
    }
  }, [searchParams.status, searchParams.trackingCode, fetchWallet]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWallet();
  };

  const handleAmountChange = (text: string) => {
    const english = toEnglishDigits(text);
    const cleaned = english.replace(/^0+(?=\d)/, ''); // جلوگیری از صفرهای اضافه در ابتدا
    setRawAmount(cleaned);
    setDisplayAmount(formatNumberWithCommas(cleaned));
  };

  const handlePresetSelect = (preset: number) => {
    const str = preset.toString();
    setRawAmount(str);
    setDisplayAmount(formatNumberWithCommas(str));
  };

  const handleChargeSubmit = async () => {
    const numericAmount = parseInt(rawAmount, 10);
    if (!numericAmount || numericAmount < 50000) {
      Alert.alert('خطا', 'حداقل مبلغ شارژ 50,000 تومان می‌باشد.');
      return;
    }

    try {
      setCharging(true);
      const res = await api.post('/payments/charge-wallet', {
        amount: numericAmount,
        amountRials: numericAmount * 10,
      });

      if (res.data?.success && res.data?.paymentUrl) {
        setIsModalOpen(false);
        setRawAmount('');
        setDisplayAmount('');

        const bridgeUrl = `https://pershot.ir/payment/gateway?url=${encodeURIComponent(res.data.paymentUrl)}`;
        await Linking.openURL(bridgeUrl);
      } else {
        Alert.alert('خطا', res.data?.message || 'امکان اتصال به درگاه بانکی وجود ندارد.');
      }
    } catch (err: any) {
      Alert.alert('خطا', err.response?.data?.message || 'خطا در ارتباط با سرور.');
    } finally {
      setCharging(false);
    }
  };

  // هدایت دقیق به آدرس کمپین در اپلیکیشن: app/(screens)/campaigns/[id].tsx
  const handleItemPress = (item: LedgerItem) => {
    if (item.targetType === 'Campaign' && item.targetId) {
      router.push({
        pathname: '/(screens)/campaigns/[id]',
        params: { id: item.targetId },
      } as any);
    } else if (item.targetType === 'Movie' && item.targetId) {
      router.push(`/movie/${item.targetId}` as any);
    }
  };

  const getMediaUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `https://api.pershot.ir${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const transactions = wallet?.ledgers || wallet?.history || [];

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.loadingText}>در حال دریافت موجودی...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>کیف پول</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#14b8a6" />}
      >
        {/* کارت موجودی تمیز و خلوت */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>موجودی کیف پول شما</Text>

          <View style={styles.balanceRow}>
            <Text style={styles.balanceAmount}>
              {toFarsiDigits((wallet?.balance || 0).toLocaleString('en-US'))}
            </Text>
            <Text style={styles.currencyText}>تومان</Text>
          </View>

          <Text style={styles.cardDescription}>
            موجودی قابل استفاده جهت تماشای فیلم و حمایت از کمپین‌های سینمایی
          </Text>

          <TouchableOpacity
            style={styles.chargeButton}
            onPress={() => {
              setIsModalOpen(true);
              setTimeout(() => inputRef.current?.focus(), 250);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.chargeButtonText}>+ افزایش موجودی</Text>
          </TouchableOpacity>
        </View>

        {/* لیست تاریخچه تراکنش‌ها با پوستر و لینک کمپین */}
        <View style={styles.historySection}>
          <View style={styles.historyHeaderRow}>
            <Text style={styles.sectionTitle}>تراکنش‌های اخیر</Text>
            <Text style={styles.historyCountText}>{toFarsiDigits(transactions.length)} مورد</Text>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>هنوز تراکنشی ثبت نشده است.</Text>
            </View>
          ) : (
            transactions.map((tx, idx) => {
              const isPositive = Number(tx.amount) > 0;
              const hasPoster = !!tx.targetPosterUrl;
              const isCreator = tx.donationRole === 'creator';

              return (
                <TouchableOpacity
                  key={tx.id || idx}
                  onPress={() => handleItemPress(tx)}
                  disabled={!tx.targetId}
                  activeOpacity={tx.targetId ? 0.75 : 1}
                  style={[
                    styles.txItem,
                    idx === transactions.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={styles.txRight}>
                    {hasPoster ? (
                      <Image
                        source={{ uri: getMediaUrl(tx.targetPosterUrl) }}
                        style={styles.txPosterImage}
                      />
                    ) : (
                      <View style={[styles.txIconContainer, isPositive ? styles.depositBg : styles.withdrawBg]}>
                        <Text style={isPositive ? styles.depositArrow : styles.withdrawArrow}>
                          {isPositive ? '↓' : '↑'}
                        </Text>
                      </View>
                    )}

                    <View style={styles.txTextContainer}>
                      <View style={styles.titleWithBadgeRow}>
                        <Text style={styles.txTitle} numberOfLines={1}>
                          {tx.targetTitle || tx.description}
                        </Text>
                        {isCreator && (
                          <View style={styles.creatorBadge}>
                            <Text style={styles.creatorBadgeText}>ناشر اثر</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.txDate}>{toFarsiDigits(tx.createdAt)}</Text>
                    </View>
                  </View>

                  <View style={styles.txLeft}>
                    <Text style={[styles.txAmount, isPositive ? styles.depositColor : styles.withdrawColor]}>
                      {isPositive ? '+' : ''}
                      {toFarsiDigits(Math.abs(tx.amount).toLocaleString('en-US'))} تومان
                    </Text>
                    <Text style={styles.txBalanceAfter}>
                      مانده: {toFarsiDigits(Number(tx.balanceAfter || 0).toLocaleString('en-US'))} تومان
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* مدال شارژ با کیبورد هوشمند */}
      <Modal visible={isModalOpen} transparent animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={[
                styles.keyboardAvoidContainer,
                { paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 },
              ]}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalIndicator} />

                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>افزایش موجودی</Text>
                  <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.closeButton} activeOpacity={0.7}>
                    <Text style={styles.closeModalText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* ورودی مبلغ */}
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={inputRef}
                    style={styles.inputField}
                    placeholder="۰"
                    placeholderTextColor="#475569"
                    keyboardType="number-pad"
                    value={displayAmount}
                    onChangeText={handleAmountChange}
                  />
                  <Text style={styles.fixedCurrencyText}>تومان</Text>
                </View>

                {/* مبالغ پیشنهادی */}
                <View style={styles.presetsGrid}>
                  {PRESET_AMOUNTS.map((preset) => (
                    <TouchableOpacity
                      key={preset}
                      style={[styles.presetButton, rawAmount === preset.toString() && styles.presetButtonActive]}
                      onPress={() => handlePresetSelect(preset)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.presetText, rawAmount === preset.toString() && styles.presetTextActive]}>
                        {toFarsiDigits(preset.toLocaleString('en-US'))} تومان
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.paySubmitButton, charging && { opacity: 0.6 }]}
                  onPress={handleChargeSubmit}
                  disabled={charging}
                  activeOpacity={0.85}
                >
                  {charging ? (
                    <ActivityIndicator color="#030712" size="small" />
                  ) : (
                    <Text style={styles.paySubmitText}>
                      پرداخت بانکی {displayAmount ? `(${displayAmount} تومان)` : ''}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  centerContainer: { flex: 1, backgroundColor: '#030712', justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#94a3b8', fontSize: 14, fontFamily: 'RaviFa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: '#0d1520',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: { color: '#ffffff', fontSize: 22, fontWeight: 'bold' },
  headerTitle: { color: '#ffffff', fontSize: 19, fontWeight: '900', fontFamily: 'RaviFa' },
  scrollContent: { padding: 18, paddingBottom: 40 },
  balanceCard: {
    backgroundColor: '#0d1520',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.3)',
    marginBottom: 20,
    alignItems: 'center',
  },
  balanceLabel: { color: '#94a3b8', fontSize: 13, fontFamily: 'RaviFa', marginBottom: 4 },
  balanceRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 8, marginBottom: 8 },
  balanceAmount: { color: '#ffffff', fontSize: 38, fontWeight: '900', fontFamily: 'RaviFa' },
  currencyText: { color: '#14b8a6', fontSize: 16, fontWeight: 'bold', fontFamily: 'RaviFa' },
  cardDescription: { color: '#64748b', fontSize: 12, fontFamily: 'RaviFa', textAlign: 'center', marginBottom: 18 },
  chargeButton: { backgroundColor: '#14b8a6', paddingVertical: 14, borderRadius: 18, width: '100%', alignItems: 'center' },
  chargeButtonText: { color: '#030712', fontSize: 15, fontWeight: '900', fontFamily: 'RaviFa' },
  historySection: { backgroundColor: '#0d1520', borderRadius: 28, padding: 18, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  historyHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  sectionTitle: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', fontFamily: 'RaviFa' },
  historyCountText: { color: '#14b8a6', fontSize: 12, fontWeight: 'bold', fontFamily: 'RaviFa' },
  emptyContainer: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { color: '#64748b', fontSize: 13, fontFamily: 'RaviFa' },
  txItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  txRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, flex: 1 },
  txPosterImage: { width: 40, height: 54, borderRadius: 8, backgroundColor: '#1e293b' },
  txIconContainer: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  depositBg: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
  withdrawBg: { backgroundColor: 'rgba(244, 63, 94, 0.12)' },
  depositArrow: { color: '#10b981', fontSize: 16, fontWeight: 'bold' },
  withdrawArrow: { color: '#f43f5e', fontSize: 16, fontWeight: 'bold' },
  txTextContainer: { flex: 1, alignItems: 'flex-end' },
  titleWithBadgeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  txTitle: { color: '#ffffff', fontSize: 13, fontWeight: 'bold', fontFamily: 'RaviFa', textAlign: 'right', flexShrink: 1 },
  creatorBadge: { backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  creatorBadgeText: { color: '#f59e0b', fontSize: 10, fontWeight: 'bold', fontFamily: 'RaviFa' },
  txDate: { color: '#64748b', fontSize: 11, fontFamily: 'RaviFa', textAlign: 'right', marginTop: 3 },
  txLeft: { alignItems: 'flex-start', paddingLeft: 4 },
  txAmount: { fontSize: 13.5, fontWeight: '900', fontFamily: 'RaviFa' },
  depositColor: { color: '#10b981' },
  withdrawColor: { color: '#f43f5e' },
  txBalanceAfter: { color: '#64748b', fontSize: 10.5, fontFamily: 'RaviFa', marginTop: 3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'flex-end' },
  keyboardAvoidContainer: { width: '100%' },
  modalContent: {
    backgroundColor: '#0d1520',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalIndicator: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.2)', alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#ffffff', fontSize: 17, fontWeight: '900', fontFamily: 'RaviFa' },
  closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255, 255, 255, 0.05)', justifyContent: 'center', alignItems: 'center' },
  closeModalText: { color: '#94a3b8', fontSize: 15, fontWeight: 'bold' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.5,
    borderColor: '#14b8a6',
    borderRadius: 20,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputField: {
    flex: 1,
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'RaviFa',
    textAlign: 'right',
    paddingVertical: 12,
  },
  fixedCurrencyText: { color: '#14b8a6', fontSize: 14, fontWeight: 'bold', fontFamily: 'RaviFa', marginLeft: 8 },
  presetsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  presetButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: 'center',
  },
  presetButtonActive: { backgroundColor: 'rgba(20, 184, 166, 0.15)', borderColor: '#14b8a6' },
  presetText: { color: '#cbd5e1', fontSize: 12.5, fontWeight: 'bold', fontFamily: 'RaviFa' },
  presetTextActive: { color: '#14b8a6', fontWeight: '900' },
  paySubmitButton: { backgroundColor: '#14b8a6', paddingVertical: 15, borderRadius: 20, alignItems: 'center' },
  paySubmitText: { color: '#030712', fontSize: 15, fontWeight: '900', fontFamily: 'RaviFa' },
});