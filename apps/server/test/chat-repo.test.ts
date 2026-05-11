import { describe, it, expect, beforeEach } from 'vitest';
import type { Database } from 'better-sqlite3';
import { openDb } from '../src/db/index.js';
import { appendChat, listChat, listChatSince } from '../src/db/repo-chat.js';
import { createPlayer } from '../src/db/repo-players.js';
import { createMatch } from '../src/db/repo-matches.js';
import type { GameState } from '@kozel/shared';

function dummyState(): GameState {
  return {
    matchId: 'X', roomCode: 'X', seats: [],
    hands: [[], [], [], []], stock: [],
    trump: null, trumpCardVisible: null,
    phase: { kind: 'sdacha-end' }, currentTrick: null, nextLeader: 0,
    scores: { sdacha: { A: 0, B: 0 }, match: { A: 0, B: 0 } },
    sdachaNumber: 0, log: [],
  };
}

describe('chat repo', () => {
  let db: Database;
  beforeEach(() => { db = openDb(':memory:'); });

  it('appendChat stores text + listChat returns in order', () => {
    const m = createMatch(db, 'R1', dummyState());
    const a = createPlayer(db, 'Alice');
    const b = createPlayer(db, 'Bob');
    appendChat(db, m.id, a.id, 0, 'hi');
    appendChat(db, m.id, b.id, 1, 'hello');
    const msgs = listChat(db, m.id);
    expect(msgs.map((mm) => mm.text)).toEqual(['hi', 'hello']);
    expect(msgs[0]!.seat).toBe(0);
    expect(msgs[1]!.seat).toBe(1);
  });

  it('listChatSince filters by message id', () => {
    const m = createMatch(db, 'R2', dummyState());
    const a = createPlayer(db, 'Alice');
    appendChat(db, m.id, a.id, 0, 'one');
    const second = appendChat(db, m.id, a.id, 0, 'two');
    appendChat(db, m.id, a.id, 0, 'three');
    const after = listChatSince(db, m.id, second.id);
    expect(after.map((mm) => mm.text)).toEqual(['three']);
  });
});
