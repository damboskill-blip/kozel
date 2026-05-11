import type { Socket } from 'socket.io';
import type { DB } from '../../db/index.js';
import type { RoomRegistry, Room } from '../../lifecycle/room.js';
import { generateRoomCode, emptySeats } from '../../lifecycle/room.js';
import { createMatch, getMatchByRoomCode } from '../../db/repo-matches.js';
import { freshGameState } from '../../engine/deal.js';
import { projectStateForSeat } from '../../engine/projection.js';
import type { RoomSnapshot, SeatPresence, SeatIndex, SocketData } from '@kozel/shared';

function roomSnapshot(room: Room, mySeat: number | null): RoomSnapshot {
  const seats: SeatPresence[] = room.seats.map((s) => ({
    seat: s.seat, playerId: s.playerId, name: s.name,
    connected: s.connected, ready: s.ready,
  }));
  const state = mySeat !== null && room.status === 'playing'
    ? projectStateForSeat(room.state, mySeat as SeatIndex)
    : null;
  return {
    roomCode: room.roomCode,
    matchId: room.matchId,
    status: room.status,
    mySeat: mySeat === null ? null : (mySeat as 0 | 1 | 2 | 3),
    seats,
    state,
  };
}

export function handleCreateRoom(
  db: DB, registry: RoomRegistry, socket: Socket,
): { roomCode: string } | { error: string } {
  let code: string | null = null;
  for (let i = 0; i < 20; i++) {
    const candidate = generateRoomCode();
    if (!getMatchByRoomCode(db, candidate) && !registry.byRoomCode(candidate)) {
      code = candidate;
      break;
    }
  }
  if (!code) return { error: 'codegen-exhausted' };

  // Engine state placeholder — full deal happens on `ready` → start-match in Task 13.
  const placeholder = freshGameState({
    seed: 0, firstLeader: 0, matchId: '', roomCode: code,
    seats: [], sdachaNumber: 0, matchScores: { A: 0, B: 0 },
  });
  placeholder.phase = { kind: 'sdacha-end' };
  placeholder.sdachaNumber = 0;
  placeholder.hands = [[], [], [], []];
  placeholder.stock = [];
  placeholder.trump = null;
  placeholder.trumpCardVisible = null;

  const m = createMatch(db, code, placeholder);
  const room: Room = {
    matchId: m.id,
    roomCode: m.roomCode,
    state: placeholder,
    status: 'lobby',
    seats: emptySeats(),
    turnTimer: null,
    interceptTimer: null,
  };
  registry.register(room);

  // Auto-join the creator's socket to the room (without taking a seat yet).
  const data = socket.data as SocketData;
  data.matchId = m.id;
  socket.join(m.id);

  return { roomCode: code };
}

export function handleJoinRoom(
  db: DB, registry: RoomRegistry, socket: Socket, raw: { roomCode: string },
): RoomSnapshot | { error: string } {
  const code = raw.roomCode;
  let room = registry.byRoomCode(code);
  if (!room) {
    const dbMatch = getMatchByRoomCode(db, code);
    if (!dbMatch) return { error: 'unknown-room' };
    room = {
      matchId: dbMatch.id,
      roomCode: dbMatch.roomCode,
      state: dbMatch.state,
      status: dbMatch.status,
      seats: emptySeats(),
      turnTimer: null,
      interceptTimer: null,
    };
    registry.register(room);
  }
  const data = socket.data as SocketData;
  data.matchId = room.matchId;
  socket.join(room.matchId);
  // Find existing seat for this playerId (e.g. reconnecting) and mark connected.
  let mySeat: number | null = null;
  for (const s of room.seats) {
    if (s.playerId === data.playerId) {
      s.connected = true;
      s.socketId = socket.id;
      s.disconnectedAt = null;
      mySeat = s.seat;
    }
  }
  return roomSnapshot(room, mySeat);
}

import { setSeatPlayer } from '../../db/repo-matches.js';
import { findPlayerById } from '../../db/repo-players.js';

export function broadcastSeats(io: import('socket.io').Server, room: Room): void {
  const seats: SeatPresence[] = room.seats.map((s) => ({
    seat: s.seat, playerId: s.playerId, name: s.name,
    connected: s.connected, ready: s.ready,
  }));
  io.to(room.matchId).emit('seats-updated', { seats });
}

