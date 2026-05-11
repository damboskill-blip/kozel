import { describe, it, expect } from 'vitest';
import { engine } from '../src/engine/index.js';
import type { GameState, Card, PlayerInfo, SeatIndex, Suit, Trick } from '@kozel/shared';

const seats: PlayerInfo[] = [
  { playerId: 'p0', name: 'P0', seat: 0, connected: true },
  { playerId: 'p1', name: 'P1', seat: 1, connected: true },
  { playerId: 'p2', name: 'P2', seat: 2, connected: true },
  { playerId: 'p3', name: 'P3', seat: 3, connected: true },
];

const c = (rank: string, suit: string): Card =>
  ({ kind: 'normal', rank: rank as never, suit: suit as never, id: `${rank}-${suit}` });

function stateInFollow(opts: {
  hands: Card[][];
  trump?: Suit | null;
  leadCards: Card[];
  leadSuit: Suit | 'joker-only';
  next: SeatIndex;
}): GameState {
  const trick: Trick = {
    leadCount: opts.leadCards.length as never,
    leadSuit: opts.leadSuit,
    played: [{ by: 0, cards: opts.leadCards, faceDown: false }],
    topIndex: 0,
    lockedFromBeating: [],
    extraRound: null,
  };
  return {
    matchId: 'm', roomCode: 'R', seats,
    hands: opts.hands,
    stock: [],
    trump: opts.trump ?? null,
    trumpCardVisible: null,
    phase: { kind: 'follow', next: opts.next },
    currentTrick: trick,
    nextLeader: 0,
    scores: { sdacha: { A: 0, B: 0 }, match: { A: 0, B: 0 } },
    sdachaNumber: 1, log: [],
  };
}

describe('engine: follow action — face-down skid', () => {
  it('accepts face-down skid of leadCount cards', () => {
    const hands: Card[][] = [
      [], [c('6', 'diamonds'), c('7', 'diamonds')], [], [],
    ];
    const s = stateInFollow({
      hands, leadCards: [c('A', 'hearts')], leadSuit: 'hearts', next: 1,
    });
    const r = engine(s, { kind: 'follow', by: 1, cardIds: ['6-diamonds'], faceDown: true });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.currentTrick!.played).toHaveLength(2);
      expect(r.state.currentTrick!.played[1]!.faceDown).toBe(true);
      expect(r.state.currentTrick!.topIndex).toBe(0);
      expect(r.state.currentTrick!.lockedFromBeating).toContain(1);
      expect(r.state.hands[1]).toHaveLength(1);
    }
  });

  it('rejects follow with wrong card count', () => {
    const hands: Card[][] = [
      [], [c('6', 'diamonds'), c('7', 'diamonds')], [], [],
    ];
    const s = stateInFollow({
      hands, leadCards: [c('A', 'hearts'), c('K', 'hearts')], leadSuit: 'hearts', next: 1,
    });
    const r = engine(s, { kind: 'follow', by: 1, cardIds: ['6-diamonds'], faceDown: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('wrong-card-count');
  });

  it('rejects follow by non-next player', () => {
    const hands: Card[][] = [[], [], [c('6', 'diamonds')], []];
    const s = stateInFollow({
      hands, leadCards: [c('A', 'hearts')], leadSuit: 'hearts', next: 1,
    });
    const r = engine(s, { kind: 'follow', by: 2, cardIds: ['6-diamonds'], faceDown: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('not-your-turn');
  });

  it('after 4th follow (all 4 played, hands non-empty), phase becomes extra-round', () => {
    // Each follower keeps a leftover card so the extra-round actually opens —
    // openExtraRound auto-passes seats with empty hands and closes the trick
    // immediately if every seat is empty.
    const hands: Card[][] = [
      [c('9', 'diamonds')],
      [c('6', 'diamonds'), c('K', 'spades')],
      [c('7', 'diamonds'), c('K', 'clubs')],
      [c('8', 'diamonds'), c('Q', 'clubs')],
    ];
    const s = stateInFollow({
      hands, leadCards: [c('A', 'hearts')], leadSuit: 'hearts', next: 1,
    });
    let r = engine(s, { kind: 'follow', by: 1, cardIds: ['6-diamonds'], faceDown: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    r = engine(r.state, { kind: 'follow', by: 2, cardIds: ['7-diamonds'], faceDown: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    r = engine(r.state, { kind: 'follow', by: 3, cardIds: ['8-diamonds'], faceDown: true });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.phase.kind).toBe('extra-round');
      expect(r.state.currentTrick!.extraRound).not.toBeNull();
      expect(r.state.currentTrick!.extraRound!.nextToAsk).toBe(1);
      expect(r.state.currentTrick!.extraRound!.asked).toEqual([]);
    }
  });

  it('after 4th follow with all hands empty, phase skips extra-round → between-tricks', () => {
    const hands: Card[][] = [
      [], [c('6', 'diamonds')], [c('7', 'diamonds')], [c('8', 'diamonds')],
    ];
    const s = stateInFollow({
      hands, leadCards: [c('A', 'hearts')], leadSuit: 'hearts', next: 1,
    });
    let r = engine(s, { kind: 'follow', by: 1, cardIds: ['6-diamonds'], faceDown: true });
    expect(r.ok).toBe(true); if (!r.ok) return;
    r = engine(r.state, { kind: 'follow', by: 2, cardIds: ['7-diamonds'], faceDown: true });
    expect(r.ok).toBe(true); if (!r.ok) return;
    r = engine(r.state, { kind: 'follow', by: 3, cardIds: ['8-diamonds'], faceDown: true });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.phase.kind).toBe('between-tricks');
  });
});
