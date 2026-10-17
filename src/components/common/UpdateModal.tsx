import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Sparkles, Download, X } from 'lucide-react-native';

interface UpdateModalProps {
  visible: boolean;
  isForce: boolean;
  title?: string;
  message?: string;
  releaseNotes?: string;
  bazaarUrl?: string;
  myketUrl?: string;
  directDownloadUrl?: string;
  onDismiss: () => void;
}

export default function UpdateModal({
  visible,
  isForce,
  title,
  message,
  releaseNotes,
  onDismiss,
}: UpdateModalProps) {
  if (!visible) return null;

  const handleUpdateFromMyket = async () => {
    const myketIntent = 'myket://details?id=com.pershot.app';
    const myketWeb = 'https://myket.ir/app/com.pershot.app';

    try {
      const supported = await Linking.canOpenURL(myketIntent);
      if (supported) {
        await Linking.openURL(myketIntent);
      } else {
        await Linking.openURL(myketWeb);
      }
    } catch {
      await Linking.openURL(myketWeb);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!isForce) onDismiss();
      }}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {!isForce && (
            <TouchableOpacity style={styles.closeBtn} onPress={onDismiss}>
              <X size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}

          <View style={styles.iconBox}>
            <Sparkles size={28} color="#14b8a6" />
          </View>

          <Text style={styles.title}>{title || 'بروزرسانی نسخه جدید پرشات'}</Text>
          <Text style={styles.message}>
            {message || 'نسخه جدیدی از برنامه پرشات با قابلیت‌های بهتر و رفع اشکالات در مایکت منتشر شده است.'}
          </Text>

          {releaseNotes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesTitle}>تغییرات این نسخه:</Text>
              <Text style={styles.notesText}>{releaseNotes}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.myketBtn}
            activeOpacity={0.85}
            onPress={handleUpdateFromMyket}
          >
            <Download size={18} color="#030712" />
            <Text style={styles.myketBtnText}>بروزرسانی از مایکت</Text>
          </TouchableOpacity>

          {!isForce && (
            <TouchableOpacity style={styles.laterBtn} onPress={onDismiss}>
              <Text style={styles.laterBtnText}>فعلاً نه</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0d1520',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.3)',
    padding: 22,
    alignItems: 'center',
    gap: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Ravi-Bold',
    fontSize: 15,
    color: '#ffffff',
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Ravi-Regular',
    fontSize: 12,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 20,
  },
  notesBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 4,
  },
  notesTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11,
    color: '#2dd4bf',
    textAlign: 'right',
  },
  notesText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'right',
    lineHeight: 18,
  },
  myketBtn: {
    width: '100%',
    height: 46,
    backgroundColor: '#14b8a6',
    borderRadius: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  myketBtnText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 13,
    color: '#030712',
  },
  laterBtn: {
    paddingVertical: 6,
  },
  laterBtnText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11.5,
    color: '#64748b',
  },
});