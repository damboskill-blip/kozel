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

describe('seat management', () => {
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

  it('take-seat assigns and broadcasts seats-updated', async () => {
    const a = newClient(); await hello(a, 'Alice');
    const created = await emitp(a, 'create-room', {});
    const b = newClient(); await hello(b, 'Bob');
    await emitp(b, 'join-room', { roomCode: created.roomCode });
    // listen AFTER join-room so we capture the take-seat broadcast, not the join-room broadcast
    const seatsPromise = new Promise<any>((resolve) => {
      b.on('seats-updated', (ev) => { if (ev.seats[1]?.playerId) resolve(ev); });
    });
    const r = await emitp(b, 'take-seat', { seat: 1 });
    expect(r.ok).toBe(true);
    const ev = await seatsPromise;
    expect(ev.seats[1].playerId).not.toBeNull();
    expect(ev.seats[1].name).toBe('Bob');
  });

  it('take-seat fails if seat occupied', async () => {
    const a = newClient(); await hello(a, 'Alice');
    const created = await emitp(a, 'create-room', {});
    await emitp(a, 'take-seat', { seat: 0 });
    const b = newClient(); await hello(b, 'Bob');
    await emitp(b, 'join-room', { roomCode: created.roomCode });
    const r = await emitp(b, 'take-seat', { seat: 0 });
    expect(r.error).toBe('seat-occupied');
  });

  it('leave-seat clears seat', async () => {
    const a = newClient(); await hello(a, 'Alice');
    const created = await emitp(a, 'create-room', {});
    await emitp(a, 'take-seat', { seat: 0 });
    await emitp(a, 'leave-seat', {});
    const b = newClient(); await hello(b, 'Bob');
    const snap = await emitp(b, 'join-room', { roomCode: created.roomCode });
    expect(snap.seats[0].playerId).toBeNull();
  });
});
