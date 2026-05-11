import type { Server as IoServer, Socket } from 'socket.io';
import type { DB } from '../../db/index.js';
import type { RoomRegistry } from '../../lifecycle/room.js';
import { engine } from '../../engine/index.js';
import { appendMatchEvent, updateMatchState } from '../../db/repo-matches.js';
import { broadcastEphemeral, broadcastStatePerSeat } from '../broadcast.js';
import type { Action, SocketData } from '@kozel/shared';

export function handleAction(
  db: DB, registry: RoomRegistry, io: IoServer, socket: Socket, action: Action,
): { ok: true } | { error: string } {
  const data = socket.data as SocketData;
  if (!data.matchId) return { error: 'not-in-room' };
  const room = registry.byMatchId(data.matchId);
  if (!room) return { error: 'not-in-room' };
  if (room.status !== 'playing') return { error: 'match-not-playing' };

  // For "by"-tagged actions, ensure socket's player owns that seat.
  if ('by' in action) {
    const seat = room.seats.find((s) => s.seat === action.by);
    if (!seat || seat.playerId !== data.playerId) return { error: 'not-your-seat' };
  }

  const r = engine(room.state, action);
  if (!r.ok) return { error: `engine:${r.error}` };

  room.state = r.state;
  updateMatchState(db, room.matchId, r.state, room.status);
  appendMatchEvent(db, room.matchId, action, r.events);

  broadcastStatePerSeat(io, room);
  broadcastEphemeral(io, room, r.events);

  return { ok: true };
}
