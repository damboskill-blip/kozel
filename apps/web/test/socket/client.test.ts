import { describe, it, expect } from 'vitest';
import { createSocket, DEFAULT_SERVER_URL } from '../../src/socket/client.js';

describe('createSocket', () => {
  it('creates a socket with autoConnect=false', () => {
    const s = createSocket('http://localhost:3001');
    expect(s.connected).toBe(false);
    // It should NOT auto-connect.
    s.disconnect();
  });

  it('DEFAULT_SERVER_URL is non-empty', () => {
    expect(typeof DEFAULT_SERVER_URL).toBe('string');
    expect(DEFAULT_SERVER_URL.length).toBeGreaterThan(0);
  });
});
