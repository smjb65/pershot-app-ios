import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { api, getMediaUrl } from '../../src/api/axiosClient';

export default function CampaignsScreen() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/projects/explore?page=1&limit=10')
      .then((res) => setCampaigns(res.data?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>کمپین‌های جذب سرمایه</Text>
      <FlatList
        data={campaigns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <Image source={{ uri: getMediaUrl(item.mainPosterUrl) }} style={styles.poster} contentFit="cover" />
            <View style={styles.cardBody}>
              <Text style={styles.title}>{item.titleFa}</Text>
              <Text numberOfLines={2} style={styles.synopsis}>{item.shortSynopsis}</Text>
              <Text style={styles.goal}>هدف: {item.fundingGoal?.toLocaleString()} تومان</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712', paddingTop: 50 },
  centerContainer: { flex: 1, backgroundColor: '#030712', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', paddingHorizontal: 16, marginBottom: 12 },
  card: { backgroundColor: '#0f172a', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  poster: { width: '100%', height: 180 },
  cardBody: { padding: 14, gap: 6 },
  title: { color: '#fff', fontSize: 15, fontWeight: 'bold', textAlign: 'right' },
  synopsis: { color: '#94a3b8', fontSize: 12, textAlign: 'right', lineHeight: 18 },
  goal: { color: '#14b8a6', fontSize: 12, fontWeight: 'bold', marginTop: 4, textAlign: 'right' },
});