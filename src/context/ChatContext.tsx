import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import * as signalR from '@microsoft/signalr';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { api } from '../api/axiosClient';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { showLocalNotificationAsync, registerForPushNotificationsAsync } from '../utils/notificationService';

// 🟢 استخراج فوق‌پیشرفته تمامی آیدی‌های شما از توکن برای جلوگیری قطعی از نوتیفیکیشن اضافه
export const extractAllMyIds = (token?: string | null): string[] => {
  if (!token) return [];
  try {
    const parts = token.replace(/^Bearer\s+/i, '').trim().split('.');
    if (parts.length < 2) return [];
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = '';
    for (let i = 0; i < base64.length; i += 4) {
      const n1 = chars.indexOf(base64[i]);
      const n2 = chars.indexOf(base64[i + 1]);
      const n3 = chars.indexOf(base64[i + 2]);
      const n4 = chars.indexOf(base64[i + 3]);
      str += String.fromCharCode((n1 << 2) | (n2 >> 4));
      if (n3 !== 64) str += String.fromCharCode(((n2 & 15) << 4) | (n3 >> 2));
      if (n4 !== 64) str += String.fromCharCode(((n3 & 3) << 6) | n4);
    }
    const payload = JSON.parse(decodeURIComponent(str.split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
    return Object.values(payload).map(v => String(v).toLowerCase());
  } catch {
    return [];
  }
};

export const getMyPossibleIds = () => {
  const u = useAuthStore.getState().user as any;
  const t = useAuthStore.getState().token;
  const tokenClaims = extractAllMyIds(t);
  
  const ids = [
    ...tokenClaims,
    u?.id, u?.sub, u?.userId, u?.phoneNumber, u?.phone, u?.username,
    u?.data?.id, u?.data?.sub, u?.data?.userId
  ];
  return ids.filter(Boolean).map(x => String(x).trim().toLowerCase());
};

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const currentActiveContact = useChatStore.getState().activeContactId;
    const senderId = String(notification.request.content.data?.senderId || '').trim().toLowerCase();
    const myIds = getMyPossibleIds();

    // 🟢 اگر آیدی فرستنده با شما همخوانی داشت، هیچ اعلانی پرتاب نمی‌شود
    if (senderId && myIds.includes(senderId)) {
      return { shouldShowAlert: false, shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false };
    }

    if (currentActiveContact && senderId && String(currentActiveContact).trim().toLowerCase() === senderId) {
      return { shouldShowAlert: false, shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false };
    }
    
    return { shouldShowAlert: true, shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true };
  },
});

