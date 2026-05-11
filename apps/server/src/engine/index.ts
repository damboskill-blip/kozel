import type { GameState, Action, EngineResult, EphemeralEvent } from '@kozel/shared';
import { freshGameState } from './deal.js';

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
    default:
      void state;
      return { ok: false, error: 'unknown-action' };
  }
}
