import type { Server as IoServer, Socket } from 'socket.io';
import type { DB } from '../../db/index.js';
import type { RoomRegistry } from '../../lifecycle/room.js';
import { ChatThrottle } from '../../chat/throttle.js';
import { appendChat } from '../../db/repo-chat.js';
import type { SocketData } from '@kozel/shared';

const throttle = new ChatThrottle();

export function handleChat(
  db: DB, registry: RoomRegistry, io: IoServer, socket: Socket, text: string,
): { ok: true } | { error: string } {
  const data = socket.data as SocketData;
  if (!data.matchId) return { error: 'not-in-room' };
  const room = registry.byMatchId(data.matchId);
  if (!room) return { error: 'not-in-room' };
  const seat = room.seats.find((s) => s.playerId === data.playerId);
  if (!seat) return { error: 'not-seated' };
  if (!throttle.tryConsume(data.playerId)) return { error: 'rate-limited' };
  appendChat(db, room.matchId, data.playerId, seat.seat, text);
  io.to(room.matchId).emit('chat', {
    from: seat.seat,
    name: seat.name ?? 'Anon',
    text,
    at: Date.now(),
  });
  return { ok: true };
}
