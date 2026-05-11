import type { Card, GameState, Suit, EphemeralEvent } from '@kozel/shared';

export function maybeChangeTrumpOnDraw(
  stateBeforeDraw: GameState,
  drawnCard: Card,
  stockAfterDraw: Card[],
): { trump: Suit | null; trumpCardVisible: Card | null; events: EphemeralEvent[] } {
  const triggered = stateBeforeDraw.stock.length === 2 && stockAfterDraw.length === 1;
  if (!triggered) {
    return {
      trump: stateBeforeDraw.trump,
      trumpCardVisible: stateBeforeDraw.trumpCardVisible,
      events: [],
    };
  }
  const newTrump: Suit | null = drawnCard.kind === 'normal' ? drawnCard.suit : null;
  return {
    trump: newTrump,
    trumpCardVisible: stockAfterDraw[0] ?? null,
    events: [{ kind: 'trump-changed', toSuit: newTrump, card: drawnCard }],
  };
}
