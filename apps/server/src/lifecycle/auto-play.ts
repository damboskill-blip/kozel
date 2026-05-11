import type { Card, Suit } from '@kozel/shared';
import { RANK_ORDER } from '../engine/compare.js';

function sortKey(card: Card, trump: Suit | null): [number, number] {
  // priority order: non-trump normal < trump normal < joker
  if (card.kind === 'joker') return [2, 0];
  const isTrump = trump !== null && card.suit === trump;
  return [isTrump ? 1 : 0, RANK_ORDER[card.rank]];
}

export function chooseAutoLead(hand: Card[]): string[] {
  if (hand.length === 0) return [];
  const groups = new Map<string, Card[]>();
  for (const c of hand) {
    const key = c.kind === 'joker' ? '__joker' : c.suit;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  // Prefer largest non-joker group; tie-break by suit-name alphabetic for determinism.
  const sortedGroups = [...groups.entries()]
    .filter(([k]) => k !== '__joker')
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  if (sortedGroups.length === 0) {
    // only jokers
    const j = hand.find((c) => c.kind === 'joker')!;
    return [j.id];
  }
  const [, cards] = sortedGroups[0]!;
  const lowest = [...cards].sort(
    (a, b) => (a.kind === 'normal' ? RANK_ORDER[a.rank] : 99)
            - (b.kind === 'normal' ? RANK_ORDER[b.rank] : 99),
  )[0]!;
  return [lowest.id];
}

export function chooseAutoFollowSkid(
  hand: Card[], n: number, trump: Suit | null,
): string[] {
  const sorted = [...hand].sort((a, b) => {
    const [pa, ra] = sortKey(a, trump);
    const [pb, rb] = sortKey(b, trump);
    if (pa !== pb) return pa - pb;
    return ra - rb;
  });
  return sorted.slice(0, n).map((c) => c.id);
}
