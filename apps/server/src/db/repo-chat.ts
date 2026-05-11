import type { Database } from 'better-sqlite3';

export type ChatRow = {
  id: number;
  match_id: string;
  player_id: string;
  seat: number;
  text: string;
  created_at: number;
};

export function appendChat(
  db: Database, matchId: string, playerId: string, seat: number, text: string,
): ChatRow {
  const now = Date.now();
  const r = db.prepare(
    'INSERT INTO chat_messages (match_id, player_id, seat, text, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(matchId, playerId, seat, text, now);
  return {
    id: Number(r.lastInsertRowid),
    match_id: matchId, player_id: playerId, seat, text, created_at: now,
  };
}

export function listChat(db: Database, matchId: string): ChatRow[] {
  return db.prepare('SELECT * FROM chat_messages WHERE match_id = ? ORDER BY id').all(matchId) as ChatRow[];
}

export function listChatSince(db: Database, matchId: string, sinceId: number): ChatRow[] {
  return db.prepare('SELECT * FROM chat_messages WHERE match_id = ? AND id > ? ORDER BY id').all(matchId, sinceId) as ChatRow[];
}
