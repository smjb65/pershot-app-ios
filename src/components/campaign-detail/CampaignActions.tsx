import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { CreditCard, HeartHandshake } from 'lucide-react-native';
import { toFarsiDigits } from '../../api/axiosClient';
import DonationModal from '../movie/DonationModal';

interface CampaignActionsProps {
  campaign: any;
  onRefresh?: () => void;
}

export default function CampaignActions({ campaign, onRefresh }: CampaignActionsProps) {
  const router = useRouter();
  const [isDonationOpen, setIsDonationOpen] = useState(false);

  const fundingPercent = campaign?.fundingGoal
    ? Math.min(Math.round(((campaign.currentFunding || 0) / campaign.fundingGoal) * 100), 100)
    : 0;

  const handleFinancialSupportClick = () => {
    setIsDonationOpen(true);
  };

  const handleNonFinancialSupportClick = () => {
    const targetUserId =
      campaign?.ownerId || campaign?.userId || campaign?.creatorId;

    Alert.alert(
      'حمایت غیرنقدی و همکاری',
      'برای ارائه خدمات، تجهیزات، لوکیشن یا همکاری تخصصی در این پروژه، گفتگو با صاحب کمپین را در دایرکت شروع کنید.',
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'شروع گفتگو در دایرکت',
          style: 'default',
          onPress: () => {
            if (targetUserId) {
              router.push(`/(screens)/chat/${targetUserId}` as any);
            } else {
              router.push('/(tabs)/directs' as any);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      {/* پیشرفت جذب سرمایه */}
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>پیشرفت جذب سرمایه کمپین</Text>
        <Text style={styles.percentText}>{toFarsiDigits(fundingPercent)}٪</Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${fundingPercent}%` }]} />
      </View>

      <View style={styles.numbersRow}>
        <Text style={styles.collectedText}>
          جمع‌آوری شده: {toFarsiDigits((campaign?.currentFunding || 0).toLocaleString('fa-IR'))} تومان
        </Text>
        <Text style={styles.goalText}>
          هدف کل: {toFarsiDigits((campaign?.fundingGoal || 0).toLocaleString('fa-IR'))} تومان
        </Text>
      </View>

      {/* دکمه‌های عملیاتی */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.financialBtn}
          activeOpacity={0.85}
          onPress={handleFinancialSupportClick}
        >
          <CreditCard size={18} color="#030712" />
          <Text style={styles.financialBtnText}>حمایت مالی از این اثر</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.nonFinancialBtn}
          activeOpacity={0.85}
          onPress={handleNonFinancialSupportClick}
        >
          <HeartHandshake size={18} color="#f59e0b" />
          <Text style={styles.nonFinancialBtnText}>حمایت غیرنقدی</Text>
        </TouchableOpacity>
      </View>

      {/* مدال پرداخت و دونیت اختصاصی کمپین */}
      <DonationModal
        isOpen={isDonationOpen}
        onClose={() => setIsDonationOpen(false)}
        targetType="Campaign"
        targetId={campaign?.id}
        targetTitle={campaign?.titleFa || 'پروژه کمپین'}
        ownerUserId={campaign?.ownerId || campaign?.userId}
        onSuccess={onRefresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0d1520',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    gap: 10,
  },
  progressHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { color: '#cbd5e1', fontFamily: 'Ravi-Bold', fontSize: 11 },
  percentText: { color: '#2dd4bf', fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold' },
  progressBar: { height: 6, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#14b8a6' },
  numbersRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  collectedText: { color: '#2dd4bf', fontSize: 10, fontFamily: 'Ravi-Bold' },
  goalText: { color: '#64748b', fontSize: 9.5, fontFamily: 'Ravi-Regular' },
  actionRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 6 },
  financialBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#14b8a6',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  financialBtnText: { color: '#030712', fontFamily: 'Ravi-Black', fontSize: 12 },
  nonFinancialBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  nonFinancialBtnText: { color: '#cbd5e1', fontFamily: 'Ravi-Bold', fontSize: 11 },
});