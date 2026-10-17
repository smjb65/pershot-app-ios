import { useRouter } from 'expo-router';
import {
    Bookmark,
    ChevronLeft,
    Clapperboard,
    Film,
    MailCheck,
    Rocket,
    Settings,
    ShieldAlert,
    Wallet,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../../api/axiosClient';

interface QuickActionsProps {
  roleCode?: any;
  profile?: any;
}

export function parseUserRole(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;

  if (typeof val === 'object') {
    if (val.roleCode !== undefined) return parseUserRole(val.roleCode);
    if (val.RoleCode !== undefined) return parseUserRole(val.RoleCode);
    if (val.role !== undefined) return parseUserRole(val.role);
    if (val.Role !== undefined) return parseUserRole(val.Role);
    if (val.roles && Array.isArray(val.roles)) return parseUserRole(val.roles[0]);
    if (val['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']) {
      return parseUserRole(val['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']);
    }
    return 0;
  }

  const str = String(val).toLowerCase();
  if (str.includes('owner') || str === '3') return 3;
  if (str.includes('superadmin') || str.includes('super_admin') || str === '2') return 2;
  if (str.includes('admin') || str === '1') return 1;

  return 0;
}

export default function QuickActions({ roleCode, profile }: QuickActionsProps) {
  const router = useRouter();
  const [serverRole, setServerRole] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSecureRole = async () => {
      try {
        const response = await api.get('/auth/me');
        if (isMounted && response.data) {
          const exactRole = parseUserRole(response.data);
          setServerRole(exactRole);
        }
      } catch (error) {
        console.log('Error fetching role from auth/me:', error);
      }
    };
    fetchSecureRole();
    return () => {
      isMounted = false;
    };
  }, []);

  const finalRole =
    serverRole !== null
      ? serverRole
      : Math.max(parseUserRole(roleCode), parseUserRole(profile));

  const isAdminOrHigher = finalRole >= 1;

  const items = [
    {
      title: 'کیف پول و تراکنش‌ها',
      icon: <Wallet size={18} color="#10b981" />,
      route: '/(screens)/wallet',
      bgColor: 'rgba(16, 185, 129, 0.12)',
    },
    {
      title: 'نشان‌شده‌ها و ذخیره‌ها',
      icon: <Bookmark size={18} color="#06b6d4" />,
      route: '/(screens)/saved',
      bgColor: 'rgba(6, 182, 212, 0.12)',
    },
    {
      title: 'مدیریت و آنالیز فیلم‌ها',
      icon: <Film size={18} color="#f59e0b" />,
      route: '/(screens)/movies',
      bgColor: 'rgba(245, 158, 11, 0.12)',
    },
    {
      title: 'مدیریت و آنالیز ریلز',
      icon: <Clapperboard size={18} color="#ec4899" />,
      route: '/(screens)/reels',
      bgColor: 'rgba(236, 72, 153, 0.12)',
    },
    {
      title: 'مدیریت و آنالیز کمپین‌ها',
      icon: <Rocket size={18} color="#14b8a6" />,
      route: '/(screens)/campaigns',
      bgColor: 'rgba(20, 184, 166, 0.12)',
    },
    {
      title: 'دعوتنامه‌های همکاری',
      icon: <MailCheck size={18} color="#8b5cf6" />,
      route: '/(screens)/invite',
      bgColor: 'rgba(139, 92, 246, 0.12)',
    },
    ...(isAdminOrHigher
      ? [
          {
            title: 'پنل مدیریت سیستم (ادمین)',
            icon: <ShieldAlert size={18} color="#f43f5e" />,
            route: '/(screens)/manage',
            bgColor: 'rgba(244, 63, 94, 0.15)',
          },
        ]
      : []),
    {
      title: 'تنظیمات حساب کاربری',
      icon: <Settings size={18} color="#94a3b8" />,
      route: '/(screens)/settings',
      bgColor: 'rgba(148, 163, 184, 0.12)',
    },
  ];

  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.itemBtn}
          activeOpacity={0.7}
          onPress={() => router.push(item.route as any)}
        >
          <View style={styles.rightGroup}>
            <View style={[styles.iconBox, { backgroundColor: item.bgColor }]}>
              {item.icon}
            </View>
            <Text style={styles.itemTitle}>{item.title}</Text>
          </View>

          {serverRole === null && item.route === '/(screens)/manage' ? (
            <ActivityIndicator size="small" color="#475569" />
          ) : (
            <ChevronLeft size={16} color="#475569" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d1520',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 8,
    gap: 4,
  },
  itemBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  rightGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 12,
    color: '#e2e8f0',
  },
});