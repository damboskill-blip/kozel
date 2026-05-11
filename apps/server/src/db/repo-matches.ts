import type { Database } from 'better-sqlite3';
import { v7 as uuidv7 } from 'uuid';
import type { GameState, Action, EphemeralEvent } from '@kozel/shared';

export type MatchStatus = 'lobby' | 'playing' | 'finished';

export type MatchRow = {
  id: string;
  roomCode: string;
  state: GameState;
  status: MatchStatus;
  createdAt: number;
  updatedAt: number;
};

export type SeatRow = {
  match_id: string;
  seat: number;
  player_id: string | null;
  ready: number;
};

export type MatchEventRow = {
  id: number;
  match_id: string;
  seq: number;
  action: Action;
  ephemeral: EphemeralEvent[];
  created_at: number;
};

function parseMatchRow(r: any): MatchRow {
  return {
    id: r.id,
    roomCode: r.room_code,
    state: JSON.parse(r.state_json) as GameState,
    status: r.status as MatchStatus,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function createMatch(db: Database, roomCode: string, state: GameState): MatchRow {
  const id = uuidv7();
  const now = Date.now();
  db.transaction(() => {
    db.prepare(
      'INSERT INTO matches (id, room_code, state_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(id, roomCode, JSON.stringify(state), 'lobby', now, now);
    const ins = db.prepare(
      'INSERT INTO match_seats (match_id, seat, player_id, ready) VALUES (?, ?, NULL, 0)',
    );
    for (const s of [0, 1, 2, 3]) ins.run(id, s);
  })();
  return { id, roomCode, state, status: 'lobby', createdAt: now, updatedAt: now };
}

export function getMatchByRoomCode(db: Database, roomCode: string): MatchRow | null {
  const r = db.prepare('SELECT * FROM matches WHERE room_code = ?').get(roomCode);
  return r ? parseMatchRow(r) : null;
}

export function getMatchById(db: Database, id: string): MatchRow | null {
  const r = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
  return r ? parseMatchRow(r) : null;
}

export function updateMatchState(
  db: Database, id: string, state: GameState, status: MatchStatus,
): void {
  db.prepare(
    'UPDATE matches SET state_json = ?, status = ?, updated_at = ? WHERE id = ?',
  ).run(JSON.stringify(state), status, Date.now(), id);
}

export function finalizeMatch(db: Database, id: string): void {
  db.prepare('UPDATE matches SET status = ?, updated_at = ? WHERE id = ?')
    .run('finished', Date.now(), id);
}

export function listActiveMatches(db: Database): MatchRow[] {
  const rows = db.prepare("SELECT * FROM matches WHERE status != 'finished' ORDER BY created_at")
    .all();
  return rows.map(parseMatchRow);
}

export function getSeats(db: Database, matchId: string): SeatRow[] {
  return db.prepare('SELECT * FROM match_seats WHERE match_id = ? ORDER BY seat').all(matchId) as SeatRow[];
}

export function setSeatPlayer(
  db: Database, matchId: string, seat: number, playerId: string | null,
): void {
  db.prepare(
    'UPDATE match_seats SET player_id = ?, ready = 0 WHERE match_id = ? AND seat = ?',
  ).run(playerId, matchId, seat);
}

export function setSeatReady(
  db: Database, matchId: string, seat: number, ready: boolean,
): void {
  db.prepare('UPDATE match_seats SET ready = ? WHERE match_id = ? AND seat = ?')
    .run(ready ? 1 : 0, matchId, seat);
}

export function appendMatchEvent(
  db: Database, matchId: string, action: Action, ephemeral: EphemeralEvent[],
): MatchEventRow {
  const seqRow = db.prepare(
    'SELECT COALESCE(MAX(seq), 0) AS s FROM match_events WHERE match_id = ?',
  ).get(matchId) as { s: number };
  const seq = seqRow.s + 1;
  const now = Date.now();
  const result = db.prepare(
    'INSERT INTO match_events (match_id, seq, action_json, ephemeral_json, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(matchId, seq, JSON.stringify(action), JSON.stringify(ephemeral), now);
  return {
    id: Number(result.lastInsertRowid),
    match_id: matchId, seq, action,
    ephemeral, created_at: now,
  };
}

export function listMatchEvents(db: Database, matchId: string): MatchEventRow[] {
  const rows = db.prepare(
    'SELECT * FROM match_events WHERE match_id = ? ORDER BY seq',
  ).all(matchId) as any[];
  return rows.map((r) => ({
    id: r.id,
    match_id: r.match_id,
    seq: r.seq,
    action: JSON.parse(r.action_json) as Action,
    ephemeral: JSON.parse(r.ephemeral_json) as EphemeralEvent[],
    created_at: r.created_at,
  }));
}
