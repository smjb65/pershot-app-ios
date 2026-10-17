import { Image } from 'expo-image';
import { Edit3, Share2, ShieldCheck, User } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getMediaUrl, toFarsiDigits } from '../../api/axiosClient';

interface ProfileHeaderProps {
  profile: any;
  onEditClick: () => void;
  onShareClick: () => void;
  onFollowClick: (type: 'followers' | 'following') => void;
}

export default function ProfileHeader({
  profile,
  onEditClick,
  onShareClick,
  onFollowClick,
}: ProfileHeaderProps) {
  const avatarUrl = profile?.avatarUrl || profile?.avatar;
  const isVerified = Boolean(profile?.isEmailVerified || profile?.isVerified);

  // محاسبه دقیق مجموع آثار (فیلم‌ها + ریلز + کمپین‌ها) مطابق لاجیک سرور و وب
  const moviesCount = Array.isArray(profile?.movies)
    ? profile.movies.length
    : Array.isArray(profile?.userApprovedMovies)
    ? profile.userApprovedMovies.length
    : 0;

  const reelsCount = Array.isArray(profile?.reels)
    ? profile.reels.length
    : Array.isArray(profile?.userApprovedReels)
    ? profile.userApprovedReels.length
    : 0;

  const campaignsCount = Array.isArray(profile?.campaigns)
    ? profile.campaigns.length
    : Array.isArray(profile?.userApprovedCampaigns)
    ? profile.userApprovedCampaigns.length
    : 0;

  const calculatedWorks = moviesCount + reelsCount + campaignsCount;
  const totalWorksCount =
    profile?.postsCount ??
    (calculatedWorks > 0
      ? calculatedWorks
      : (profile?.moviesCount || profile?.filmCount || 0));

  // محاسبه دنبال‌کننده و دنبال‌شونده با پشتیبانی از فیلد مستقیم و آرایه‌ها
  const followersCount =
    profile?.followersCount ??
    (Array.isArray(profile?.followers) ? profile.followers.length : 0);

  const followingCount =
    profile?.followingCount ??
    (Array.isArray(profile?.following) ? profile.following.length : 0);

  const displayName =
    profile?.name ||
    (profile?.firstName
      ? `${profile.firstName} ${profile?.lastName || ''}`.trim()
      : null) ||
    'کاربر پرشات';

  return (
    <View style={styles.cardContainer}>
      <View style={styles.topRow}>
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: getMediaUrl(avatarUrl) }} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <User size={30} color="#14b8a6" />
            </View>
          )}
          {isVerified && (
            <View style={styles.verifiedBadge}>
              <ShieldCheck size={12} color="#ffffff" />
            </View>
          )}
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.nameText}>{displayName}</Text>
          <Text style={styles.usernameText}>@{profile?.username || profile?.userName || 'user'}</Text>
          {profile?.bio ? (
            <Text style={styles.bioText} numberOfLines={2}>
              {profile.bio}
            </Text>
          ) : null}
        </View>
      </View>

      {/* بخش آمار و شمارنده‌ها */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{toFarsiDigits(totalWorksCount)}</Text>
          <Text style={styles.statLabel}>آثار</Text>
        </View>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statBox} activeOpacity={0.7} onPress={() => onFollowClick('followers')}>
          <Text style={styles.statNum}>{toFarsiDigits(followersCount)}</Text>
          <Text style={styles.statLabel}>دنبال‌کننده</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statBox} activeOpacity={0.7} onPress={() => onFollowClick('following')}>
          <Text style={styles.statNum}>{toFarsiDigits(followingCount)}</Text>
          <Text style={styles.statLabel}>دنبال‌شونده</Text>
        </TouchableOpacity>
      </View>

      {/* دکمه‌های عملیاتی */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity style={styles.editBtn} activeOpacity={0.8} onPress={onEditClick}>
          <Edit3 size={15} color="#030712" />
          <Text style={styles.editBtnText}>ویرایش پروفایل</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareBtn} activeOpacity={0.8} onPress={onShareClick}>
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
    alignItems: 'center',
    gap: 14,
  },
  avatarContainer: {
    position: 'relative',
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: 'rgba(20, 184, 166, 0.4)',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#059669',
    borderRadius: 10,
    padding: 2,
  },
  infoCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  nameText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 16,
    color: '#ffffff',
  },
  usernameText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  bioText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 6,
    lineHeight: 16,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row-reverse',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontFamily: 'Ravi-Black',
    fontSize: 14,
    color: '#ffffff',
  },
  statLabel: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionButtonsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  editBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#14b8a6',
    borderRadius: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editBtnText: {
    fontFamily: 'Ravi-Black',
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