interface ChatContextType {
  connection: signalR.HubConnection | null;
  globalUnreadCount: number;
  onlineUsers: Set<string>;
  typingUsers: Set<string>;
  currentUserId: string | null;
  refreshUnreadCount: () => void;
  markChatAsRead: (userId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType>({} as ChatContextType);

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [globalUnreadCount, setGlobalUnreadCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  
  const { token, user } = useAuthStore() as any;
  const initialMyIds = extractAllMyIds(token);
  const initialMyId = initialMyIds.length > 0 ? initialMyIds[0] : (user?.id || user?.sub ? String(user.id || user.sub).toLowerCase() : null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(initialMyId);

  const currentUserIdRef = useRef<string | null>(initialMyId);

  useEffect(() => {
    const ids = extractAllMyIds(token);
    const id = ids.length > 0 ? ids[0] : (user?.id || user?.sub ? String(user.id || user.sub).toLowerCase() : null);
    if (id) {
      setCurrentUserId(id);
      currentUserIdRef.current = id;
    }
  }, [token, user]);

  const getGatewayRootUrl = () => {
    const base = api.defaults.baseURL || process.env.EXPO_PUBLIC_API_URL || 'https://api.pershot.ir';
    return base.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  };

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await api.get('/profile/me');
      const id = res.data?.data?.id || res.data?.id || res.data?.sub;
      if (id) {
        const cleanId = String(id).toLowerCase();
        setCurrentUserId(cleanId);
        currentUserIdRef.current = cleanId;
      }
    } catch {}
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/chat/unread-count');
      setGlobalUnreadCount(res.data?.count || 0);
    } catch {}
  }, []);

  const fetchOnlineUsers = useCallback(async () => {
    try {
      const res = await api.get('/chat/online-users');
      if (Array.isArray(res.data)) {
        setOnlineUsers(new Set(res.data.map((id: string) => String(id).toLowerCase())));
      }
    } catch {}
  }, []);

  const markChatAsRead = useCallback(async (userId: string) => {
    if (!userId) return;
    try {
      await api.post(`/chat/mark-read/${userId}`);
      refreshUnreadCount();
      Notifications.dismissAllNotificationsAsync();
    } catch {}
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
      fetchOnlineUsers();
      refreshUnreadCount();
      registerForPushNotificationsAsync();
    }
  }, [token, fetchCurrentUser, fetchOnlineUsers, refreshUnreadCount]);

  useEffect(() => {
    let hubConn: signalR.HubConnection | null = null;
    let isDisposed = false;

    const startSignalR = async () => {
      const currentToken = (await AsyncStorage.getItem('pershot_token')) || token;
      if (!currentToken || isDisposed) return;

      const cleanToken = currentToken.replace(/^Bearer\s+/i, '').trim();
      const gatewayUrl = getGatewayRootUrl();
      const hubUrl = `${gatewayUrl}/chathub`;

      hubConn = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => cleanToken,
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect([0, 1500, 3000, 6000, 15000])
        .configureLogging(signalR.LogLevel.None)
        .build();

      hubConn.on('InitialOnlineUsers', (userIds: string[]) => {
        if (Array.isArray(userIds)) {
          setOnlineUsers((prev) => {
            const next = new Set(prev);
            userIds.forEach((id) => next.add(String(id).toLowerCase()));
            return next;
          });
        }
      });

      hubConn.on('ReceiveMessage', (newMsg: any) => {
        refreshUnreadCount();

        const myIds = getMyPossibleIds();
        if (currentUserIdRef.current) myIds.push(currentUserIdRef.current);

        const msgSenderId = String(newMsg?.senderId || newMsg?.SenderId || '').trim().toLowerCase();
        const receiverId = String(newMsg?.receiverId || newMsg?.ReceiverId || '').trim().toLowerCase();
        const activeContactId = String(useChatStore.getState().activeContactId || '').trim().toLowerCase();

        // 🟢 اطمینان کامل از اینکه پیام خود ماست (توسط شناسه فرستنده یا گیرنده پیام)
        const isMine = myIds.includes(msgSenderId) || (activeContactId && receiverId === activeContactId);

        if (isMine) {
          if (receiverId) {
            useChatStore.getState().addNewMessage(receiverId, newMsg);
            useChatStore.getState().updateRecentChatOnMessage(newMsg, msgSenderId);
          }
          return; 
        }

        const contactKey = msgSenderId;
        if (contactKey) {
          useChatStore.getState().addNewMessage(contactKey, newMsg);
          useChatStore.getState().updateRecentChatOnMessage(newMsg, myIds[0] || receiverId);
          setOnlineUsers((prev) => new Set(prev).add(msgSenderId));
        }

        const isLookingAtThisChat = activeContactId && activeContactId === contactKey;

        if (isLookingAtThisChat) {
          useChatStore.getState().markMessagesReadInCache(contactKey, receiverId);
          api.post(`/chat/mark-read/${contactKey}`).catch(() => {});
        } else {
          if (AppState.currentState === 'active') {
            const title = newMsg.senderName || 'پیام جدید';
            const body = newMsg.content || (newMsg.mediaType === 'voice' ? '🎤 پیام صوتی' : newMsg.mediaType === 'image' ? '📷 عکس ارسال کرد' : 'پیام جدید');
            showLocalNotificationAsync(title, body, { senderId: msgSenderId });
          }
        }
      });

      hubConn.on('UserStatusChanged', (userId: string, isOnline: boolean) => {
        const uId = String(userId).toLowerCase();
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          if (isOnline) next.add(uId);
          else next.delete(uId);
          return next;
        });
      });

      hubConn.on('UserTyping', (userId: string) => {
        const uId = String(userId).toLowerCase();
        setOnlineUsers((prev) => new Set(prev).add(uId));
        setTypingUsers((prev) => new Set(prev).add(uId));
        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(uId);
            return next;
          });
        }, 3000);
      });

      try {
        await hubConn.start();
        setConnection(hubConn);
      } catch (err: any) {}
    };

    startSignalR();

    return () => {
      isDisposed = true;
      if (hubConn) {
        hubConn.stop().catch(() => {});
      }
    };
  }, [token, refreshUnreadCount]);

  return (
    <ChatContext.Provider
      value={{ connection, globalUnreadCount, onlineUsers, typingUsers, currentUserId, refreshUnreadCount, markChatAsRead }}
    >
      {children}
    </ChatContext.Provider>
  );
};