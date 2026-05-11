import { describe, it, expect } from 'vitest';
import { ChatThrottle } from '../src/chat/throttle.js';

describe('ChatThrottle (token-bucket: 5 msg / 10s)', () => {
  it('allows up to 5 messages immediately', () => {
    const t = new ChatThrottle();
    for (let i = 0; i < 5; i++) {
      expect(t.tryConsume('p1', i * 100)).toBe(true);
    }
  });

  it('rejects 6th message in the same window', () => {
    const t = new ChatThrottle();
    for (let i = 0; i < 5; i++) t.tryConsume('p1', i * 100);
    expect(t.tryConsume('p1', 600)).toBe(false);
  });

  it('refills tokens over time (2s/token after burst)', () => {
    const t = new ChatThrottle();
    for (let i = 0; i < 5; i++) t.tryConsume('p1', 0);
    expect(t.tryConsume('p1', 1500)).toBe(false);
    expect(t.tryConsume('p1', 2100)).toBe(true);
  });

  it('isolates per player', () => {
    const t = new ChatThrottle();
    for (let i = 0; i < 5; i++) t.tryConsume('p1', 0);
    expect(t.tryConsume('p2', 0)).toBe(true);
  });
});
