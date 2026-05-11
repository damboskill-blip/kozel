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
const j = (n: 1 | 2): Card => ({ kind: 'joker', id: `joker-${n}` });

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
    topIndex: 0, lockedFromBeating: [], extraRound: null,
  };
  return {
    matchId: 'm', roomCode: 'R', seats,
    hands: opts.hands, stock: [],
    trump: opts.trump ?? null, trumpCardVisible: null,
    phase: { kind: 'follow', next: opts.next },
    currentTrick: trick, nextLeader: 0,
    scores: { sdacha: { A: 0, B: 0 }, match: { A: 0, B: 0 } },
    sdachaNumber: 1, log: [],
  };
}

describe('engine: beat in follow (pairing)', () => {
  it('single card: higher same suit beats', () => {
    const hands: Card[][] = [[], [c('K', 'hearts')], [], []];
    const s = stateInFollow({ hands, leadCards: [c('Q', 'hearts')], leadSuit: 'hearts', next: 1 });
    const r = engine(s, { kind: 'follow', by: 1, cardIds: ['K-hearts'], faceDown: false });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.currentTrick!.topIndex).toBe(1);
      expect(r.state.currentTrick!.lockedFromBeating).toEqual([]);
    }
  });

  it('rejects single card that cannot beat (lower of same suit)', () => {
    const hands: Card[][] = [[], [c('7', 'hearts')], [], []];
    const s = stateInFollow({ hands, leadCards: [c('Q', 'hearts')], leadSuit: 'hearts', next: 1 });
    const r = engine(s, { kind: 'follow', by: 1, cardIds: ['7-hearts'], faceDown: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('cannot-beat');
  });

  it('multi-card: each pair beats by index (player chooses order)', () => {
    const hands: Card[][] = [[], [c('A', 'hearts'), c('K', 'hearts')], [], []];
    const s = stateInFollow({
      hands, leadCards: [c('Q', 'hearts'), c('J', 'hearts')], leadSuit: 'hearts', next: 1,
    });
    const r = engine(s, { kind: 'follow', by: 1, cardIds: ['K-hearts', 'A-hearts'], faceDown: false });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.currentTrick!.topIndex).toBe(1);
  });

  it('rejects multi-card if any pair fails', () => {
    const hands: Card[][] = [[], [c('A', 'hearts'), c('7', 'hearts')], [], []];
    const s = stateInFollow({
      hands, leadCards: [c('Q', 'hearts'), c('J', 'hearts')], leadSuit: 'hearts', next: 1,
    });
    const r = engine(s, { kind: 'follow', by: 1, cardIds: ['A-hearts', '7-hearts'], faceDown: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid-pairing');
  });

  it('trump beats non-trump (single)', () => {
    const hands: Card[][] = [[], [c('6', 'spades')], [], []];
    const s = stateInFollow({
      hands, leadCards: [c('A', 'hearts')], leadSuit: 'hearts', next: 1, trump: 'spades',
    });
    const r = engine(s, { kind: 'follow', by: 1, cardIds: ['6-spades'], faceDown: false });
    expect(r.ok).toBe(true);
  });

  it('joker beats any normal (single)', () => {
    const hands: Card[][] = [[], [j(1)], [], []];
    const s = stateInFollow({
      hands, leadCards: [c('A', 'hearts')], leadSuit: 'hearts', next: 1, trump: 'hearts',
    });
    const r = engine(s, { kind: 'follow', by: 1, cardIds: ['joker-1'], faceDown: false });
    expect(r.ok).toBe(true);
  });

  it('joker is beaten only by another joker', () => {
    const hands: Card[][] = [[], [c('A', 'hearts')], [], []];
    const s = stateInFollow({
      hands, leadCards: [j(1)], leadSuit: 'joker-only', next: 1, trump: 'hearts',
    });
    const r = engine(s, { kind: 'follow', by: 1, cardIds: ['A-hearts'], faceDown: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('cannot-beat');
  });

  it('joker beats joker — second joker covers first', () => {
    const hands: Card[][] = [[], [j(2)], [], []];
    const s = stateInFollow({
      hands, leadCards: [j(1)], leadSuit: 'joker-only', next: 1, trump: 'hearts',
    });
    const r = engine(s, { kind: 'follow', by: 1, cardIds: ['joker-2'], faceDown: false });
    expect(r.ok).toBe(true);
  });

  it('beat updates topIndex and does not lock from beating', () => {
    const hands: Card[][] = [[], [c('K', 'hearts')], [], []];
    const s = stateInFollow({
      hands, leadCards: [c('Q', 'hearts')], leadSuit: 'hearts', next: 1,
    });
    const r = engine(s, { kind: 'follow', by: 1, cardIds: ['K-hearts'], faceDown: false });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.currentTrick!.lockedFromBeating).not.toContain(1);
    }
  });
});
