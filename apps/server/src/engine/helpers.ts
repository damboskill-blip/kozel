import type { Card, SeatIndex } from '@kozel/shared';

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
