import { create } from 'zustand';
import type { Chat, Message } from '@/types';

interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  messagesByChat: Record<string, Message[]>;
  typingByChat: Record<string, Set<string>>;
  setChats: (chats: Chat[]) => void;
  upsertChat: (chat: Chat) => void;
  setActiveChat: (chatId: string | null) => void;
  setMessages: (chatId: string, messages: Message[]) => void;
  prependMessages: (chatId: string, messages: Message[]) => void;
  addMessage: (chatId: string, message: Message) => void;
  updateMessage: (chatId: string, messageId: string, patch: Partial<Message>) => void;
  removeMessage: (chatId: string, messageId: string) => void;
  setTyping: (chatId: string, userId: string, isTyping: boolean) => void;
  markChatRead: (chatId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  activeChatId: null,
  messagesByChat: {},
  typingByChat: {},

  setChats: (chats) => set({ chats }),

  upsertChat: (chat) =>
    set((s) => {
      const exists = s.chats.some((c) => c.id === chat.id);
      const chats = exists ? s.chats.map((c) => (c.id === chat.id ? { ...c, ...chat } : c)) : [chat, ...s.chats];
      return { chats };
    }),

  setActiveChat: (chatId) => set({ activeChatId: chatId }),

  setMessages: (chatId, messages) =>
    set((s) => ({ messagesByChat: { ...s.messagesByChat, [chatId]: messages } })),

  prependMessages: (chatId, messages) =>
    set((s) => ({
      messagesByChat: { ...s.messagesByChat, [chatId]: [...messages, ...(s.messagesByChat[chatId] ?? [])] },
    })),

  addMessage: (chatId, message) =>
    set((s) => {
      const existing = s.messagesByChat[chatId] ?? [];
      if (existing.some((m) => m.id === message.id)) return {};
      return {
        messagesByChat: { ...s.messagesByChat, [chatId]: [...existing, message] },
        chats: s.chats.map((c) => (c.id === chatId ? { ...c, lastMessage: message, updatedAt: message.createdAt } : c)),
      };
    }),

  updateMessage: (chatId, messageId, patch) =>
    set((s) => ({
      messagesByChat: {
        ...s.messagesByChat,
        [chatId]: (s.messagesByChat[chatId] ?? []).map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
      },
    })),

  removeMessage: (chatId, messageId) =>
    set((s) => ({
      messagesByChat: {
        ...s.messagesByChat,
        [chatId]: (s.messagesByChat[chatId] ?? []).filter((m) => m.id !== messageId),
      },
    })),

  setTyping: (chatId, userId, isTyping) =>
    set((s) => {
      const current = new Set(s.typingByChat[chatId] ?? []);
      if (isTyping) current.add(userId);
      else current.delete(userId);
      return { typingByChat: { ...s.typingByChat, [chatId]: current } };
    }),

  markChatRead: (chatId) =>
    set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c)) })),
}));
