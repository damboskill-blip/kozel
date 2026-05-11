import type { Card, Suit, Rank } from '@kozel/shared';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const EXCLUDED = new Set(['6-spades', '6-clubs']);

export function makeDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const id = `${rank}-${suit}`;
      if (EXCLUDED.has(id)) continue;
      cards.push({ kind: 'normal', suit, rank, id });
    }
  }
  cards.push({ kind: 'joker', id: 'joker-1' });
  cards.push({ kind: 'joker', id: 'joker-2' });
  return cards;
}
