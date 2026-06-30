import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { redisPub, redisSub } from '@/lib/redis';
import { verifyAccessToken } from '@/utils/jwt';
import { setIo } from '@/sockets/emitter';
import { registerChatHandlers } from '@/sockets/handlers/chat.handler';
import { registerCallHandlers } from '@/sockets/handlers/call.handler';

export interface AuthedSocket extends Socket {
  data: {
    userId: string;
    deviceId: string;
  };
}

export function initSocketServer(server: HttpServer) {
  const io = new Server(server, {
    cors: { origin: env.CLIENT_URL, credentials: true },
    adapter: createAdapter(redisPub, redisSub),
    maxHttpBufferSize: 2e6,
  });

  setIo(io);

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) return next(new Error('Authentication required'));
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      socket.data.deviceId = payload.deviceId;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const authedSocket = socket as AuthedSocket;
    const { userId, deviceId } = authedSocket.data;

    logger.debug({ userId, deviceId, socketId: socket.id }, 'Socket connected');

    socket.join(`user:${userId}`);

    const participants = await prisma.chatParticipant.findMany({ where: { userId, leftAt: null }, select: { chatId: true } });
    for (const p of participants) socket.join(`chat:${p.chatId}`);

    const userRoomSize = io.sockets.adapter.rooms.get(`user:${userId}`)?.size ?? 0;
    if (userRoomSize === 1) {
      // First connection for this user across all devices — mark online.
      await prisma.user.update({ where: { id: userId }, data: { status: 'ONLINE' } });
      broadcastPresence(io, userId, 'ONLINE');
    }

    registerChatHandlers(io, authedSocket);
    registerCallHandlers(io, authedSocket);

    socket.on('disconnect', async () => {
      logger.debug({ userId, deviceId, socketId: socket.id }, 'Socket disconnected');
      const remaining = io.sockets.adapter.rooms.get(`user:${userId}`)?.size ?? 0;
      if (remaining === 0) {
        const lastSeenAt = new Date();
        await prisma.user.update({ where: { id: userId }, data: { status: 'OFFLINE', lastSeenAt } });
        broadcastPresence(io, userId, 'OFFLINE', lastSeenAt);
      }
    });
  });

  return io;
}

async function broadcastPresence(io: Server, userId: string, status: 'ONLINE' | 'OFFLINE', lastSeenAt?: Date) {
  const participants = await prisma.chatParticipant.findMany({ where: { userId, leftAt: null }, select: { chatId: true } });
  for (const p of participants) {
    io.to(`chat:${p.chatId}`).emit('presence:update', { userId, status, lastSeenAt });
  }
}
