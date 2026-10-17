import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  MailCheck,
  Inbox,
} from 'lucide-react-native';
import { api } from '../../src/api/axiosClient';

interface Invitation {
  id: string;
  token?: string;
  campaignId: string;
  campaignTitle: string;
  role: string;
  createdAt: string;
  status: 'Accepted' | 'Rejected' | 'Pending' | string;
}

export default function InviteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fetchMyInvitations = async () => {
    try {
      const res = await api.get('/projects/my-invitations');
      setInvitations(res.data || []);
    } catch (err) {
      console.error('Error fetching invitations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMyInvitations();
  }, []);

  const handleRespond = async (targetTokenOrId: string, accept: boolean) => {
    if (!targetTokenOrId) return;

    try {
      setSubmittingId(targetTokenOrId);
      await api.post(`/projects/invitations/${targetTokenOrId}/respond`, { accept });
      
      Alert.alert(
        accept ? 'پذیرفته شد' : 'رد شد',
        accept ? 'شما با موفقیت به عوامل این پروژه اضافه شدید.' : 'دعوتنامه با موفقیت رد شد.'
      );

      fetchMyInvitations();
    } catch (err: any) {
      Alert.alert('خطا', err.response?.data?.message || 'خطا در ثبت پاسخ');
    } finally {
      setSubmittingId(null);
    }
  };

  useEffect(() => {
    fetchMyInvitations();

    if (token) {
      api.get(`/projects/invitations/token/${token}`)
        .then((res) => {
          const invite = res.data;
          Alert.alert(
            'دعوت به همکاری',
            `آیا تمایل دارید دعوت برای نقش "${invite.role}" در پروژه "${invite.campaignTitle}" را بپذیرید؟`,
            [
              {
                text: 'رد می‌کنم',
                style: 'destructive',
                onPress: () => handleRespond(token, false),
              },
              {
                text: 'می‌پذیرم',
                style: 'default',
                onPress: () => handleRespond(token, true),
              },
            ]
          );
        })
        .catch(() => {
          Alert.alert('خطا', 'لینک دعوت معتبر نیست یا منقضی شده است.');
        });
    }
  }, [token]);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Accepted':
        return (
          <View style={[styles.statusBadge, styles.statusAccepted]}>
            <CheckCircle2 size={12} color="#10b981" />
            <Text style={[styles.statusText, { color: '#10b981' }]}>پذیرفته شده</Text>
          </View>
        );
      case 'Rejected':
        return (
          <View style={[styles.statusBadge, styles.statusRejected]}>
            <XCircle size={12} color="#f43f5e" />
            <Text style={[styles.statusText, { color: '#f43f5e' }]}>رد شده</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.statusBadge, styles.statusPending]}>
            <Clock size={12} color="#f59e0b" />
            <Text style={[styles.statusText, { color: '#fbbf24' }]}>در انتظار پاسخ</Text>
          </View>
        );
    }
  };

  const renderItem = ({ item }: { item: Invitation }) => {
    const identifier = item.token || item.id;
    const isSubmitting = submittingId === identifier;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.campaignTitle} numberOfLines={1}>
            {item.campaignTitle}
          </Text>
          {renderStatusBadge(item.status)}
        </View>

        <View style={styles.cardInfoRow}>
          <View style={styles.roleWrapper}>
            <Text style={styles.infoLabel}>نقش درخواستی:</Text>
            <Text style={styles.roleText}>{item.role}</Text>
          </View>
          {item.createdAt && (
            <Text style={styles.dateText}>{item.createdAt}</Text>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.detailBtn}
            onPress={() => router.push(`/(screens)/campaigns/${item.campaignId}` as any)}
            activeOpacity={0.7}
          >
            <ExternalLink size={14} color="#94a3b8" />
            <Text style={styles.detailBtnText}>مشاهده پروژه</Text>
          </TouchableOpacity>

          {isSubmitting ? (
            <ActivityIndicator size="small" color="#8b5cf6" style={styles.actionLoader} />
          ) : (
            <View style={styles.responseBtns}>
              {item.status !== 'Accepted' && (
                <TouchableOpacity
                  style={[styles.btn, styles.acceptBtn]}
                  onPress={() => handleRespond(identifier, true)}
                  activeOpacity={0.8}
                >
                  <CheckCircle2 size={13} color="#10b981" />
                  <Text style={styles.acceptBtnText}>
                    {item.status === 'Rejected' ? 'پذیرش مجدد' : 'پذیرش'}
                  </Text>
                </TouchableOpacity>
              )}

              {item.status !== 'Rejected' && (
                <TouchableOpacity
                  style={[styles.btn, styles.rejectBtn]}
                  onPress={() => handleRespond(identifier, false)}
                  activeOpacity={0.8}
                >
                  <XCircle size={13} color="#f43f5e" />
                  <Text style={styles.rejectBtnText}>رد دعوت</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* هدر استاندارد یکپارچه */}
      <View style={styles.header}>
        <View style={styles.headerRight}>
          <View style={styles.headerIconBox}>
            <MailCheck size={20} color="#8b5cf6" />
          </View>
          <View>
            <Text style={styles.headerTitle}>دعوتنامه‌های همکاری</Text>
            <Text style={styles.headerSubtitle}>درخواست‌های عضویت در تیم سازندگان</Text>
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

      {/* محتوا و لیست دعوتنامه‌ها */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>در حال دریافت لیست دعوتنامه‌ها...</Text>
        </View>
      ) : (
        <FlatList
          data={invitations}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8b5cf6"
              colors={['#8b5cf6']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Inbox size={38} color="#475569" />
              </View>
              <Text style={styles.emptyTitle}>هیچ دعوتنامه‌ای یافت نشد</Text>
              <Text style={styles.emptySubtitle}>
                شما در حال حاضر هیچ دعوتنامه‌ای برای همکاری در پروژه‌ها دریافت نکرده‌اید.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
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
  headerRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 13.5,
    color: '#ffffff',
  },
  headerSubtitle: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'right',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 10,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#0d1520',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  campaignTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 13,
    color: '#ffffff',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  cardInfoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  roleWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11,
    color: '#64748b',
  },
  roleText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11.5,
    color: '#8b5cf6',
  },
  dateText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#475569',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginVertical: 8,
  },
  cardActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  responseBtns: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  acceptBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  acceptBtnText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 10.5,
    color: '#10b981',
  },
  rejectBtn: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: 'rgba(244, 63, 94, 0.25)',
  },
  rejectBtnText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 10.5,
    color: '#f43f5e',
  },
  detailBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  detailBtnText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10.5,
    color: '#94a3b8',
  },
  actionLoader: {
    paddingHorizontal: 14,
  },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusAccepted: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  statusRejected: {
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderColor: 'rgba(244, 63, 94, 0.25)',
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  statusText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 9.5,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  loadingText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 11,
    color: '#94a3b8',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
    gap: 6,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 13,
    color: '#94a3b8',
  },
  emptySubtitle: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
  },
});