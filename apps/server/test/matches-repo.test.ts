import { describe, it, expect, beforeEach } from 'vitest';
import type { Database } from 'better-sqlite3';
import { openDb } from '../src/db/index.js';
import {
  createMatch, getMatchByRoomCode, getMatchById, updateMatchState,
  appendMatchEvent, listMatchEvents, setSeatPlayer, getSeats, setSeatReady,
  listActiveMatches, finalizeMatch,
} from '../src/db/repo-matches.js';
import { createPlayer } from '../src/db/repo-players.js';
import type { GameState } from '@kozel/shared';

function dummyState(): GameState {
  return {
    matchId: 'X', roomCode: 'X', seats: [],
    hands: [[], [], [], []], stock: [],
    trump: null, trumpCardVisible: null,
    phase: { kind: 'sdacha-end' }, currentTrick: null, nextLeader: 0,
    scores: { sdacha: { A: 0, B: 0 }, match: { A: 0, B: 0 } },
    sdachaNumber: 0, log: [],
  };
}

describe('matches repo', () => {
  let db: Database;
  beforeEach(() => { db = openDb(':memory:'); });

  it('createMatch stores id+room_code+state+status=lobby and seeds 4 empty seats', () => {
    const m = createMatch(db, 'ABC123', dummyState());
    expect(m.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(m.roomCode).toBe('ABC123');
    expect(m.status).toBe('lobby');

    const seats = getSeats(db, m.id);
    expect(seats).toHaveLength(4);
    for (const s of seats) {
      expect(s.player_id).toBeNull();
      expect(s.ready).toBe(0);
    }
  });

  it('getMatchByRoomCode returns the match with state parsed', () => {
    const created = createMatch(db, 'ROOM01', dummyState());
    const got = getMatchByRoomCode(db, 'ROOM01');
    expect(got!.id).toBe(created.id);
    expect(got!.state.phase.kind).toBe('sdacha-end');
  });

  it('updateMatchState persists JSON state and bumps updated_at', () => {
    const m = createMatch(db, 'ROOM02', dummyState());
    const newState = { ...dummyState(), sdachaNumber: 5 };
    updateMatchState(db, m.id, newState, 'playing');
    const after = getMatchById(db, m.id)!;
    expect(after.state.sdachaNumber).toBe(5);
    expect(after.status).toBe('playing');
  });

  it('appendMatchEvent increments seq and lists events in order', () => {
    const m = createMatch(db, 'ROOM03', dummyState());
    appendMatchEvent(db, m.id, { kind: 'start-sdacha', seed: 1 } as any, []);
    appendMatchEvent(db, m.id, { kind: 'lead', by: 0, cardIds: ['A-hearts'] } as any, []);
    const events = listMatchEvents(db, m.id);
    expect(events).toHaveLength(2);
    expect(events[0]!.seq).toBe(1);
    expect(events[1]!.seq).toBe(2);
    expect((events[1]!.action as any).kind).toBe('lead');
  });

  it('setSeatPlayer assigns a player to a seat', () => {
    const m = createMatch(db, 'ROOM04', dummyState());
    const p = createPlayer(db, 'Alice');
    setSeatPlayer(db, m.id, 1, p.id);
    const seats = getSeats(db, m.id);
    expect(seats.find((s) => s.seat === 1)!.player_id).toBe(p.id);
  });

  it('setSeatReady toggles ready flag', () => {
    const m = createMatch(db, 'ROOM05', dummyState());
    const p = createPlayer(db, 'Bob');
    setSeatPlayer(db, m.id, 2, p.id);
    setSeatReady(db, m.id, 2, true);
    expect(getSeats(db, m.id).find((s) => s.seat === 2)!.ready).toBe(1);
    setSeatReady(db, m.id, 2, false);
    expect(getSeats(db, m.id).find((s) => s.seat === 2)!.ready).toBe(0);
  });

  it('listActiveMatches returns matches with status != finished', () => {
    const a = createMatch(db, 'A1', dummyState());
    const b = createMatch(db, 'B1', dummyState());
    updateMatchState(db, b.id, dummyState(), 'playing');
    const c = createMatch(db, 'C1', dummyState());
    finalizeMatch(db, c.id);
    const active = listActiveMatches(db);
    expect(active.map((m) => m.id).sort()).toEqual([a.id, b.id].sort());
  });
});
