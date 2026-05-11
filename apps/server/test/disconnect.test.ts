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

describe('disconnect/reconnect', () => {
  let app: FastifyInstance; let db: Database; let url: string; const cs: Socket[] = [];
  beforeEach(async () => {
    db = openDb(':memory:');
    app = await buildServer({ db });
    await attachIo(app, db);
    await app.listen({ port: 0, host: '127.0.0.1' });
    const a = app.server.address(); if (!a || typeof a === 'string') throw new Error();
    url = `http://127.0.0.1:${a.port}`;
  });
  afterEach(async () => { for (const c of cs) c.disconnect(); cs.length = 0; await app.close(); db.close(); });
  function nc(): Socket { const c = ioc(url, { transports: ['websocket'] }); cs.push(c); return c; }

  it('disconnect marks seat as connected=false; reconnect via token restores presence', async () => {
    const a = nc(); const aHello = await hello(a, 'Alice');
    const code = (await emitp(a, 'create-room', {})).roomCode;
    await emitp(a, 'take-seat', { seat: 0 });
    const b = nc(); await hello(b, 'Bob');
    await emitp(b, 'join-room', { roomCode: code });
    const seatsUpdated = new Promise<any>((resolve) => b.on('seats-updated', resolve));
    a.disconnect();
    const ev = await seatsUpdated;
    expect(ev.seats[0].connected).toBe(false);

    // Reconnect with token
    const a2 = nc();
    const r = await new Promise<any>((resolve) =>
      a2.on('connect', () => a2.emit('hello', { reconnectToken: aHello.reconnectToken }, resolve)),
    );
    expect(r.playerId).toBe(aHello.playerId);
    const reSnap = await emitp(a2, 'join-room', { roomCode: code });
    expect(reSnap.mySeat).toBe(0);
    expect(reSnap.seats[0].connected).toBe(true);
  });
});
