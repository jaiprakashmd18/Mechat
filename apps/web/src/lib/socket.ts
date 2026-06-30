import { io, type Socket } from 'socket.io-client';
import { env } from '@/lib/env';

let socket: Socket | null = null;

export function connectSocket(accessToken: string): Socket {
  if (socket?.connected) return socket;
  if (socket) socket.disconnect();

  socket = io(env.SOCKET_URL, {
    auth: { token: accessToken },
    withCredentials: true,
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
