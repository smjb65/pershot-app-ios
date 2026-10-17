import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  ToastAndroid,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  Users,
  Search,
  UserPlus,
  Edit3,
  Ban,
  CheckCircle2,
  Shield,
  ShieldAlert,
  Eye,
  EyeOff,
  RefreshCw,
  UploadCloud,
  X,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  UserCheck,
  Check,
} from 'lucide-react-native';
import { api, getMediaUrl } from '../../../src/api/axiosClient';

interface UserItem {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  username: string;
  email: string;
  phoneNumber: string;
  bio: string;
  avatar?: string;
  avatarUrl?: string;
  role: string;
  roleCode: number;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ManageUsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  // استیت‌های مدال ایجاد و ویرایش
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phoneNumber: '',
    password: '',
    bio: '',
    avatarUrl: '',
  });

  const pageSize = 10;
  const myRoleCode = currentUser?.roleCode ?? currentUser?.RoleCode ?? 0;

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setCurrentUser(res.data);
    } catch (e) {
      console.log('Error fetching current user:', e);
    }
  };

  const fetchUsers = useCallback(async (pageNum: number, searchKeyword: string) => {
    try {
      setLoading(true);
      const res = await api.get('/profile/manage/users', {
        params: { page: pageNum, pageSize, search: searchKeyword },
      });
      setUsers(res.data?.items || res.data?.data?.items || []);
      setTotalCount(res.data?.totalCount || res.data?.data?.totalCount || 0);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در دریافت لیست کاربران');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(page, search);
    }, 400);
    return () => clearTimeout(timer);
  }, [page, search, fetchUsers]);

  // تولید خودکار رمز عبور قوی
  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let pwd = '';
    for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    setFormData((prev) => ({ ...prev, password: pwd }));
  };

  // انتخاب و آپلود آواتار
  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const fileUri = result.assets[0].uri;
        const filename = fileUri.split('/').pop() || 'avatar.jpg';

        const uploadData = new FormData();
        uploadData.append('file', {
          uri: fileUri,
          name: filename,
          type: 'image/jpeg',
        } as any);

        setIsAvatarUploading(true);
        const res = await api.post('/profile/avatar', uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const uploadedUrl = res.data?.avatarUrl || res.data?.data || res.data?.url;
        setFormData((prev) => ({ ...prev, avatarUrl: uploadedUrl }));
        showToast('تصویر با موفقیت آپلود شد');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'خطا در آپلود عکس');
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      id: '',
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      phoneNumber: '',
      password: '',
      bio: '',
      avatarUrl: '',
    });
    generatePassword();
    setIsEditMode(false);
    setIsUserModalOpen(true);
  };

  const openEditModal = (u: UserItem) => {
    setFormData({
      id: u.id,
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      username: u.username || '',
      email: u.email && u.email !== '-' ? u.email : '',
      phoneNumber: u.phoneNumber === '-' ? '' : u.phoneNumber,
      password: '',
      bio: u.bio || '',
      avatarUrl: u.avatarUrl || u.avatar || '',
    });
    setIsEditMode(true);
    setIsUserModalOpen(true);
  };

  const handleSubmitUser = async () => {
    if (!formData.firstName.trim()) {
      showToast('وارد کردن نام الزامی است');
      return;
    }
    if (!isEditMode && !formData.username.trim()) {
      showToast('وارد کردن نام کاربری الزامی است');
      return;
    }

    try {
      setIsSubmittingUser(true);
      const payload = { ...formData };

      if (isEditMode) {
        await api.put(`/profile/manage/users/${formData.id}/edit`, payload);
        showToast('اطلاعات کاربر با موفقیت ویرایش شد');
      } else {
        await api.post(`/profile/manage/users/create`, payload);
        showToast('کاربر جدید ایجاد شد');
      }

      setIsUserModalOpen(false);
      fetchUsers(page, search);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در ثبت اطلاعات کاربر');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleToggleBan = async (id: string) => {
    try {
      setActionId(id);
      await api.post(`/profile/manage/users/${id}/toggle-ban`);
      showToast('وضعیت مسدودسازی تغییر کرد');
      fetchUsers(page, search);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در انجام عملیات');
    } finally {
      setActionId(null);
    }
  };

  const handleRoleAction = async (id: string, actionUrl: string) => {
    try {
      setActionId(id);
      await api.post(`/profile/manage/users/${id}/role/${actionUrl}`);
      showToast('نقش کاربر تغییر یافت');
      fetchUsers(page, search);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'خطا در تغییر نقش');
    } finally {
      setActionId(null);
    }
  };

  const renderRoleBadge = (roleCode: number) => {
    switch (roleCode) {
      case 3:
        return (
          <View style={[styles.roleBadgeContainer, { backgroundColor: 'rgba(168, 85, 247, 0.15)', borderColor: 'rgba(168, 85, 247, 0.3)' }]}>
            <Text style={[styles.roleBadgeText, { color: '#c084fc' }]}>مالک (Owner)</Text>
          </View>
        );
      case 2:
        return (
          <View style={[styles.roleBadgeContainer, { backgroundColor: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)' }]}>
            <Text style={[styles.roleBadgeText, { color: '#818cf8' }]}>سوپر ادمین</Text>
          </View>
        );
      case 1:
        return (
          <View style={[styles.roleBadgeContainer, { backgroundColor: 'rgba(45, 212, 191, 0.15)', borderColor: 'rgba(45, 212, 191, 0.3)' }]}>
            <Text style={[styles.roleBadgeText, { color: '#2dd4bf' }]}>ادمین</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.roleBadgeContainer, { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
            <Text style={[styles.roleBadgeText, { color: '#94a3b8' }]}>کاربر عادی</Text>
          </View>
        );
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* هدر صفحه */}
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <View style={styles.headerIconBox}>
            <Users size={20} color="#6366f1" />
          </View>
          <View>
            <Text style={styles.headerTitle}>مدیریت کاربران</Text>
            <Text style={styles.headerSubtitle}>مشاهده و مدیریت جامع کاربران سیستم</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.backBtn} activeOpacity={0.7} onPress={() => router.back()}>
          <ChevronLeft size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* دکمه افزودن کاربر جدید (برای سوپرادمین به بالا) */}
        {myRoleCode >= 2 && (
          <TouchableOpacity style={styles.createUserBtn} activeOpacity={0.8} onPress={openCreateModal}>
            <UserPlus size={18} color="#ffffff" />
            <Text style={styles.createUserBtnText}>افزودن کاربر جدید</Text>
          </TouchableOpacity>
        )}

        {/* فیلد جستجو */}
        <View style={styles.searchBox}>
          <Search size={16} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="جستجو بر اساس نام، ایمیل، موبایل یا یوزرنیم..."
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={(val) => {
              setSearch(val);
              setPage(1);
            }}
          />
        </View>

        {/* لیست کاربران */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : users.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>موردی یافت نشد.</Text>
          </View>
        ) : (
          <View style={styles.usersList}>
            {users.map((u) => {
              const isSelf = currentUser?.id === u.id;
              const isOwner = myRoleCode === 3;
              const isSuperAdmin = myRoleCode === 2;
              const isProcessing = actionId === u.id;

              return (
                <View key={u.id} style={styles.userCard}>
                  {/* ردیف مشخصات کاربر */}
                  <View style={styles.userTopRow}>
                    <Image
                      source={{ uri: getMediaUrl(u.avatarUrl || u.avatar) }}
                      style={styles.avatar}
                      contentFit="cover"
                    />

                    <View style={styles.userMainInfo}>
                      <Text style={styles.userNameText}>{u.name || u.username}</Text>
                      <Text style={styles.userUsernameText}>@{u.username}</Text>

                      <View style={styles.badgeRow}>
                        {renderRoleBadge(u.roleCode)}
                        {!u.isActive && (
                          <View style={styles.banBadge}>
                            <Text style={styles.banBadgeText}>مسدود شده</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* اطلاعات تماس */}
                  <View style={styles.contactsBox}>
                    <View style={styles.contactItem}>
                      <Mail size={12} color="#94a3b8" />
                      <Text style={styles.contactText}>
                        {u.email && u.email !== '-' ? u.email : 'ایمیل ثبت نشده'}
                      </Text>
                      {u.isEmailVerified && <Check size={12} color="#10b981" />}
                    </View>

                    <View style={styles.contactItem}>
                      <Phone size={12} color="#94a3b8" />
                      <Text style={styles.contactText}>
                        {u.phoneNumber && u.phoneNumber !== '-' ? u.phoneNumber : 'موبایل ثبت نشده'}
                      </Text>
                    </View>
                  </View>

                  {/* ردیف دکمه‌های عملیاتی */}
                  <View style={styles.cardActionsRow}>
                    {isSelf ? (
                      <View style={styles.selfAccountBadge}>
                        <Text style={styles.selfAccountText}>حساب شما (غیرقابل ویرایش از اینجا)</Text>
                      </View>
                    ) : (
                      <View style={styles.actionsBtnGrid}>
                        {/* ۱. مشاهده پروفایل */}
                        <TouchableOpacity
                          style={styles.actionBtnSmall}
                          activeOpacity={0.75}
                          onPress={() => router.push(`/user/${u.id}` as any)}
                        >
                          <Eye size={14} color="#cbd5e1" />
                          <Text style={styles.actionBtnSmallText}>پروفایل</Text>
                        </TouchableOpacity>

                        {/* ۲. ویرایش */}
                        {(isOwner || isSuperAdmin) && (
                          <TouchableOpacity
                            style={[styles.actionBtnSmall, styles.editBtn]}
                            activeOpacity={0.75}
                            onPress={() => openEditModal(u)}
                          >
                            <Edit3 size={14} color="#60a5fa" />
                            <Text style={[styles.actionBtnSmallText, { color: '#60a5fa' }]}>ویرایش</Text>
                          </TouchableOpacity>
                        )}

                        {/* ۳. مسدود / فعال‌سازی */}
                        <TouchableOpacity
                          style={[
                            styles.actionBtnSmall,
                            u.isActive ? styles.banActionBtn : styles.unbanActionBtn,
                          ]}
                          activeOpacity={0.75}
                          disabled={isProcessing}
                          onPress={() => handleToggleBan(u.id)}
                        >
                          {u.isActive ? (
                            <>
                              <Ban size={14} color="#f43f5e" />
                              <Text style={[styles.actionBtnSmallText, { color: '#f43f5e' }]}>مسدود</Text>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={14} color="#10b981" />
                              <Text style={[styles.actionBtnSmallText, { color: '#10b981' }]}>فعال‌سازی</Text>
                            </>
                          )}
                        </TouchableOpacity>

                        {/* ۴. ارتقا یا عزل ادمین */}
                        {(isSuperAdmin || isOwner) && (
                          <TouchableOpacity
                            style={[styles.actionBtnSmall, styles.roleAdminBtn]}
                            activeOpacity={0.75}
                            disabled={isProcessing}
                            onPress={() =>
                              handleRoleAction(
                                u.id,
                                u.roleCode === 0 ? 'admin/promote' : 'admin/demote'
                              )
                            }
                          >
                            <Shield size={14} color="#2dd4bf" />
                            <Text style={[styles.actionBtnSmallText, { color: '#2dd4bf' }]}>
                              {u.roleCode === 0 ? '+ ادمین' : '- عزل ادمین'}
                            </Text>
                          </TouchableOpacity>
                        )}

                        {/* ۵. ارتقا یا عزل سوپرادمین */}
                        {isOwner && (
                          <TouchableOpacity
                            style={[styles.actionBtnSmall, styles.roleSuperBtn]}
                            activeOpacity={0.75}
                            disabled={isProcessing}
                            onPress={() =>
                              handleRoleAction(
                                u.id,
                                u.roleCode === 1 ? 'superadmin/promote' : 'superadmin/demote'
                              )
                            }
                          >
                            <ShieldAlert size={14} color="#a78bfa" />
                            <Text style={[styles.actionBtnSmallText, { color: '#a78bfa' }]}>
                              {u.roleCode === 1 ? '+ سوپر' : '- عزل سوپر'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {/* پیجینشن */}
            {totalPages > 1 && (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  style={[styles.pageBtn, page >= totalPages && styles.disabledPageBtn]}
                  disabled={page >= totalPages}
                  onPress={() => setPage((p) => Math.min(p + 1, totalPages))}
                >
                  <ChevronLeft size={16} color={page >= totalPages ? '#475569' : '#ffffff'} />
                  <Text style={[styles.pageBtnText, page >= totalPages && styles.disabledPageText]}>
                    بعدی
                  </Text>
                </TouchableOpacity>

                <Text style={styles.pageInfoText}>
                  صفحه {page} از {totalPages}
                </Text>

                <TouchableOpacity
                  style={[styles.pageBtn, page <= 1 && styles.disabledPageBtn]}
                  disabled={page <= 1}
                  onPress={() => setPage((p) => Math.max(p - 1, 1))}
                >
                  <Text style={[styles.pageBtnText, page <= 1 && styles.disabledPageText]}>
                    قبلی
                  </Text>
                  <ChevronRight size={16} color={page <= 1 ? '#475569' : '#ffffff'} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* 🟢 مدال ایجاد / ویرایش کاربر */}
      {isUserModalOpen && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalKeyboardBox}
            >
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalHeaderTitle}>
                    {isEditMode ? 'ویرایش اطلاعات کاربر' : 'ایجاد کاربر جدید'}
                  </Text>
                  <TouchableOpacity onPress={() => setIsUserModalOpen(false)}>
                    <X size={20} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                  {/* آپلود تصویر آواتار */}
                  <View style={styles.avatarUploadCenter}>
                    <TouchableOpacity
                      style={styles.avatarCirclePicker}
                      activeOpacity={0.8}
                      onPress={handlePickAvatar}
                    >
                      {formData.avatarUrl ? (
                        <Image
                          source={{ uri: getMediaUrl(formData.avatarUrl) }}
                          style={styles.modalAvatarImage}
                          contentFit="cover"
                        />
                      ) : (
                        <UploadCloud size={28} color="#6366f1" />
                      )}
                      {isAvatarUploading && (
                        <View style={styles.avatarLoadingOverlay}>
                          <ActivityIndicator size="small" color="#6366f1" />
                        </View>
                      )}
                    </TouchableOpacity>
                    <Text style={styles.avatarPickerNote}>برای تغییر تصویر لمس کنید</Text>
                  </View>

                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>نام *</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={formData.firstName}
                        onChangeText={(val) => setFormData((p) => ({ ...p, firstName: val }))}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>نام خانوادگی</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={formData.lastName}
                        onChangeText={(val) => setFormData((p) => ({ ...p, lastName: val }))}
                      />
                    </View>
                  </View>

                  {!isEditMode && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>نام کاربری (الزامی و یکتا) *</Text>
                      <TextInput
                        style={[styles.modalInput, styles.ltrInput]}
                        value={formData.username}
                        onChangeText={(val) => setFormData((p) => ({ ...p, username: val }))}
                        autoCapitalize="none"
                      />
                    </View>
                  )}

                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>ایمیل</Text>
                      <TextInput
                        style={[styles.modalInput, styles.ltrInput]}
                        keyboardType="email-address"
                        value={formData.email}
                        onChangeText={(val) => setFormData((p) => ({ ...p, email: val }))}
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>موبایل</Text>
                      <TextInput
                        style={[styles.modalInput, styles.ltrInput]}
                        keyboardType="phone-pad"
                        placeholder="09..."
                        placeholderTextColor="#64748b"
                        value={formData.phoneNumber}
                        onChangeText={(val) => setFormData((p) => ({ ...p, phoneNumber: val }))}
                      />
                    </View>
                  </View>

                  {/* رمز عبور */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      رمز عبور {isEditMode && '(برای عدم تغییر، خالی بگذارید)'}
                    </Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={[styles.modalInput, styles.ltrInput, { flex: 1 }]}
                        secureTextEntry={!showPassword}
                        placeholder={isEditMode ? '********' : 'رمز عبور'}
                        placeholderTextColor="#64748b"
                        value={formData.password}
                        onChangeText={(val) => setFormData((p) => ({ ...p, password: val }))}
                      />
                      <TouchableOpacity
                        style={styles.pwdIconBtn}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.pwdIconBtn} onPress={generatePassword}>
                        <RefreshCw size={16} color="#a78bfa" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* بیوگرافی */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>بیوگرافی</Text>
                    <TextInput
                      style={[styles.modalInput, styles.bioInput]}
                      multiline
                      numberOfLines={3}
                      value={formData.bio}
                      onChangeText={(val) => setFormData((p) => ({ ...p, bio: val }))}
                    />
                  </View>

                  {/* دکمه ثبت */}
                  <TouchableOpacity
                    style={[styles.submitUserBtn, (isSubmittingUser || isAvatarUploading) && styles.disabledBtn]}
                    activeOpacity={0.8}
                    disabled={isSubmittingUser || isAvatarUploading}
                    onPress={handleSubmitUser}
                  >
                    {isSubmittingUser ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.submitUserBtnText}>
                        {isEditMode ? 'ذخیره تغییرات' : 'ایجاد کاربر'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  scrollContent: { paddingBottom: 40 },
  centerContainer: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: 'Ravi-Regular', fontSize: 12, color: '#64748b' },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(13, 21, 32, 0.85)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: 'Ravi-Bold', fontSize: 13.5, color: '#ffffff' },
  headerSubtitle: { fontFamily: 'Ravi-Regular', fontSize: 10, color: '#94a3b8', textAlign: 'right' },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createUserBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 16,
    height: 44,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 6,
  },
  createUserBtnText: { fontFamily: 'Ravi-Bold', fontSize: 12.5, color: '#ffffff' },
  searchBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: { flex: 1, fontFamily: 'Ravi-Regular', fontSize: 12, color: '#ffffff', textAlign: 'right' },
  usersList: { paddingHorizontal: 16, gap: 12 },
  userCard: {
    backgroundColor: '#0d1520',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
    gap: 10,
  },
  userTopRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#030712' },
  userMainInfo: { flex: 1, gap: 2 },
  userNameText: { fontFamily: 'Ravi-Bold', fontSize: 13, color: '#ffffff', textAlign: 'right' },
  userUsernameText: { fontFamily: 'monospace', fontSize: 10, color: '#64748b', textAlign: 'right' },
  badgeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 4 },
  roleBadgeContainer: { borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  roleBadgeText: { fontFamily: 'Ravi-Bold', fontSize: 9 },
  banBadge: { backgroundColor: 'rgba(244, 63, 94, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  banBadgeText: { fontFamily: 'Ravi-Bold', fontSize: 9, color: '#f43f5e' },
  contactsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    padding: 8,
    gap: 6,
  },
  contactItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  contactText: { fontFamily: 'monospace', fontSize: 10, color: '#cbd5e1' },
  cardActionsRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
  },
  selfAccountBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  selfAccountText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#fbbf24' },
  actionsBtnGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  actionBtnSmall: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnSmallText: { fontFamily: 'Ravi-Bold', fontSize: 10, color: '#cbd5e1' },
  editBtn: { backgroundColor: 'rgba(96, 165, 250, 0.1)', borderColor: 'rgba(96, 165, 250, 0.25)' },
  banActionBtn: { backgroundColor: 'rgba(244, 63, 94, 0.1)', borderColor: 'rgba(244, 63, 94, 0.25)' },
  unbanActionBtn: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.25)' },
  roleAdminBtn: { backgroundColor: 'rgba(45, 212, 191, 0.1)', borderColor: 'rgba(45, 212, 191, 0.25)' },
  roleSuperBtn: { backgroundColor: 'rgba(167, 139, 250, 0.1)', borderColor: 'rgba(167, 139, 250, 0.25)' },
  paginationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingVertical: 12,
  },
  pageBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  disabledPageBtn: { opacity: 0.3 },
  pageBtnText: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#ffffff' },
  disabledPageText: { color: '#475569' },
  pageInfoText: { fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalKeyboardBox: { width: '100%', maxWidth: 360 },
  modalCard: {
    backgroundColor: '#0c1222',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 18,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 10,
    marginBottom: 12,
  },
  modalHeaderTitle: { fontFamily: 'Ravi-Bold', fontSize: 13.5, color: '#ffffff' },
  modalScroll: { maxHeight: 420 },
  avatarUploadCenter: { alignItems: 'center', marginBottom: 12, gap: 4 },
  avatarCirclePicker: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(99, 102, 241, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  modalAvatarImage: { width: '100%', height: '100%' },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 18, 34, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPickerNote: { fontFamily: 'Ravi-Regular', fontSize: 9.5, color: '#94a3b8' },
  inputGroup: { marginBottom: 10 },
  inputRow: { flexDirection: 'row-reverse', gap: 8 },
  inputLabel: { fontFamily: 'Ravi-Bold', fontSize: 10.5, color: '#94a3b8', marginBottom: 4, textAlign: 'right' },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: 'Ravi-Regular',
    fontSize: 11.5,
    color: '#ffffff',
    textAlign: 'right',
  },
  ltrInput: { textAlign: 'left', fontFamily: 'monospace' },
  bioInput: { height: 60, textAlignVertical: 'top' },
  passwordContainer: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  pwdIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitUserBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 14,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitUserBtnText: { fontFamily: 'Ravi-Bold', fontSize: 12, color: '#ffffff' },
  disabledBtn: { opacity: 0.5 },
});