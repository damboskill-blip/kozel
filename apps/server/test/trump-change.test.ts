import { describe, it, expect } from 'vitest';
import { maybeChangeTrumpOnDraw } from '../src/engine/trump-change.js';
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

function baseState(stock: Card[], trump: 'spades' | 'hearts' | null = 'spades'): GameState {
  return {
    matchId: 'm', roomCode: 'R', seats,
    hands: [[], [], [], []], stock,
    trump, trumpCardVisible: stock[stock.length - 1] ?? null,
    phase: { kind: 'lead', leader: 0 }, currentTrick: null, nextLeader: 0,
    scores: { sdacha: { A: 0, B: 0 }, match: { A: 0, B: 0 } }, sdachaNumber: 1, log: [],
  };
}

describe('maybeChangeTrumpOnDraw', () => {
  it('does nothing when stock has many cards', () => {
    const state = baseState([c('7', 'hearts'), c('8', 'hearts'), c('9', 'hearts')]);
    const drawn = state.stock[0]!;
    const stockAfter = state.stock.slice(1);
    const r = maybeChangeTrumpOnDraw(state, drawn, stockAfter);
    expect(r.trump).toBe('spades');
    expect(r.events).toEqual([]);
  });

  it('triggers when going from stock=2 to stock=1, normal card → trump becomes its suit', () => {
    const state = baseState([c('K', 'diamonds'), c('A', 'spades')]);
    const drawn = state.stock[0]!;
    const stockAfter = state.stock.slice(1);
    const r = maybeChangeTrumpOnDraw(state, drawn, stockAfter);
    expect(r.trump).toBe('diamonds');
    expect(r.events).toHaveLength(1);
    expect(r.events[0]).toEqual({ kind: 'trump-changed', toSuit: 'diamonds', card: drawn });
    expect(r.trumpCardVisible).toEqual(stockAfter[0]);
  });

  it('triggers and sets trump=null when drawn card is joker', () => {
    const state = baseState([j(1), c('A', 'spades')]);
    const drawn = state.stock[0]!;
    const stockAfter = state.stock.slice(1);
    const r = maybeChangeTrumpOnDraw(state, drawn, stockAfter);
    expect(r.trump).toBeNull();
    expect(r.events[0]?.kind).toBe('trump-changed');
  });
});
