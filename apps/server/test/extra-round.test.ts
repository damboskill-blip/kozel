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
  it('extra-pass advances nextToAsk clockwise; top seat is asked last', () => {
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
    let r = engine(s, { kind: 'extra-pass', by: 1 });
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.state.currentTrick!.extraRound!.asked).toEqual([1]);
    expect(r.state.currentTrick!.extraRound!.nextToAsk).toBe(2);

    r = engine(r.state, { kind: 'extra-pass', by: 2 });
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.state.currentTrick!.extraRound!.nextToAsk).toBe(3);

    r = engine(r.state, { kind: 'extra-pass', by: 3 });
    expect(r.ok).toBe(true); if (!r.ok) return;
    // After 3 non-top seats pass, the top seat (0) is asked.
    expect(r.state.currentTrick!.extraRound!.nextToAsk).toBe(0);
    expect(r.state.phase.kind).toBe('extra-round');
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

  it('all 4 players (incl. top) pass → trick closes, phase = between-tricks', () => {
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
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.state.phase.kind).toBe('extra-round');
    r = engine(r.state, { kind: 'extra-pass', by: 0 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.phase.kind).toBe('between-tricks');
  });

  it('top-seat extra-beat re-opens the extra-round around the new top', () => {
    // Seat 0 led Q♥ and won; seats 1-3 followed without beating. Seat 0 still
    // has K♥ in hand and decides to pile it on top, increasing the trick's
    // value. All 3 others auto-skid 1 face-down card. Because each player
    // still holds a leftover card after the skid, the extra-round re-opens
    // around the new top (seat 0) and asking resumes clockwise from seat 1.
    const s = stateInExtraRound({
      hands: [
        [c('K', 'hearts'), c('A', 'spades')],
        [c('7', 'spades'), c('8', 'spades')],
        [c('6', 'diamonds'), c('9', 'spades')],
        [c('7', 'diamonds'), c('10', 'spades')],
      ],
      played: [
        { by: 0, cards: [c('Q', 'hearts')], faceDown: false },
        { by: 1, cards: [c('J', 'hearts')], faceDown: false },
        { by: 2, cards: [c('9', 'hearts')], faceDown: false },
        { by: 3, cards: [c('8', 'hearts')], faceDown: false },
      ],
      topIndex: 0,
      nextToAsk: 0, asked: [1, 2, 3],
    });
    const r = engine(s, { kind: 'extra-beat', by: 0, cardIds: ['K-hearts'] });
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.state.phase.kind).toBe('extra-round');
    const t = r.state.currentTrick!;
    expect(t.played).toHaveLength(8);
    expect(t.topIndex).toBe(4);
    expect(t.played[4]!.by).toBe(0);
    expect(t.played[4]!.cards[0]!.id).toBe('K-hearts');
    // Re-opened around the new top (seat 0); asking starts at seat 1.
    expect(t.extraRound!.asked).toEqual([]);
    expect(t.extraRound!.nextToAsk).toBe(1);
    expect(r.state.hands.map((h) => h.length)).toEqual([1, 1, 1, 1]);
  });

  it('extra-beat re-opens extra-round; non-empty seats may beat again', () => {
    const s = stateInExtraRound({
      hands: [
        [c('6', 'diamonds'), c('A', 'diamonds')],
        [c('7', 'diamonds'), c('K', 'diamonds')],
        [c('K', 'hearts')],
        [c('8', 'diamonds'), c('Q', 'diamonds')],
      ],
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
    expect(r.ok).toBe(true); if (!r.ok) return;
    // Phase stays in extra-round: the new top (seat 2) emptied their hand,
    // but seats 0, 1, 3 still hold cards, so the round re-opens.
    expect(r.state.phase.kind).toBe('extra-round');
    const t = r.state.currentTrick!;
    expect(t.played).toHaveLength(8);
    expect(t.topIndex).toBe(4);
    expect(r.state.hands.map((h) => h.length)).toEqual([1, 1, 0, 1]);
    // Empty-handed seats are auto-passed in the new round.
    expect(t.extraRound!.asked).toEqual([2]);
    // Next ask is the seat after the new top (seat 3), clockwise from seat 2.
    expect(t.extraRound!.nextToAsk).toBe(3);
    // Auto-skidded cards were the LOWEST in each non-beater hand.
    const skidPlays = t.played.slice(5);
    const skidIds = new Set(skidPlays.flatMap((p) => p.cards.map((c) => c.id)));
    expect(skidIds.has('6-diamonds')).toBe(true);
    expect(skidIds.has('7-diamonds')).toBe(true);
    expect(skidIds.has('8-diamonds')).toBe(true);
  });

  it('extra-beat that empties every hand closes the trick immediately', () => {
    const s = stateInExtraRound({
      hands: [
        [c('6', 'hearts')], [c('7', 'hearts')], [c('K', 'hearts')], [],
      ],
      played: [
        { by: 0, cards: [c('Q', 'hearts')], faceDown: false },
        { by: 1, cards: [c('J', 'hearts')], faceDown: false },
        { by: 2, cards: [c('9', 'hearts')], faceDown: false },
        { by: 3, cards: [c('8', 'hearts')], faceDown: false },
      ],
      topIndex: 0,
      nextToAsk: 1, asked: [1],
    });
    const r = engine(s, { kind: 'extra-beat', by: 2, cardIds: ['K-hearts'] });
    expect(r.ok).toBe(true); if (!r.ok) return;
    // Every seat now has zero cards (beater played their last, others
    // auto-skidded their lasts, seat 3 was already empty) → close.
    expect(r.state.hands.map((h) => h.length)).toEqual([0, 0, 0, 0]);
    expect(r.state.phase.kind).toBe('between-tricks');
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

  it('leadCount >= 4 skips extra-round entirely (4-card single-suit lead)', () => {
    // Leader holds 5 hearts + a leftover; each follower skids 4 cards
    // face-down and keeps a leftover. After the 4th follow the trick should
    // transition directly to between-tricks: leads of 4+ cards do not open an
    // extra-round, regardless of whether anyone could have beaten.
    const leaderHand: Card[] = [
      c('A', 'hearts'), c('K', 'hearts'), c('Q', 'hearts'), c('J', 'hearts'),
      c('A', 'spades'),
    ];
    const followerHand = (extra: Card): Card[] => [
      c('6', 'spades'), c('7', 'spades'), c('8', 'spades'), c('9', 'spades'),
      extra,
    ];
    const state: GameState = {
      matchId: 'm', roomCode: 'R', seats,
      hands: [
        leaderHand,
        followerHand(c('K', 'clubs')),
        followerHand(c('K', 'diamonds')),
        followerHand(c('K', 'spades')),
      ],
      stock: [], trump: null, trumpCardVisible: null,
      phase: { kind: 'lead', leader: 0 },
      currentTrick: null, nextLeader: 0,
      scores: { sdacha: { A: 0, B: 0 }, match: { A: 0, B: 0 } },
      sdachaNumber: 1, log: [],
    };
    let r = engine(state, {
      kind: 'lead', by: 0,
      cardIds: ['A-hearts', 'K-hearts', 'Q-hearts', 'J-hearts'],
    });
    expect(r.ok).toBe(true); if (!r.ok) return;
    for (const seat of [1, 2, 3] as const) {
      r = engine(r.state, {
        kind: 'follow', by: seat,
        cardIds: ['6-spades', '7-spades', '8-spades', '9-spades'],
        faceDown: true,
      });
      expect(r.ok).toBe(true); if (!r.ok) return;
    }
    expect(r.state.phase.kind).toBe('between-tricks');
    expect(r.state.currentTrick!.extraRound ?? null).toBeNull();
  });
});
