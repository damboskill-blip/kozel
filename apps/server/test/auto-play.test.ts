import { describe, it, expect } from 'vitest';
import { chooseAutoLead, chooseAutoFollowSkid } from '../src/lifecycle/auto-play.js';
import type { Card } from '@kozel/shared';

const c = (rank: string, suit: string): Card =>
  ({ kind: 'normal', rank: rank as never, suit: suit as never, id: `${rank}-${suit}` });
const j = (n: 1 | 2): Card => ({ kind: 'joker', id: `joker-${n}` });

describe('chooseAutoLead', () => {
  it('picks lowest rank of largest suit group', () => {
    const hand: Card[] = [
      c('A', 'hearts'), c('6', 'hearts'), c('J', 'hearts'),
      c('K', 'spades'), c('9', 'clubs'),
    ];
    const ids = chooseAutoLead(hand);
    expect(ids).toEqual(['6-hearts']);
  });

  it('falls back to lowest single card if no group >1', () => {
    const hand: Card[] = [c('A', 'hearts'), c('K', 'spades'), c('Q', 'clubs')];
    const ids = chooseAutoLead(hand);
    expect(ids).toHaveLength(1);
    expect(['A-hearts', 'K-spades', 'Q-clubs']).toContain(ids[0]);
  });

  it('avoids jokers; leads jokers only if no normal cards', () => {
    const hand: Card[] = [j(1), j(2)];
    const ids = chooseAutoLead(hand);
    expect(ids).toHaveLength(1);
    expect(ids[0]).toMatch(/^joker-/);
  });
});

describe('chooseAutoFollowSkid', () => {
  it('returns N lowest cards by rank, non-trump preferred', () => {
    const hand: Card[] = [
      c('A', 'hearts'), c('6', 'hearts'), c('7', 'spades'), c('K', 'clubs'),
    ];
    const ids = chooseAutoFollowSkid(hand, 2, 'spades');
    expect(ids).toHaveLength(2);
    // Should not include trump '7-spades' if non-trumps available; '6-hearts' + 'K-clubs' are non-trump lowest.
    expect(ids).not.toContain('7-spades');
  });

  it('returns trumps + jokers last when non-trumps insufficient', () => {
    const hand: Card[] = [j(1), c('A', 'spades'), c('6', 'spades')];
    const ids = chooseAutoFollowSkid(hand, 3, 'spades');
    expect(ids).toHaveLength(3);
    expect(new Set(ids)).toEqual(new Set(['joker-1', 'A-spades', '6-spades']));
  });
});
