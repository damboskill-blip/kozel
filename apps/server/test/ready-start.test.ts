import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildServer } from '../src/server/http.js';
import { attachIo } from '../src/server/io.js';
import { openDb } from '../src/db/index.js';
import type { FastifyInstance } from 'fastify';
import { io as ioc, type Socket } from 'socket.io-client';
import type { Database } from 'better-sqlite3';

async function hello(c: Socket, n: string): Promise<any> {
  return new Promise((res) => c.on('connect', () => c.emit('hello', { name: n }, res)));
}
async function emitp(c: Socket, ev: string, p: any): Promise<any> {
  return new Promise((res) => c.emit(ev, p, res));
}

describe('ready → match-started', () => {
  let app: FastifyInstance; let db: Database; let url: string;
  const cs: Socket[] = [];
  beforeEach(async () => {
    db = openDb(':memory:');
    app = await buildServer({ db });
    await attachIo(app, db);
    await app.listen({ port: 0, host: '127.0.0.1' });
    const a = app.server.address(); if (!a || typeof a === 'string') throw new Error();
    url = `http://127.0.0.1:${a.port}`;
  });
  afterEach(async () => { for (const c of cs) c.disconnect(); cs.length = 0; await app.close(); db.close(); });
  function newClient(): Socket { const c = ioc(url, { transports: ['websocket'] }); cs.push(c); return c; }

  it('match starts when all 4 seated players ready', async () => {
    const players = [newClient(), newClient(), newClient(), newClient()];
    await Promise.all(players.map((c, i) => hello(c, `P${i}`)));
    const room = await emitp(players[0]!, 'create-room', {});
    for (let i = 1; i < 4; i++) await emitp(players[i]!, 'join-room', { roomCode: room.roomCode });
    for (let i = 0; i < 4; i++) await emitp(players[i]!, 'take-seat', { seat: i });

    const matchStarted = new Promise<any>((resolve) => players[0]!.on('match-started', resolve));
    for (let i = 0; i < 4; i++) await emitp(players[i]!, 'ready', { ready: true });
    const ev = await matchStarted;
    expect(ev.matchId).toBeTypeOf('string');
    expect(ev.sdachaNumber).toBe(1);
  });

  it('match does not start with only 3 ready', async () => {
    const players = [newClient(), newClient(), newClient(), newClient()];
    await Promise.all(players.map((c, i) => hello(c, `P${i}`)));
    const room = await emitp(players[0]!, 'create-room', {});
    for (let i = 1; i < 4; i++) await emitp(players[i]!, 'join-room', { roomCode: room.roomCode });
    for (let i = 0; i < 4; i++) await emitp(players[i]!, 'take-seat', { seat: i });
    let started = false;
    players[0]!.on('match-started', () => { started = true; });
    for (let i = 0; i < 3; i++) await emitp(players[i]!, 'ready', { ready: true });
    await new Promise((r) => setTimeout(r, 50));
    expect(started).toBe(false);
  });
});
