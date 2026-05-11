import { describe, it, expect } from 'vitest';
import { engine } from '../src/engine/index.js';
import type { GameState, Card, PlayerInfo, SeatIndex } from '@kozel/shared';

const seats: PlayerInfo[] = [
  { playerId: 'p0', name: 'P0', seat: 0, connected: true },
  { playerId: 'p1', name: 'P1', seat: 1, connected: true },
  { playerId: 'p2', name: 'P2', seat: 2, connected: true },
  { playerId: 'p3', name: 'P3', seat: 3, connected: true },
];

function makeState(opts: {
  hand0: Card[];
  trump?: 'spades' | 'hearts' | 'diamonds' | 'clubs' | null;
  leader?: SeatIndex;
}): GameState {
  return {
    matchId: 'm', roomCode: 'R', seats,
    hands: [opts.hand0, [], [], []],
    stock: [],
    trump: opts.trump ?? null,
    trumpCardVisible: null,
    phase: { kind: 'lead', leader: opts.leader ?? 0 },
    currentTrick: null,
    nextLeader: opts.leader ?? 0,
    scores: { sdacha: { A: 0, B: 0 }, match: { A: 0, B: 0 } },
    sdachaNumber: 1, log: [],
  };
}

const c = (rank: string, suit: string): Card =>
  ({ kind: 'normal', rank: rank as never, suit: suit as never, id: `${rank}-${suit}` });
const j = (n: 1 | 2): Card => ({ kind: 'joker', id: `joker-${n}` });

describe('engine: lead action', () => {
  it('accepts single-card lead', () => {
    const s = makeState({ hand0: [c('A', 'hearts'), c('K', 'spades')] });
    const r = engine(s, { kind: 'lead', by: 0, cardIds: ['A-hearts'] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.currentTrick).not.toBeNull();
      expect(r.state.currentTrick!.leadCount).toBe(1);
      expect(r.state.currentTrick!.leadSuit).toBe('hearts');
      expect(r.state.currentTrick!.played).toHaveLength(1);
      expect(r.state.currentTrick!.played[0]!.cards[0]!.id).toBe('A-hearts');
      expect(r.state.hands[0]).toHaveLength(1);
      expect(r.state.phase.kind).toBe('follow');
    }
  });

  it('accepts multi-card lead all same suit', () => {
    const s = makeState({ hand0: [c('A', 'hearts'), c('K', 'hearts'), c('Q', 'hearts')] });
    const r = engine(s, { kind: 'lead', by: 0, cardIds: ['A-hearts', 'K-hearts', 'Q-hearts'] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.currentTrick!.leadCount).toBe(3);
      expect(r.state.currentTrick!.leadSuit).toBe('hearts');
    }
  });

  it('accepts mixed suit + joker (joker covers the suit)', () => {
    const s = makeState({ hand0: [c('A', 'hearts'), c('K', 'hearts'), j(1)] });
    const r = engine(s, { kind: 'lead', by: 0, cardIds: ['A-hearts', 'K-hearts', 'joker-1'] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.currentTrick!.leadSuit).toBe('hearts');
    }
  });

  it('accepts pure joker lead → leadSuit = joker-only', () => {
    const s = makeState({ hand0: [j(1), j(2)] });
    const r = engine(s, { kind: 'lead', by: 0, cardIds: ['joker-1', 'joker-2'] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.currentTrick!.leadSuit).toBe('joker-only');
      expect(r.state.currentTrick!.leadCount).toBe(2);
    }
  });

  it('rejects lead of mixed suits (hearts + spades)', () => {
    const s = makeState({ hand0: [c('A', 'hearts'), c('K', 'spades')] });
    const r = engine(s, { kind: 'lead', by: 0, cardIds: ['A-hearts', 'K-spades'] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid-lead-suit-mix');
  });

  it('rejects lead with 0 cards', () => {
    const s = makeState({ hand0: [c('A', 'hearts')] });
    const r = engine(s, { kind: 'lead', by: 0, cardIds: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('wrong-card-count');
  });

  it('rejects lead with 7+ cards', () => {
    const hand: Card[] = ['7', '8', '9', '10', 'J', 'Q', 'K'].map((r) => c(r, 'hearts'));
    const s = makeState({ hand0: hand });
    const r = engine(s, {
      kind: 'lead', by: 0,
      cardIds: ['7-hearts', '8-hearts', '9-hearts', '10-hearts', 'J-hearts', 'Q-hearts', 'K-hearts'],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('wrong-card-count');
  });

  it("rejects lead from cards not in player's hand", () => {
    const s = makeState({ hand0: [c('A', 'hearts')] });
    const r = engine(s, { kind: 'lead', by: 0, cardIds: ['K-spades'] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('cards-not-in-hand');
  });

  it('rejects lead by non-leader', () => {
    const s = makeState({ hand0: [c('A', 'hearts')], leader: 1 });
    const r = engine(s, { kind: 'lead', by: 0, cardIds: ['A-hearts'] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('not-your-turn');
  });

  it('rejects lead when not in lead phase', () => {
    const s = makeState({ hand0: [c('A', 'hearts')] });
    const sBad: GameState = { ...s, phase: { kind: 'follow', next: 0 } };
    const r = engine(sBad, { kind: 'lead', by: 0, cardIds: ['A-hearts'] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid-action-for-phase');
  });

  it('after lead, phase=follow with next=clockwise from leader', () => {
    const s = makeState({ hand0: [c('A', 'hearts')], leader: 0 });
    const r = engine(s, { kind: 'lead', by: 0, cardIds: ['A-hearts'] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.phase.kind).toBe('follow');
      if (r.state.phase.kind === 'follow') {
        expect(r.state.phase.next).toBe(1);
      }
    }
  });
});
