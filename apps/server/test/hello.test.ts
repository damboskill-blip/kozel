import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildServer } from '../src/server/http.js';
import { attachIo } from '../src/server/io.js';
import { openDb } from '../src/db/index.js';
import type { FastifyInstance } from 'fastify';
import { io as ioc, type Socket } from 'socket.io-client';
import type { Database } from 'better-sqlite3';
import { findPlayerByReconnectToken } from '../src/db/repo-players.js';

describe('Socket.IO hello/reconnect', () => {
  let app: FastifyInstance;
  let db: Database;
  let url: string;
  let client: Socket | null = null;

  beforeEach(async () => {
    db = openDb(':memory:');
    app = await buildServer({ db });
    await attachIo(app, db);
    await app.listen({ port: 0, host: '127.0.0.1' });
    const addr = app.server.address();
    if (!addr || typeof addr === 'string') throw new Error('no addr');
    url = `http://127.0.0.1:${addr.port}`;
  });

  afterEach(async () => {
    if (client) client.disconnect();
    await app.close();
    db.close();
  });

  it('first hello with name creates player and returns token', async () => {
    client = ioc(url, { transports: ['websocket'] });
    const resp = await new Promise<any>((resolve) => {
      client!.on('connect', () => {
        client!.emit('hello', { name: 'Alice' }, resolve);
      });
    });
    expect(resp.playerId).toMatch(/^[0-9a-f-]{36}$/);
    expect(resp.reconnectToken).toMatch(/^[0-9a-f]{64}$/);
    const inDb = findPlayerByReconnectToken(db, resp.reconnectToken);
    expect(inDb!.name).toBe('Alice');
  });

  it('hello with valid reconnectToken returns same playerId', async () => {
    // First connect to create a player.
    client = ioc(url, { transports: ['websocket'] });
    const first = await new Promise<any>((resolve) => {
      client!.on('connect', () => client!.emit('hello', { name: 'Bob' }, resolve));
    });
    client.disconnect();
    // Reconnect with token.
    client = ioc(url, { transports: ['websocket'] });
    const second = await new Promise<any>((resolve) => {
      client!.on('connect', () => client!.emit('hello', { reconnectToken: first.reconnectToken }, resolve));
    });
    expect(second.playerId).toBe(first.playerId);
    expect(second.reconnectToken).toBe(first.reconnectToken);
  });

  it('hello with bad token creates a new player (name required)', async () => {
    client = ioc(url, { transports: ['websocket'] });
    const resp = await new Promise<any>((resolve) => {
      client!.on('connect', () => {
        client!.emit('hello', { reconnectToken: 'deadbeef'.repeat(8), name: 'Carol' }, resolve);
      });
    });
    expect(resp.playerId).toMatch(/^[0-9a-f-]{36}$/);
  });
});
