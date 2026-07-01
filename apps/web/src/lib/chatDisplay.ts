import type { Chat, ChatParticipantUser, Message, ReceiptStatus } from '@/types';

export function otherParticipant(chat: Chat, currentUserId?: string): ChatParticipantUser | undefined {
  return chat.participants.find((p) => p.userId !== currentUserId)?.user;
}

export function chatDisplayName(chat: Chat, currentUserId?: string): string {
  if (chat.type === 'GROUP') return chat.name ?? 'Group chat';
  return otherParticipant(chat, currentUserId)?.displayName ?? 'Unknown user';
}

export function chatDisplayAvatar(chat: Chat, currentUserId?: string): string | null | undefined {
  if (chat.type === 'GROUP') return chat.avatarUrl;
  return otherParticipant(chat, currentUserId)?.avatarUrl;
}

export function messagePreview(message?: Message | null): string {
  if (!message) return 'No messages yet';
  if (message.isDeleted) return 'This message was deleted';
  switch (message.type) {
    case 'IMAGE':
      return 'Photo';
    case 'VIDEO':
      return 'Video';
    case 'AUDIO':
    case 'VOICE_NOTE':
      return 'Voice message';
    case 'FILE':
      return 'Document';
    case 'LOCATION':
      return 'Location';
    case 'CONTACT':
      return 'Contact';
    case 'POLL':
      return 'Poll';
    default:
      return message.content ?? '';
  }
}

export function aggregateReceiptStatus(message: Message, otherParticipantIds: string[]): ReceiptStatus {
  if (otherParticipantIds.length === 0) return 'SENT';
  const relevant = otherParticipantIds.map(
    (id) => message.receipts?.find((r) => r.userId === id)?.status ?? 'SENT',
  );
  if (relevant.every((s) => s === 'SEEN')) return 'SEEN';
  if (relevant.every((s) => s === 'DELIVERED' || s === 'SEEN')) return 'DELIVERED';
  return 'SENT';
}
