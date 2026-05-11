import { describe, it, expect, beforeEach } from 'vitest';
import { openDb } from '../src/db/index.js';
import { createPlayer, findPlayerByReconnectToken, updatePlayerName } from '../src/db/repo-players.js';
import { generateReconnectToken, hashReconnectToken } from '../src/reconnect/token.js';
import type { Database } from 'better-sqlite3';

describe('players repo + reconnect', () => {
  let db: Database;
  beforeEach(() => {
    db = openDb(':memory:');
  });

  it('createPlayer stores name and reconnect hash; returns id+token', () => {
    const r = createPlayer(db, 'Alice');
    expect(r.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.reconnectToken).toMatch(/^[0-9a-f]{64}$/);
    expect(r.name).toBe('Alice');

    const row: any = db.prepare('SELECT * FROM players WHERE id=?').get(r.id);
    expect(row.name).toBe('Alice');
    expect(row.reconnect_hash).toBe(hashReconnectToken(r.reconnectToken));
  });

  it('findPlayerByReconnectToken returns player when token matches', () => {
    const c = createPlayer(db, 'Bob');
    const p = findPlayerByReconnectToken(db, c.reconnectToken);
    expect(p).not.toBeNull();
    expect(p!.id).toBe(c.id);
    expect(p!.name).toBe('Bob');
  });

  it('findPlayerByReconnectToken returns null for unknown token', () => {
    const fake = generateReconnectToken();
    const p = findPlayerByReconnectToken(db, fake);
    expect(p).toBeNull();
  });

  it('updatePlayerName changes name in db', () => {
    const c = createPlayer(db, 'Alice');
    updatePlayerName(db, c.id, 'Alice2');
    const p = findPlayerByReconnectToken(db, c.reconnectToken);
    expect(p!.name).toBe('Alice2');
  });
});
