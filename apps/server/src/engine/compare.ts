import type { Card, Rank, Suit } from '@kozel/shared';

export const RANK_ORDER: Record<Rank, number> = {
  '6': 0,
  '7': 1,
  '8': 2,
  '9': 3,
  J: 4,
  Q: 5,
  K: 6,
  '10': 7,
  A: 8,
};

export function beats(challenger: Card, top: Card, trump: Suit | null): boolean {
  if (challenger.kind === 'joker' && top.kind === 'joker') return true;
  if (challenger.kind === 'joker') return true;
  if (top.kind === 'joker') return false;

  const cTrump = trump !== null && challenger.suit === trump;
  const tTrump = trump !== null && top.suit === trump;

  if (cTrump && !tTrump) return true;
  if (!cTrump && tTrump) return false;
  if (challenger.suit !== top.suit) return false;
  return RANK_ORDER[challenger.rank] > RANK_ORDER[top.rank];
}
