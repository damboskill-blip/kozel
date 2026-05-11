import { describe, it, expect } from 'vitest';
import { seededShuffle } from '../src/engine/shuffle.js';

describe('seededShuffle', () => {
  it('produces same order for same seed', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const a = seededShuffle(arr, 42);
    const b = seededShuffle(arr, 42);
    expect(a).toEqual(b);
  });

  it('produces different order for different seed', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const a = seededShuffle(arr, 42);
    const b = seededShuffle(arr, 43);
    expect(a).not.toEqual(b);
  });

  it('does not mutate input array', () => {
    const arr = [1, 2, 3, 4, 5];
    const original = [...arr];
    seededShuffle(arr, 1);
    expect(arr).toEqual(original);
  });

  it('preserves all elements', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled = seededShuffle(arr, 7);
    expect(shuffled.sort()).toEqual([...arr].sort());
  });

  it('handles single-element array', () => {
    expect(seededShuffle([42], 1)).toEqual([42]);
  });

  it('handles empty array', () => {
    expect(seededShuffle([], 1)).toEqual([]);
  });
});
