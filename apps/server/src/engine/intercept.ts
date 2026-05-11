import type { Card, SeatIndex, Suit } from '@kozel/shared';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export function isHandInterceptEligible(hand: Card[]): boolean {
  let jokers = 0;
  const counts: Record<Suit, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 };
  for (const c of hand) {
    if (c.kind === 'joker') jokers++;
    else counts[c.suit]++;
  }
  for (const s of SUITS) {
    if (counts[s] + jokers >= 5) return true;
  }
  return false;
}

export function interceptEligible(hands: Card[][]): SeatIndex[] {
  const out: SeatIndex[] = [];
  for (let i = 0; i < 4; i++) {
    if (isHandInterceptEligible(hands[i]!)) out.push(i as SeatIndex);
  }
  return out;
}
