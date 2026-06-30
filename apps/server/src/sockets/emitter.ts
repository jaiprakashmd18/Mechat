import type { Server } from 'socket.io';

let ioInstance: Server | null = null;

export function setIo(io: Server) {
  ioInstance = io;
}

export function getIo(): Server {
  if (!ioInstance) throw new Error('Socket.IO server has not been initialized yet');
  return ioInstance;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  ioInstance?.to(`user:${userId}`).emit(event, payload);
}

export function emitToChat(chatId: string, event: string, payload: unknown) {
  ioInstance?.to(`chat:${chatId}`).emit(event, payload);
}
