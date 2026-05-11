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

describe('action handler: lead', () => {
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
  function nc(): Socket { const c = ioc(url, { transports: ['websocket'] }); cs.push(c); return c; }

  async function setupMatch(): Promise<{ players: Socket[]; firstLeader: number; leaderClient: Socket; leaderState: any }> {
    const players = [nc(), nc(), nc(), nc()];
    await Promise.all(players.map((c, i) => hello(c, `P${i}`)));
    const room = await emitp(players[0]!, 'create-room', {});
    for (let i = 1; i < 4; i++) await emitp(players[i]!, 'join-room', { roomCode: room.roomCode });
    for (let i = 0; i < 4; i++) await emitp(players[i]!, 'take-seat', { seat: i });

    // Collect state-updates for ALL players to adapt to any firstLeader.
    const stateUpdates: any[] = new Array(4).fill(null);
    const statePromises = players.map((c, i) =>
      new Promise<void>((resolve) => c.once('state-update', (p) => { stateUpdates[i] = p; resolve(); })),
    );

    const matchStarted = new Promise<any>((resolve) => players[0]!.on('match-started', resolve));
    for (let i = 0; i < 4; i++) await emitp(players[i]!, 'ready', { ready: true });
    await matchStarted;
    await Promise.all(statePromises);

    const p0State = stateUpdates[0]!.state;
    const firstLeader = p0State.phase.kind === 'lead' ? p0State.phase.leader : 0;
    const leaderState = stateUpdates[firstLeader]!.state;
    return { players, firstLeader, leaderClient: players[firstLeader]!, leaderState };
  }

  it('leader can lead a card; non-leaders receive state-update', async () => {
    const { players, firstLeader, leaderClient, leaderState } = await setupMatch();
    const card = leaderState.hands[firstLeader][0].id;
    const otherWaiting = new Promise<any>((resolve) => {
      const other = players.find((_, i) => i !== firstLeader)!;
      other.once('state-update', resolve);
    });
    const r = await emitp(leaderClient, 'action', { kind: 'lead', by: firstLeader, cardIds: [card] });
    expect(r.ok).toBe(true);
    const otherUpdate = await otherWaiting;
    expect(otherUpdate.state.phase.kind).toBe('follow');
  });

  it('non-leader lead is rejected', async () => {
    const { players, firstLeader } = await setupMatch();
    const wrongSeat = (firstLeader + 1) % 4;
    const r = await emitp(players[wrongSeat]!, 'action', { kind: 'lead', by: wrongSeat, cardIds: ['A-hearts'] });
    expect(r.error).toMatch(/not-your-turn|invalid|cards-not-in-hand/);
  });
});
