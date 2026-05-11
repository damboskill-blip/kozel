import type { Card, Suit } from '@kozel/shared';
import { beats } from './compare.js';

export type LeadShape =
  | { ok: true; leadSuit: Suit | 'joker-only'; count: number }
  | { ok: false; error: 'wrong-card-count' | 'invalid-lead-suit-mix' };

export function classifyLead(cards: Card[]): LeadShape {
  if (cards.length < 1 || cards.length > 6) {
    return { ok: false, error: 'wrong-card-count' };
  }
  const suits = new Set<Suit>();
  let jokers = 0;
  for (const c of cards) {
    if (c.kind === 'joker') jokers++;
    else suits.add(c.suit);
  }
  if (suits.size === 0) {
    return { ok: true, leadSuit: 'joker-only', count: cards.length };
  }
  if (suits.size > 1) {
    return { ok: false, error: 'invalid-lead-suit-mix' };
  }
  const [theSuit] = [...suits];
  void jokers;
  return { ok: true, leadSuit: theSuit!, count: cards.length };
}

export function isPairingValid(
  beaters: Card[],
  top: Card[],
  trump: Suit | null,
): boolean {
  if (beaters.length !== top.length) return false;
  for (let i = 0; i < beaters.length; i++) {
    if (!beats(beaters[i]!, top[i]!, trump)) return false;
  }
  return true;
}
