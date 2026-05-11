import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildServer } from '../src/server/http.js';
import { attachIo } from '../src/server/io.js';
import { openDb } from '../src/db/index.js';
import { createMatch } from '../src/db/repo-matches.js';
import { freshGameState } from '../src/engine/deal.js';
import type { FastifyInstance } from 'fastify';
import { io as ioc, type Socket } from 'socket.io-client';
import type { Database } from 'better-sqlite3';

async function hello(c: Socket, n: string): Promise<any> {
  return new Promise((res) => c.on('connect', () => c.emit('hello', { name: n }, res)));
}
async function emitp(c: Socket, ev: string, p: any): Promise<any> {
  return new Promise((res) => c.emit(ev, p, res));
}

describe('recovery: rooms reloaded from DB at startup', () => {
  let db: Database; let app: FastifyInstance; let url: string; const cs: Socket[] = [];
  beforeEach(async () => {
    db = openDb(':memory:');
    // Pre-seed: a lobby room in the DB.
    const placeholder = freshGameState({
      seed: 0, firstLeader: 0, matchId: '', roomCode: 'PRESED',
      seats: [], sdachaNumber: 0, matchScores: { A: 0, B: 0 },
    });
    placeholder.phase = { kind: 'sdacha-end' };
    placeholder.hands = [[], [], [], []]; placeholder.stock = [];
    placeholder.trump = null; placeholder.trumpCardVisible = null;
    placeholder.sdachaNumber = 0;
    createMatch(db, 'PRESED', placeholder);
    app = await buildServer({ db });
    await attachIo(app, db);
    await app.listen({ port: 0, host: '127.0.0.1' });
    const a = app.server.address(); if (!a || typeof a === 'string') throw new Error();
    url = `http://127.0.0.1:${a.port}`;
  });
  afterEach(async () => { for (const c of cs) c.disconnect(); cs.length = 0; await app.close(); db.close(); });
  function nc(): Socket { const c = ioc(url, { transports: ['websocket'] }); cs.push(c); return c; }

  it('client can join-room a pre-seeded room by code', async () => {
    const c = nc(); await hello(c, 'Alice');
    const snap = await emitp(c, 'join-room', { roomCode: 'PRESED' });
    expect(snap.roomCode).toBe('PRESED');
    expect(snap.seats).toHaveLength(4);
  });
});
