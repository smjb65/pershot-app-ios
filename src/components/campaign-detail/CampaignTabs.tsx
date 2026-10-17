import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Linking } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { FileText, Download, Film, Clock, Globe, MapPin, Hash, User } from 'lucide-react-native';
import { getMediaUrl, toFarsiDigits } from '../../api/axiosClient';

interface CampaignTabsProps {
  campaign: any;
  userProfilesMap: Record<string, any>;
}

export default function CampaignTabs({ campaign, userProfilesMap }: CampaignTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'info' | 'budget'>('info');

  const cost = campaign?.costDetails || {};
  const time = campaign?.timeDetails || {};

  return (
    <View style={styles.container}>
      {/* هدر تب‌ها */}
      <View style={styles.tabHeader}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'info' && styles.tabBtnActive]}
          onPress={() => setActiveTab('info')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'info' && styles.tabBtnTextActive]}>
            شناسنامه، داستان و مدارک
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'budget' && styles.tabBtnActive]}
          onPress={() => setActiveTab('budget')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'budget' && styles.tabBtnTextActive]}>
            شکست هزینه‌ها و زمان‌بندی
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'info' ? (
        <View style={styles.tabBody}>
          {/* مشخصات تولیدی */}
          <View style={styles.specsCard}>
            <View style={styles.specItem}>
              <Film size={14} color="#14b8a6" />
              <Text style={styles.specText}>
                ژانرها: {Array.isArray(campaign?.genres) ? campaign.genres.join('، ') : campaign?.genres || 'نامشخص'}
              </Text>
            </View>

            <View style={styles.specItem}>
              <Clock size={14} color="#14b8a6" />
              <Text style={styles.specText}>مدت زمان اثر: {toFarsiDigits(campaign?.durationMinutes || 0)} دقیقه</Text>
            </View>

            <View style={styles.specItem}>
              <Globe size={14} color="#14b8a6" />
              <Text style={styles.specText}>زبان اثر: {campaign?.language || 'فارسی'}</Text>
            </View>

            <View style={styles.specItem}>
              <MapPin size={14} color="#14b8a6" />
              <Text style={styles.specText}>
                لوکیشن‌ها: {Array.isArray(campaign?.productionLocations) ? campaign.productionLocations.join('، ') : campaign?.productionLocations || 'ایران'}
              </Text>
            </View>
          </View>

          {/* شماره‌های ثبت رسمی در خانه سینما */}
          {(campaign?.scriptRegistrationNumber || campaign?.ideaRegistrationNumber) && (
            <View style={styles.registrationCard}>
              {campaign?.scriptRegistrationNumber && (
                <View style={styles.specItem}>
                  <Hash size={14} color="#2dd4bf" />
                  <Text style={styles.specText}>
                    شماره ثبت فیلمنامه: {toFarsiDigits(campaign.scriptRegistrationNumber)}
                  </Text>
                </View>
              )}
              {campaign?.ideaRegistrationNumber && (
                <View style={styles.specItem}>
                  <Hash size={14} color="#2dd4bf" />
                  <Text style={styles.specText}>
                    شماره ثبت طرح: {toFarsiDigits(campaign.ideaRegistrationNumber)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* لاگ‌لاین */}
          {campaign?.logline ? (
            <View style={styles.cardBox}>
              <Text style={styles.sectionTitle}>لاگ‌لاین (Logline)</Text>
              <Text style={styles.loglineText}>{campaign.logline}</Text>
            </View>
          ) : null}

          {/* خلاصه کوتاه */}
          {campaign?.shortSynopsis ? (
            <View style={styles.cardBox}>
              <Text style={styles.sectionTitle}>خلاصه کوتاه معرفی</Text>
              <Text style={styles.descText}>{campaign.shortSynopsis}</Text>
            </View>
          ) : null}

          {/* خلاصه داستان کامل */}
          {campaign?.synopsis ? (
            <View style={styles.cardBox}>
              <Text style={styles.sectionTitle}>خلاصه داستان کامل</Text>
              <Text style={styles.descText}>{campaign.synopsis}</Text>
            </View>
          ) : null}

          {/* فایل‌های فیلمنامه و طرح */}
          {(campaign?.scriptFileUrl || campaign?.ideaFileUrl) && (
            <View style={styles.cardBox}>
              <Text style={styles.sectionTitle}>مدارک و فایل‌های پیوست</Text>
              <View style={styles.filesRow}>
                {campaign.scriptFileUrl && (
                  <TouchableOpacity
                    style={styles.fileDownloadBtn}
                    activeOpacity={0.8}
                    onPress={() => Linking.openURL(getMediaUrl(campaign.scriptFileUrl)).catch(() => {})}
                  >
                    <FileText size={16} color="#2dd4bf" />
                    <Text style={styles.fileDownloadText}>دانلود فایل فیلمنامه</Text>
                    <Download size={14} color="#2dd4bf" />
                  </TouchableOpacity>
                )}

                {campaign.ideaFileUrl && (
                  <TouchableOpacity
                    style={styles.fileDownloadBtn}
                    activeOpacity={0.8}
                    onPress={() => Linking.openURL(getMediaUrl(campaign.ideaFileUrl)).catch(() => {})}
                  >
                    <FileText size={16} color="#2dd4bf" />
                    <Text style={styles.fileDownloadText}>دانلود فایل طرح</Text>
                    <Download size={14} color="#2dd4bf" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* عوامل و سازندگان پروژه */}
          {campaign?.crew && campaign.crew.length > 0 ? (
            <View style={styles.cardBox}>
              <Text style={styles.sectionTitle}>عوامل و سازندگان اثر</Text>
              <FlatList
                horizontal
                inverted
                data={campaign.crew}
                keyExtractor={(_, i) => i.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.crewList}
                renderItem={({ item: member }) => {
                  const userProfileId = member.userId;
                  const fetchedUser = userProfileId ? userProfilesMap[userProfileId] : null;
                  const displayName = fetchedUser?.name || fetchedUser?.username || member.name;
                  const avatarUrl = fetchedUser?.avatar || member.avatar;

                  return (
                    <TouchableOpacity
                      style={styles.crewItem}
                      activeOpacity={0.75}
                      onPress={() => {
                        if (userProfileId) router.push(`/user/${userProfileId}` as any);
                      }}
                    >
                      <View style={styles.crewAvatar}>
                        {avatarUrl ? (
                          <Image source={{ uri: getMediaUrl(avatarUrl) }} style={styles.avatarImg} contentFit="cover" />
                        ) : (
                          <User size={22} color="#64748b" />
                        )}
                      </View>
                      <Text style={styles.crewName} numberOfLines={1}>{displayName}</Text>
                      <Text style={styles.crewRole} numberOfLines={1}>{member.role || 'عوامل'}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          ) : null}
        </View>
      ) : (
        /* تب بودجه و زمان‌بندی */
        <View style={styles.tabBody}>
          <View style={styles.budgetGrid}>
            <View style={styles.budgetCard}>
              <Text style={styles.budgetStage}>۱. پیش‌تولید</Text>
              <Text style={styles.budgetAmount}>
                {toFarsiDigits((cost.preProductionCost || 0).toLocaleString('fa-IR'))} تومان
              </Text>
              <View style={styles.timeBadge}>
                <Text style={styles.timeBadgeText}>
                  مدت زمان: {toFarsiDigits(time.preProductionDays || 0)} روز
                </Text>
              </View>
            </View>

            <View style={[styles.budgetCard, styles.budgetCardActive]}>
              <Text style={[styles.budgetStage, { color: '#2dd4bf' }]}>۲. تولید</Text>
              <Text style={styles.budgetAmount}>
                {toFarsiDigits((cost.productionCost || 0).toLocaleString('fa-IR'))} تومان
              </Text>
              <View style={styles.timeBadge}>
                <Text style={styles.timeBadgeText}>
                  مدت زمان: {toFarsiDigits(time.productionDays || 0)} روز
                </Text>
              </View>
            </View>

            <View style={styles.budgetCard}>
              <Text style={styles.budgetStage}>۳. پس‌تولید</Text>
              <Text style={styles.budgetAmount}>
                {toFarsiDigits((cost.postProductionCost || 0).toLocaleString('fa-IR'))} تومان
              </Text>
              <View style={styles.timeBadge}>
                <Text style={styles.timeBadgeText}>
                  مدت زمان: {toFarsiDigits(time.postProductionDays || 0)} روز
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.totalBudgetBox}>
            <Text style={styles.totalBudgetLabel}>کل بودجه درخواستی کمپین:</Text>
            <Text style={styles.totalBudgetValue}>
              {toFarsiDigits((cost.grandTotal || campaign?.fundingGoal || 0).toLocaleString('fa-IR'))} تومان
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  tabHeader: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: '#14b8a6' },
  tabBtnText: { color: '#64748b', fontFamily: 'Ravi-Bold', fontSize: 11.5 },
  tabBtnTextActive: { color: '#14b8a6' },
  tabBody: { gap: 12, paddingTop: 4 },
  specsCard: {
    backgroundColor: '#0d1520',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    gap: 8,
  },
  registrationCard: {
    backgroundColor: 'rgba(20, 184, 166, 0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
    padding: 12,
    gap: 8,
  },
  specItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  specText: { color: '#cbd5e1', fontFamily: 'Ravi-Regular', fontSize: 11 },
  cardBox: {
    backgroundColor: '#0d1520',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
    gap: 8,
  },
  sectionTitle: { color: '#2dd4bf', fontFamily: 'Ravi-Bold', fontSize: 12, textAlign: 'right' },
  descText: { color: '#cbd5e1', fontFamily: 'Ravi-Regular', fontSize: 11.5, lineHeight: 20, textAlign: 'right' },
  loglineText: {
    color: '#fbbf24',
    fontFamily: 'Ravi-Regular',
    fontSize: 11.5,
    fontStyle: 'italic',
    textAlign: 'right',
    lineHeight: 18,
  },
  filesRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  fileDownloadBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  fileDownloadText: { color: '#2dd4bf', fontFamily: 'Ravi-Bold', fontSize: 10.5 },
  crewList: { gap: 14, paddingVertical: 4 },
  crewItem: { width: 80, alignItems: 'center', gap: 4 },
  crewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  crewName: { color: '#ffffff', fontFamily: 'Ravi-Bold', fontSize: 10.5, textAlign: 'center' },
  crewRole: { color: '#64748b', fontFamily: 'Ravi-Regular', fontSize: 9, textAlign: 'center' },
  budgetGrid: { gap: 10 },
  budgetCard: {
    backgroundColor: '#0d1520',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  budgetCardActive: { borderColor: 'rgba(20, 184, 166, 0.3)', backgroundColor: 'rgba(20, 184, 166, 0.05)' },
  budgetStage: { color: '#94a3b8', fontFamily: 'Ravi-Bold', fontSize: 11 },
  budgetAmount: { color: '#ffffff', fontFamily: 'Ravi-Black', fontSize: 14 },
  timeBadge: { backgroundColor: 'rgba(0, 0, 0, 0.4)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginTop: 2 },
  timeBadgeText: { color: '#64748b', fontFamily: 'Ravi-Regular', fontSize: 10 },
  totalBudgetBox: {
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  totalBudgetLabel: { color: '#94a3b8', fontFamily: 'Ravi-Regular', fontSize: 11 },
  totalBudgetValue: { color: '#2dd4bf', fontFamily: 'Ravi-Black', fontSize: 16 },
});