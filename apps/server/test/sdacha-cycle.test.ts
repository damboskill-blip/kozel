import { describe, it, expect } from 'vitest';
import { engine } from '../src/engine/index.js';
import type { GameState, PlayerInfo } from '@kozel/shared';

const seats: PlayerInfo[] = [
  { playerId: 'p0', name: 'P0', seat: 0, connected: true },
  { playerId: 'p1', name: 'P1', seat: 1, connected: true },
  { playerId: 'p2', name: 'P2', seat: 2, connected: true },
  { playerId: 'p3', name: 'P3', seat: 3, connected: true },
];

describe('full sdacha cycle (engine-only, no socket)', () => {
  it('start-match → 6 tricks (all face-down) → end-sdacha → start-sdacha (next)', () => {
    const initial: GameState = {
      matchId: '', roomCode: '', seats: [],
      hands: [[], [], [], []], stock: [],
      trump: null, trumpCardVisible: null,
      phase: { kind: 'sdacha-end' }, currentTrick: null, nextLeader: 0,
      scores: { sdacha: { A: 0, B: 0 }, match: { A: 0, B: 0 } },
      sdachaNumber: 0, log: [],
    };
    let r = engine(initial, {
      kind: 'start-match', seed: 7, firstLeader: 0,
      matchId: 'm1', roomCode: 'CYC001', seats,
    });
    expect(r.ok).toBe(true); if (!r.ok) return;
    let state = r.state;

    // Play 6 tricks blindly: leader leads first card, others skid first.
    while (state.phase.kind !== 'sdacha-end') {
      if (state.phase.kind === 'lead') {
        const leader = state.phase.leader;
        const card = state.hands[leader]![0]!.id;
        r = engine(state, { kind: 'lead', by: leader, cardIds: [card] });
        if (!r.ok) throw new Error(`lead fail: ${r.error}`);
        state = r.state;
      } else if (state.phase.kind === 'follow') {
        const next = state.phase.next;
        const card = state.hands[next]![0]!.id;
        r = engine(state, { kind: 'follow', by: next, cardIds: [card], faceDown: true });
        if (!r.ok) throw new Error(`follow fail: ${r.error}`);
        state = r.state;
      } else if (state.phase.kind === 'extra-round') {
        const seat = state.currentTrick!.extraRound!.nextToAsk;
        r = engine(state, { kind: 'extra-pass', by: seat });
        if (!r.ok) throw new Error(`pass fail: ${r.error}`);
        state = r.state;
      } else if (state.phase.kind === 'between-tricks') {
        r = engine(state, { kind: 'close-trick' });
        if (!r.ok) throw new Error('close fail');
        state = r.state;
        r = engine(state, { kind: 'draw-cards' });
        if (!r.ok) throw new Error('draw fail');
        state = r.state;
      } else if (state.phase.kind === 'intercept-window') {
        r = engine(state, { kind: 'intercept-window-expired' });
        if (!r.ok) throw new Error('expire fail');
        state = r.state;
      } else {
        throw new Error(`unexpected phase: ${state.phase.kind}`);
      }
    }

    expect(state.phase.kind).toBe('sdacha-end');
    r = engine(state, { kind: 'end-sdacha' });
    expect(r.ok).toBe(true); if (!r.ok) return;
    state = r.state;
    expect(state.phase.kind).toMatch(/between-tricks|match-end/);

    if (state.phase.kind === 'between-tricks') {
      r = engine(state, { kind: 'start-sdacha', seed: 8 });
      expect(r.ok).toBe(true); if (!r.ok) return;
      state = r.state;
      expect(state.sdachaNumber).toBe(2);
      expect(state.hands[0]).toHaveLength(6);
    }
  });
});
