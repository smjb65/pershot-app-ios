import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Eye, Film, Wallet } from 'lucide-react-native';
import { api, toFarsiDigits } from '../../api/axiosClient';

interface AnalyticsData {
  totalViews: number;
  publishedCount: number;
  pendingCount: number;
  rejectedCount: number;
  totalEarnings: number;
}

export default function MovieAnalyticsOverview({ data }: { data: AnalyticsData }) {
  const [totalEarnings, setTotalEarnings] = useState<number>(data.totalEarnings || 0);
  const totalFilms = data.publishedCount + data.pendingCount + data.rejectedCount;

  useEffect(() => {
    // 🟢 دریافت مجموع دقیق کل دونیت‌های دریافتی فیلم‌های این ناشر از ولت
    api.get('/payments/wallet/my-movies-earnings')
      .then((res) => {
        const total = res.data?.totalEarnings ?? res.data?.data?.totalEarnings;
        if (typeof total === 'number') {
          setTotalEarnings(total);
        }
      })
      .catch(() => {});
  }, []);

  const displayEarnings = totalEarnings > 0 ? totalEarnings : (data.totalEarnings || 0);

  return (
    <View style={styles.container}>
      {/* کارت بازدید کل */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(20, 184, 166, 0.12)' }]}>
            <Eye size={18} color="#14b8a6" />
          </View>
          <Text style={styles.cardLabel}>کل بازدید فیلم‌ها</Text>
        </View>
        <View style={styles.valueRow}>
          <Text style={styles.valueText}>{data.totalViews.toLocaleString('fa-IR')}</Text>
          <Text style={styles.unitText}>بازدید</Text>
        </View>
      </View>

      {/* وضعیت آثار */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
            <Film size={18} color="#f59e0b" />
          </View>
          <Text style={styles.cardLabel}>وضعیت آثار ({totalFilms.toLocaleString('fa-IR')})</Text>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusBadge}>
            <View style={[styles.dot, { backgroundColor: '#14b8a6' }]} />
            <Text style={styles.statusText}>فعال ({data.publishedCount})</Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={[styles.dot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.statusText}>انتظار ({data.pendingCount})</Text>
          </View>
          {data.rejectedCount > 0 && (
            <View style={styles.statusBadge}>
              <View style={[styles.dot, { backgroundColor: '#f43f5e' }]} />
              <Text style={styles.statusText}>رد شده ({data.rejectedCount})</Text>
            </View>
          )}
        </View>
      </View>

      {/* مجموع دونیت و درآمد کل آثار */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
            <Wallet size={18} color="#fbbf24" />
          </View>
          <Text style={styles.cardLabel}>مجموع حمایت جذب‌شده (کل آثار)</Text>
        </View>
        <View style={styles.valueRow}>
          <Text style={[styles.valueText, { color: '#fbbf24' }]}>
            {toFarsiDigits(displayEarnings.toLocaleString('en-US'))}
          </Text>
          <Text style={[styles.unitText, { color: '#fbbf24' }]}>تومان</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10, marginBottom: 16 },
  card: {
    backgroundColor: '#0d1520',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  iconBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontFamily: 'Ravi-Regular', fontSize: 11, color: '#94a3b8' },
  valueRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 6 },
  valueText: { fontFamily: 'Ravi-Bold', fontSize: 22, color: '#ffffff' },
  unitText: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#14b8a6' },
  statusRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, marginTop: 2 },
  statusBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: 'Ravi-Regular', fontSize: 10.5, color: '#cbd5e1' },
});