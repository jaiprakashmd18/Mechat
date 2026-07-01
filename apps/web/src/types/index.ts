export type UserStatus = 'ONLINE' | 'OFFLINE' | 'AWAY' | 'BUSY';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  statusMessage?: string | null;
  status: UserStatus;
  lastSeenAt?: string | null;
  isAdmin?: boolean;
  uniqueUserId?: string;
  twoFactorEnabled?: boolean;
  createdAt?: string;
}

export type ChatType = 'DIRECT' | 'GROUP';

export interface ChatParticipantUser extends Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'status' | 'lastSeenAt'> {}

export interface ChatParticipant {
  id: string;
  userId: string;
  role?: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';
  user: ChatParticipantUser;
}

export interface Chat {
  id: string;
  type: ChatType;
  name?: string | null;
  avatarUrl?: string | null;
  wallpaperUrl?: string | null;
  description?: string | null;
  isPinned?: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
  participants: ChatParticipant[];
  lastMessage?: Message | null;
  unreadCount?: number;
  updatedAt: string;
}

export type MessageType =
  | 'TEXT'
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'VOICE_NOTE'
  | 'FILE'
  | 'LOCATION'
  | 'CONTACT'
  | 'POLL'
  | 'SYSTEM';

export interface MessageSender {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface MediaAttachment {
  id: string;
  url: string;
  mimeType: string;
  fileName: string;
  fileSizeBytes: number;
}

export interface MessageReaction {
  messageId: string;
  userId: string;
  emoji: string;
  user?: { id: string; username: string; displayName: string };
}

export interface PollOption {
  id: string;
  text: string;
  votes: { userId: string }[];
}

export interface Poll {
  id: string;
  question: string;
  allowsMultiple: boolean;
  closesAt?: string | null;
  options: PollOption[];
}

export type ReceiptStatus = 'SENT' | 'DELIVERED' | 'SEEN';

export interface MessageReceipt {
  userId: string;
  status: ReceiptStatus;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  sender?: MessageSender;
  type: MessageType;
  content?: string | null;
  attachments?: MediaAttachment[];
  reactions?: MessageReaction[];
  receipts?: MessageReceipt[];
  replyToId?: string | null;
  replyTo?: Message | null;
  forwardedFromId?: string | null;
  poll?: Poll | null;
  isEdited?: boolean;
  isDeleted?: boolean;
  isPinned?: boolean;
  mentions?: string[];
  createdAt: string;
  editedAt?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  nextCursor?: string | null;
}
