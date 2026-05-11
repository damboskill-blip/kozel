import type { Card, PlayedSet, Team } from '@kozel/shared';

const CARD_VALUE: Record<string, number> = {
  A: 11, '10': 10, K: 4, Q: 3, J: 2, '9': 0, '8': 0, '7': 0, '6': 0,
};

export function cardValue(card: Card): number {
  if (card.kind === 'joker') return 0;
  return CARD_VALUE[card.rank] ?? 0;
}

export function sumPlayedSetPoints(played: PlayedSet[]): number {
  let sum = 0;
  for (const p of played) {
    for (const c of p.cards) sum += cardValue(c);
  }
  return sum;
}

export function penaltyForScore(score: number): number {
  if (score === 0) return 6;
  if (score <= 30) return 4;
  if (score <= 60) return 2;
  return 0;
}

export function computePenalties(scores: { A: number; B: number }): { A: number; B: number } {
  if (scores.A >= 61) return { A: 0, B: penaltyForScore(scores.B) };
  if (scores.B >= 61) return { A: penaltyForScore(scores.A), B: 0 };
  return { A: penaltyForScore(scores.A), B: penaltyForScore(scores.B) };
}

export function teamOfSeat(seat: number): Team {
  return seat % 2 === 0 ? 'A' : 'B';
}
