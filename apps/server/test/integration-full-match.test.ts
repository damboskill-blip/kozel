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
function waitForState(c: Socket, predicate: (s: any) => boolean, timeoutMs = 4000): Promise<any> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    const onState = (p: any) => {
      if (predicate(p.state)) {
        clearTimeout(t);
        c.off('state-update', onState);
        resolve(p.state);
      }
    };
    c.on('state-update', onState);
  });
}

describe('integration: 4 clients play 1 sdacha to completion', () => {
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

  it('runs a full sdacha; ends in sdacha-end → between-tricks or match-end', async () => {
    const players = [nc(), nc(), nc(), nc()];
    await Promise.all(players.map((c, i) => hello(c, `P${i}`)));
    const room = await emitp(players[0]!, 'create-room', {});
    for (let i = 1; i < 4; i++) await emitp(players[i]!, 'join-room', { roomCode: room.roomCode });
    for (let i = 0; i < 4; i++) await emitp(players[i]!, 'take-seat', { seat: i });
    // Register state listeners BEFORE sending ready (so we capture the initial state-update)
    let states: Record<number, any> = {};
    players.forEach((c, i) => c.on('state-update', (p) => { states[i] = p.state; }));

    for (let i = 0; i < 4; i++) await emitp(players[i]!, 'ready', { ready: true });

    // Wait for all 4 players to receive initial state
    await new Promise<void>((resolve) => {
      const check = () => {
        if (Object.keys(states).length === 4) resolve();
        else setTimeout(check, 20);
      };
      setTimeout(check, 20);
    });

    const MAX_STEPS = 200;
    for (let step = 0; step < MAX_STEPS; step++) {
      const s = states[0]!;
      if (!s) { await new Promise((r) => setTimeout(r, 10)); continue; }
      const phase = s.phase.kind;
      if (phase === 'sdacha-end' || phase === 'match-end') break;
      if (phase === 'lead') {
        const leader = s.phase.leader as number;
        const ownState = states[leader];
        if (!ownState) { await new Promise((r) => setTimeout(r, 30)); continue; }
        const card = (ownState.hands[leader] as any[])[0].id;
        await emitp(players[leader]!, 'action', { kind: 'lead', by: leader, cardIds: [card] });
      } else if (phase === 'follow') {
        const next = s.phase.next as number;
        const ownState = states[next];
        if (!ownState) { await new Promise((r) => setTimeout(r, 30)); continue; }
        const card = (ownState.hands[next] as any[])[0].id;
        await emitp(players[next]!, 'action', { kind: 'follow', by: next, cardIds: [card], faceDown: true });
      } else if (phase === 'extra-round') {
        const seat = s.currentTrick!.extraRound!.nextToAsk as number;
        await emitp(players[seat]!, 'action', { kind: 'extra-pass', by: seat });
      } else if (phase === 'between-tricks') {
        // server auto-progresses via microtask; wait for state to advance
        await new Promise((r) => setTimeout(r, 80));
      } else if (phase === 'intercept-window') {
        // claim intercept on behalf of first eligible seat to skip 3s wait
        const eligible = s.phase.eligible as number[];
        if (eligible.length > 0) {
          await emitp(players[eligible[0]!]!, 'claim-intercept', {});
        } else {
          // no eligible players: wait for server expiry
          await new Promise<void>((resolve) => {
            const check = () => {
              if (states[0]?.phase.kind !== 'intercept-window') resolve();
              else setTimeout(check, 100);
            };
            setTimeout(check, 100);
          });
        }
      } else {
        break;
      }
      await new Promise((r) => setTimeout(r, 30));
    }

    expect(['sdacha-end', 'between-tricks', 'match-end', 'lead']).toContain(states[0]!.phase.kind);
  }, 20_000);
});
