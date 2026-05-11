import type { DB } from '../../db/index.js';
import {
  createPlayer, findPlayerByReconnectToken, updatePlayerName,
} from '../../db/repo-players.js';
import { HelloPayload } from '../wire.js';

export type HelloResult = {
  playerId: string;
  reconnectToken: string;
};

export function handleHello(db: DB, raw: unknown, defaultName: string): HelloResult {
  const parsed = HelloPayload.safeParse(raw);
  if (!parsed.success) {
    // Treat as anon, name defaults
    return doCreate(db, defaultName);
  }
  const p = parsed.data;
  if (p.reconnectToken) {
    const existing = findPlayerByReconnectToken(db, p.reconnectToken);
    if (existing) {
      if (p.name && p.name !== existing.name) updatePlayerName(db, existing.id, p.name);
      return { playerId: existing.id, reconnectToken: p.reconnectToken };
    }
  }
  return doCreate(db, p.name ?? defaultName);
}

function doCreate(db: DB, name: string): HelloResult {
  const r = createPlayer(db, name);
  return { playerId: r.id, reconnectToken: r.reconnectToken };
}
