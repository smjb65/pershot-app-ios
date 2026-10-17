import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageSquare, Share2, ShieldCheck, User } from 'lucide-react-native';
import { getMediaUrl } from '../../api/axiosClient';

interface PublicProfileHeaderProps {
  profile: any;
  onMessageClick: () => void;
  onShareClick: () => void;
}

export default function PublicProfileHeader({
  profile,
  onMessageClick,
  onShareClick,
}: PublicProfileHeaderProps) {
  const avatarUrl = profile?.avatar || profile?.avatarUrl;
  const isVerified = Boolean(profile?.isEmailVerified || profile?.isVerified);
  const displayName = profile?.name || profile?.username || 'کاربر پرشات';

  return (
    <View style={styles.cardContainer}>
      <View style={styles.topRow}>
        {/* رینگ گرادیانت دور آواتار */}
        <LinearGradient
          colors={['#14b8a6', '#f97316', '#f59e0b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarGradientRing}
        >
          <View style={styles.avatarInnerBox}>
            {avatarUrl ? (
              <Image
                source={{ uri: getMediaUrl(avatarUrl) }}
                style={styles.avatarImg}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={34} color="#14b8a6" />
              </View>
            )}
          </View>
        </LinearGradient>

        {/* اطلاعات: نام، نقش، نام‌کاربری و بیوگرافی کامل */}
        <View style={styles.infoCol}>
          <View style={styles.nameRoleRow}>
            <Text style={styles.nameText} numberOfLines={1}>
              {displayName}
            </Text>
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <ShieldCheck size={13} color="#10b981" />
              </View>
            )}
            {profile?.role && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{profile.role}</Text>
              </View>
            )}
          </View>

          <Text style={styles.usernameText}>@{profile?.username}</Text>

          {/* نمایش کامل بیوگرافی بدون محدودیت خط و بدون سه نقطه */}
          {profile?.bio ? (
            <Text style={styles.bioText}>
              {profile.bio}
            </Text>
          ) : null}
        </View>
      </View>

      {/* دکمه‌های پیام در دایرکت و اشتراک‌گذاری */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.messageBtn}
          activeOpacity={0.8}
          onPress={onMessageClick}
        >
          <MessageSquare size={16} color="#030712" />
          <Text style={styles.messageBtnText}>ارسال پیام در دایرکت</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shareBtn}
          activeOpacity={0.8}
          onPress={onShareClick}
        >
          <Share2 size={16} color="#cbd5e1" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#0d1520',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 14,
  },
  avatarGradientRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInnerBox: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: '#080d14',
    borderWidth: 2.5,
    borderColor: '#080d14',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
  },
  infoCol: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  nameRoleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  nameText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 16,
    color: '#ffffff',
  },
  verifiedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 10,
    padding: 2,
  },
  roleBadge: {
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 9,
    color: '#2dd4bf',
  },
  usernameText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#2dd4bf',
    marginTop: 2,
  },
  bioText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 6,
    lineHeight: 20,
    textAlign: 'right',
    width: '100%',
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    paddingTop: 4,
  },
  messageBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#14b8a6',
    borderRadius: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  messageBtnText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 12,
    color: '#030712',
  },
  shareBtn: {
    width: 42,
    height: 42,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});