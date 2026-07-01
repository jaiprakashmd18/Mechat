import { api } from '@/lib/api';
import type { Chat, MediaAttachment, Message, MessageType, User } from '@/types';

export async function listChats(archived = false) {
  const res = await api.get('/api/chats', { params: { archived } });
  return res.data.data as Chat[];
}

export async function getChat(chatId: string) {
  const res = await api.get(`/api/chats/${chatId}`);
  return res.data.data as Chat;
}

export async function createDirectChat(userId: string) {
  const res = await api.post('/api/chats/direct', { userId });
  return res.data.data as Chat;
}

export async function getMessages(chatId: string, cursor?: string, limit = 30) {
  const res = await api.get(`/api/messages/${chatId}`, { params: { cursor, limit } });
  return { messages: res.data.data as Message[], nextCursor: res.data.nextCursor as string | null };
}

export interface SendMessagePayload {
  chatId: string;
  type?: MessageType;
  content?: string;
  mediaIds?: string[];
  replyToId?: string;
}

export async function sendMessage(payload: SendMessagePayload) {
  const res = await api.post('/api/messages', { type: 'TEXT', ...payload });
  return res.data.data as Message;
}

export async function editMessage(id: string, content: string) {
  const res = await api.patch(`/api/messages/${id}`, { content });
  return res.data.data as Message;
}

export async function deleteMessage(id: string, forEveryone = false) {
  await api.delete(`/api/messages/${id}`, { params: { forEveryone } });
}

export async function reactToMessage(id: string, emoji: string) {
  await api.post(`/api/messages/${id}/react`, { emoji });
}

export async function removeReaction(id: string, emoji: string) {
  await api.delete(`/api/messages/${id}/react/${encodeURIComponent(emoji)}`);
}

export async function markChatRead(chatId: string) {
  await api.post(`/api/messages/${chatId}/read`);
}

export async function searchUsers(q: string) {
  const res = await api.get('/api/users/search', { params: { q } });
  return res.data.data as User[];
}

export async function uploadMedia(file: File) {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post('/api/media/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data as MediaAttachment;
}
