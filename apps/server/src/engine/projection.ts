import type { Card, GameState, SeatIndex, Trick, PlayedSet } from '@kozel/shared';

export type HiddenCard = { kind: 'hidden' };
export type ProjectedHand = Card[] | { count: number };
export type ProjectedPlayedSet = Omit<PlayedSet, 'cards'> & { cards: (Card | HiddenCard)[] };
export type ProjectedTrick = Omit<Trick, 'played'> & { played: ProjectedPlayedSet[] };

export type ProjectedGameState = Omit<GameState, 'hands' | 'currentTrick'> & {
  hands: ProjectedHand[];
  currentTrick: ProjectedTrick | null;
};

export function projectStateForSeat(state: GameState, viewer: SeatIndex): ProjectedGameState {
  const sdachaEnded = state.phase.kind === 'sdacha-end';

  const hands: ProjectedHand[] = state.hands.map((h, i) =>
    i === viewer ? h : { count: h.length },
  );

  let currentTrick: ProjectedTrick | null = null;
  if (state.currentTrick) {
    currentTrick = {
      ...state.currentTrick,
      played: state.currentTrick.played.map((p) => {
        if (p.faceDown && !sdachaEnded) {
          return {
            ...p,
            cards: Array.from({ length: p.cards.length }, () => ({ kind: 'hidden' as const })),
          };
        }
        return { ...p, cards: [...p.cards] };
      }),
    };
  }

  return {
    ...state,
    hands,
    currentTrick,
  };
}
