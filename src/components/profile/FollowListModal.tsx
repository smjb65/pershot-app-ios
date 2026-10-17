import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { X, Users } from 'lucide-react-native';
import { api, getMediaUrl } from '../../api/axiosClient';

interface Props {
  type: 'followers' | 'following';
  onClose: () => void;
}

export default function FollowListModal({ type, onClose }: Props) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api
      .get(`/profile/${type}`)
      .then((res) => {
        if (!isMounted) return;
        setUsers(res.data?.items || res.data || []);
      })
      .catch(() => {
        if (!isMounted) return;
        setUsers([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [type]);

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
            <Text style={styles.title}>
              {type === 'followers' ? 'دنبال‌کننده‌ها' : 'دنبال‌شده‌ها'}
            </Text>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color="#14b8a6" style={{ marginVertical: 36 }} />
          ) : users.length === 0 ? (
            <View style={styles.emptyBox}>
              <Users size={32} color="#475569" />
              <Text style={styles.emptyText}>کاربری یافت نشد.</Text>
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item, idx) => item.id?.toString() || idx.toString()}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.userRow}>
                  <Image
                    source={{ uri: getMediaUrl(item.avatar || item.avatarUrl) }}
                    style={styles.userAvatar}
                    contentFit="cover"
                  />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.name || item.username}</Text>
                    <Text style={styles.userTag}>@{item.username}</Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    backgroundColor: '#0d1520',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 18,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 12,
  },
  title: {
    fontFamily: 'Ravi-Bold',
    fontSize: 14,
    color: '#ffffff',
  },
  list: {
    paddingVertical: 12,
    gap: 10,
  },
  userRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1e293b',
  },
  userInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  userName: {
    fontFamily: 'Ravi-Bold',
    fontSize: 12,
    color: '#ffffff',
  },
  userTag: {
    fontFamily: 'Ravi-Regular',
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontFamily: 'Ravi-Regular',
    fontSize: 12,
    color: '#64748b',
  },
});