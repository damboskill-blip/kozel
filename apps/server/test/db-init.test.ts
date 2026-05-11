import { describe, it, expect } from 'vitest';
import { openDb } from '../src/db/index.js';
import { applyMigrations } from '../src/db/schema.js';

describe('openDb', () => {
  it('creates all tables in :memory: db', () => {
    const db = openDb(':memory:');
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    ).all().map((r: any) => r.name);
    expect(tables).toContain('players');
    expect(tables).toContain('matches');
    expect(tables).toContain('match_seats');
    expect(tables).toContain('match_events');
    expect(tables).toContain('chat_messages');
    db.close();
  });

  it('is idempotent — running migrations twice does not error', () => {
    const db = openDb(':memory:');
    // schema applied in openDb; call again via re-open on same path won't help with :memory:.
    // Instead, directly re-run migration via the exported function.
    expect(() => {
      applyMigrations(db);
    }).not.toThrow();
    db.close();
  });
});
