import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@kozel/shared';

export const DEFAULT_SERVER_URL =
  (import.meta.env['VITE_KOZEL_SERVER_URL'] as string | undefined) ?? 'http://localhost:3001';

export type KozelSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createSocket(url: string = DEFAULT_SERVER_URL): KozelSocket {
  return io(url, {
    autoConnect: false,
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  });
}
