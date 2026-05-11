import { describe, it, expect } from 'vitest';
import { engine } from '../src/engine/index.js';
import type { GameState, Action, PlayerInfo, SeatIndex } from '@kozel/shared';

const seats: PlayerInfo[] = [
  { playerId: 'p0', name: 'P0', seat: 0, connected: true },
  { playerId: 'p1', name: 'P1', seat: 1, connected: true },
  { playerId: 'p2', name: 'P2', seat: 2, connected: true },
  { playerId: 'p3', name: 'P3', seat: 3, connected: true },
];

function startMatch(seed: number, firstLeader: SeatIndex): GameState {
  const initial: GameState = {
    matchId: '',
    roomCode: '',
    seats: [],
    hands: [[], [], [], []],
    stock: [],
    trump: null,
    trumpCardVisible: null,
    phase: { kind: 'sdacha-end' },
    currentTrick: null,
    nextLeader: 0,
    scores: { sdacha: { A: 0, B: 0 }, match: { A: 0, B: 0 } },
    sdachaNumber: 0,
    log: [],
  };
  const startAction: Action = {
    kind: 'start-match',
    seed,
    firstLeader,
    matchId: 'm1',
    roomCode: 'TEST',
    seats,
  };
  const r = engine(initial, startAction);
  if (!r.ok) throw new Error(`start-match failed: ${r.error}`);
  return r.state;
}

describe('start-match → start-sdacha', () => {
  it('deals 6 cards to each of 4 players', () => {
    const state = startMatch(42, 0);
    expect(state.hands[0]).toHaveLength(6);
    expect(state.hands[1]).toHaveLength(6);
    expect(state.hands[2]).toHaveLength(6);
    expect(state.hands[3]).toHaveLength(6);
  });

  it('leaves 12 cards in stock', () => {
    const state = startMatch(42, 0);
    expect(state.stock).toHaveLength(12);
  });

  it('sets trumpCardVisible to last (bottom) card of stock', () => {
    const state = startMatch(42, 0);
    expect(state.trumpCardVisible).toEqual(state.stock[state.stock.length - 1]);
  });

  it('sets trump to suit of bottom card if normal', () => {
    const state = startMatch(42, 0);
    if (state.trumpCardVisible?.kind === 'normal') {
      expect(state.trump).toBe(state.trumpCardVisible.suit);
    } else {
      expect(state.trump).toBeNull();
    }
  });

  it('sets phase to intercept-window or lead with firstLeader', () => {
    const state = startMatch(42, 0);
    expect(['intercept-window', 'lead']).toContain(state.phase.kind);
    if (state.phase.kind === 'lead') {
      expect(state.phase.leader).toBe(0);
    }
  });

  it('uses all 36 cards exactly once across hands+stock', () => {
    const state = startMatch(42, 0);
    const all = [...state.hands.flat(), ...state.stock];
    expect(all).toHaveLength(36);
    const ids = all.map((c) => c.id);
    expect(new Set(ids).size).toBe(36);
  });

  it('is deterministic for same seed', () => {
    const a = startMatch(123, 0);
    const b = startMatch(123, 0);
    expect(a.hands).toEqual(b.hands);
    expect(a.stock).toEqual(b.stock);
  });

  it('is different for different seed', () => {
    const a = startMatch(1, 0);
    const b = startMatch(2, 0);
    expect(a.hands).not.toEqual(b.hands);
  });

  it('sets sdachaNumber to 1', () => {
    const state = startMatch(42, 0);
    expect(state.sdachaNumber).toBe(1);
  });

  it('sets nextLeader to firstLeader', () => {
    const state = startMatch(42, 2);
    expect(state.nextLeader).toBe(2);
  });

  it('sets matchId, roomCode, seats from action', () => {
    const state = startMatch(42, 0);
    expect(state.matchId).toBe('m1');
    expect(state.roomCode).toBe('TEST');
    expect(state.seats).toEqual(seats);
  });
});
