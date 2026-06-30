import type { Server } from 'socket.io';
import { prisma } from '@/lib/prisma';
import type { AuthedSocket } from '@/sockets/index';

export function registerChatHandlers(io: Server, socket: AuthedSocket) {
  const { userId } = socket.data;

  /** Lets a client subscribe to a newly created chat without reconnecting. */
  socket.on('chat:join', async (chatId: string) => {
    const participant = await prisma.chatParticipant.findUnique({ where: { chatId_userId: { chatId, userId } } });
    if (participant && !participant.leftAt) socket.join(`chat:${chatId}`);
  });

  socket.on('chat:leave', (chatId: string) => {
    socket.leave(`chat:${chatId}`);
  });

  socket.on('typing:start', (chatId: string) => {
    socket.to(`chat:${chatId}`).emit('typing:start', { chatId, userId });
  });

  socket.on('typing:stop', (chatId: string) => {
    socket.to(`chat:${chatId}`).emit('typing:stop', { chatId, userId });
  });

  socket.on('message:delivered', async ({ messageId, chatId }: { messageId: string; chatId: string }) => {
    await prisma.messageReceipt.updateMany({
      where: { messageId, userId, status: 'SENT' },
      data: { status: 'DELIVERED' },
    });
    io.to(`chat:${chatId}`).emit('message:delivered', { messageId, userId });
  });

  socket.on('message:seen', async ({ messageId, chatId }: { messageId: string; chatId: string }) => {
    await prisma.messageReceipt.updateMany({
      where: { messageId, userId },
      data: { status: 'SEEN' },
    });
    io.to(`chat:${chatId}`).emit('message:seen', { messageId, userId, at: new Date() });
  });
}
