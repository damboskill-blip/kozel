import { describe, it, expect } from 'vitest';
import { engine } from '../src/engine/index.js';
import type { GameState, Card, PlayerInfo, SeatIndex, Trick, Suit } from '@kozel/shared';

const seats: PlayerInfo[] = [
  { playerId: 'p0', name: 'P0', seat: 0, connected: true },
  { playerId: 'p1', name: 'P1', seat: 1, connected: true },
  { playerId: 'p2', name: 'P2', seat: 2, connected: true },
  { playerId: 'p3', name: 'P3', seat: 3, connected: true },
];
const c = (rank: string, suit: string): Card =>
  ({ kind: 'normal', rank: rank as never, suit: suit as never, id: `${rank}-${suit}` });

function stateInExtraRound(opts: {
  hands: Card[][];
  trump?: Suit | null;
  played: { by: SeatIndex; cards: Card[]; faceDown: boolean }[];
  topIndex: number;
  lockedFromBeating?: SeatIndex[];
  nextToAsk: SeatIndex;
  asked?: SeatIndex[];
}): GameState {
  const trick: Trick = {
    leadCount: opts.played[0]!.cards.length as never,
    leadSuit: 'hearts',
    played: opts.played,
    topIndex: opts.topIndex,
    lockedFromBeating: opts.lockedFromBeating ?? [],
    extraRound: { asked: opts.asked ?? [], nextToAsk: opts.nextToAsk },
  };
  return {
    matchId: 'm', roomCode: 'R', seats,
    hands: opts.hands, stock: [],
    trump: opts.trump ?? null, trumpCardVisible: null,
    phase: { kind: 'extra-round' },
    currentTrick: trick, nextLeader: 0,
    scores: { sdacha: { A: 0, B: 0 }, match: { A: 0, B: 0 } },
    sdachaNumber: 1, log: [],
  };
}

describe('engine: extra-round', () => {
  it('extra-pass advances nextToAsk clockwise, skipping top owner', () => {
    const s = stateInExtraRound({
      hands: [[], [c('6', 'hearts')], [c('7', 'hearts')], [c('8', 'hearts')]],
      played: [
        { by: 0, cards: [c('Q', 'hearts')], faceDown: false },
        { by: 1, cards: [c('J', 'hearts')], faceDown: false },
        { by: 2, cards: [c('9', 'hearts')], faceDown: false },
        { by: 3, cards: [c('8', 'spades')], faceDown: true },
      ],
      topIndex: 0,
      nextToAsk: 1,
    });
    const r = engine(s, { kind: 'extra-pass', by: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.currentTrick!.extraRound!.asked).toEqual([1]);
      expect(r.state.currentTrick!.extraRound!.nextToAsk).toBe(2);
    }
  });

  it('extra-pass by player who is not nextToAsk → not-your-turn', () => {
    const s = stateInExtraRound({
      hands: [[], [], [], []],
      played: [
        { by: 0, cards: [c('Q', 'hearts')], faceDown: false },
        { by: 1, cards: [c('J', 'hearts')], faceDown: false },
        { by: 2, cards: [c('9', 'hearts')], faceDown: false },
        { by: 3, cards: [c('8', 'spades')], faceDown: true },
      ],
      topIndex: 0,
      nextToAsk: 1,
    });
    const r = engine(s, { kind: 'extra-pass', by: 2 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('not-your-turn');
  });

  it('all 3 non-top players pass → trick closes, phase = between-tricks', () => {
    const s = stateInExtraRound({
      hands: [[], [], [], []],
      played: [
        { by: 0, cards: [c('Q', 'hearts')], faceDown: false },
        { by: 1, cards: [c('J', 'hearts')], faceDown: false },
        { by: 2, cards: [c('9', 'hearts')], faceDown: false },
        { by: 3, cards: [c('8', 'spades')], faceDown: true },
      ],
      topIndex: 0,
      nextToAsk: 1,
    });
    let r = engine(s, { kind: 'extra-pass', by: 1 });
    expect(r.ok).toBe(true); if (!r.ok) return;
    r = engine(r.state, { kind: 'extra-pass', by: 2 });
    expect(r.ok).toBe(true); if (!r.ok) return;
    r = engine(r.state, { kind: 'extra-pass', by: 3 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.phase.kind).toBe('between-tricks');
    }
  });

  it('extra-beat by valid beater updates topIndex, resets asked, nextToAsk = next-after-new-top', () => {
    const s = stateInExtraRound({
      hands: [[], [], [c('K', 'hearts')], []],
      played: [
        { by: 0, cards: [c('Q', 'hearts')], faceDown: false },
        { by: 1, cards: [c('J', 'hearts')], faceDown: false },
        { by: 2, cards: [c('9', 'hearts')], faceDown: false },
        { by: 3, cards: [c('8', 'spades')], faceDown: true },
      ],
      topIndex: 0,
      nextToAsk: 1, asked: [1],
    });
    const r = engine(s, { kind: 'extra-beat', by: 2, cardIds: ['K-hearts'] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const t = r.state.currentTrick!;
      expect(t.played).toHaveLength(5);
      expect(t.topIndex).toBe(4);
      expect(t.extraRound!.asked).toEqual([]);
      expect(t.extraRound!.nextToAsk).toBe(3);
    }
  });

  it('extra-beat that does not actually beat top → cannot-beat', () => {
    const s = stateInExtraRound({
      hands: [[], [], [c('7', 'hearts')], []],
      played: [
        { by: 0, cards: [c('Q', 'hearts')], faceDown: false },
        { by: 1, cards: [c('J', 'hearts')], faceDown: false },
        { by: 2, cards: [c('9', 'hearts')], faceDown: false },
        { by: 3, cards: [c('8', 'spades')], faceDown: true },
      ],
      topIndex: 0, nextToAsk: 2, asked: [1],
    });
    const r = engine(s, { kind: 'extra-beat', by: 2, cardIds: ['7-hearts'] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('cannot-beat');
  });

  it('locked-from-beating player gets locked-from-beating error on extra-beat', () => {
    const s = stateInExtraRound({
      hands: [[], [c('K', 'hearts')], [], []],
      played: [
        { by: 0, cards: [c('Q', 'hearts')], faceDown: false },
        { by: 1, cards: [c('8', 'spades')], faceDown: true },
        { by: 2, cards: [c('9', 'hearts')], faceDown: false },
        { by: 3, cards: [c('10', 'hearts')], faceDown: false },
      ],
      topIndex: 3,
      lockedFromBeating: [1],
      nextToAsk: 0, asked: [],
    });
    let r = engine(s, { kind: 'extra-pass', by: 0 });
    expect(r.ok).toBe(true); if (!r.ok) return;
    const r2 = engine(r.state, { kind: 'extra-beat', by: 1, cardIds: ['K-hearts'] });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error).toBe('locked-from-beating');
  });
});
