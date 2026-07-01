'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { useAuthStore } from '@/store/auth.store';
import { useChatStore } from '@/store/chat.store';
import { getSocket } from '@/lib/socket';
import { getChat, listChats, markChatRead } from '@/lib/chat';
import type { Message, ReceiptStatus, UserStatus } from '@/types';

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    (async () => {
      try {
        const chats = await listChats();
        useChatStore.getState().setChats(chats);
      } finally {
        setIsLoadingChats(false);
      }
    })();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function onMessageNew(message: Message) {
      const store = useChatStore.getState();
      store.addMessage(message.chatId, message);
      const me = useAuthStore.getState().user?.id;
      if (message.senderId !== me) {
        socket?.emit('message:delivered', { messageId: message.id, chatId: message.chatId });
        if (message.chatId === store.activeChatId) {
          markChatRead(message.chatId).catch(() => {});
        } else {
          store.incrementUnread(message.chatId);
        }
      }
    }

    function onMessageEdited(message: Message) {
      useChatStore.getState().updateMessage(message.chatId, message.id, message);
    }

    function onMessageDeleted(payload: { id: string; chatId: string }) {
      useChatStore.getState().updateMessage(payload.chatId, payload.id, { isDeleted: true, content: null, attachments: [] });
    }

    function onReaction(payload: { messageId: string; userId: string; emoji: string; action: 'add' | 'remove' }) {
      useChatStore.getState().applyReactionEvent(payload.messageId, payload.userId, payload.emoji, payload.action);
    }

    function onDelivered(payload: { messageId: string; userId: string }) {
      useChatStore.getState().updateReceiptByMessageId(payload.messageId, payload.userId, 'DELIVERED' as ReceiptStatus);
    }

    function onSeen(payload: { messageId?: string; chatId?: string; userId: string }) {
      const store = useChatStore.getState();
      if (payload.chatId) store.markMessagesSeenInChat(payload.chatId, payload.userId);
      else if (payload.messageId) store.updateReceiptByMessageId(payload.messageId, payload.userId, 'SEEN' as ReceiptStatus);
    }

    function onPresence(payload: { userId: string; status: UserStatus; lastSeenAt?: string | null }) {
      useChatStore.getState().updatePresence(payload.userId, payload.status, payload.lastSeenAt);
    }

    function onTypingStart(payload: { chatId: string; userId: string }) {
      useChatStore.getState().setTyping(payload.chatId, payload.userId, true);
    }

    function onTypingStop(payload: { chatId: string; userId: string }) {
      useChatStore.getState().setTyping(payload.chatId, payload.userId, false);
    }

    async function onChatNew(payload: { chatId: string }) {
      try {
        const chat = await getChat(payload.chatId);
        useChatStore.getState().upsertChat(chat);
      } catch {
        // The chat may already be gone by the time we fetch it; safe to ignore.
      }
    }

    socket.on('message:new', onMessageNew);
    socket.on('message:edited', onMessageEdited);
    socket.on('message:deleted', onMessageDeleted);
    socket.on('message:reaction', onReaction);
    socket.on('message:delivered', onDelivered);
    socket.on('message:seen', onSeen);
    socket.on('presence:update', onPresence);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);
    socket.on('chat:new', onChatNew);

    return () => {
      socket.off('message:new', onMessageNew);
      socket.off('message:edited', onMessageEdited);
      socket.off('message:deleted', onMessageDeleted);
      socket.off('message:reaction', onReaction);
      socket.off('message:delivered', onDelivered);
      socket.off('message:seen', onSeen);
      socket.off('presence:update', onPresence);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
      socket.off('chat:new', onChatNew);
    };
  }, [accessToken]);

  if (isLoadingChats) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-brand-600" size={28} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <ChatSidebar />
      {children}
    </div>
  );
}
