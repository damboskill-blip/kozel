import type { GameState, SeatIndex } from '@kozel/shared';
import { randomFillSync } from 'node:crypto';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0,1,O,I

export function generateRoomCode(): string {
  const N = ROOM_CODE_ALPHABET.length;
  let out = '';
  const bytes = new Uint8Array(6);
  randomFillSync(bytes);
  for (let i = 0; i < 6; i++) out += ROOM_CODE_ALPHABET[bytes[i]! % N];
  return out;
}

export type SeatPresenceInternal = {
  seat: SeatIndex;
  playerId: string | null;
  name: string | null;
  connected: boolean;
  ready: boolean;
  socketId: string | null;
  disconnectedAt: number | null;
};

export type Room = {
  matchId: string;
  roomCode: string;
  state: GameState;
  status: 'lobby' | 'playing' | 'finished';
  seats: SeatPresenceInternal[];
  turnTimer: NodeJS.Timeout | null;
  interceptTimer: NodeJS.Timeout | null;
};

export class RoomRegistry {
  private byMatch = new Map<string, Room>();
  private byCode = new Map<string, Room>();

  register(room: Room): void {
    this.byMatch.set(room.matchId, room);
    this.byCode.set(room.roomCode, room);
  }

  unregister(matchId: string): void {
    const r = this.byMatch.get(matchId);
    if (!r) return;
    this.byMatch.delete(matchId);
    this.byCode.delete(r.roomCode);
    if (r.turnTimer) clearTimeout(r.turnTimer);
    if (r.interceptTimer) clearTimeout(r.interceptTimer);
  }

  byMatchId(id: string): Room | undefined { return this.byMatch.get(id); }
  byRoomCode(code: string): Room | undefined { return this.byCode.get(code); }
  all(): Room[] { return [...this.byMatch.values()]; }
}

export function emptySeats(): SeatPresenceInternal[] {
  return [0, 1, 2, 3].map((s) => ({
    seat: s as SeatIndex, playerId: null, name: null, connected: false,
    ready: false, socketId: null, disconnectedAt: null,
  }));
}
