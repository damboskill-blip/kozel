import type {
  GameState, Action, EngineResult, EphemeralEvent, SeatIndex, LeadCount, Trick,
} from '@kozel/shared';
import { freshGameState } from './deal.js';
import { pickCardsByIds, removeCardsFromHand, isAllInHand } from './helpers.js';
import { classifyLead, isPairingValid } from './validate.js';

function nextSeat(s: SeatIndex): SeatIndex {
  return ((s + 1) % 4) as SeatIndex;
}

export function engine(state: GameState, action: Action): EngineResult {
  switch (action.kind) {
    case 'start-match': {
      const newState = freshGameState({
        seed: action.seed,
        firstLeader: action.firstLeader,
        matchId: action.matchId,
        roomCode: action.roomCode,
        seats: action.seats,
        sdachaNumber: 1,
        matchScores: { A: 0, B: 0 },
      });
      const events: EphemeralEvent[] = [
        { kind: 'dealt' },
        ...(newState.trumpCardVisible
          ? [{ kind: 'trump-revealed', card: newState.trumpCardVisible } as EphemeralEvent]
          : []),
      ];
      return { ok: true, state: newState, events };
    }

    case 'lead': {
      if (state.phase.kind !== 'lead') return { ok: false, error: 'invalid-action-for-phase' };
      if (state.phase.leader !== action.by) return { ok: false, error: 'not-your-turn' };

      const hand = state.hands[action.by]!;
      if (action.cardIds.length < 1 || action.cardIds.length > 6) {
        return { ok: false, error: 'wrong-card-count' };
      }
      if (!isAllInHand(hand, action.cardIds)) return { ok: false, error: 'cards-not-in-hand' };

      const cards = pickCardsByIds(hand, action.cardIds)!;
      const shape = classifyLead(cards);
      if (!shape.ok) return { ok: false, error: shape.error };

      const trick: Trick = {
        leadCount: shape.count as LeadCount,
        leadSuit: shape.leadSuit,
        played: [{ by: action.by, cards, faceDown: false }],
        topIndex: 0,
        lockedFromBeating: [],
        extraRound: null,
      };

      const newHands = state.hands.map((h, i) =>
        i === action.by ? removeCardsFromHand(h, action.cardIds) : h,
      );

      const next = nextSeat(action.by);

      return {
        ok: true,
        state: {
          ...state,
          hands: newHands,
          currentTrick: trick,
          phase: { kind: 'follow', next },
          log: [...state.log, { kind: 'lead', by: action.by, cards }],
        },
        events: [{ kind: 'cards-played', bySeat: action.by, count: cards.length, faceDown: false }],
      };
    }

    case 'follow': {
      if (state.phase.kind !== 'follow') return { ok: false, error: 'invalid-action-for-phase' };
      if (state.phase.next !== action.by) return { ok: false, error: 'not-your-turn' };
      const trick = state.currentTrick!;
      if (action.cardIds.length !== trick.leadCount) {
        return { ok: false, error: 'wrong-card-count' };
      }
      const hand = state.hands[action.by]!;
      if (!isAllInHand(hand, action.cardIds)) return { ok: false, error: 'cards-not-in-hand' };
      const cards = pickCardsByIds(hand, action.cardIds)!;

      if (action.faceDown) {
        const newPlayed = [...trick.played, { by: action.by, cards, faceDown: true }];
        const newLocked = trick.lockedFromBeating.includes(action.by)
          ? trick.lockedFromBeating
          : [...trick.lockedFromBeating, action.by];
        const newHands = state.hands.map((h, i) =>
          i === action.by ? removeCardsFromHand(h, action.cardIds) : h,
        );
        const allPlayed = newPlayed.length === 4;
        const newTrick: Trick = {
          ...trick,
          played: newPlayed,
          lockedFromBeating: newLocked,
        };
        if (allPlayed) {
          const topSeat = newTrick.played[newTrick.topIndex]!.by;
          const firstToAsk = nextSeat(topSeat);
          return {
            ok: true,
            state: {
              ...state,
              hands: newHands,
              currentTrick: { ...newTrick, extraRound: { asked: [], nextToAsk: firstToAsk } },
              phase: { kind: 'extra-round' },
              log: [...state.log, { kind: 'follow', by: action.by, cards, faceDown: true }],
            },
            events: [{ kind: 'cards-played', bySeat: action.by, count: cards.length, faceDown: true }],
          };
        }
        return {
          ok: true,
          state: {
            ...state,
            hands: newHands,
            currentTrick: newTrick,
            phase: { kind: 'follow', next: nextSeat(action.by) },
            log: [...state.log, { kind: 'follow', by: action.by, cards, faceDown: true }],
          },
          events: [{ kind: 'cards-played', bySeat: action.by, count: cards.length, faceDown: true }],
        };
      }

      // Beat path.
      const top = trick.played[trick.topIndex]!.cards;
      if (!isPairingValid(cards, top, state.trump)) {
        if (cards.length === 1) return { ok: false, error: 'cannot-beat' };
        return { ok: false, error: 'invalid-pairing' };
      }

      const newPlayed = [...trick.played, { by: action.by, cards, faceDown: false }];
      const newHands = state.hands.map((h, i) =>
        i === action.by ? removeCardsFromHand(h, action.cardIds) : h,
      );
      const newTopIndex = newPlayed.length - 1;

      const allPlayed = newPlayed.length === 4;
      const newTrick: Trick = {
        ...trick,
        played: newPlayed,
        topIndex: newTopIndex,
      };

      if (allPlayed) {
        const topSeat = newTrick.played[newTrick.topIndex]!.by;
        const firstToAsk = nextSeat(topSeat);
        return {
          ok: true,
          state: {
            ...state,
            hands: newHands,
            currentTrick: { ...newTrick, extraRound: { asked: [], nextToAsk: firstToAsk } },
            phase: { kind: 'extra-round' },
            log: [...state.log, { kind: 'follow', by: action.by, cards, faceDown: false }],
          },
          events: [{ kind: 'cards-played', bySeat: action.by, count: cards.length, faceDown: false }],
        };
      }

      return {
        ok: true,
        state: {
          ...state,
          hands: newHands,
          currentTrick: newTrick,
          phase: { kind: 'follow', next: nextSeat(action.by) },
          log: [...state.log, { kind: 'follow', by: action.by, cards, faceDown: false }],
        },
        events: [{ kind: 'cards-played', bySeat: action.by, count: cards.length, faceDown: false }],
      };
    }

    default:
      void state;
      return { ok: false, error: 'unknown-action' };
  }
}
