import { useRouter } from 'expo-router';
import {
    CheckCircle2,
    ChevronLeft,
    Film,
    Layers,
    Megaphone,
    PlaySquare,
    Rocket,
    ShieldAlert,
    Users,
    Video,
    XCircle
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../src/api/axiosClient';

function parseRole(data: any): number {
  if (!data) return 0;
  if (typeof data.roleCode === 'number') return data.roleCode;
  if (typeof data.RoleCode === 'number') return data.RoleCode;

  const rawRole = data.role || data.Role;
  if (!rawRole) return 0;
  const roles = Array.isArray(rawRole) ? rawRole.map(String) : [String(rawRole)];

  if (roles.includes('Owner') || roles.includes('3')) return 3;
  if (roles.includes('SuperAdmin') || roles.includes('superadmin') || roles.includes('2')) return 2;
  if (roles.includes('Admin') || roles.includes('admin') || roles.includes('1')) return 1;

  return 0;
}

export default function ManageDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.get('/auth/me')
      .then((res) => {
        if (!isMounted) return;
        const currentRole = parseRole(res.data);
        if (currentRole >= 1) {
          setRole(currentRole);
        } else {
          router.replace('/(tabs)');
        }
      })
      .catch(() => {
        router.replace('/(tabs)');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f43f5e" />
      </View>
    );
  }

  const isSuperAdmin = (role ?? 0) >= 2;

  const menuItems = [
    // بخش‌های عمومی ادمین (سطح ۱ به بالا)
    {
      title: 'مدیریت تبلیغات',
      desc: 'مدیریت تبلیغات ویدیویی، آمار کلیک و استریم HLS',
      icon: <Megaphone size={22} color="#f59e0b" />,
      route: '/(screens)/manage/ads',
      bgColor: 'rgba(245, 158, 11, 0.12)',
      show: true,
    },
    {
      title: 'تایید فیلم‌های جدید',
      desc: 'بررسی و ارزیابی فیلم‌های ارسال‌شده توسط کاربران',
      icon: <CheckCircle2 size={22} color="#14b8a6" />,
      route: '/(screens)/manage/verify-movie',
      bgColor: 'rgba(20, 184, 166, 0.12)',
      show: true,
    },
    {
      title: 'لیست فیلم‌ها و بنر اصلی',
      desc: 'تنظیم بنر صفحه اصلی و مشاهده کل آرشیو فیلم‌ها',
      icon: <Film size={22} color="#f59e0b" />,
      route: '/(screens)/manage/movies',
      bgColor: 'rgba(245, 158, 11, 0.12)',
      show: true,
    },
    {
      title: 'تایید ریلزی جدید',
      desc: 'بررسی ویدیوهای کوتاه ارسالی کاربران قبل از انتشار',
      icon: <PlaySquare size={22} color="#a855f7" />,
      route: '/(screens)/manage/verify-reel',
      bgColor: 'rgba(168, 85, 247, 0.12)',
      show: true,
    },
    {
      title: 'مدیریت کلی ریلز',
      desc: 'مشاهده لیست کل ریلز و حذف موارد متخلف',
      icon: <Video size={22} color="#06b6d4" />,
      route: '/(screens)/manage/reels',
      bgColor: 'rgba(6, 182, 212, 0.12)',
      show: true,
    },
    {
      title: 'تایید کمپین‌های جدید',
      desc: 'بررسی و تایید درخواست‌های تامین مالی و کرادفاندینگ',
      icon: <Rocket size={22} color="#10b981" />,
      route: '/(screens)/manage/verify-campaign',
      bgColor: 'rgba(16, 185, 129, 0.12)',
      show: true,
    },
    {
      title: 'لیست کل کمپین‌ها',
      desc: 'مدیریت کمپین‌های فعال و وضعیت پیشرفت مالی',
      icon: <Layers size={22} color="#38bdf8" />,
      route: '/(screens)/manage/campaigns',
      bgColor: 'rgba(56, 189, 248, 0.12)',
      show: true,
    },

    // بخش‌های اختصاصی سوپرادمین و مالک (سطح ۲ و ۳)
    {
      title: 'مدیریت کاربران',
      desc: 'تغییر نقش‌ها، ارتقا به ادمین و مسدودسازی حساب‌ها',
      icon: <Users size={22} color="#6366f1" />,
      route: '/(screens)/manage/users',
      bgColor: 'rgba(99, 102, 241, 0.15)',
      show: isSuperAdmin,
    },
    {
      title: 'فیلم‌های رد شده',
      desc: 'آرشیو آثار رد شده با امکان بازگردانی یا حذف قطعی',
      icon: <XCircle size={22} color="#f43f5e" />,
      route: '/(screens)/manage/deny-movie',
      bgColor: 'rgba(244, 63, 94, 0.15)',
      show: isSuperAdmin,
    },
    {
      title: 'ریلزی رد شده',
      desc: 'بررسی ریلزی عدم‌تایید شده و پاکسازی فایل‌ها',
      icon: <XCircle size={22} color="#f43f5e" />,
      route: '/(screens)/manage/deny-reel',
      bgColor: 'rgba(244, 63, 94, 0.15)',
      show: isSuperAdmin,
    },
    {
      title: 'کمپین‌های رد شده',
      desc: 'آرشیو پروژه‌های رد شده با مهلت بازبینی ۷ روزه',
      icon: <XCircle size={22} color="#f43f5e" />,
      route: '/(screens)/manage/deny-campaign',
      bgColor: 'rgba(244, 63, 94, 0.15)',
      show: isSuperAdmin,
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* هدر صفحه */}
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <View style={styles.headerIconBox}>
            <ShieldAlert size={20} color="#f43f5e" />
          </View>
          <View>
            <Text style={styles.headerTitle}>پنل مدیریت سیستم</Text>
            <Text style={styles.headerSubtitle}>
              {role === 3 ? 'دسترسی مالک پلتفرم' : role === 2 ? 'دسترسی سوپر ادمین' : 'دسترسی ادمین'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <ChevronLeft size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {menuItems
            .filter((item) => item.show)
            .map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.card}
                activeOpacity={0.75}
                onPress={() => router.push(item.route as any)}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: item.bgColor }]}>
                    {item.icon}
                  </View>
                  <ChevronLeft size={18} color="#475569" />
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {item.desc}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#030712',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(13, 21, 32, 0.85)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 14,
    color: '#ffffff',
  },
  headerSubtitle: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    textAlign: 'right',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  grid: {
    gap: 10,
  },
  card: {
    backgroundColor: '#0d1520',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    gap: 4,
  },
  cardTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 13.5,
    color: '#ffffff',
    textAlign: 'right',
  },
  cardDesc: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'right',
    lineHeight: 16,
  },
});