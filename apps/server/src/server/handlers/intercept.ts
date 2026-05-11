import type { Server as IoServer, Socket } from 'socket.io';
import type { DB } from '../../db/index.js';
import type { RoomRegistry, Room } from '../../lifecycle/room.js';
import { engine } from '../../engine/index.js';
import { appendMatchEvent, updateMatchState } from '../../db/repo-matches.js';
import { broadcastEphemeral, broadcastStatePerSeat } from '../broadcast.js';
import { clearInterceptTimer, setInterceptTimer } from '../../lifecycle/timers.js';
import type { SocketData, SeatIndex } from '@kozel/shared';

const INTERCEPT_WINDOW_MS = 3000;

export function handleClaimIntercept(
  db: DB, registry: RoomRegistry, io: IoServer, socket: Socket,
): { ok: true } | { error: string } {
  const data = socket.data as SocketData;
  if (!data.matchId) return { error: 'not-in-room' };
  const room = registry.byMatchId(data.matchId);
  if (!room) return { error: 'not-in-room' };
  const seat = room.seats.find((s) => s.playerId === data.playerId);
  if (!seat) return { error: 'not-seated' };

  const r = engine(room.state, { kind: 'claim-intercept', by: seat.seat });
  if (!r.ok) return { error: `engine:${r.error}` };
  clearInterceptTimer(room);
  room.state = r.state;
  updateMatchState(db, room.matchId, r.state, room.status);
  appendMatchEvent(db, room.matchId, { kind: 'claim-intercept', by: seat.seat }, r.events);
  broadcastStatePerSeat(io, room);
  broadcastEphemeral(io, room, r.events);
  return { ok: true };
}

export function maybeOpenInterceptWindow(
  db: DB, io: IoServer, room: Room,
): void {
  if (room.state.phase.kind !== 'intercept-window') return;
  const phase = room.state.phase;
  io.to(room.matchId).emit('intercept-window', {
    eligibleSeats: phase.eligible as SeatIndex[],
    deadlineMs: phase.deadlineMs,
  });
  setInterceptTimer(room, () => {
    // expire only if still in intercept-window
    if (room.state.phase.kind !== 'intercept-window') return;
    const r = engine(room.state, { kind: 'intercept-window-expired' });
    if (!r.ok) return;
    room.state = r.state;
    updateMatchState(db, room.matchId, r.state, room.status);
    appendMatchEvent(db, room.matchId, { kind: 'intercept-window-expired' }, r.events);
    broadcastStatePerSeat(io, room);
    broadcastEphemeral(io, room, r.events);
  }, INTERCEPT_WINDOW_MS);
}
