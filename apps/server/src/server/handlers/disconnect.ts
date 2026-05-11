import type { Server as IoServer, Socket } from 'socket.io';
import type { RoomRegistry } from '../../lifecycle/room.js';
import type { SocketData } from '@kozel/shared';
import { broadcastSeats } from './lobby.js';

export function handleDisconnect(
  registry: RoomRegistry, io: IoServer, socket: Socket,
): void {
  const data = socket.data as SocketData;
  if (!data.matchId) return;
  const room = registry.byMatchId(data.matchId);
  if (!room) return;
  for (const s of room.seats) {
    if (s.playerId === data.playerId && s.socketId === socket.id) {
      s.connected = false;
      s.socketId = null;
      s.disconnectedAt = Date.now();
    }
  }
  broadcastSeats(io, room);
}
