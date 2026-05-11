import Database from 'better-sqlite3';
import type { Database as DBType } from 'better-sqlite3';
import { applyMigrations } from './schema.js';

export function openDb(path: string): DBType {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  applyMigrations(db);
  return db;
}

export type DB = DBType;
