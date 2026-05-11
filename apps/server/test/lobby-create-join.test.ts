import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildServer } from '../src/server/http.js';
import { attachIo } from '../src/server/io.js';
import { openDb } from '../src/db/index.js';
import type { FastifyInstance } from 'fastify';
import { io as ioc, type Socket } from 'socket.io-client';
import type { Database } from 'better-sqlite3';

async function hello(client: Socket, name: string): Promise<any> {
  return new Promise((resolve) => {
    client.on('connect', () => client.emit('hello', { name }, resolve));
  });
}
async function emitp(client: Socket, ev: string, payload: any): Promise<any> {
  return new Promise((resolve) => client.emit(ev, payload, resolve));
}

describe('create-room + join-room', () => {
  let app: FastifyInstance; let db: Database; let url: string;
  const clients: Socket[] = [];

  beforeEach(async () => {
    db = openDb(':memory:');
    app = await buildServer({ db });
    await attachIo(app, db);
    await app.listen({ port: 0, host: '127.0.0.1' });
    const a = app.server.address(); if (!a || typeof a === 'string') throw new Error();
    url = `http://127.0.0.1:${a.port}`;
  });
  afterEach(async () => {
    for (const c of clients) c.disconnect();
    clients.length = 0;
    await app.close(); db.close();
  });
  function newClient(): Socket {
    const c = ioc(url, { transports: ['websocket'] });
    clients.push(c); return c;
  }

  it('create-room returns a 6-char code and persists match in lobby', async () => {
    const c = newClient();
    await hello(c, 'Alice');
    const resp = await emitp(c, 'create-room', {});
    expect(resp.roomCode).toMatch(/^[A-Z2-9]{6}$/);
  });

  it('join-room with valid code returns RoomSnapshot with seats', async () => {
    const a = newClient(); await hello(a, 'Alice');
    const created = await emitp(a, 'create-room', {});
    const b = newClient(); await hello(b, 'Bob');
    const snap = await emitp(b, 'join-room', { roomCode: created.roomCode });
    expect(snap.roomCode).toBe(created.roomCode);
    expect(snap.seats).toHaveLength(4);
    expect(snap.status).toBe('lobby');
    expect(snap.mySeat).toBeNull();
  });

  it('join-room with unknown code returns error', async () => {
    const c = newClient(); await hello(c, 'X');
    const snap = await emitp(c, 'join-room', { roomCode: 'ZZZZZZ' });
    expect(snap.error).toBe('unknown-room');
  });
});
