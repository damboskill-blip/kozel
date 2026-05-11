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

describe('chat broadcast', () => {
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

  it('seated player can send chat; others receive event with name and seat', async () => {
    const a = nc(); await hello(a, 'Alice');
    const room = await emitp(a, 'create-room', {});
    await emitp(a, 'take-seat', { seat: 0 });
    const b = nc(); await hello(b, 'Bob');
    await emitp(b, 'join-room', { roomCode: room.roomCode });
    await emitp(b, 'take-seat', { seat: 1 });
    const chatRecv = new Promise<any>((resolve) => b.once('chat', resolve));
    const r = await emitp(a, 'chat', { text: 'hello!' });
    expect(r.ok).toBe(true);
    const msg = await chatRecv;
    expect(msg.text).toBe('hello!');
    expect(msg.from).toBe(0);
    expect(msg.name).toBe('Alice');
  });

  it('chat from non-seated player is rejected', async () => {
    const a = nc(); await hello(a, 'Alice');
    const room = await emitp(a, 'create-room', {});
    const b = nc(); await hello(b, 'Bob');
    await emitp(b, 'join-room', { roomCode: room.roomCode });
    const r = await emitp(b, 'chat', { text: 'hi' });
    expect(r.error).toBe('not-seated');
  });

  it('chat throttled after 5 quick messages', async () => {
    const a = nc(); await hello(a, 'Alice');
    const room = await emitp(a, 'create-room', {});
    await emitp(a, 'take-seat', { seat: 0 });
    for (let i = 0; i < 5; i++) {
      const r = await emitp(a, 'chat', { text: `m${i}` });
      expect(r.ok).toBe(true);
    }
    const r6 = await emitp(a, 'chat', { text: 'm6' });
    expect(r6.error).toBe('rate-limited');
  });
});
