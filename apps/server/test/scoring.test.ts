import { describe, it, expect } from 'vitest';
import { cardValue, penaltyForScore, computePenalties } from '../src/engine/scoring.js';
import type { Card } from '@kozel/shared';

const c = (rank: string, suit: string): Card =>
  ({ kind: 'normal', rank: rank as never, suit: suit as never, id: `${rank}-${suit}` });
const j = (n: 1 | 2): Card => ({ kind: 'joker', id: `joker-${n}` });

describe('cardValue', () => {
  it('A=11, 10=10, K=4, Q=3, J=2', () => {
    expect(cardValue(c('A', 'hearts'))).toBe(11);
    expect(cardValue(c('10', 'hearts'))).toBe(10);
    expect(cardValue(c('K', 'hearts'))).toBe(4);
    expect(cardValue(c('Q', 'hearts'))).toBe(3);
    expect(cardValue(c('J', 'hearts'))).toBe(2);
  });
  it('9..6 = 0', () => {
    for (const r of ['9', '8', '7', '6']) expect(cardValue(c(r, 'hearts'))).toBe(0);
  });
  it('joker = 0', () => {
    expect(cardValue(j(1))).toBe(0);
  });
});

describe('penaltyForScore', () => {
  it('0 → 6', () => expect(penaltyForScore(0)).toBe(6));
  it('1 → 4', () => expect(penaltyForScore(1)).toBe(4));
  it('30 → 4', () => expect(penaltyForScore(30)).toBe(4));
  it('31 → 2', () => expect(penaltyForScore(31)).toBe(2));
  it('60 → 2', () => expect(penaltyForScore(60)).toBe(2));
  it('61 → 0', () => expect(penaltyForScore(61)).toBe(0));
  it('120 → 0', () => expect(penaltyForScore(120)).toBe(0));
});

describe('computePenalties', () => {
  it('A wins 80:40 → only B penalized (+2)', () => {
    expect(computePenalties({ A: 80, B: 40 })).toEqual({ A: 0, B: 2 });
  });
  it('B wins 100:20 → only A penalized (+4)', () => {
    expect(computePenalties({ A: 20, B: 100 })).toEqual({ A: 4, B: 0 });
  });
  it('tie 60:60 → both penalized (+2)', () => {
    expect(computePenalties({ A: 60, B: 60 })).toEqual({ A: 2, B: 2 });
  });
  it('shutout: A=120, B=0 → B +6', () => {
    expect(computePenalties({ A: 120, B: 0 })).toEqual({ A: 0, B: 6 });
  });
});
