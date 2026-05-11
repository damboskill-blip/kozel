// Public engine entrypoint. Real implementation in subsequent tasks.
import type { GameState, Action, EngineResult } from '@kozel/shared';

export function engine(_state: GameState, _action: Action): EngineResult {
  return { ok: false, error: 'unknown-action' };
}
