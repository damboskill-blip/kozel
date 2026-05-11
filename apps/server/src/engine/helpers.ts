import type { Card, SeatIndex, Suit } from '@kozel/shared';
import { RANK_ORDER } from './compare.js';

export function cardById(id: string, pool: Card[]): Card | undefined {
  return pool.find((c) => c.id === id);
}

export function removeCardsFromHand(hand: Card[], ids: string[]): Card[] {
  const idSet = new Set(ids);
  return hand.filter((c) => !idSet.has(c.id));
}

export function pickCardsByIds(hand: Card[], ids: string[]): Card[] | null {
  const result: Card[] = [];
  for (const id of ids) {
    const c = hand.find((h) => h.id === id);
    if (!c) return null;
    result.push(c);
  }
  return result;
}

export function isAllInHand(hand: Card[], ids: string[]): boolean {
  return ids.every((id) => hand.some((c) => c.id === id));
}

export const SEATS_CW: SeatIndex[] = [0, 1, 2, 3];

function lowestSkidSortKey(card: Card, trump: Suit | null): [number, number] {
  if (card.kind === 'joker') return [2, 0];
  const isTrump = trump !== null && card.suit === trump;
  return [isTrump ? 1 : 0, RANK_ORDER[card.rank]];
}

export function pickLowestNCardIds(hand: Card[], n: number, trump: Suit | null): string[] {
  const sorted = [...hand].sort((a, b) => {
    const [pa, ra] = lowestSkidSortKey(a, trump);
    const [pb, rb] = lowestSkidSortKey(b, trump);
    if (pa !== pb) return pa - pb;
    return ra - rb;
  });
  return sorted.slice(0, n).map((c) => c.id);
}
