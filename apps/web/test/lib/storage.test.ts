import { describe, it, expect, beforeEach } from 'vitest';
import { loadSession, saveSession, clearSession } from '../../src/lib/storage.js';

describe('storage', () => {
  beforeEach(() => { localStorage.clear(); });

  it('returns null when nothing saved', () => {
    expect(loadSession()).toBeNull();
  });

  it('roundtrips session', () => {
    saveSession({ playerId: 'p1', name: 'Alice', reconnectToken: 'abc', lastRoom: 'ROOM01' });
    expect(loadSession()).toEqual({ playerId: 'p1', name: 'Alice', reconnectToken: 'abc', lastRoom: 'ROOM01' });
  });

  it('clears', () => {
    saveSession({ playerId: 'p1', name: 'Alice', reconnectToken: 'abc', lastRoom: null });
    clearSession();
    expect(loadSession()).toBeNull();
  });

  it('returns null on malformed JSON', () => {
    localStorage.setItem('kozel.session', '{not-json');
    expect(loadSession()).toBeNull();
  });
});
