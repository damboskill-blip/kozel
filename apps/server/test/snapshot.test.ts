import { describe, it, expect } from 'vitest';
import { engine } from '../src/engine/index.js';
import { dealNewSdacha } from '../src/engine/deal.js';
import type { PlayerInfo, GameState } from '@kozel/shared';

const seats: PlayerInfo[] = [
  { playerId: 'p0', name: 'P0', seat: 0, connected: true },
  { playerId: 'p1', name: 'P1', seat: 1, connected: true },
  { playerId: 'p2', name: 'P2', seat: 2, connected: true },
  { playerId: 'p3', name: 'P3', seat: 3, connected: true },
];

describe('snapshot: deterministic single trick', () => {
  it('match-start with seed=42 produces stable hands and trump', () => {
    const dealt = dealNewSdacha(42);
    expect(dealt.hands.map((h) => h.map((c) => c.id))).toMatchSnapshot();
    expect(dealt.trump).toMatchSnapshot();
  });

  it('start-match → 4× face-down skid → close → draw → produces stable state', () => {
    const initial: GameState = {
      matchId: '', roomCode: '', seats: [],
      hands: [[], [], [], []], stock: [],
      trump: null, trumpCardVisible: null,
      phase: { kind: 'sdacha-end' }, currentTrick: null, nextLeader: 0,
      scores: { sdacha: { A: 0, B: 0 }, match: { A: 0, B: 0 } },
      sdachaNumber: 0, log: [],
    };
    let r = engine(initial, {
      kind: 'start-match', seed: 42, firstLeader: 0,
      matchId: 'snap-m', roomCode: 'SNAP', seats,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    let state = r.state;

    const lead = state.hands[0]![0]!.id;
    r = engine(state, { kind: 'lead', by: 0, cardIds: [lead] });
    expect(r.ok).toBe(true); if (!r.ok) return; state = r.state;

    for (const seat of [1, 2, 3] as const) {
      const card = state.hands[seat]![0]!.id;
      r = engine(state, { kind: 'follow', by: seat, cardIds: [card], faceDown: true });
      expect(r.ok).toBe(true); if (!r.ok) return; state = r.state;
    }

    r = engine(state, { kind: 'extra-pass', by: 1 });
    expect(r.ok).toBe(true); if (!r.ok) return; state = r.state;
    r = engine(state, { kind: 'extra-pass', by: 2 });
    expect(r.ok).toBe(true); if (!r.ok) return; state = r.state;
    r = engine(state, { kind: 'extra-pass', by: 3 });
    expect(r.ok).toBe(true); if (!r.ok) return; state = r.state;

    expect(state.phase.kind).toBe('between-tricks');

    r = engine(state, { kind: 'close-trick' });
    expect(r.ok).toBe(true); if (!r.ok) return; state = r.state;

    r = engine(state, { kind: 'draw-cards' });
    expect(r.ok).toBe(true); if (!r.ok) return; state = r.state;

    expect({
      handsCount: state.hands.map((h) => h.length),
      stockCount: state.stock.length,
      trump: state.trump,
      phase: state.phase.kind,
      scores: state.scores,
      nextLeader: state.nextLeader,
    }).toMatchSnapshot();
  });
});
