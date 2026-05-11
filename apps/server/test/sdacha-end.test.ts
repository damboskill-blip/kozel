import { describe, it, expect } from 'vitest';
import { engine } from '../src/engine/index.js';
import type { GameState, PlayerInfo } from '@kozel/shared';

const seats: PlayerInfo[] = [
  { playerId: 'p0', name: 'P0', seat: 0, connected: true },
  { playerId: 'p1', name: 'P1', seat: 1, connected: true },
  { playerId: 'p2', name: 'P2', seat: 2, connected: true },
  { playerId: 'p3', name: 'P3', seat: 3, connected: true },
];

function endingState(opts: { sdacha: { A: number; B: number }; match: { A: number; B: number }; lastWinnerSeat: 0 | 1 | 2 | 3 }): GameState {
  return {
    matchId: 'm', roomCode: 'R', seats,
    hands: [[], [], [], []], stock: [], trump: null, trumpCardVisible: null,
    phase: { kind: 'sdacha-end' }, currentTrick: null,
    nextLeader: opts.lastWinnerSeat,
    scores: { sdacha: opts.sdacha, match: opts.match }, sdachaNumber: 3, log: [],
  };
}

describe('end-sdacha', () => {
  it('80:40 → B +2; not match end (12<18)', () => {
    const s = endingState({ sdacha: { A: 80, B: 40 }, match: { A: 6, B: 10 }, lastWinnerSeat: 0 });
    const r = engine(s, { kind: 'end-sdacha' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.scores.match).toEqual({ A: 6, B: 12 });
      expect(r.state.phase.kind).toBe('between-tricks');
    }
  });

  it('shutout 120:0 → B +6 → match end if B reaches 18', () => {
    const s = endingState({ sdacha: { A: 120, B: 0 }, match: { A: 0, B: 12 }, lastWinnerSeat: 0 });
    const r = engine(s, { kind: 'end-sdacha' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.scores.match).toEqual({ A: 0, B: 18 });
      expect(r.state.phase.kind).toBe('match-end');
      if (r.state.phase.kind === 'match-end') expect(r.state.phase.loser).toBe('B');
    }
  });

  it('60:60 → both +2', () => {
    const s = endingState({ sdacha: { A: 60, B: 60 }, match: { A: 4, B: 4 }, lastWinnerSeat: 1 });
    const r = engine(s, { kind: 'end-sdacha' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.scores.match).toEqual({ A: 6, B: 6 });
  });
});

describe('start-sdacha (next sdacha after end-sdacha)', () => {
  it('uses last-trick winner as nextLeader', () => {
    const after: GameState = {
      matchId: 'm', roomCode: 'R', seats,
      hands: [[], [], [], []], stock: [], trump: null, trumpCardVisible: null,
      phase: { kind: 'between-tricks' }, currentTrick: null,
      nextLeader: 2,
      scores: { sdacha: { A: 0, B: 0 }, match: { A: 6, B: 12 } }, sdachaNumber: 3, log: [],
    };
    const r = engine(after, { kind: 'start-sdacha', seed: 99 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.sdachaNumber).toBe(4);
      expect(r.state.nextLeader).toBe(2);
      expect(r.state.scores.sdacha).toEqual({ A: 0, B: 0 });
      expect(r.state.scores.match).toEqual({ A: 6, B: 12 });
      expect(r.state.hands[0]).toHaveLength(6);
    }
  });
});

describe('rematch', () => {
  it('resets match score, sdacha 1, fresh deal', () => {
    const ended: GameState = {
      matchId: 'm', roomCode: 'R', seats,
      hands: [[], [], [], []], stock: [], trump: null, trumpCardVisible: null,
      phase: { kind: 'match-end', loser: 'B' }, currentTrick: null, nextLeader: 0,
      scores: { sdacha: { A: 0, B: 0 }, match: { A: 12, B: 18 } }, sdachaNumber: 7, log: [],
    };
    const r = engine(ended, { kind: 'rematch', seed: 100 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.scores).toEqual({ sdacha: { A: 0, B: 0 }, match: { A: 0, B: 0 } });
      expect(r.state.sdachaNumber).toBe(1);
      expect(r.state.hands[0]).toHaveLength(6);
    }
  });
});
