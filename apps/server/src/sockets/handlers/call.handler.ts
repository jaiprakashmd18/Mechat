import type { Server } from 'socket.io';
import type { AuthedSocket } from '@/sockets/index';

/**
 * WebRTC signaling relay. The server never sees media — it only relays
 * SDP offers/answers and ICE candidates between peers in a call so they
 * can establish a direct (or TURN-relayed) peer connection.
 */
export function registerCallHandlers(io: Server, socket: AuthedSocket) {
  const { userId } = socket.data;

  socket.on('call:invite', ({ chatId, callId, type }: { chatId: string; callId: string; type: 'VOICE' | 'VIDEO' }) => {
    socket.to(`chat:${chatId}`).emit('call:incoming', { chatId, callId, type, fromUserId: userId });
  });

  socket.on('call:offer', ({ callId, toUserId, sdp }: { callId: string; toUserId: string; sdp: unknown }) => {
    io.to(`user:${toUserId}`).emit('call:offer', { callId, fromUserId: userId, sdp });
  });

  socket.on('call:answer', ({ callId, toUserId, sdp }: { callId: string; toUserId: string; sdp: unknown }) => {
    io.to(`user:${toUserId}`).emit('call:answer', { callId, fromUserId: userId, sdp });
  });

  socket.on('call:ice-candidate', ({ callId, toUserId, candidate }: { callId: string; toUserId: string; candidate: unknown }) => {
    io.to(`user:${toUserId}`).emit('call:ice-candidate', { callId, fromUserId: userId, candidate });
  });

  socket.on('call:screen-share', ({ callId, chatId, active }: { callId: string; chatId: string; active: boolean }) => {
    socket.to(`chat:${chatId}`).emit('call:screen-share', { callId, fromUserId: userId, active });
  });

  socket.on('call:decline', ({ callId, chatId }: { callId: string; chatId: string }) => {
    socket.to(`chat:${chatId}`).emit('call:declined', { callId, fromUserId: userId });
  });

  socket.on('call:leave', ({ callId, chatId }: { callId: string; chatId: string }) => {
    socket.to(`chat:${chatId}`).emit('call:left', { callId, fromUserId: userId });
  });
}
