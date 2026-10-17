import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Wallet, Target, Rocket } from 'lucide-react-native';

interface AnalyticsData {
  totalFunding: number;
  fundingGoalTotal: number;
  activeCount: number;
  pendingCount: number;
  rejectedCount: number;
}

export default function CampaignAnalyticsOverview({ data }: { data: AnalyticsData }) {
  const totalCampaigns = data.activeCount + data.pendingCount + data.rejectedCount;

  return (
    <View style={styles.container}>
      {/* سرمایه جذب شده */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(20, 184, 166, 0.12)' }]}>
            <Wallet size={18} color="#14b8a6" />
          </View>
          <Text style={styles.cardLabel}>کل سرمایه جذب شده</Text>
        </View>
        <View style={styles.valueRow}>
          <Text style={styles.valueText}>{data.totalFunding.toLocaleString('fa-IR')}</Text>
          <Text style={styles.unitText}>تومان</Text>
        </View>
      </View>

      {/* وضعیت کمپین‌ها */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
            <Rocket size={18} color="#38bdf8" />
          </View>
          <Text style={styles.cardLabel}>وضعیت پروژه‌ها ({totalCampaigns.toLocaleString('fa-IR')})</Text>
        </View>
        <View style={styles.statusRow}>
          <View style={styles.statusBadge}>
            <View style={[styles.dot, { backgroundColor: '#14b8a6' }]} />
            <Text style={styles.statusText}>فعال ({data.activeCount})</Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={[styles.dot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.statusText}>در انتظار ({data.pendingCount})</Text>
          </View>
          {data.rejectedCount > 0 && (
            <View style={styles.statusBadge}>
              <View style={[styles.dot, { backgroundColor: '#f43f5e' }]} />
              <Text style={styles.statusText}>رد شده ({data.rejectedCount})</Text>
            </View>
          )}
        </View>
      </View>

      {/* مجموع اهداف مالی */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
            <Target size={18} color="#f59e0b" />
          </View>
          <Text style={styles.cardLabel}>مجموع اهداف مالی</Text>
        </View>
        <View style={styles.valueRow}>
          <Text style={[styles.valueText, { color: '#fbbf24' }]}>
            {data.fundingGoalTotal.toLocaleString('fa-IR')}
          </Text>
          <Text style={[styles.unitText, { color: '#fbbf24' }]}>تومان</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10, marginBottom: 14 },
  card: {
    backgroundColor: '#0d1520',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  iconBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontFamily: 'Ravi-Regular', fontSize: 11, color: '#94a3b8' },
  valueRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 6 },
  valueText: { fontFamily: 'Ravi-Bold', fontSize: 20, color: '#ffffff' },
  unitText: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#14b8a6' },
  statusRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, marginTop: 2 },
  statusBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#cbd5e1' },
});