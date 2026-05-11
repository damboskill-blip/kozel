import { describe, it, expect } from 'vitest';
import { interceptEligible, isHandInterceptEligible } from '../src/engine/intercept.js';
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
const j = (n: 1 | 2): Card => ({ kind: 'joker', id: `joker-${n}` });

describe('isHandInterceptEligible', () => {
  it('6 cards same suit → eligible', () => {
    const hand = ['6', '7', '8', '9', 'J', 'Q'].map((r) => c(r, 'hearts'));
    expect(isHandInterceptEligible(hand)).toBe(true);
  });
  it('5 cards same suit → eligible', () => {
    const hand = [c('6', 'hearts'), c('7', 'hearts'), c('8', 'hearts'), c('9', 'hearts'), c('J', 'hearts'), c('A', 'spades')];
    expect(isHandInterceptEligible(hand)).toBe(true);
  });
  it('4 cards same suit → not eligible', () => {
    const hand = [c('6', 'hearts'), c('7', 'hearts'), c('8', 'hearts'), c('9', 'hearts'), c('A', 'spades'), c('K', 'clubs')];
    expect(isHandInterceptEligible(hand)).toBe(false);
  });
  it('5 hearts + 1 joker → eligible (joker counts as hearts → 6 of suit)', () => {
    const hand = [c('6', 'hearts'), c('7', 'hearts'), c('8', 'hearts'), c('9', 'hearts'), c('J', 'hearts'), j(1)];
    expect(isHandInterceptEligible(hand)).toBe(true);
  });
  it('4 hearts + 1 joker → eligible (4+1=5 of suit)', () => {
    const hand = [c('6', 'hearts'), c('7', 'hearts'), c('8', 'hearts'), c('9', 'hearts'), j(1), c('A', 'spades')];
    expect(isHandInterceptEligible(hand)).toBe(true);
  });
  it('3 hearts + 1 joker → not eligible (3+1=4 of suit)', () => {
    const hand = [c('6', 'hearts'), c('7', 'hearts'), c('8', 'hearts'), j(1), c('A', 'spades'), c('K', 'clubs')];
    expect(isHandInterceptEligible(hand)).toBe(false);
  });
  it('2 jokers + 3 hearts → eligible (3+2=5)', () => {
    const hand = [c('6', 'hearts'), c('7', 'hearts'), c('8', 'hearts'), j(1), j(2), c('A', 'spades')];
    expect(isHandInterceptEligible(hand)).toBe(true);
  });
});

describe('interceptEligible(hands) → seats', () => {
  it('returns all seats with eligibility', () => {
    const hands: Card[][] = [
      ['6', '7', '8', '9', 'J', 'Q'].map((r) => c(r, 'hearts')),
      [c('A', 'spades'), c('K', 'clubs'), c('Q', 'diamonds'), c('J', 'hearts'), c('10', 'spades'), c('9', 'clubs')],
      ['6', '7', '8', '9', 'J'].map((r) => c(r, 'spades')).concat([c('A', 'clubs')]),
      [],
    ];
    expect(interceptEligible(hands)).toEqual([0, 2]);
  });
});

describe('engine: claim-intercept', () => {
  it('eligible player can claim → becomes leader, phase = lead', () => {
    const hand: Card[] = ['6', '7', '8', '9', 'J', 'Q'].map((r) => c(r, 'hearts'));
    const state: GameState = {
      matchId: 'm', roomCode: 'R', seats,
      hands: [hand, [], [], []],
      stock: [], trump: null, trumpCardVisible: null,
      phase: { kind: 'intercept-window', eligible: [0], deadlineMs: 1_000_000_000 },
      currentTrick: null, nextLeader: 2,
      scores: { sdacha: { A: 0, B: 0 }, match: { A: 0, B: 0 } }, sdachaNumber: 1, log: [],
    };
    const r = engine(state, { kind: 'claim-intercept', by: 0 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.phase.kind).toBe('lead');
      if (r.state.phase.kind === 'lead') expect(r.state.phase.leader).toBe(0);
      expect(r.state.nextLeader).toBe(0);
    }
  });

  it('non-eligible player cannot claim', () => {
    const state: GameState = {
      matchId: 'm', roomCode: 'R', seats,
      hands: [[], [], [], []],
      stock: [], trump: null, trumpCardVisible: null,
      phase: { kind: 'intercept-window', eligible: [0], deadlineMs: 1_000_000_000 },
      currentTrick: null, nextLeader: 2,
      scores: { sdacha: { A: 0, B: 0 }, match: { A: 0, B: 0 } }, sdachaNumber: 1, log: [],
    };
    const r = engine(state, { kind: 'claim-intercept', by: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('not-eligible-for-intercept');
  });

  it('intercept-window-expired with no claim → phase=lead with nextLeader', () => {
    const state: GameState = {
      matchId: 'm', roomCode: 'R', seats,
      hands: [[], [], [], []],
      stock: [], trump: null, trumpCardVisible: null,
      phase: { kind: 'intercept-window', eligible: [0], deadlineMs: 0 },
      currentTrick: null, nextLeader: 2,
      scores: { sdacha: { A: 0, B: 0 }, match: { A: 0, B: 0 } }, sdachaNumber: 1, log: [],
    };
    const r = engine(state, { kind: 'intercept-window-expired' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.phase.kind).toBe('lead');
      if (r.state.phase.kind === 'lead') expect(r.state.phase.leader).toBe(2);
    }
  });
});
