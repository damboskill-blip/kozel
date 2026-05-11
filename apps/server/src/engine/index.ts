import type {
  GameState, Action, EngineResult, EphemeralEvent, SeatIndex, LeadCount, Trick,
} from '@kozel/shared';
import { freshGameState } from './deal.js';
import { pickCardsByIds, removeCardsFromHand, isAllInHand, pickLowestNCardIds } from './helpers.js';
import { classifyLead, isPairingValid } from './validate.js';
import { nextToAskOrNull } from './extra-round.js';
import { sumPlayedSetPoints, teamOfSeat, computePenalties } from './scoring.js';
import { maybeChangeTrumpOnDraw } from './trump-change.js';
import { isHandInterceptEligible, interceptEligible } from './intercept.js';

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

    case 'extra-pass': {
      if (state.phase.kind !== 'extra-round') return { ok: false, error: 'invalid-action-for-phase' };
      const trick = state.currentTrick!;
      if (trick.extraRound!.nextToAsk !== action.by) return { ok: false, error: 'not-your-turn' };

      const newAsked = [...trick.extraRound!.asked, action.by];
      // All 4 seats (3 non-top + top) get a chance to beat. Once everyone has
      // passed, the trick closes.
      const allAsked = newAsked.length === 4;

      if (allAsked) {
        return {
          ok: true,
          state: {
            ...state,
            currentTrick: { ...trick, extraRound: { asked: newAsked, nextToAsk: action.by } },
            phase: { kind: 'between-tricks' },
            log: [...state.log, { kind: 'extra-pass', by: action.by }],
          },
          events: [],
        };
      }

      let s: SeatIndex = nextSeat(action.by);
      while (newAsked.includes(s)) {
        s = nextSeat(s);
      }
      return {
        ok: true,
        state: {
          ...state,
          currentTrick: { ...trick, extraRound: { asked: newAsked, nextToAsk: s } },
          log: [...state.log, { kind: 'extra-pass', by: action.by }],
        },
        events: [],
      };
    }

    case 'extra-beat': {
      if (state.phase.kind !== 'extra-round') return { ok: false, error: 'invalid-action-for-phase' };
      const trick = state.currentTrick!;
      const actualNextToAsk = nextToAskOrNull(trick);
      if (actualNextToAsk !== action.by) return { ok: false, error: 'not-your-turn' };
      if (trick.lockedFromBeating.includes(action.by)) return { ok: false, error: 'locked-from-beating' };
      if (action.cardIds.length !== trick.leadCount) return { ok: false, error: 'wrong-card-count' };

      const hand = state.hands[action.by]!;
      if (!isAllInHand(hand, action.cardIds)) return { ok: false, error: 'cards-not-in-hand' };
      const cards = pickCardsByIds(hand, action.cardIds)!;

      const top = trick.played[trick.topIndex]!.cards;
      if (!isPairingValid(cards, top, state.trump)) {
        return { ok: false, error: cards.length === 1 ? 'cannot-beat' : 'invalid-pairing' };
      }

      // Beater puts N face-up cards beating top.
      const played = [...trick.played, { by: action.by, cards, faceDown: false }];
      const newTopIndex = played.length - 1;
      const newHands = state.hands.map((h, i) =>
        i === action.by ? removeCardsFromHand(h, action.cardIds) : h,
      );
      const events: EphemeralEvent[] = [
        { kind: 'cards-played', bySeat: action.by, count: cards.length, faceDown: false },
      ];

      // All 3 other players auto-skid leadCount face-down cards.
      // Keeps hand counts in lockstep so the sdacha can finish.
      const N = trick.leadCount;
      for (const seat of [0, 1, 2, 3] as SeatIndex[]) {
        if (seat === action.by) continue;
        const h = newHands[seat]!;
        const skidCount = Math.min(N, h.length);
        if (skidCount === 0) continue;
        const skidIds = pickLowestNCardIds(h, skidCount, state.trump);
        const skidCards = pickCardsByIds(h, skidIds)!;
        played.push({ by: seat, cards: skidCards, faceDown: true });
        newHands[seat] = removeCardsFromHand(h, skidIds);
        events.push({ kind: 'cards-played', bySeat: seat, count: skidCount, faceDown: true });
      }

      return {
        ok: true,
        state: {
          ...state,
          hands: newHands,
          currentTrick: {
            ...trick,
            played,
            topIndex: newTopIndex,
            extraRound: { asked: [], nextToAsk: action.by },
          },
          phase: { kind: 'between-tricks' },
          log: [...state.log, { kind: 'extra-beat', by: action.by, cards }],
        },
        events,
      };
    }

    case 'close-trick': {
      if (state.phase.kind !== 'between-tricks') return { ok: false, error: 'invalid-action-for-phase' };
      const trick = state.currentTrick!;
      const winnerSeat = trick.played[trick.topIndex]!.by;
      const team = teamOfSeat(winnerSeat);
      const points = sumPlayedSetPoints(trick.played);
      const newSdachaScores = {
        ...state.scores.sdacha,
        [team]: state.scores.sdacha[team] + points,
      };
      return {
        ok: true,
        state: {
          ...state,
          currentTrick: null,
          phase: { kind: 'between-tricks' },
          nextLeader: winnerSeat,
          scores: { ...state.scores, sdacha: newSdachaScores },
          log: [...state.log, { kind: 'trick-closed', winner: winnerSeat, team, points }],
        },
        events: [{ kind: 'trick-won', bySeat: winnerSeat, team, points }],
      };
    }

    case 'draw-cards': {
      if (state.phase.kind !== 'between-tricks') return { ok: false, error: 'invalid-action-for-phase' };
      let trump = state.trump;
      let trumpCardVisible = state.trumpCardVisible;
      const stock = [...state.stock];
      const newHands = state.hands.map((h) => [...h]);
      const events: EphemeralEvent[] = [];

      // Round-robin refill, starting from the winner of the last trick.
      // Each round every seat clockwise gets at most one card if it needs one,
      // so the hand-size gap between seats can never grow by more than 1 in a
      // single draw phase. Previously this loop fully refilled each seat in
      // turn, which let the winner take 2-3 cards while the last seat got 0
      // — that asymmetry compounded across sdacha and could leave a player
      // stranded with 0 cards while others still had cards to play.
      let progressed = true;
      while (progressed && stock.length > 0) {
        progressed = false;
        let s: SeatIndex = state.nextLeader;
        for (let i = 0; i < 4; i++) {
          if (newHands[s]!.length < 6 && stock.length > 0) {
            const drawn = stock.shift()!;
            const before = { stock: [...stock, drawn], trump, trumpCardVisible } as GameState;
            newHands[s]!.push(drawn);
            const change = maybeChangeTrumpOnDraw(before, drawn, stock);
            trump = change.trump;
            trumpCardVisible = change.trumpCardVisible;
            events.push(...change.events);
            progressed = true;
          }
          s = nextSeat(s);
        }
      }

      // End the sdacha as soon as further play is impossible: someone has 0
      // cards and the stock is empty, so the next trick could not collect 4
      // legal plays. Cards remaining in non-empty hands stay unscored.
      const stockEmpty = stock.length === 0;
      const anyEmpty = newHands.some((h) => h.length === 0);
      const allEmpty = newHands.every((h) => h.length === 0);
      if (allEmpty || (stockEmpty && anyEmpty)) {
        return {
          ok: true,
          state: {
            ...state, hands: newHands, stock, trump, trumpCardVisible,
            phase: { kind: 'sdacha-end' },
          },
          events,
        };
      }

      const eligible = interceptEligible(newHands);
      if (eligible.length > 0) {
        const INTERCEPT_WINDOW_MS = 3000;
        const deadlineMs = Date.now() + INTERCEPT_WINDOW_MS;
        return {
          ok: true,
          state: {
            ...state,
            hands: newHands, stock, trump, trumpCardVisible,
            phase: { kind: 'intercept-window', eligible, deadlineMs },
          },
          events: [
            ...events,
            { kind: 'intercept-window-open', eligibleSeats: eligible, deadlineMs },
          ],
        };
      }
      return {
        ok: true,
        state: {
          ...state,
          hands: newHands, stock, trump, trumpCardVisible,
          phase: { kind: 'lead', leader: state.nextLeader },
        },
        events,
      };
    }

    case 'claim-intercept': {
      if (state.phase.kind !== 'intercept-window') return { ok: false, error: 'invalid-action-for-phase' };
      const hand = state.hands[action.by]!;
      if (!isHandInterceptEligible(hand)) return { ok: false, error: 'not-eligible-for-intercept' };
      return {
        ok: true,
        state: {
          ...state,
          phase: { kind: 'lead', leader: action.by },
          nextLeader: action.by,
          log: [...state.log, { kind: 'intercept-claimed', by: action.by }],
        },
        events: [{ kind: 'intercept-claimed', bySeat: action.by }],
      };
    }

    case 'intercept-window-expired': {
      if (state.phase.kind !== 'intercept-window') return { ok: false, error: 'invalid-action-for-phase' };
      return {
        ok: true,
        state: { ...state, phase: { kind: 'lead', leader: state.nextLeader } },
        events: [],
      };
    }

    case 'force-end-sdacha': {
      // Recovery escape hatch: legacy rooms (created before the round-robin
      // draw fix) can sit in a phase where the next-to-act seat has 0 cards
      // and therefore can't play. The new draw-cards logic prevents reaching
      // this state, but for rooms already stuck we collapse straight to
      // sdacha-end so the match can progress.
      const ph = state.phase;
      let stuckSeat: SeatIndex | null = null;
      if (ph.kind === 'lead' && state.hands[ph.leader]!.length === 0) {
        stuckSeat = ph.leader;
      } else if (ph.kind === 'follow' && state.hands[ph.next]!.length === 0) {
        stuckSeat = ph.next;
      } else if (ph.kind === 'extra-round') {
        const t = state.currentTrick;
        const s = t?.extraRound?.nextToAsk;
        if (s !== undefined && state.hands[s]!.length === 0) stuckSeat = s;
      } else if (ph.kind === 'intercept-window') {
        const empties = state.hands.filter((h) => h.length === 0).length;
        if (empties > 0 && state.stock.length === 0) stuckSeat = 0;
      }
      if (stuckSeat === null) return { ok: false, error: 'no-stuck-seat' };
      return {
        ok: true,
        state: { ...state, currentTrick: null, phase: { kind: 'sdacha-end' } },
        events: [],
      };
    }

    case 'end-sdacha': {
      if (state.phase.kind !== 'sdacha-end') return { ok: false, error: 'invalid-action-for-phase' };
      const penalties = computePenalties(state.scores.sdacha);
      const newMatch = {
        A: state.scores.match.A + penalties.A,
        B: state.scores.match.B + penalties.B,
      };
      const events: EphemeralEvent[] = [
        { kind: 'sdacha-end', scores: { ...state.scores.sdacha }, penalties },
      ];
      const matchEnded = newMatch.A >= 18 || newMatch.B >= 18;
      if (matchEnded) {
        const loser = newMatch.A >= 18 && newMatch.B >= 18
          ? (newMatch.A >= newMatch.B ? 'A' : 'B')
          : (newMatch.A >= 18 ? 'A' : 'B');
        return {
          ok: true,
          state: {
            ...state,
            scores: { sdacha: { A: 0, B: 0 }, match: newMatch },
            phase: { kind: 'match-end', loser },
            log: [...state.log, { kind: 'sdacha-ended', scores: state.scores.sdacha, penalties }, { kind: 'match-ended', loser }],
          },
          events: [...events, { kind: 'match-end', loser }],
        };
      }
      return {
        ok: true,
        state: {
          ...state,
          scores: { sdacha: { A: 0, B: 0 }, match: newMatch },
          phase: { kind: 'between-tricks' },
          log: [...state.log, { kind: 'sdacha-ended', scores: state.scores.sdacha, penalties }],
        },
        events,
      };
    }

    case 'start-sdacha': {
      if (state.phase.kind !== 'between-tricks') return { ok: false, error: 'invalid-action-for-phase' };
      const newState = freshGameState({
        seed: action.seed,
        firstLeader: state.nextLeader,
        matchId: state.matchId,
        roomCode: state.roomCode,
        seats: state.seats,
        sdachaNumber: state.sdachaNumber + 1,
        matchScores: { ...state.scores.match },
      });
      return {
        ok: true,
        state: newState,
        events: [
          { kind: 'dealt' },
          ...(newState.trumpCardVisible ? [{ kind: 'trump-revealed', card: newState.trumpCardVisible } as EphemeralEvent] : []),
        ],
      };
    }

    case 'rematch': {
      if (state.phase.kind !== 'match-end') return { ok: false, error: 'invalid-action-for-phase' };
      const firstLeader = ((action.seed >>> 0) % 4) as 0 | 1 | 2 | 3;
      const newState = freshGameState({
        seed: action.seed,
        firstLeader,
        matchId: state.matchId,
        roomCode: state.roomCode,
        seats: state.seats,
        sdachaNumber: 1,
        matchScores: { A: 0, B: 0 },
      });
      return { ok: true, state: newState, events: [{ kind: 'dealt' }] };
    }

    default:
      void state;
      return { ok: false, error: 'unknown-action' };
  }
}
