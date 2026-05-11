import { describe, it, expect } from 'vitest';
import { projectStateForSeat } from '../src/engine/projection.js';
import type { GameState, Card, PlayerInfo, Trick } from '@kozel/shared';

const seats: PlayerInfo[] = [
  { playerId: 'p0', name: 'P0', seat: 0, connected: true },
  { playerId: 'p1', name: 'P1', seat: 1, connected: true },
  { playerId: 'p2', name: 'P2', seat: 2, connected: true },
  { playerId: 'p3', name: 'P3', seat: 3, connected: true },
];
const c = (rank: string, suit: string): Card =>
  ({ kind: 'normal', rank: rank as never, suit: suit as never, id: `${rank}-${suit}` });

const sampleHands: Card[][] = [
  [c('A', 'hearts'), c('K', 'spades')],
  [c('Q', 'clubs')],
  [c('J', 'diamonds'), c('10', 'hearts')],
  [c('9', 'spades'), c('8', 'spades'), c('7', 'spades')],
];

describe('projectStateForSeat', () => {
  it('reveals only own hand; others as counts', () => {
    const trick: Trick = {
      leadCount: 1, leadSuit: 'hearts',
      played: [
        { by: 0, cards: [c('A', 'hearts')], faceDown: false },
        { by: 1, cards: [c('Q', 'clubs')], faceDown: true },
      ],
      topIndex: 0, lockedFromBeating: [1], extraRound: null,
    };
    const state: GameState = {
      matchId: 'm', roomCode: 'R', seats, hands: sampleHands,
      stock: [c('6', 'hearts')], trump: 'hearts', trumpCardVisible: c('6', 'hearts'),
      phase: { kind: 'follow', next: 2 }, currentTrick: trick, nextLeader: 0,
      scores: { sdacha: { A: 11, B: 0 }, match: { A: 0, B: 0 } }, sdachaNumber: 1, log: [],
    };
    const proj = projectStateForSeat(state, 2);
    expect(proj.hands[2]).toEqual(sampleHands[2]);
    expect(proj.hands[0]).toEqual({ count: 2 });
    expect(proj.hands[1]).toEqual({ count: 1 });
    expect(proj.hands[3]).toEqual({ count: 3 });
    expect(proj.currentTrick!.played[1]).toMatchObject({
      by: 1, faceDown: true, cards: [{ kind: 'hidden' }],
    });
    expect((proj.currentTrick!.played[0]!.cards[0] as Card).id).toBe('A-hearts');
  });

  it('after sdacha-end, all face-down cards revealed', () => {
    const trick: Trick = {
      leadCount: 1, leadSuit: 'hearts',
      played: [{ by: 1, cards: [c('Q', 'clubs')], faceDown: true }],
      topIndex: 0, lockedFromBeating: [1], extraRound: null,
    };
    const state: GameState = {
      matchId: 'm', roomCode: 'R', seats, hands: sampleHands,
      stock: [], trump: null, trumpCardVisible: null,
      phase: { kind: 'sdacha-end' }, currentTrick: trick, nextLeader: 0,
      scores: { sdacha: { A: 0, B: 0 }, match: { A: 0, B: 0 } }, sdachaNumber: 1, log: [],
    };
    const proj = projectStateForSeat(state, 0);
    expect((proj.currentTrick!.played[0]!.cards[0] as Card).id).toBe('Q-clubs');
  });
});
