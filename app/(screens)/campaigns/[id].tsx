import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  ToastAndroid,
  Platform,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Settings2,
  Trash2,
  ChevronLeft,
  Edit3,
} from 'lucide-react-native';
import { api, getMediaUrl } from '../../../src/api/axiosClient';

import CampaignSingleAnalytics from '../../../src/components/campaigns/CampaignSingleAnalytics';
import CampaignEditStepperForm from '../../../src/components/campaigns/CampaignEditStepperForm';
import CampaignHero from '../../../src/components/campaign-detail/CampaignHero';
import CampaignActions from '../../../src/components/campaign-detail/CampaignActions';
import CampaignTabs from '../../../src/components/campaign-detail/CampaignTabs';

// 🟢 استفاده از ویدیو پلیر پیشرفته مشترک با بخش فیلم‌ها
import AdvancedVideoPlayer from '../../../src/components/movie/AdvancedVideoPlayer';

export default function SingleCampaignScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfilesMap, setUserProfilesMap] = useState<Record<string, any>>({});
  
  // استیت پخش پلیر پیشرفته
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  // 🟢 تعیین نمای پیش‌فرض: اگر از بخش مدیریت آمده باشد (manage)، وارد مدیریت می‌شود در غیر این صورت عمومی است
  const [viewMode, setViewMode] = useState<'public' | 'manage'>(
    tab === 'manage' || tab === 'edit' || tab === 'analytics' ? 'manage' : 'public'
  );
  const [manageTab, setManageTab] = useState<'analytics' | 'edit'>(tab === 'edit' ? 'edit' : 'analytics');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
    else Alert.alert('', msg);
  };

  const fetchCampaignDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.get(`/projects/${id}`);
      const data = res.data?.data || res.data;
      setCampaign(data);

      const crewList = Array.isArray(data?.crew) ? data.crew : [];
      const userIds: string[] = crewList.map((c: any) => c.userId || c.id).filter(Boolean);

      if (data?.ownerId && !userIds.includes(data.ownerId)) {
        userIds.push(data.ownerId);
      }

      if (userIds.length > 0) {
        try {
          const usersRes = await api.post('/profile/users/batch', userIds);
          const map: Record<string, any> = {};
          (usersRes.data || []).forEach((u: any) => {
            map[u.id] = u;
          });
          setUserProfilesMap(map);
        } catch {}
      }
    } catch {
      showToast('خطا در دریافت مشخصات کمپین', 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCampaignDetails();
    api.get('/profile/me')
      .then((res) => setCurrentUser(res.data?.data || res.data))
      .catch(() => {});
  }, [fetchCampaignDetails]);

  const handleDeleteCampaign = () => {
    Alert.alert(
      'حذف کامل کمپین',
      'تمامی اطلاعات و مستندات کمپین پاک خواهند شد. آیا مطمئن هستید؟',
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'بله، حذف کامل',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/projects/${id}`);
              showToast('کمپین با موفقیت حذف شد');
              router.replace('/(screens)/campaigns' as any);
            } catch (err: any) {
              showToast(err.response?.data?.message || 'خطا در حذف کمپین', 'error');
            }
          },
        },
      ]
    );
  };

  const isOwner =
    Boolean(currentUser?.id) &&
    (currentUser?.id === campaign?.ownerId ||
      currentUser?.id === campaign?.userId ||
      currentUser?.id === campaign?.creatorId);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>کمپین مورد نظر یافت نشد.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ۱. نمای عمومی لبه‌به‌لبه و تمام‌عرض بدون هدر اضافی بالایی */}
      {viewMode === 'public' ? (
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.publicScrollContent}
        >
          <CampaignHero
            campaign={campaign}
            onPlayPitch={() => {
              if (campaign?.pitchVideoUrl) {
                setIsPlayerOpen(true);
              } else {
                showToast('ویدیوی معرفی بارگذاری نشده است', 'error');
              }
            }}
            onToast={showToast}
          />

          <View style={styles.publicContentPadding}>
            <CampaignActions campaign={campaign} />
            <CampaignTabs campaign={campaign} userProfilesMap={userProfilesMap} />
          </View>
        </ScrollView>
      ) : (
        /* ۲. پنل مدیریت و ویرایش کمپین برای صاحب پروژه */
        <View style={{ flex: 1 }}>
          <View style={[styles.manageHeader, { paddingTop: insets.top + 8 }]}>
            <View style={styles.manageHeaderRight}>
              <TouchableOpacity style={styles.deleteBtn} activeOpacity={0.75} onPress={handleDeleteCampaign}>
                <Trash2 size={16} color="#f43f5e" />
              </TouchableOpacity>
              <View>
                <Text style={styles.manageHeaderTitle} numberOfLines={1}>{campaign.titleFa}</Text>
                <Text style={styles.manageHeaderSubtitle}>مدیریت مراحل، دعوتنامه‌ها و مستندات</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.backBtn} activeOpacity={0.7} onPress={() => setViewMode('public')}>
              <ChevronLeft size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              style={[styles.tabBtn, manageTab === 'analytics' && styles.activeTabBtn]}
              onPress={() => setManageTab('analytics')}
            >
              <Text style={[styles.tabBtnText, manageTab === 'analytics' && styles.activeTabText]}>
                مستندات و دعوتنامه‌ها
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, manageTab === 'edit' && styles.activeTabBtn]}
              onPress={() => setManageTab('edit')}
            >
              <Edit3 size={15} color={manageTab === 'edit' ? '#030712' : '#94a3b8'} />
              <Text style={[styles.tabBtnText, manageTab === 'edit' && styles.activeTabText]}>
                ویرایش
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.manageScrollContent}>
            {manageTab === 'analytics' ? (
              <CampaignSingleAnalytics campaign={campaign} onRefresh={fetchCampaignDetails} />
            ) : (
              <CampaignEditStepperForm
                campaign={campaign}
                onSuccess={() => {
                  fetchCampaignDetails();
                  setManageTab('analytics');
                }}
              />
            )}
          </ScrollView>
        </View>
      )}

      {/* دکمه شناور مدیریت برای صاحب کمپین */}
      {isOwner && viewMode === 'public' && (
        <TouchableOpacity
          style={styles.floatingManageBtn}
          activeOpacity={0.85}
          onPress={() => setViewMode('manage')}
        >
          <Settings2 size={18} color="#030712" />
          <Text style={styles.floatingManageText}>مدیریت و دعوتنامه‌ها</Text>
        </TouchableOpacity>
      )}

      {/* پلیر پیشرفته و تمام‌صفحه لنداسکیپ ویدیوی پیچ */}
      {isPlayerOpen && campaign?.pitchVideoUrl && (
        <Modal
          visible={isPlayerOpen}
          animationType="fade"
          supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}
          onRequestClose={() => setIsPlayerOpen(false)}
        >
          <AdvancedVideoPlayer
            src={campaign.pitchVideoUrl}
            poster={campaign.mainPosterUrl}
            title={`ویدیوی پیچ: ${campaign.titleFa}`}
            movieId={campaign.id}
            userId={campaign.ownerId}
            isMainMovie={false}
            onClose={() => setIsPlayerOpen(false)}
          />
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  publicScrollContent: {
    paddingBottom: 80,
  },
  publicContentPadding: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#030712',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 12,
    color: '#64748b',
  },
  floatingManageBtn: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    backgroundColor: '#14b8a6',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 99,
  },
  floatingManageText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 12,
    color: '#030712',
  },
  manageHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#030712',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  manageHeaderRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  manageHeaderTitle: {
    fontFamily: 'Ravi-Bold',
    fontSize: 13.5,
    color: '#ffffff',
    textAlign: 'right',
  },
  manageHeaderSubtitle: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'right',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSwitcher: {
    flexDirection: 'row-reverse',
    backgroundColor: '#0d1520',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabBtn: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  activeTabBtn: {
    backgroundColor: '#14b8a6',
  },
  tabBtnText: {
    fontFamily: 'Ravi-Bold',
    fontSize: 11,
    color: '#94a3b8',
  },
  activeTabText: {
    color: '#030712',
  },
  manageScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 50,
  },
});