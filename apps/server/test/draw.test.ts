import { describe, it, expect } from 'vitest';
import { engine } from '../src/engine/index.js';
import type { GameState, Card, PlayerInfo, Trick } from '@kozel/shared';

const seats: PlayerInfo[] = [
  { playerId: 'p0', name: 'P0', seat: 0, connected: true },
  { playerId: 'p1', name: 'P1', seat: 1, connected: true },
  { playerId: 'p2', name: 'P2', seat: 2, connected: true },
  { playerId: 'p3', name: 'P3', seat: 3, connected: true },
];
const c = (rank: string, suit: string): Card =>
  ({ kind: 'normal', rank: rank as never, suit: suit as never, id: `${rank}-${suit}` });

describe('close-trick + draw-cards', () => {
  it('winner team gets points; nextLeader = winner; players draw to 6', () => {
    const trick: Trick = {
      leadCount: 1, leadSuit: 'hearts',
      played: [
        { by: 0, cards: [c('A', 'hearts')], faceDown: false },
        { by: 1, cards: [c('6', 'diamonds')], faceDown: true },
        { by: 2, cards: [c('K', 'hearts')], faceDown: false },
        { by: 3, cards: [c('Q', 'hearts')], faceDown: false },
      ],
      topIndex: 0, lockedFromBeating: [1],
      extraRound: { asked: [1, 2, 3], nextToAsk: 1 },
    };
    const state: GameState = {
      matchId: 'm', roomCode: 'R', seats,
      hands: [
        ['7-hearts', '8-hearts', '9-hearts', '10-hearts'].map((id) => {
          const [r, s] = id.split('-'); return c(r!, s!);
        }),
        [c('7', 'spades'), c('8', 'spades'), c('9', 'spades')],
        [c('7', 'clubs'), c('8', 'clubs')],
        [c('7', 'diamonds')],
      ],
      stock: [
        c('J', 'spades'), c('Q', 'spades'), c('K', 'spades'),
        c('J', 'clubs'), c('Q', 'clubs'), c('K', 'clubs'),
        c('A', 'spades'),
      ],
      trump: 'spades', trumpCardVisible: c('A', 'spades'),
      phase: { kind: 'between-tricks' },
      currentTrick: trick, nextLeader: 0,
      scores: { sdacha: { A: 0, B: 0 }, match: { A: 0, B: 0 } },
      sdachaNumber: 1, log: [],
    };

    let r = engine(state, { kind: 'close-trick' });
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.state.scores.sdacha).toEqual({ A: 18, B: 0 });
    expect(r.state.nextLeader).toBe(0);
    expect(r.state.currentTrick).toBeNull();

    r = engine(r.state, { kind: 'draw-cards' });
    expect(r.ok).toBe(true); if (!r.ok) return;
    // Round-robin refill, starting from seat 0 (winner):
    // Initial deficits: 2, 3, 4, 5. Stock = 7.
    // Round 1: each seat draws 1 → hands 5,4,3,2 ; stock 3.
    // Round 2: seat 0,1,2 draw 1 each, stock=0 → 6,5,4,2 ; seat 3 misses.
    expect(r.state.hands[0]).toHaveLength(6);
    expect(r.state.hands[1]).toHaveLength(5);
    expect(r.state.hands[2]).toHaveLength(4);
    expect(r.state.hands[3]).toHaveLength(2);
    expect(r.state.stock).toHaveLength(0);
    expect(r.state.phase.kind).toBe('lead');
  });

  it('sdacha ends early when stock empty and any hand depletes to 0', () => {
    // After the trick, seat 3 will be the only one with 0 cards. With stock
    // already empty, future tricks cannot collect 4 legal plays, so draw-cards
    // should transition to sdacha-end (rather than `lead`) to avoid a stuck
    // game where it's the empty seat's turn to follow.
    const trick: Trick = {
      leadCount: 1, leadSuit: 'hearts',
      played: [
        { by: 0, cards: [c('A', 'hearts')], faceDown: false },
        { by: 1, cards: [c('K', 'hearts')], faceDown: false },
        { by: 2, cards: [c('Q', 'hearts')], faceDown: false },
        { by: 3, cards: [c('J', 'hearts')], faceDown: false },
      ],
      topIndex: 0, lockedFromBeating: [],
      extraRound: { asked: [1, 2, 3], nextToAsk: 1 },
    };
    const state: GameState = {
      matchId: 'm', roomCode: 'R', seats,
      hands: [
        [c('7', 'hearts'), c('8', 'hearts')],
        [c('7', 'spades'), c('8', 'spades')],
        [c('7', 'clubs')],
        [],
      ],
      stock: [],
      trump: null, trumpCardVisible: null,
      phase: { kind: 'between-tricks' },
      currentTrick: trick, nextLeader: 0,
      scores: { sdacha: { A: 0, B: 0 }, match: { A: 0, B: 0 } },
      sdachaNumber: 1, log: [],
    };
    let r = engine(state, { kind: 'close-trick' });
    expect(r.ok).toBe(true); if (!r.ok) return;
    r = engine(r.state, { kind: 'draw-cards' });
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.state.phase.kind).toBe('sdacha-end');
  });
});
