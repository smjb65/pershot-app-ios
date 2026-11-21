import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Svg, { Path } from 'react-native-svg';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  X,
  CheckSquare,
  Square,
} from 'lucide-react-native';
import { api } from '../../src/api/axiosClient';
import { useAuthStore } from '../../src/store/authStore';

const { width } = Dimensions.get('window');

type AuthView = 'login' | 'register' | 'otp_request' | 'otp_verify';

const GoogleIcon = () => (
  <Svg viewBox="0 0 24 24" width={18} height={18}>
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </Svg>
);

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const loginToStore = useAuthStore((state) => state.login);

  const [view, setView] = useState<AuthView>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [otpType, setOtpType] = useState<'phone' | 'email' | null>(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpPurpose, setOtpPurpose] = useState<'login' | 'register'>('login');
  const otpInputsRef = useRef<Array<TextInput | null>>([]);

  const [errorMsg, setErrorMsg] = useState('');
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  // اگر از Google Cloud Console شناسه iOS Client ID ساختید اینجا بگذارید؛ در غیر این صورت خالی بماند تا روی iOS کرش نکند
  const IOS_GOOGLE_CLIENT_ID = '';
  const SHOW_GOOGLE_LOGIN = Platform.OS === 'android' || Boolean(IOS_GOOGLE_CLIENT_ID);

  useEffect(() => {
    if (!SHOW_GOOGLE_LOGIN) return;
    try {
      GoogleSignin.configure({
        scopes: ['email', 'profile'],
        webClientId: '237503344790-c0934o37bu1eio7afvnmlfnlpfqib4ap.apps.googleusercontent.com',
        ...(Platform.OS === 'ios' && IOS_GOOGLE_CLIENT_ID ? { iosClientId: IOS_GOOGLE_CLIENT_ID } : {}),
        offlineAccess: false,
      });
    } catch { }
  }, []);

  const videoSource = require('../../assets/videos/cinema-bg.mp4');
  const videoPlayer = useVideoPlayer(videoSource, (player) => {
    player.loop = true;
    player.muted = true;
  });

  useEffect(() => {
    if (videoPlayer) {
      videoPlayer.play();
    }
  }, [videoPlayer]);

  const handleAuthSuccess = async (token: string, userData?: any) => {
    await loginToStore(token, userData || { id: '', name: contact, username: contact, avatar: '' });
    router.replace('/(tabs)');
  };

  const validateContact = (val: string) => {
    const phoneRegex = /^09\d{9}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (phoneRegex.test(val)) return 'phone';
    if (emailRegex.test(val)) return 'email';
    return 'invalid';
  };

  const handlePasswordLogin = async () => {
    if (!contact.trim() || !password.trim()) {
      setErrorMsg('لطفاً مشخصات حساب را کامل وارد کنید.');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', { contact: contact.trim(), password });
      const token = res.data?.token || res.data?.data?.token;
      if (token) {
        await handleAuthSuccess(token, res.data?.user || res.data?.data?.user);
      } else {
        setErrorMsg(res.data?.message || 'ایمیل/شماره موبایل یا رمز عبور اشتباه است.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'اطلاعات وارد شده نامعتبر است.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      try {
        await GoogleSignin.signOut();
      } catch { }

      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken || (signInResult as any).idToken;
      if (!idToken) {
        throw new Error('توکن گوگل دریافت نشد.');
      }

      const res = await api.post('/auth/google', { idToken, token: idToken });
      const token = res.data?.token || res.data?.data?.token;
      if (token) {
        await handleAuthSuccess(token, res.data?.user || res.data?.data?.user);
      } else {
        setErrorMsg(res.data?.message || 'ورود با گوگل ناموفق بود.');
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // انصراف کاربر
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setErrorMsg('سرویس گوگل پلی در دسترس نیست.');
      } else {
        setErrorMsg(error.response?.data?.message || error.message || 'خطا در ورود با گوگل');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpRequest = async (purpose: 'login' | 'register') => {
    const type = validateContact(contact.trim());
    if (type === 'invalid') {
      setErrorMsg('فرمت شماره موبایل (مثال: 09123456789) یا ایمیل نامعتبر است.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      await api.post('/auth/send-otp', { contact: contact.trim(), purpose });
      setOtpType(type);
      setOtpPurpose(purpose);
      setView('otp_verify');
    } catch (err: any) {
      const serverMsg = err.response?.data?.message || '';
      if (purpose === 'login') {
        if (
          err.response?.status === 400 ||
          err.response?.status === 404 ||
          serverMsg.includes('یافت نشد') ||
          serverMsg.includes('NotFound')
        ) {
          setErrorMsg('شماره شما در سامانه موجود نمی باشد ابتدا ثبت نام کنید');
        } else {
          setErrorMsg(serverMsg || 'شماره شما در سامانه موجود نمی باشد ابتدا ثبت نام کنید');
        }
      } else {
        setErrorMsg(serverMsg || 'خطا در ارسال کد یک‌بار مصرف');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterInit = async () => {
    if (!firstName.trim() || !lastName.trim() || !contact.trim() || !password.trim() || !confirmPassword.trim()) {
      setErrorMsg('لطفاً همه فیلدهای ثبت‌نام را پر کنید.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('رمز عبور و تکرار آن یکسان نیستند.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('رمز عبور باید حداقل ۶ کاراکتر باشد.');
      return;
    }
    if (!acceptTerms) {
      setErrorMsg('پذیرش شرایط و قوانین پلتفرم الزامی است.');
      return;
    }
    await handleOtpRequest('register');
  };

  const handleOtpVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setErrorMsg('لطفاً کد ۶ رقمی را کامل وارد کنید.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      let res;
      if (otpPurpose === 'register') {
        res = await api.post('/auth/register', {
          contact: contact.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          otp: otpCode,
        });
      } else {
        res = await api.post('/auth/verify-otp', {
          contact: contact.trim(),
          otpCode,
        });
      }

      const token = res.data?.token || res.data?.data?.token;
      if (token) {
        await handleAuthSuccess(token, res.data?.user || res.data?.data?.user);
      } else {
        setErrorMsg(res.data?.message || 'کد تایید معتبر نیست.');
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.message || '';
      if (otpPurpose === 'login' && (serverMsg.includes('یافت نشد') || err.response?.status === 404)) {
        setErrorMsg('شماره شما در سامانه موجود نمی باشد ابتدا ثبت نام کنید');
      } else {
        setErrorMsg(serverMsg || 'کد وارد شده اشتباه یا منقضی شده است.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* پس‌زمینه ویدیو و گرادینت تاریک */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <VideoView
          player={videoPlayer}
          style={StyleSheet.absoluteFill}
          nativeControls={false}
          contentFit="cover"
        />
        <LinearGradient
          colors={['rgba(3, 7, 18, 0.4)', 'rgba(3, 7, 18, 0.75)', '#030712']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* کانتینر مدیریت هوشمند ارتفاع کیبورد برای iOS و اندروید */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 20,
              paddingBottom: insets.bottom + 40,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.brandBox}>
            <Text numberOfLines={1} ellipsizeMode="clip" style={styles.brandTitle}>Pershot</Text>
            <Text numberOfLines={1} ellipsizeMode="clip" style={styles.brandSubtitle}>سینمای مستقل، فراتر از مرزها</Text>
          </View>

          {(view === 'login' || view === 'register') && (
            <View style={styles.tabSwitcher}>
              <TouchableOpacity
                style={[styles.switchBtn, view === 'login' && styles.switchBtnActive]}
                activeOpacity={0.8}
                onPress={() => {
                  setView('login');
                  setErrorMsg('');
                }}
              >
                <Text numberOfLines={1} ellipsizeMode="clip" style={[styles.switchBtnText, view === 'login' && styles.switchBtnTextActive]}>ورود</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.switchBtn, view === 'register' && styles.switchBtnActive]}
                activeOpacity={0.8}
                onPress={() => {
                  setView('register');
                  setErrorMsg('');
                }}
              >
                <Text numberOfLines={1} ellipsizeMode="clip" style={[styles.switchBtnText, view === 'register' && styles.switchBtnTextActive]}>ثبت‌نام</Text>
              </TouchableOpacity>
            </View>
          )}

          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          ) : null}

          {view === 'login' && (
            <View style={styles.formContainer}>
              <View style={styles.inputCard}>
                <TextInput
                  placeholder="ایمیل یا شماره موبایل"
                  placeholderTextColor="#64748b"
                  value={contact}
                  onChangeText={setContact}
                  style={styles.textInput}
                  autoCapitalize="none"
                />
                <Mail size={18} color="#64748b" />
              </View>

              <View style={styles.inputCard}>
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                </TouchableOpacity>
                <TextInput
                  placeholder="رمز عبور"
                  placeholderTextColor="#64748b"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  style={[styles.textInput, { textAlign: 'right' }]}
                />
                <Lock size={18} color="#64748b" />
              </View>

              <TouchableOpacity
                style={styles.otpLink}
                activeOpacity={0.8}
                onPress={() => {
                  setView('otp_request');
                  setErrorMsg('');
                }}
              >
                <Text numberOfLines={1} ellipsizeMode="clip" style={styles.otpLinkText}>ورود با کد یک‌بار مصرف</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mainButton, isLoading && styles.btnDisabled]}
                disabled={isLoading}
                activeOpacity={0.85}
                onPress={handlePasswordLogin}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#030712" />
                ) : (
                  <Text numberOfLines={1} ellipsizeMode="clip" style={styles.mainButtonText}>ورود به حساب</Text>
                )}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <View style={styles.dividerTextWrapper}>
                  <Text numberOfLines={1} ellipsizeMode="clip" style={styles.dividerText}>یا</Text>
                </View>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.googleBtn}
                activeOpacity={0.8}
                onPress={handleGoogleLogin}
              >
                <View style={styles.googleBtnInner}>
                  <View style={styles.googleIconBox}>
                    <GoogleIcon />
                  </View>
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="clip"
                    style={styles.googleBtnText}
                  >
                    ورود با گوگل
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {view === 'register' && (
            <View style={styles.formContainer}>
              {/* ترتیب فیلدها: ابتدا نام و سپس نام خانوادگی */}
              <View style={styles.rowInputs}>
                <View style={[styles.inputCard, { flex: 1 }]}>
                  <TextInput
                    placeholder="نام"
                    placeholderTextColor="#64748b"
                    value={firstName}
                    onChangeText={setFirstName}
                    style={styles.textInput}
                  />
                </View>
                <View style={[styles.inputCard, { flex: 1 }]}>
                  <TextInput
                    placeholder="نام خانوادگی"
                    placeholderTextColor="#64748b"
                    value={lastName}
                    onChangeText={setLastName}
                    style={styles.textInput}
                  />
                </View>
              </View>

              <View style={styles.inputCard}>
                <TextInput
                  placeholder="ایمیل یا شماره موبایل"
                  placeholderTextColor="#64748b"
                  value={contact}
                  onChangeText={setContact}
                  style={styles.textInput}
                  autoCapitalize="none"
                />
                <Mail size={18} color="#64748b" />
              </View>

              <View style={styles.inputCard}>
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                </TouchableOpacity>
                <TextInput
                  placeholder="رمز عبور دلخواه"
                  placeholderTextColor="#64748b"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  style={[styles.textInput, { textAlign: 'right' }]}
                />
                <Lock size={18} color="#64748b" />
              </View>

              {/* فیلد تکرار رمز عبور */}
              <View style={styles.inputCard}>
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                </TouchableOpacity>
                <TextInput
                  placeholder="تکرار رمز عبور"
                  placeholderTextColor="#64748b"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  style={[styles.textInput, { textAlign: 'right' }]}
                />
                <Lock size={18} color="#64748b" />
              </View>

              <TouchableOpacity
                style={styles.termsBox}
                activeOpacity={0.8}
                onPress={() => setAcceptTerms(!acceptTerms)}
              >
                <Text style={styles.termsText}>
                  با{' '}
                  <Text style={styles.termsLink} onPress={() => setIsTermsModalOpen(true)}>
                    قوانین و مقررات
                  </Text>{' '}
                  پرشات موافقم.
                </Text>
                {acceptTerms ? <CheckSquare size={18} color="#14b8a6" /> : <Square size={18} color="#64748b" />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mainButton, isLoading && styles.btnDisabled]}
                disabled={isLoading}
                activeOpacity={0.85}
                onPress={handleRegisterInit}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#030712" />
                ) : (
                  <Text numberOfLines={1} ellipsizeMode="clip" style={styles.mainButtonText}>ثبت‌نام و دریافت کد</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {view === 'otp_request' && (
            <View style={styles.formContainer}>
              <TouchableOpacity style={styles.backLink} onPress={() => setView('login')}>
                <Text numberOfLines={1} ellipsizeMode="clip" style={styles.backLinkText}>بازگشت به ورود با رمز</Text>
                <ArrowRight size={16} color="#94a3b8" />
              </TouchableOpacity>

              <Text numberOfLines={1} ellipsizeMode="clip" style={styles.otpHeaderTitle}>کد یک‌بار مصرف</Text>
              <Text numberOfLines={1} ellipsizeMode="clip" style={styles.otpHeaderDesc}>شماره موبایل یا ایمیل خود را برای ورود وارد کنید.</Text>

              <View style={styles.inputCard}>
                <TextInput
                  placeholder="موبایل (مثال: 0912...) یا ایمیل"
                  placeholderTextColor="#64748b"
                  value={contact}
                  onChangeText={setContact}
                  style={styles.textInput}
                  autoCapitalize="none"
                />
                <Mail size={18} color="#64748b" />
              </View>

              <TouchableOpacity
                style={[styles.mainButton, (isLoading || !contact.trim()) && styles.btnDisabled]}
                disabled={isLoading || !contact.trim()}
                activeOpacity={0.85}
                onPress={() => handleOtpRequest('login')}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#030712" />
                ) : (
                  <Text numberOfLines={1} ellipsizeMode="clip" style={styles.mainButtonText}>دریافت کد تایید</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {view === 'otp_verify' && (
            <View style={styles.formContainer}>
              <TouchableOpacity
                style={styles.backLink}
                onPress={() => setView(otpPurpose === 'register' ? 'register' : 'otp_request')}
              >
                <Text numberOfLines={1} ellipsizeMode="clip" style={styles.backLinkText}>اصلاح {otpType === 'phone' ? 'شماره' : 'ایمیل'}</Text>
                <ArrowRight size={16} color="#94a3b8" />
              </TouchableOpacity>

              <Text numberOfLines={1} ellipsizeMode="clip" style={styles.otpHeaderTitle}>تایید هویت</Text>
              <Text numberOfLines={1} ellipsizeMode="clip" style={styles.otpHeaderDesc}>
                کد ۶ رقمی ارسال شده به <Text style={styles.highlightText}>{contact}</Text> را وارد کنید.
              </Text>

              <View style={styles.otpBoxesRow}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(el) => (otpInputsRef.current[index] = el)}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(val) => handleOtpChange(index, val)}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
                        otpInputsRef.current[index - 1]?.focus();
                      }
                    }}
                    style={styles.otpSingleBox}
                  />
                ))}
              </View>

              <TouchableOpacity style={styles.resendBtn} onPress={() => handleOtpRequest(otpPurpose)}>
                <Text numberOfLines={1} ellipsizeMode="clip" style={styles.resendBtnText}>ارسال مجدد کد</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mainButton, (isLoading || otp.some((d) => !d)) && styles.btnDisabled]}
                disabled={isLoading || otp.some((d) => !d)}
                activeOpacity={0.85}
                onPress={handleOtpVerify}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#030712" />
                ) : (
                  <Text numberOfLines={1} ellipsizeMode="clip" style={styles.mainButtonText}>تایید و ورود</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={isTermsModalOpen} transparent animationType="fade" onRequestClose={() => setIsTermsModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsTermsModalOpen(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>قوانین و مقررات پرشات</Text>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.termsParagraph}>
                به پلتفرم استریم و کرودفاندینگ سینمای مستقل پرشات خوش آمدید. استفاده از خدمات ما به معنای پذیرش شرایط زیر است:
              </Text>
              <Text style={styles.termsHeading}>۱. حریم خصوصی</Text>
              <Text style={styles.termsParagraph}>
                اطلاعات شخصی شما نزد پرشات محفوظ بوده و در اختیار هیچ شخص ثالثی قرار نخواهد گرفت.
              </Text>
              <Text style={styles.termsHeading}>۲. حقوق مالکیت معنوی</Text>
              <Text style={styles.termsParagraph}>
                تمامی آثار و ویدیوها متعلق به سازندگان و تهیه‌کنندگان اثر است و هرگونه کپی‌برداری غیرمجاز پیگرد قانونی دارد.
              </Text>
            </ScrollView>

            <TouchableOpacity style={styles.modalActionBtn} onPress={() => setIsTermsModalOpen(false)}>
              <Text style={styles.modalActionBtnText}>متوجه شدم</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#030712',
  },
  keyboardView: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  brandBox: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  brandTitle: {
    fontFamily: 'Ravi-Black',
    fontSize: 38,
    color: '#2dd4bf',
    width: '100%',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 52,
  },
  brandSubtitle: {
    fontFamily: 'Ravi-Regular',
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    width: '100%',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 22,
  },
  tabSwitcher: {
    flexDirection: 'row-reverse',
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 18,
  },
  switchBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  switchBtnActive: {
    backgroundColor: '#1e293b',
  },
  switchBtnText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 13,
    color: '#64748b',
    width: '100%',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 22,
  },
  switchBtnTextActive: {
    color: '#2dd4bf',
  },
  errorBanner: {
    width: '100%',
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  errorBannerText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11,
    color: '#fb7185',
    textAlign: 'right',
    width: '100%',
    includeFontPadding: false,
    lineHeight: 18,
  },
  formContainer: {
    width: '100%',
    gap: 12,
  },
  rowInputs: {
    flexDirection: 'row-reverse',
    gap: 10,
    width: '100%',
  },
  inputCard: {
    width: '100%',
    height: 52,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'Ravi-Regular',
    fontSize: 13,
    color: '#ffffff',
    textAlign: 'right',
    includeFontPadding: false,
  },
  otpLink: {
    width: '100%',
    marginTop: -2,
  },
  otpLinkText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11.5,
    color: '#2dd4bf',
    textAlign: 'right',
    width: '100%',
    includeFontPadding: false,
    lineHeight: 20,
  },
  mainButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  mainButtonText: {
    fontFamily: 'Ravi-Black',
    fontSize: 14,
    color: '#030712',
    width: '100%',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 24,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  dividerTextWrapper: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
  },
  dividerText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 12,
    color: '#64748b',
    includeFontPadding: false,
    textAlign: 'center',
    lineHeight: 18,
  },
  googleBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  googleIconBox: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 13,
    color: '#ffffff',
    includeFontPadding: false,
    textAlign: 'center',
    paddingHorizontal: 4,
    lineHeight: 22,
  },
  termsBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    width: '100%',
    gap: 8,
    marginTop: 2,
  },
  termsText: {
    flex: 1,
    fontFamily: 'Ravi-Regular',
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'right',
    includeFontPadding: false,
    lineHeight: 20,
  },
  termsLink: {
    color: '#2dd4bf',
    fontFamily: 'Ravi-Bold',
    includeFontPadding: false,
  },
  backLink: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    alignSelf: 'flex-end',
  },
  backLinkText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11,
    color: '#94a3b8',
    includeFontPadding: false,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  otpHeaderTitle: {
    fontFamily: 'Ravi-Black',
    fontSize: 20,
    color: '#ffffff',
    width: '100%',
    textAlign: 'right',
    includeFontPadding: false,
    lineHeight: 30,
  },
  otpHeaderDesc: {
    fontFamily: 'Ravi-Regular',
    fontSize: 12,
    color: '#94a3b8',
    width: '100%',
    textAlign: 'right',
    lineHeight: 22,
    includeFontPadding: false,
  },
  highlightText: {
    color: '#2dd4bf',
    fontFamily: 'Ravi-Bold',
    includeFontPadding: false,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 10,
  },
  otpSingleBox: {
    width: (width - 96) / 6,
    height: 56,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    textAlign: 'center',
    fontSize: 20,
    fontFamily: 'Ravi-Bold',
    color: '#2dd4bf',
    includeFontPadding: false,
  },
  resendBtn: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 6,
  },
  resendBtnText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11,
    color: '#64748b',
    width: '100%',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 12,
  },
  modalTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 14,
    color: '#ffffff',
    includeFontPadding: false,
    textAlign: 'right',
  },
  modalBody: {
    marginVertical: 14,
  },
  termsHeading: {
    fontFamily: 'Ravi-Bold',
    fontSize: 13,
    color: '#2dd4bf',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'right',
    width: '100%',
    includeFontPadding: false,
    lineHeight: 20,
  },
  termsParagraph: {
    fontFamily: 'Ravi-Regular',
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 22,
    textAlign: 'right',
    width: '100%',
    includeFontPadding: false,
  },
  modalActionBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    width: '100%',
  },
  modalActionBtnText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 13,
    color: '#030712',
    width: '100%',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 20,
  },
});