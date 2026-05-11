import type { Database } from 'better-sqlite3';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS players (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  reconnect_hash  TEXT NOT NULL UNIQUE,
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_players_hash ON players(reconnect_hash);

CREATE TABLE IF NOT EXISTS matches (
  id              TEXT PRIMARY KEY,
  room_code       TEXT NOT NULL UNIQUE,
  state_json      TEXT NOT NULL,
  status          TEXT NOT NULL,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_matches_room_code ON matches(room_code);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

CREATE TABLE IF NOT EXISTS match_seats (
  match_id        TEXT NOT NULL,
  seat            INTEGER NOT NULL,
  player_id       TEXT,
  ready           INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (match_id, seat),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS match_events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id        TEXT NOT NULL,
  seq             INTEGER NOT NULL,
  action_json     TEXT NOT NULL,
  ephemeral_json  TEXT NOT NULL,
  created_at      INTEGER NOT NULL,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_match_events_match ON match_events(match_id, seq);

CREATE TABLE IF NOT EXISTS chat_messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id        TEXT NOT NULL,
  player_id       TEXT NOT NULL,
  seat            INTEGER NOT NULL,
  text            TEXT NOT NULL,
  created_at      INTEGER NOT NULL,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_match ON chat_messages(match_id, id);
`;

export function applyMigrations(db: Database): void {
  db.exec(SCHEMA_SQL);
}
