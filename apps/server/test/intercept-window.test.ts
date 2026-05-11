import { describe, it, expect } from 'vitest';
import { engine } from '../src/engine/index.js';
import type { GameState, Card, PlayerInfo } from '@kozel/shared';

const seats: PlayerInfo[] = [
  { playerId: 'p0', name: 'P0', seat: 0, connected: true },
  { playerId: 'p1', name: 'P1', seat: 1, connected: true },
  { playerId: 'p2', name: 'P2', seat: 2, connected: true },
  { playerId: 'p3', name: 'P3', seat: 3, connected: true },
];
const c = (rank: string, suit: string): Card =>
  ({ kind: 'normal', rank: rank as never, suit: suit as never, id: `${rank}-${suit}` });

describe('intercept window after draw', () => {
  it('after draw-cards, if any seat eligible → phase=intercept-window with deadlineMs', () => {
    const hands: Card[][] = [
      [c('A', 'spades')],
      ['6', '7', '8', '9', 'J', 'Q'].map((r) => c(r, 'hearts')),
      [c('K', 'clubs')],
      [c('Q', 'diamonds')],
    ];
    const state: GameState = {
      matchId: 'm', roomCode: 'R', seats, hands,
      stock: [], trump: null, trumpCardVisible: null,
      phase: { kind: 'between-tricks' }, currentTrick: null, nextLeader: 0,
      scores: { sdacha: { A: 0, B: 0 }, match: { A: 0, B: 0 } }, sdachaNumber: 1, log: [],
    };
    const r = engine(state, { kind: 'draw-cards' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.phase.kind).toBe('intercept-window');
      if (r.state.phase.kind === 'intercept-window') {
        expect(r.state.phase.eligible).toEqual([1]);
        expect(r.state.phase.deadlineMs).toBeGreaterThan(0);
      }
    }
  });

  it('after draw-cards, if no eligible → phase=lead', () => {
    const hands: Card[][] = [
      [c('A', 'spades'), c('K', 'hearts'), c('Q', 'diamonds'), c('J', 'clubs'), c('10', 'spades'), c('9', 'hearts')],
      [c('K', 'clubs'), c('Q', 'spades'), c('J', 'hearts'), c('10', 'diamonds'), c('9', 'clubs'), c('8', 'spades')],
      [c('Q', 'hearts'), c('J', 'diamonds'), c('10', 'clubs'), c('9', 'spades'), c('8', 'hearts'), c('7', 'diamonds')],
      [c('J', 'spades'), c('10', 'hearts'), c('9', 'diamonds'), c('8', 'clubs'), c('7', 'spades'), c('6', 'hearts')],
    ];
    const state: GameState = {
      matchId: 'm', roomCode: 'R', seats, hands,
      stock: [], trump: null, trumpCardVisible: null,
      phase: { kind: 'between-tricks' }, currentTrick: null, nextLeader: 0,
      scores: { sdacha: { A: 0, B: 0 }, match: { A: 0, B: 0 } }, sdachaNumber: 1, log: [],
    };
    const r = engine(state, { kind: 'draw-cards' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.phase.kind).toBe('lead');
  });
});
