import { CheckCircle2, Clock, Eye, Heart } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

interface AnalyticsData {
  totalViews: number;
  totalLikes: number;
  publishedCount: number;
  pendingCount: number;
}

export default function ReelsAnalyticsOverview({ data }: { data: AnalyticsData }) {
  return (
    <View style={styles.grid}>
      {/* بازدید کل */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
            <Eye size={16} color="#38bdf8" />
          </View>
          <Text style={styles.cardLabel}>کل بازدید ریلز</Text>
        </View>
        <Text style={styles.cardValue}>{data.totalViews.toLocaleString('fa-IR')}</Text>
      </View>

      {/* مجموع لایک‌ها */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(244, 63, 94, 0.12)' }]}>
            <Heart size={16} color="#f43f5e" />
          </View>
          <Text style={styles.cardLabel}>مجموع پسندها</Text>
        </View>
        <Text style={[styles.cardValue, { color: '#f43f5e' }]}>
          {data.totalLikes.toLocaleString('fa-IR')}
        </Text>
      </View>

      {/* ریلزی منتشر شده */}
      <View style={[styles.card, styles.publishedCard]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(20, 184, 166, 0.15)' }]}>
            <CheckCircle2 size={16} color="#14b8a6" />
          </View>
          <Text style={[styles.cardLabel, { color: '#2dd4bf' }]}>منتشر شده</Text>
        </View>
        <Text style={[styles.cardValue, { color: '#14b8a6' }]}>
          {data.publishedCount.toLocaleString('fa-IR')}
        </Text>
      </View>

      {/* در انتظار بررسی */}
      <View style={[styles.card, styles.pendingCard]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
            <Clock size={16} color="#f59e0b" />
          </View>
          <Text style={[styles.cardLabel, { color: '#fbbf24' }]}>در انتظار بررسی</Text>
        </View>
        <Text style={[styles.cardValue, { color: '#f59e0b' }]}>
          {data.pendingCount.toLocaleString('fa-IR')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  card: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#0d1520',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    gap: 6,
  },
  publishedCard: {
    borderColor: 'rgba(20, 184, 166, 0.25)',
  },
  pendingCard: {
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10,
    color: '#94a3b8',
  },
  cardValue: {
    fontFamily: 'Ravi-Bold',
    fontSize: 20,
    color: '#ffffff',
    textAlign: 'right',
  },
});