export function handleTakeSeat(
  db: DB, registry: RoomRegistry, socket: Socket, seat: SeatIndex,
): { ok: true } | { error: string } {
  const data = socket.data as SocketData;
  if (!data.matchId) return { error: 'not-in-room' };
  const room = registry.byMatchId(data.matchId);
  if (!room) return { error: 'not-in-room' };
  if (room.status !== 'lobby') return { error: 'match-already-started' };

  const target = room.seats[seat]!;
  if (target.playerId && target.playerId !== data.playerId) return { error: 'seat-occupied' };

  // Remove player from any previous seat.
  for (const s of room.seats) {
    if (s.playerId === data.playerId) {
      s.playerId = null; s.name = null; s.connected = false;
      s.ready = false; s.socketId = null;
      setSeatPlayer(db, room.matchId, s.seat, null);
    }
  }
  const player = findPlayerById(db, data.playerId)!;
  target.playerId = data.playerId;
  target.name = player.name;
  target.connected = true;
  target.ready = false;
  target.socketId = socket.id;
  setSeatPlayer(db, room.matchId, seat, data.playerId);
  return { ok: true };
}

export function handleLeaveSeat(
  db: DB, registry: RoomRegistry, socket: Socket,
): { ok: true } | { error: string } {
  const data = socket.data as SocketData;
  if (!data.matchId) return { error: 'not-in-room' };
  const room = registry.byMatchId(data.matchId);
  if (!room) return { error: 'not-in-room' };
  if (room.status !== 'lobby') return { error: 'match-already-started' };
  for (const s of room.seats) {
    if (s.playerId === data.playerId) {
      s.playerId = null; s.name = null; s.connected = false;
      s.ready = false; s.socketId = null;
      setSeatPlayer(db, room.matchId, s.seat, null);
    }
  }
  return { ok: true };
}

import { updateMatchState, setSeatReady, appendMatchEvent } from '../../db/repo-matches.js';
import type { PlayerInfo } from '@kozel/shared';
import { engine } from '../../engine/index.js';

export function handleReady(
  db: DB, registry: RoomRegistry, socket: Socket, ready: boolean,
): { ok: true } | { error: string } {
  const data = socket.data as SocketData;
  if (!data.matchId) return { error: 'not-in-room' };
  const room = registry.byMatchId(data.matchId);
  if (!room) return { error: 'not-in-room' };
  if (room.status !== 'lobby') return { error: 'match-already-started' };
  const seat = room.seats.find((s) => s.playerId === data.playerId);
  if (!seat) return { error: 'not-seated' };
  seat.ready = ready;
  setSeatReady(db, room.matchId, seat.seat, ready);
  return { ok: true };
}

export async function tryStartMatch(
  db: DB, io: import('socket.io').Server, room: Room,
): Promise<boolean> {
  if (room.status !== 'lobby') return false;
  const seated = room.seats.every((s) => s.playerId !== null && s.ready);
  if (!seated) return false;

  const seats: PlayerInfo[] = room.seats.map((s) => ({
    playerId: s.playerId!,
    name: s.name ?? `Seat ${s.seat}`,
    seat: s.seat,
    connected: s.connected,
  }));
  const seed = Math.floor(Math.random() * 0xffffffff);
  const firstLeader = (seed % 4) as 0 | 1 | 2 | 3;

  const action = {
    kind: 'start-match' as const,
    seed,
    firstLeader,
    matchId: room.matchId,
    roomCode: room.roomCode,
    seats,
  };
  const r = engine(room.state, action);
  if (!r.ok) return false;
  room.state = r.state;
  room.status = 'playing';
  updateMatchState(db, room.matchId, r.state, 'playing');
  appendMatchEvent(db, room.matchId, action, r.events);
  io.to(room.matchId).emit('match-started', {
    matchId: room.matchId,
    sdachaNumber: r.state.sdachaNumber,
  });
  // Broadcast initial per-seat state.
  for (const s of room.seats) {
    if (!s.socketId) continue;
    const projected = projectStateForSeat(r.state, s.seat);
    io.to(s.socketId).emit('state-update', { state: projected });
  }
  io.to(room.matchId).emit('ephemeral', { events: r.events });
  const { scheduleTurnTimer } = await import('../../lifecycle/auto-turn.js');
  const { broadcastStatePerSeat } = await import('../broadcast.js');
  scheduleTurnTimer(db, io, room, (rr) => broadcastStatePerSeat(io, rr));
  return true;
}
