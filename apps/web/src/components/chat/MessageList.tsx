'use client';

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { aggregateReceiptStatus } from '@/lib/chatDisplay';
import { reactToMessage, removeReaction } from '@/lib/chat';
import { apiErrorMessage } from '@/lib/api';
import type { Chat, Message } from '@/types';

interface MessageListProps {
  chat: Chat;
  messages: Message[];
  currentUserId: string;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

function dayLabel(date: Date) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

export function MessageList({ chat, messages, currentUserId, hasMore, isLoadingMore, onLoadMore }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const prevScrollHeight = useRef(0);
  const isFirstRender = useRef(true);

  const otherParticipantIds = chat.participants.filter((p) => p.userId !== currentUserId).map((p) => p.userId);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (isFirstRender.current) {
      el.scrollTop = el.scrollHeight;
      isFirstRender.current = false;
      return;
    }
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 200) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (prevScrollHeight.current && !isLoadingMore) {
      el.scrollTop = el.scrollHeight - prevScrollHeight.current;
      prevScrollHeight.current = 0;
    }
  }, [messages, isLoadingMore]);

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          prevScrollHeight.current = root.scrollHeight;
          onLoadMore();
        }
      },
      { root, threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  async function handleToggleReaction(message: Message, emoji: string) {
    const alreadyReacted = message.reactions?.some((r) => r.userId === currentUserId && r.emoji === emoji);
    try {
      if (alreadyReacted) await removeReaction(message.id, emoji);
      else await reactToMessage(message.id, emoji);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not react to message'));
    }
  }

  let lastDateLabel = '';

  return (
    <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
      {hasMore && (
        <div ref={topSentinelRef} className="flex justify-center py-2">
          {isLoadingMore && <Loader2 className="animate-spin text-brand-500" size={18} />}
        </div>
      )}

      {messages.length === 0 && !isLoadingMore && (
        <div className="flex h-full items-center justify-center text-sm text-slate-400">No messages yet. Say hello!</div>
      )}

      {messages.map((message, idx) => {
        const date = new Date(message.createdAt);
        const label = dayLabel(date);
        const showDateSeparator = label !== lastDateLabel;
        lastDateLabel = label;

        const previous = messages[idx - 1];
        const showSenderName = chat.type === 'GROUP' && (!previous || previous.senderId !== message.senderId);

        return (
          <div key={message.id}>
            {showDateSeparator && (
              <div className="my-4 flex justify-center">
                <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-white/10 dark:text-slate-400">
                  {label}
                </span>
              </div>
            )}
            <MessageBubble
              message={message}
              isMine={message.senderId === currentUserId}
              showSenderName={showSenderName}
              receiptStatus={aggregateReceiptStatus(message, otherParticipantIds)}
              currentUserId={currentUserId}
              onToggleReaction={(emoji) => handleToggleReaction(message, emoji)}
            />
          </div>
        );
      })}
    </div>
  );
}
