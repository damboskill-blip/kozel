import { describe, it, expect } from 'vitest';
import { makeDeck } from '../src/engine/deck.js';

describe('makeDeck', () => {
  it('produces 36 cards total', () => {
    const deck = makeDeck();
    expect(deck).toHaveLength(36);
  });

  it('contains exactly 2 jokers', () => {
    const deck = makeDeck();
    const jokers = deck.filter((c) => c.kind === 'joker');
    expect(jokers).toHaveLength(2);
    const jokerIds = jokers.map((j) => j.id).sort();
    expect(jokerIds).toEqual(['joker-1', 'joker-2']);
  });

  it('excludes 6 of spades and 6 of clubs (replaced by jokers)', () => {
    const deck = makeDeck();
    const sixSpades = deck.find((c) => c.kind === 'normal' && c.suit === 'spades' && c.rank === '6');
    const sixClubs = deck.find((c) => c.kind === 'normal' && c.suit === 'clubs' && c.rank === '6');
    expect(sixSpades).toBeUndefined();
    expect(sixClubs).toBeUndefined();
  });

  it('includes 6 of hearts and 6 of diamonds', () => {
    const deck = makeDeck();
    const sixHearts = deck.find((c) => c.kind === 'normal' && c.suit === 'hearts' && c.rank === '6');
    const sixDiamonds = deck.find((c) => c.kind === 'normal' && c.suit === 'diamonds' && c.rank === '6');
    expect(sixHearts).toBeDefined();
    expect(sixDiamonds).toBeDefined();
  });

  it('contains 34 normal cards', () => {
    const deck = makeDeck();
    const normals = deck.filter((c) => c.kind === 'normal');
    expect(normals).toHaveLength(34);
  });

  it('every normal card has stable id of form `${rank}-${suit}`', () => {
    const deck = makeDeck();
    for (const c of deck) {
      if (c.kind === 'normal') {
        expect(c.id).toBe(`${c.rank}-${c.suit}`);
      }
    }
  });

  it('all card ids are unique', () => {
    const deck = makeDeck();
    const ids = deck.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
