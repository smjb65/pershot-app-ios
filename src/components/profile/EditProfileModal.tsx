import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { X, UploadCloud, User } from 'lucide-react-native';
import { api, getMediaUrl } from '../../api/axiosClient';
import { DeviceEventEmitter } from 'react-native';

interface EditProfileModalProps {
  profile: any;
  onClose: () => void;
  onSuccess: (updatedProfile: any) => void;
}

export default function EditProfileModal({ profile, onClose, onSuccess }: EditProfileModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [editForm, setEditForm] = useState({
    name: profile?.name || profile?.firstName || '',
    username: (profile?.username || profile?.userName || '').toLowerCase().trim(),
    bio: profile?.bio || '',
    avatar: profile?.avatar || profile?.avatarUrl || '',
  });

  const handleAvatarPick = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setErrorMsg('دسترسی به گالری تصاویر تایید نشد.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const filename = asset.uri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const fileType = match ? `image/${match[1]}` : 'image/jpeg';

      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: filename,
        type: fileType,
      } as any);

      setIsAvatarUploading(true);
      setErrorMsg('');

      const res = await api.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success || res.data?.avatarUrl || res.data?.data) {
        const uploadedUrl = res.data.avatarUrl || res.data.data;
        setEditForm((prev) => ({ ...prev, avatar: uploadedUrl }));
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'خطا در آپلود تصویر آواتار');
    } finally {
      setIsAvatarUploading(false);
    }
  };

  // 🟢 فیلتر آنی: حذف فاصله‌ها و کاراکترهای غیر انگلیسی
  const handleUsernameChange = (val: string) => {
    const cleaned = val.replace(/\s+/g, '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    setEditForm((prev) => ({ ...prev, username: cleaned }));
  };

  const handleSubmit = async () => {
    const trimmedName = editForm.name.trim();
    const cleanUsername = editForm.username.trim().toLowerCase();

    if (!trimmedName) {
      setErrorMsg('وارد کردن نام نمایشی الزامی است.');
      return;
    }

    if (!cleanUsername) {
      setErrorMsg('وارد کردن نام کاربری الزامی است.');
      return;
    }

    // 🟢 اعتبارسنجی فقط انگلیسی، بدون فاصله و بین ۳ تا ۳۰ کاراکتر
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(cleanUsername)) {
      setErrorMsg('نام کاربری فقط می‌تواند شامل حروف انگلیسی، اعداد و خط زیر (_) و بدون فاصله باشد (حداقل ۳ کاراکتر).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await api.put('/profile/me', {
        name: trimmedName,
        username: cleanUsername,
        bio: editForm.bio.trim(),
        avatar: editForm.avatar,
      });

      if (res.data?.success || res.status === 200) {
        if (editForm.avatar) {
          DeviceEventEmitter.emit('PROFILE_AVATAR_UPDATED', editForm.avatar);
        }

        onSuccess({ ...profile, ...editForm, username: cleanUsername, name: trimmedName });
      }
    } catch (err: any) {
      const serverError = err.response?.data?.message || err.response?.data?.error;
      setErrorMsg(serverError || 'این نام کاربری قبلاً انتخاب شده یا خطا در ثبت رخ داده است.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <View style={styles.modalCard}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>ویرایش پروفایل</Text>
            </View>

            <ScrollView 
              style={styles.formScroll}
              showsVerticalScrollIndicator={false} 
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              {errorMsg ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              <View style={styles.avatarSection}>
                <TouchableOpacity
                  style={styles.avatarPicker}
                  activeOpacity={0.8}
                  onPress={handleAvatarPick}
                  disabled={isAvatarUploading || isSubmitting}
                >
                  {editForm.avatar ? (
                    <Image
                      source={{ uri: getMediaUrl(editForm.avatar) }}
                      style={styles.avatarImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.placeholderBox}>
                      <User size={46} color="#64748b" />
                    </View>
                  )}

                  <View style={styles.avatarOverlay}>
                    <UploadCloud size={16} color="#ffffff" />
                    <Text style={styles.avatarOverlayText}>تغییر تصویر</Text>
                  </View>

                  {isAvatarUploading && (
                    <View style={styles.avatarLoadingOverlay}>
                      <ActivityIndicator size="small" color="#06b6d4" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>نام نمایشی</Text>
                <TextInput
                  value={editForm.name}
                  onChangeText={(val) => setEditForm((prev) => ({ ...prev, name: val }))}
                  placeholder="نام و نام خانوادگی"
                  placeholderTextColor="#64748b"
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.helperText}>انگلیسی، بدون فاصله</Text>
                  <Text style={styles.label}>نام کاربری (یونیک)</Text>
                </View>
                <TextInput
                  value={editForm.username}
                  onChangeText={handleUsernameChange}
                  placeholder="username"
                  placeholderTextColor="#64748b"
                  style={[styles.input, styles.usernameInput]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>بیوگرافی</Text>
                <TextInput
                  value={editForm.bio}
                  onChangeText={(val) => setEditForm((prev) => ({ ...prev, bio: val }))}
                  placeholder="توضیحاتی کوتاه درباره خود بنویسید..."
                  placeholderTextColor="#64748b"
                  multiline
                  numberOfLines={3}
                  style={[styles.input, styles.textArea]}
                />
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.submitBtn, (isSubmitting || isAvatarUploading) && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting || isAvatarUploading}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitBtnText}>ذخیره تغییرات</Text>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardView: {
    width: '100%',
    maxWidth: 420,
  },
  modalCard: {
    backgroundColor: '#0c1222',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  headerTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 15,
    color: '#ffffff',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScroll: {
    flexShrink: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: '#0c1222',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarPicker: {
    position: 'relative',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(6, 182, 212, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  placeholderBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  avatarOverlayText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 9,
    color: '#ffffff',
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 18, 34, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'right',
  },
  helperText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10,
    color: '#06b6d4',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Ravi-Regular',
    fontSize: 12.5,
    color: '#ffffff',
    textAlign: 'right',
  },
  usernameInput: {
    textAlign: 'left',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorBox: {
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11,
    color: '#fb7185',
    textAlign: 'right',
  },
  submitBtn: {
    height: 48,
    backgroundColor: '#06b6d4',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 13,
    color: '#ffffff',
  },
});