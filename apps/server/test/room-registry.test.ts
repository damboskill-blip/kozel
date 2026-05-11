import { describe, it, expect } from 'vitest';
import { RoomRegistry, generateRoomCode } from '../src/lifecycle/room.js';

describe('generateRoomCode', () => {
  it('produces 6-char uppercase alphanumeric (no ambiguous chars)', () => {
    for (let i = 0; i < 100; i++) {
      const c = generateRoomCode();
      expect(c).toMatch(/^[A-Z2-9]{6}$/);
      expect(c).not.toMatch(/[OI01]/);
    }
  });
});

describe('RoomRegistry', () => {
  it('register / lookup by matchId and roomCode', () => {
    const reg = new RoomRegistry();
    reg.register({ matchId: 'm1', roomCode: 'ABCDEF' } as any);
    expect(reg.byMatchId('m1')).toBeDefined();
    expect(reg.byRoomCode('ABCDEF')).toBeDefined();
    expect(reg.byMatchId('does-not-exist')).toBeUndefined();
  });

  it('unregister removes from both indexes', () => {
    const reg = new RoomRegistry();
    reg.register({ matchId: 'm1', roomCode: 'ABCDEF' } as any);
    reg.unregister('m1');
    expect(reg.byMatchId('m1')).toBeUndefined();
    expect(reg.byRoomCode('ABCDEF')).toBeUndefined();
  });
});
