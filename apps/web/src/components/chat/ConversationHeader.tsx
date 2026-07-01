'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { chatDisplayAvatar, chatDisplayName, otherParticipant } from '@/lib/chatDisplay';
import { formatRelativeTime } from '@/lib/utils';
import type { Chat } from '@/types';

interface ConversationHeaderProps {
  chat: Chat;
  currentUserId?: string;
  typingUserIds: string[];
}

export function ConversationHeader({ chat, currentUserId, typingUserIds }: ConversationHeaderProps) {
  const name = chatDisplayName(chat, currentUserId);
  const avatarUrl = chatDisplayAvatar(chat, currentUserId);
  const other = chat.type === 'DIRECT' ? otherParticipant(chat, currentUserId) : undefined;

  let subtitle: string;
  if (typingUserIds.length > 0) {
    subtitle = 'typing...';
  } else if (chat.type === 'GROUP') {
    subtitle = `${chat.participants.length} members`;
  } else if (other?.status === 'ONLINE') {
    subtitle = 'Online';
  } else if (other?.lastSeenAt) {
    subtitle = `Last seen ${formatRelativeTime(other.lastSeenAt)}`;
  } else {
    subtitle = 'Offline';
  }

  return (
    <div className="glass flex items-center gap-3 border-b border-white/40 px-4 py-3 dark:border-white/10 sm:px-6">
      <Link href="/home" className="btn-ghost -ml-2 shrink-0 lg:hidden" aria-label="Back to chats">
        <ArrowLeft size={18} />
      </Link>
      <Avatar name={name} src={avatarUrl} status={chat.type === 'DIRECT' ? other?.status : undefined} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}
