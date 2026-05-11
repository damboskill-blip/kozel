import type { Card, Suit } from '@kozel/shared';
import { RANK_ORDER, beats } from '../engine/compare.js';
import { pickLowestNCardIds } from '../engine/helpers.js';

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
  return pickLowestNCardIds(hand, n, trump);
}

// Sort key for "cheapest" candidate when beating: prefer non-trump non-joker
// (rank-ascending), then trump (rank-ascending), then jokers last. Mirrors the
// face-down skid ranking so the bot never burns a joker on a normal card when
// a normal beat would work.
function beatSortKey(card: Card, trump: Suit | null): [number, number] {
  if (card.kind === 'joker') return [2, 0];
  const isTrump = trump !== null && card.suit === trump;
  return [isTrump ? 1 : 0, RANK_ORDER[card.rank]];
}

// Returns the cheapest single card that beats `top`, or null if none exists.
// Used by the bot to decide between face-up beat and face-down skid.
export function findCheapestSingleBeat(
  hand: Card[], top: Card, trump: Suit | null,
): string | null {
  const candidates = hand.filter((c) => beats(c, top, trump));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const [pa, ra] = beatSortKey(a, trump);
    const [pb, rb] = beatSortKey(b, trump);
    if (pa !== pb) return pa - pb;
    return ra - rb;
  });
  return candidates[0]!.id;
}
