import React, { useState, useCallback, useEffect } from 'react';
import { View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Search, MessageSquare, Check, CheckCheck, X } from 'lucide-react-native';
import { api, getMediaUrl, toFarsiDigits } from '../../api/axiosClient';
import { useChat } from '../../context/ChatContext';
import { useChatStore } from '../../store/chatStore';

interface DirectListProps {
  onSelectUser: (user: any) => void;
  currentUserId?: string;
}

const AVATAR_COLORS = ['#0d9488', '#0284c7', '#7c3aed', '#db2777', '#ea580c', '#16a34a'];
const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export default function DirectList({ onSelectUser, currentUserId }: DirectListProps) {
  const { connection, onlineUsers, refreshUnreadCount } = useChat();
  const recentChats = useChatStore((state) => state.recentChats);
  const setRecentChats = useChatStore((state) => state.setRecentChats);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);

  const fetchRecentChats = async () => {
    try {
      const chatRes = await api.get('/chat/recent');
      const recentData = chatRes.data || [];

      if (recentData.length === 0) {
        setRecentChats([]);
        return;
      }

      const userIds = recentData
        .map((c: any) => c.contactId)
        .filter((id: string) => id && id !== currentUserId);

      if (userIds.length === 0) {
        setRecentChats([]);
        return;
      }

      const profileRes = await api.post('/profile/users/batch', userIds);
      const profiles = profileRes.data || [];

      const mergedUsers = profiles
        .filter((p: any) => p.id !== currentUserId)
        .map((p: any) => {
          const chatInfo = recentData.find((c: any) => c.contactId === p.id);
          return {
            ...p,
            lastMessage: chatInfo?.lastMessage,
            lastMessageTime: chatInfo?.createdAt,
            unreadCount: chatInfo?.unreadCount || 0,
            isLastMessageMine: Boolean(chatInfo?.isLastMessageMine),
            isLastMessageRead: Boolean(chatInfo?.isLastMessageRead),
          };
        });

      mergedUsers.sort(
        (a: any, b: any) =>
          new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime()
      );

      setRecentChats(mergedUsers);
    } catch {}
  };

  // 🟢 اتصال زنده وب‌سوکت در صفحه دایرکت‌ها جهت به‌روزرسانی بدون معطلی
  useEffect(() => {
    if (!connection) return;

    const handleSocketMessage = () => {
      if (!searchQuery.trim()) {
        fetchRecentChats();
      }
    };

    connection.on('ReceiveMessage', handleSocketMessage);
    return () => {
      connection.off('ReceiveMessage', handleSocketMessage);
    };
  }, [connection, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      Notifications.dismissAllNotificationsAsync();
      refreshUnreadCount();
      if (!searchQuery.trim()) {
        fetchRecentChats();
      }
    }, [searchQuery, currentUserId])
  );

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const res = await api.get('/profile/crew-users', {
        params: { search: query, page: 1, pageSize: 20 },
      });
      const items = res.data?.items || res.data || [];
      setSearchResults(items.filter((u: any) => u.id !== currentUserId));
    } catch {
      setSearchResults([]);
    }
  };

  const displayedUsers = searchResults !== null ? searchResults : recentChats;

  const renderItem = ({ item }: { item: any }) => {
    const targetId = String(item.id || item.contactId || '').toLowerCase();
    const isOnline = onlineUsers?.has(targetId);
    const avatarUri = item.avatar || item.Avatar || item.avatarUrl ? getMediaUrl(item.avatar || item.Avatar || item.avatarUrl) : null;
    const displayName = item.name && item.name !== 'undefined' ? item.name : (item.username || 'کاربر پرشات');

    const timeStr = item.lastMessageTime
      ? new Date(item.lastMessageTime).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <TouchableOpacity
        style={styles.chatRow}
        activeOpacity={0.7}
        onPress={() => onSelectUser(item)}
      >
        <View style={styles.avatarWrapper}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: getAvatarColor(displayName) }]}>
              <Text style={styles.avatarInitial}>{displayName[0] || 'U'}</Text>
            </View>
          )}
          {isOnline && <View style={styles.onlineBadge} />}
        </View>

        <View style={styles.centerContent}>
          <View style={styles.topLine}>
            <Text style={styles.timeText}>{toFarsiDigits(timeStr)}</Text>
            <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
          </View>

          <View style={styles.bottomLine}>
            {item.unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{toFarsiDigits(item.unreadCount)}</Text>
              </View>
            ) : item.isLastMessageMine ? (
              item.isLastMessageRead ? (
                <CheckCheck size={15} color="#14b8a6" />
              ) : (
                <Check size={15} color="#64748b" />
              )
            ) : null}

            <Text numberOfLines={1} style={styles.lastMessageText}>
              {searchResults !== null ? (item.username ? `@${item.username}` : 'شروع گفتگو') : (item.lastMessage || 'گفتگوی خالی')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setSearchResults(null);
            }}
            hitSlop={8}
          >
            <X size={16} color="#64748b" />
          </TouchableOpacity>
        )}
        <TextInput
          value={searchQuery}
          onChangeText={(val) => {
            setSearchQuery(val);
            if (val.trim()) searchUsers(val);
            else setSearchResults(null);
          }}
          placeholder="جستجوی گفتگوها یا افراد..."
          placeholderTextColor="#64748b"
          style={styles.searchInput}
        />
        <Search color="#64748b" size={17} />
      </View>

      {displayedUsers.length === 0 ? (
        <View style={styles.centerState}>
          <MessageSquare size={44} color="#334155" />
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'نتیجه‌ای یافت نشد' : 'هنوز گفتگویی ندارید'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedUsers}
          keyExtractor={(item, index) => item.id || item.contactId || String(index)}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          style={styles.flatList}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080e18' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111a28',
    marginHorizontal: 12,
    marginVertical: 10,
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 42,
    gap: 8,
  },
  searchInput: { flex: 1, color: '#ffffff', fontFamily: 'Ravi-Regular', fontSize: 12.5, textAlign: 'right' },
  flatList: { flex: 1, width: '100%' },
  listContent: { flexGrow: 1, paddingBottom: 110 },
  chatRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 12 },
  avatarWrapper: { position: 'relative', width: 52, height: 52 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#17212b' },
  avatarPlaceholder: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: 'Ravi-Black', fontSize: 20, color: '#ffffff' },
  onlineBadge: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#10b981',
    position: 'absolute',
    bottom: 0,
    left: 0,
    borderWidth: 2,
    borderColor: '#080e18',
  },
  centerContent: { flex: 1, justifyContent: 'center', gap: 4 },
  topLine: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  userName: { fontFamily: 'Ravi-Bold', fontSize: 14, color: '#ffffff', flex: 1, textAlign: 'right' },
  timeText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 10.5, color: '#64748b', marginLeft: 6 },
  bottomLine: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  lastMessageText: { fontFamily: 'Ravi-Regular', fontSize: 12, color: '#94a3b8', flex: 1, textAlign: 'right' },
  unreadBadge: {
    backgroundColor: '#14b8a6',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 6,
  },
  unreadBadgeText: { fontFamily: 'Ravi-Black', fontSize: 10, color: '#030712' },
  separator: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.04)', marginRight: 76 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 8 },
  emptyTitle: { fontFamily: 'Ravi-Bold', fontSize: 13.5, color: '#64748b' },
});