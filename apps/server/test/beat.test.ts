import { describe, it, expect } from 'vitest';
import { beats, RANK_ORDER } from '../src/engine/compare.js';
import type { Card } from '@kozel/shared';

const c = (rank: string, suit: string): Card =>
  ({ kind: 'normal', rank: rank as never, suit: suit as never, id: `${rank}-${suit}` });
const j = (n: 1 | 2): Card => ({ kind: 'joker', id: `joker-${n}` });

describe('RANK_ORDER', () => {
  it('orders: A > 10 > K > Q > J > 9 > 8 > 7 > 6', () => {
    expect(RANK_ORDER['A']).toBeGreaterThan(RANK_ORDER['10']);
    expect(RANK_ORDER['10']).toBeGreaterThan(RANK_ORDER['K']);
    expect(RANK_ORDER['K']).toBeGreaterThan(RANK_ORDER['Q']);
    expect(RANK_ORDER['Q']).toBeGreaterThan(RANK_ORDER['J']);
    expect(RANK_ORDER['J']).toBeGreaterThan(RANK_ORDER['9']);
    expect(RANK_ORDER['9']).toBeGreaterThan(RANK_ORDER['8']);
    expect(RANK_ORDER['8']).toBeGreaterThan(RANK_ORDER['7']);
    expect(RANK_ORDER['7']).toBeGreaterThan(RANK_ORDER['6']);
  });
});

describe('beats(challenger, top, trump)', () => {
  it('higher rank of same suit beats lower (no trump)', () => {
    expect(beats(c('K', 'hearts'), c('Q', 'hearts'), null)).toBe(true);
    expect(beats(c('Q', 'hearts'), c('K', 'hearts'), null)).toBe(false);
  });

  it('lower rank of same suit does not beat higher', () => {
    expect(beats(c('7', 'spades'), c('A', 'spades'), 'hearts')).toBe(false);
  });

  it('same suit, equal rank — does not beat', () => {
    expect(beats(c('K', 'hearts'), c('K', 'hearts'), null)).toBe(false);
  });

  it('different non-trump suits — challenger does not beat', () => {
    expect(beats(c('A', 'hearts'), c('6', 'diamonds'), 'clubs')).toBe(false);
  });

  it('trump beats any non-trump', () => {
    expect(beats(c('6', 'hearts'), c('A', 'spades'), 'hearts')).toBe(true);
  });

  it('non-trump does not beat trump', () => {
    expect(beats(c('A', 'spades'), c('6', 'hearts'), 'hearts')).toBe(false);
  });

  it('higher trump beats lower trump', () => {
    expect(beats(c('A', 'hearts'), c('K', 'hearts'), 'hearts')).toBe(true);
  });

  it('joker beats any normal card (incl. trump)', () => {
    expect(beats(j(1), c('A', 'hearts'), 'hearts')).toBe(true);
    expect(beats(j(1), c('6', 'diamonds'), null)).toBe(true);
  });

  it('normal card does not beat joker', () => {
    expect(beats(c('A', 'hearts'), j(1), 'hearts')).toBe(false);
  });

  it('joker beats joker (allowed for pairing — second joker covers first)', () => {
    expect(beats(j(2), j(1), null)).toBe(true);
  });

  it('with trump=null, only same-suit higher beats; trump rule is no-op', () => {
    expect(beats(c('A', 'hearts'), c('6', 'spades'), null)).toBe(false);
    expect(beats(c('A', 'hearts'), c('K', 'hearts'), null)).toBe(true);
  });
});
