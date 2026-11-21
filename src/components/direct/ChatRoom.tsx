import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronRight,
  Send,
  Paperclip,
  X,
  Reply,
  MessageSquare,
  AlertCircle,
  ChevronDown,
} from 'lucide-react-native';
import { api, getMediaUrl } from '../../api/axiosClient';
import { useChat, getMyPossibleIds } from '../../context/ChatContext';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import MessageBubble from './MessageBubble';

interface ChatRoomProps {
  selectedUser: any;
  currentUserId?: string;
  onBack: () => void;
}

const EMPTY_MESSAGES: any[] = [];
const AVATAR_COLORS = ['#0d9488', '#0284c7', '#7c3aed', '#db2777', '#ea580c', '#16a34a'];
const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export default function ChatRoom({ selectedUser, currentUserId: propUserId, onBack }: ChatRoomProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const chatContext = useChat();
  const { user, token } = useAuthStore() as any;

  const targetUserId = String(selectedUser?.id || selectedUser?.contactId || selectedUser?.userId || '').trim().toLowerCase();
  
  const myIds = useMemo(() => {
    const ids = getMyPossibleIds();
    if (propUserId) ids.push(String(propUserId).toLowerCase());
    if (chatContext?.currentUserId) ids.push(String(chatContext.currentUserId).toLowerCase());
    return ids;
  }, [user, token, propUserId, chatContext?.currentUserId]);

  const resolvedMyId = myIds.length > 0 ? myIds[0] : '';
  const isSelf = Boolean(resolvedMyId && targetUserId && myIds.includes(targetUserId));

  const mySenderName = user?.name && user?.name !== 'undefined' ? user.name : user?.username || 'کاربر پرشات';

  const messagesFromStore = useChatStore((state) => state.messagesByContact[targetUserId]);
  const cachedMessages = messagesFromStore || EMPTY_MESSAGES;

  const mergeHistoryMessages = useChatStore((state) => state.mergeHistoryMessages);
  const appendOlderMessages = useChatStore((state) => state.appendOlderMessages);
  const addNewMessage = useChatStore((state) => state.addNewMessage);
  const updateRecentChatOnMessage = useChatStore((state) => state.updateRecentChatOnMessage);
  const setActiveContactId = useChatStore((state) => state.setActiveContactId);
  const markMessagesReadInCache = useChatStore((state) => state.markMessagesReadInCache);

  const [text, setText] = useState('');
  const [fileAsset, setFileAsset] = useState<any>(null);
  const [replyingMessage, setReplyingMessage] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const displayName = selectedUser?.name && selectedUser?.name !== 'undefined' ? selectedUser.name : selectedUser?.username || 'کاربر پرشات';

  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    Notifications.dismissAllNotificationsAsync();
  }, []);

  useEffect(() => {
    if (!targetUserId) return;
    setActiveContactId(targetUserId);
    return () => setActiveContactId(null);
  }, [targetUserId, setActiveContactId]);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    setShowScrollDown(false);
  }, []);

  useEffect(() => {
    const conn = chatContext?.connection;
    if (!conn || !targetUserId) return;

    const handleIncomingMessage = (newMsg: any) => {
      const sId = String(newMsg?.senderId || newMsg?.SenderId || '').trim().toLowerCase();
      const rId = String(newMsg?.receiverId || newMsg?.ReceiverId || '').trim().toLowerCase();

      if (sId === targetUserId || rId === targetUserId) {
        addNewMessage(targetUserId, newMsg);
        updateRecentChatOnMessage(newMsg, resolvedMyId);

        if (sId === targetUserId) {
          chatContext?.markChatAsRead?.(targetUserId);
          if (!showScrollDown) scrollToBottom();
        }
      }
    };

    const handleRead = (readerId: string) => {
      if (String(readerId).trim().toLowerCase() === targetUserId) {
        markMessagesReadInCache(targetUserId, resolvedMyId);
      }
    };

    conn.on('ReceiveMessage', handleIncomingMessage);
    conn.on('MessagesRead', handleRead);

    return () => {
      conn.off('ReceiveMessage', handleIncomingMessage);
      conn.off('MessagesRead', handleRead);
    };
  }, [chatContext?.connection, targetUserId, resolvedMyId, addNewMessage, updateRecentChatOnMessage, markMessagesReadInCache, showScrollDown, scrollToBottom]);

  useEffect(() => {
    if (!targetUserId || isSelf) return;

    api.get(`/chat/history/${targetUserId}`, { params: { page: 1, pageSize: 25 } })
      .then((res) => {
        const rawItems = res.data?.items || res.data || [];
        mergeHistoryMessages(targetUserId, rawItems);
        if (rawItems.length < 25) setHasMore(false);
      })
      .catch(() => {});

    chatContext?.markChatAsRead?.(targetUserId);
  }, [targetUserId, isSelf, mergeHistoryMessages]);

  const handleLoadMore = async () => {
    if (loadingOlder || !hasMore || isSelf) return;
    const nextPage = page + 1;
    setLoadingOlder(true);
    try {
      const res = await api.get(`/chat/history/${targetUserId}`, { params: { page: nextPage, pageSize: 25 } });
      const rawItems = res.data?.items || res.data || [];
      if (rawItems.length < 25) setHasMore(false);
      const sorted = [...rawItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      appendOlderMessages(targetUserId, sorted);
      setPage(nextPage);
    } catch {}
    finally { setLoadingOlder(false); }
  };

  const handleScroll = useCallback((event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    setShowScrollDown((prev) => {
      if (y > 70 && !prev) return true;
      if (y <= 70 && prev) return false;
      return prev;
    });
  }, []);

  const handleTextChange = useCallback((val: string) => {
    setText(val);
    if (chatContext?.connection && val.length > 0 && targetUserId && !isSelf) {
      chatContext.connection.invoke('SendTyping', targetUserId).catch(() => {});
    }
  }, [chatContext, targetUserId, isSelf]);

  const pickMedia = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.85 });
      if (!res.canceled && res.assets[0]) {
        setFileAsset({
          uri: res.assets[0].uri,
          name: res.assets[0].fileName || (res.assets[0].type === 'video' ? 'video.mp4' : 'image.jpg'),
          type: res.assets[0].type === 'video' ? 'video/mp4' : 'image/jpeg',
        });
      }
    } catch {}
  };

  const handleSend = async () => {
    if (isSelf) return;
    if (!text.trim() && !fileAsset) return;
    setIsSending(true);

    try {
      const form = new FormData();
      form.append('receiverId', targetUserId);
      form.append('senderName', mySenderName);

      if (text.trim()) {
        form.append('content', text.trim());
      }
      
      if (fileAsset) {
        form.append('file', {
          uri: Platform.OS === 'android' ? fileAsset.uri : fileAsset.uri.replace('file://', ''),
          name: fileAsset.name || 'upload.jpg',
          type: fileAsset.type || 'image/jpeg',
        } as any);
      }

      if (replyingMessage) {
        form.append('replyToId', replyingMessage.id);
        form.append('replyToContent', replyingMessage.content || 'فایل ضمیمه');
        form.append('replyToSenderName', replyingMessage.senderName || displayName);
      }

      const res = await api.post('/chat/send', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data) {
        const sentMsg = res.data?.data || res.data;
        addNewMessage(targetUserId, sentMsg);
        updateRecentChatOnMessage(sentMsg, resolvedMyId);
      }

      setText('');
      setFileAsset(null);
      setReplyingMessage(null);
      scrollToBottom();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err: any) {
      console.log('Send Error Details:', err?.response?.data || err?.message || err);
      Alert.alert('خطا', 'مشکل در ارتباط با سرور.');
    } finally {
      setIsSending(false);
    }
  };

  const scrollToRepliedMessage = useCallback((replyToId: string) => {
    if (!flatListRef.current) return;
    const msgs = useChatStore.getState().messagesByContact[targetUserId] || [];
    const index = msgs.findIndex((m) => String(m.id) === String(replyToId));
    if (index !== -1) {
      flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      setHighlightedMsgId(String(replyToId));
      setTimeout(() => setHighlightedMsgId(null), 1500);
    }
  }, [targetUserId]);

  const handleSwipeReply = useCallback((msgItem: any) => {
    setReplyingMessage(msgItem);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const isTyping = chatContext?.typingUsers?.has(targetUserId);
  const isOnline = chatContext?.onlineUsers?.has(targetUserId) || isTyping || Boolean(selectedUser?.isOnline);
  const hasContent = Boolean(text.trim() || fileAsset);

  // 🟢 رفع قطعی مشکل رنگ پیام‌ها با استفاده از فرمول طلایی
  const renderMessageItem = useCallback(({ item }: { item: any }) => {
    const itemSenderId = String(item.senderId || item.SenderId || '').trim().toLowerCase();
    
    // در چت دو نفره، اگر فرستنده شخص مقابل نبود، یعنی ۱۰۰٪ خود من هستم!
    const isMsgMine = itemSenderId !== targetUserId;
    const isHigh = String(item.id) === highlightedMsgId;
    
    return (
      <MessageBubble
        msg={item}
        isMine={isMsgMine}
        isHighlighted={isHigh}
        onSwipeReply={handleSwipeReply}
        onPressReplyBox={scrollToRepliedMessage}
        onPressImage={setPreviewImageUrl}
      />
    );
  }, [targetUserId, highlightedMsgId, handleSwipeReply, scrollToRepliedMessage]);

  return (
    <View style={styles.rootContainer}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.7} onPress={onBack}>
          <ChevronRight size={26} color="#f8fafc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerProfileBox} activeOpacity={0.75} onPress={() => targetUserId && !isSelf && router.push(`/user/${targetUserId}` as any)}>
          <View style={styles.avatarWrapper}>
            {selectedUser?.avatarUrl || selectedUser?.avatar ? (
              <Image source={{ uri: getMediaUrl(selectedUser.avatarUrl || selectedUser.avatar) }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: getAvatarColor(displayName) }]}><Text style={styles.avatarInitial}>{displayName[0] || 'U'}</Text></View>
            )}
            {isOnline && <View style={styles.onlineDot} />}
          </View>

          <View style={styles.headerTextCol}>
            <Text style={styles.headerName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.headerStatus}>
              {isSelf ? (
                <Text style={{ color: '#fbbf24' }}>فضای ذخیره ابری</Text>
              ) : isTyping ? (
                <Text style={{ color: '#2dd4bf', fontWeight: 'bold' }}>در حال تایپ...</Text>
              ) : isOnline ? (
                <Text style={{ color: '#10b981' }}>آنلاین</Text>
              ) : (
                <Text style={{ color: '#64748b' }}>آفلاین</Text>
              )}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior="padding"
      >
        <View style={styles.mainArea}>
          {isSelf ? (
            <View style={styles.centerContainer}>
              <AlertCircle size={44} color="#f59e0b" />
              <Text style={styles.selfNoticeTitle}>گفتگو با خود امکان‌پذیر نیست</Text>
            </View>
          ) : cachedMessages.length === 0 ? (
            <View style={styles.emptyMessagesContainer}>
              <View style={styles.emptyIconCircle}><MessageSquare size={32} color="#14b8a6" /></View>
              <Text style={styles.emptyTitle}>هنوز پیامی وجود ندارد</Text>
            </View>
          ) : (
            <>
              <FlatList
                ref={flatListRef}
                data={cachedMessages}
                inverted
                style={{ flex: 1 }}
                keyboardShouldPersistTaps="handled"
                keyExtractor={(item, index) => item?.id ? `msg-${item.id}` : `temp-${index}`}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
                renderItem={renderMessageItem}
              />
              
              {showScrollDown && (
                <TouchableOpacity style={styles.scrollDownBtn} onPress={scrollToBottom} activeOpacity={0.8}>
                  <ChevronDown size={26} color="#ffffff" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {replyingMessage && (
          <View style={styles.replyBar}>
            <TouchableOpacity onPress={() => setReplyingMessage(null)} style={styles.closeReplyBtn}><X size={16} color="#94a3b8" /></TouchableOpacity>
            <View style={styles.replyContentBox}>
              <Text style={styles.replyName} numberOfLines={1}>{replyingMessage.senderName || 'کاربر'}</Text>
              <Text style={styles.replyText} numberOfLines={1}>{replyingMessage.content || 'فایل ضمیمه'}</Text>
            </View>
            <Reply size={18} color="#14b8a6" />
          </View>
        )}

        {fileAsset && (
          <View style={styles.filePreviewBar}>
            <TouchableOpacity onPress={() => setFileAsset(null)} style={styles.removeFileBtn}><X size={16} color="#f43f5e" /></TouchableOpacity>
            <Text style={styles.filePreviewText} numberOfLines={1}>{fileAsset.name}</Text>
          </View>
        )}

        <View style={[
          styles.inputContainer,
          { paddingBottom: isKeyboardVisible ? 8 : Math.max(insets.bottom, 12), paddingTop: 8 }
        ]}>
          
          {/* 🟢 دکمه ارسال (اگر محتوایی نباشد کم‌رنگ می‌شود) */}
          <TouchableOpacity 
            style={[styles.actionBtn, styles.sendBtnActive, { opacity: hasContent ? 1 : 0.5 }]} 
            disabled={isSending || isSelf || !hasContent} 
            onPress={handleSend} 
            activeOpacity={0.7}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#030712" />
            ) : (
              <View style={styles.iconCenter}><Send size={18} color="#030712" /></View>
            )}
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={text}
            editable={!isSelf}
            onChangeText={handleTextChange}
            placeholder={isSelf ? 'ارسال به خود امکان‌پذیر نیست' : 'پیام شما...'}
            placeholderTextColor="#64748b"
            multiline
          />

          <TouchableOpacity style={styles.attachBtn} activeOpacity={0.7} onPress={pickMedia}>
            <Paperclip size={20} color="#94a3b8" />
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>

      <Modal visible={Boolean(previewImageUrl)} transparent animationType="fade" onRequestClose={() => setPreviewImageUrl(null)}>
        <View style={styles.fullscreenModal}>
          <TouchableOpacity style={[styles.closeModalBtn, { top: insets.top + 10 }]} onPress={() => setPreviewImageUrl(null)}><X size={26} color="#ffffff" /></TouchableOpacity>
          {previewImageUrl && <Image source={{ uri: previewImageUrl }} style={{ width: '100%', height: '85%' }} contentFit="contain" />}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: '#070c14' },
  keyboardContainer: { flex: 1 },
  mainArea: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10, backgroundColor: '#0e1724', borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.06)', gap: 8 },
  backBtn: { padding: 4 },
  headerProfileBox: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  avatarWrapper: { position: 'relative', width: 42, height: 42 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#17212b' },
  avatarPlaceholder: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: 'Ravi-Black', fontSize: 17, color: '#ffffff' },
  onlineDot: { width: 11, height: 11, borderRadius: 5.5, backgroundColor: '#10b981', position: 'absolute', bottom: 0, left: 0, borderWidth: 2, borderColor: '#0e1724' },
  headerTextCol: { alignItems: 'flex-end', justifyContent: 'center' },
  headerName: { fontFamily: 'Ravi-Bold', fontSize: 14, color: '#ffffff' },
  headerStatus: { fontFamily: 'Ravi-Regular', fontSize: 10, marginTop: 1 },
  messagesList: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, flexGrow: 1 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
  selfNoticeTitle: { fontFamily: 'Ravi-Bold', fontSize: 14, color: '#f59e0b', marginTop: 10 },
  emptyMessagesContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 8 },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(20, 184, 166, 0.1)', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: 'Ravi-Bold', fontSize: 14, color: '#ffffff' },
  replyBar: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#0d1522', paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.08)', borderRightWidth: 3, borderRightColor: '#14b8a6', gap: 8 },
  replyContentBox: { flex: 1, alignItems: 'flex-end' },
  replyName: { fontFamily: 'Ravi-Bold', fontSize: 11, color: '#14b8a6' },
  replyText: { fontFamily: 'Ravi-Regular', fontSize: 11, color: '#94a3b8' },
  closeReplyBtn: { padding: 4 },
  filePreviewBar: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#0e1724', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.06)', gap: 10 },
  filePreviewText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11, color: '#2dd4bf', flex: 1, textAlign: 'right' },
  removeFileBtn: { padding: 4 },
  inputContainer: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 10, backgroundColor: '#0e1724', borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.08)', gap: 8 },
  input: { flex: 1, maxHeight: 100, minHeight: 40, backgroundColor: '#162232', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontFamily: 'Ravi-Regular', fontSize: 13, color: '#ffffff', textAlign: 'right' },
  attachBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  actionBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  iconCenter: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', transform: [{ scaleX: -1 }] },
  sendBtnActive: { backgroundColor: '#14b8a6' },
  scrollDownBtn: { position: 'absolute', bottom: 16, right: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  fullscreenModal: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.96)', justifyContent: 'center', alignItems: 'center' },
  closeModalBtn: { position: 'absolute', right: 18, zIndex: 50, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.15)', alignItems: 'center', justifyContent: 'center' },
});