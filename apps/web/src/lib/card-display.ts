import type { Suit, Rank } from '@kozel/shared';

const GLYPHS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  spades: '♠',
  clubs: '♣',
};

export function suitGlyph(suit: Suit): string {
  return GLYPHS[suit];
}

export function isRed(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

export function suitColor(suit: Suit): 'red' | 'black' {
  return isRed(suit) ? 'red' : 'black';
}

export function rankLabel(rank: Rank): string {
  return rank;
}
