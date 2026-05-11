import type { Database } from 'better-sqlite3';
import { v7 as uuidv7 } from 'uuid';
import { generateReconnectToken, hashReconnectToken } from '../reconnect/token.js';

export type PlayerRow = {
  id: string;
  name: string;
  reconnect_hash: string;
  created_at: number;
};

export function createPlayer(
  db: Database,
  name: string,
): { id: string; reconnectToken: string; name: string } {
  const id = uuidv7();
  const reconnectToken = generateReconnectToken();
  const reconnect_hash = hashReconnectToken(reconnectToken);
  const now = Date.now();
  db.prepare(
    'INSERT INTO players (id, name, reconnect_hash, created_at) VALUES (?, ?, ?, ?)',
  ).run(id, name, reconnect_hash, now);
  return { id, reconnectToken, name };
}

export function findPlayerByReconnectToken(db: Database, token: string): PlayerRow | null {
  const hash = hashReconnectToken(token);
  const row = db
    .prepare('SELECT * FROM players WHERE reconnect_hash = ?')
    .get(hash) as PlayerRow | undefined;
  return row ?? null;
}

export function findPlayerById(db: Database, id: string): PlayerRow | null {
  const row = db
    .prepare('SELECT * FROM players WHERE id = ?')
    .get(id) as PlayerRow | undefined;
  return row ?? null;
}

export function updatePlayerName(db: Database, id: string, name: string): void {
  db.prepare('UPDATE players SET name = ? WHERE id = ?').run(name, id);
}
