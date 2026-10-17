import { create } from 'zustand';

interface ChatStoreState {
  messagesByContact: Record<string, any[]>;
  recentChats: any[];
  activeContactId: string | null;
  setActiveContactId: (id: string | null) => void;
  setRecentChats: (chats: any[]) => void;
  setCachedMessages: (contactId: string, messages: any[]) => void;
  mergeHistoryMessages: (contactId: string, historyMessages: any[]) => void;
  appendOlderMessages: (contactId: string, olderMessages: any[]) => void;
  addNewMessage: (contactId: string, message: any) => void;
  updateRecentChatOnMessage: (newMsg: any, myId: string) => void;
  markMessagesReadInCache: (contactId: string, myId: string) => void;
}

export const useChatStore = create<ChatStoreState>((set) => ({
  messagesByContact: {},
  recentChats: [],
  activeContactId: null,

  setActiveContactId: (id) => set({ activeContactId: id ? String(id).toLowerCase() : null }),

  setRecentChats: (chats) => set({ recentChats: chats }),

  setCachedMessages: (contactId, messages) =>
    set((state) => ({
      messagesByContact: {
        ...state.messagesByContact,
        [contactId.toLowerCase()]: messages,
      },
    })),

  mergeHistoryMessages: (contactId, historyMessages) =>
    set((state) => {
      const key = contactId.toLowerCase();
      const current = state.messagesByContact[key] || [];
      const map = new Map<string, any>();
      for (const m of current) {
        if (m?.id) map.set(String(m.id), m);
      }
      for (const m of historyMessages) {
        if (m?.id) map.set(String(m.id), m);
      }
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return {
        messagesByContact: {
          ...state.messagesByContact,
          [key]: merged,
        },
      };
    }),

  appendOlderMessages: (contactId, olderMessages) =>
    set((state) => {
      const key = contactId.toLowerCase();
      const current = state.messagesByContact[key] || [];
      const combined = [...current, ...olderMessages];
      const unique = combined.filter(
        (m, idx, arr) => idx === arr.findIndex((x) => String(x.id) === String(m.id))
      );
      return {
        messagesByContact: {
          ...state.messagesByContact,
          [key]: unique,
        },
      };
    }),

  addNewMessage: (contactId, message) =>
    set((state) => {
      const key = contactId.toLowerCase();
      const current = state.messagesByContact[key] || [];
      if (current.some((m) => String(m.id) === String(message.id))) return state;
      return {
        messagesByContact: {
          ...state.messagesByContact,
          [key]: [message, ...current],
        },
      };
    }),

  updateRecentChatOnMessage: (newMsg, myId) =>
    set((state) => {
      const senderId = String(newMsg?.senderId || newMsg?.SenderId || '').toLowerCase();
      const receiverId = String(newMsg?.receiverId || newMsg?.ReceiverId || '').toLowerCase();
      const normalizedMyId = String(myId || '').toLowerCase();
      const isMine = senderId === normalizedMyId;
      const contactId = isMine ? receiverId : senderId;

      const existingIndex = state.recentChats.findIndex(
        (u) => String(u.id || u.contactId).toLowerCase() === contactId
      );

      const lastMsgText =
        newMsg.content ||
        (newMsg.mediaType === 'voice'
          ? '🎤 پیام صوتی'
          : newMsg.mediaType === 'image'
          ? '📷 عکس ارسال شد'
          : '🎥 ویدیو ارسال شد');

      const isRead = Boolean(newMsg.isRead ?? newMsg.IsRead);

      if (existingIndex !== -1) {
        const updated = [...state.recentChats];
        const target = { ...updated[existingIndex] };
        target.lastMessage = lastMsgText;
        target.lastMessageTime = newMsg.createdAt || new Date().toISOString();
        target.isLastMessageMine = isMine;
        target.isLastMessageRead = isRead;
        if (!isMine && state.activeContactId !== contactId) {
          target.unreadCount = (target.unreadCount || 0) + 1;
        }
        updated.splice(existingIndex, 1);
        return { recentChats: [target, ...updated] };
      }
      return state;
    }),

  markMessagesReadInCache: (contactId, myId) =>
    set((state) => {
      const key = contactId.toLowerCase();
      const current = state.messagesByContact[key] || [];
      const updated = current.map((m) => {
        const s = m.senderId || m.SenderId;
        return String(s).toLowerCase() === String(myId).toLowerCase() ? { ...m, isRead: true } : m;
      });

      const updatedRecent = state.recentChats.map((c) => {
        if (String(c.id || c.contactId).toLowerCase() === key) {
          return { ...c, isLastMessageRead: true, unreadCount: 0 };
        }
        return c;
      });

      return {
        messagesByContact: {
          ...state.messagesByContact,
          [key]: updated,
        },
        recentChats: updatedRecent,
      };
    }),
}));