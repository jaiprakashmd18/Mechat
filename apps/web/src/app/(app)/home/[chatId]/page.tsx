'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ConversationHeader } from '@/components/chat/ConversationHeader';
import { MessageList } from '@/components/chat/MessageList';
import { Composer } from '@/components/chat/Composer';
import { useAuthStore } from '@/store/auth.store';
import { useChatStore } from '@/store/chat.store';
import { getChat, getMessages, markChatRead } from '@/lib/chat';
import { getSocket } from '@/lib/socket';
import type { Chat, Message } from '@/types';

// Stable empty array so the Zustand selector never returns a new reference
const EMPTY_MESSAGES: Message[] = [];

export default function ConversationPage() {
  const { chatId } = useParams() as { chatId: string };

  const currentUserId = useAuthStore((s) => s.user?.id);
  const storeChat = useChatStore((s) => s.chats.find((c) => c.id === chatId) ?? null);
  const rawMessages = useChatStore((s) => s.messagesByChat[chatId]);
  const messages = rawMessages ?? EMPTY_MESSAGES;
  const typingSet = useChatStore((s) => s.typingByChat[chatId]);
  const setActiveChat = useChatStore((s) => s.setActiveChat);
  const setMessages = useChatStore((s) => s.setMessages);
  const prependMessages = useChatStore((s) => s.prependMessages);
  const upsertChat = useChatStore((s) => s.upsertChat);
  const markChatReadLocal = useChatStore((s) => s.markChatRead);

  const [fetchedChat, setFetchedChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const activeChat = storeChat ?? fetchedChat;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setActiveChat(chatId);

    (async () => {
      try {
        const [chatData, messageData] = await Promise.all([getChat(chatId), getMessages(chatId)]);
        if (cancelled) return;
        setFetchedChat(chatData);
        upsertChat(chatData);
        setMessages(chatId, messageData.messages);
        setNextCursor(messageData.nextCursor);
        getSocket()?.emit('chat:join', chatId);
        await markChatRead(chatId);
        markChatReadLocal(chatId);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      setActiveChat(null);
    };
  }, [chatId, setActiveChat, setMessages, upsertChat, markChatReadLocal]);

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const data = await getMessages(chatId, nextCursor);
      prependMessages(chatId, data.messages);
      setNextCursor(data.nextCursor);
    } finally {
      setIsLoadingMore(false);
    }
  }, [chatId, nextCursor, isLoadingMore, prependMessages]);

  if (isLoading || !activeChat) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="animate-spin text-brand-600" size={28} />
      </div>
    );
  }

  const typingUserIds = Array.from(typingSet ?? []).filter((id) => id !== currentUserId);

  return (
    <div className="flex flex-1 flex-col">
      <ConversationHeader chat={activeChat} currentUserId={currentUserId} typingUserIds={typingUserIds} />
      <MessageList
        chat={activeChat}
        messages={messages}
        currentUserId={currentUserId ?? ''}
        hasMore={!!nextCursor}
        isLoadingMore={isLoadingMore}
        onLoadMore={handleLoadMore}
      />
      <Composer chatId={chatId} />
    </div>
  );
}
