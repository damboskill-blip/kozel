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

function stuckMidTrick(): GameState {
  // Reproduces the screenshot the user reported: hands [me=2, right=2, partner=1, left=0],
  // mid-follow with the empty-handed seat about to play.
  const trick: Trick = {
    leadCount: 1, leadSuit: 'diamonds',
    played: [
      { by: 0, cards: [c('A', 'diamonds')], faceDown: false },
      { by: 1, cards: [c('6', 'diamonds')], faceDown: true },
      { by: 2, cards: [c('7', 'diamonds')], faceDown: true },
    ],
    topIndex: 0, lockedFromBeating: [1, 2],
    extraRound: null,
  };
  return {
    matchId: 'm', roomCode: 'R', seats,
    hands: [
      [c('A', 'spades'), { kind: 'joker', id: 'joker-1' }],
      [c('8', 'diamonds'), c('9', 'diamonds')],
      [c('10', 'diamonds')],
      [],
    ],
    stock: [],
    trump: 'hearts', trumpCardVisible: null,
    phase: { kind: 'follow', next: 3 },
    currentTrick: trick, nextLeader: 0,
    scores: { sdacha: { A: 7, B: 4 }, match: { A: 0, B: 0 } },
    sdachaNumber: 1, log: [],
  };
}

describe('engine: force-end-sdacha (stuck-state recovery)', () => {
  it('collapses to sdacha-end when next-to-act has 0 cards in follow', () => {
    const s = stuckMidTrick();
    const r = engine(s, { kind: 'force-end-sdacha' });
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.state.phase.kind).toBe('sdacha-end');
    expect(r.state.currentTrick).toBeNull();
    // Scores so far are preserved — end-sdacha will tally them next.
    expect(r.state.scores.sdacha).toEqual({ A: 7, B: 4 });
  });

  it('refuses if the stuck condition is not present', () => {
    const s = stuckMidTrick();
    s.hands[3] = [c('K', 'diamonds')]; // seat 3 actually has a card now
    const r = engine(s, { kind: 'force-end-sdacha' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('no-stuck-seat');
  });

  it('end-sdacha runs cleanly after force-end-sdacha', () => {
    let r = engine(stuckMidTrick(), { kind: 'force-end-sdacha' });
    expect(r.ok).toBe(true); if (!r.ok) return;
    r = engine(r.state, { kind: 'end-sdacha' });
    expect(r.ok).toBe(true); if (!r.ok) return;
    // Penalties applied to match score, sdacha reset.
    expect(r.state.scores.sdacha).toEqual({ A: 0, B: 0 });
    expect(r.state.phase.kind).toBe('between-tricks');
  });
});
