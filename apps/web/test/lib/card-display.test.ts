import { describe, it, expect } from 'vitest';
import { suitGlyph, suitColor, rankLabel, isRed } from '../../src/lib/card-display.js';

describe('suitGlyph', () => {
  it('returns unicode glyphs for each suit', () => {
    expect(suitGlyph('hearts')).toBe('♥');
    expect(suitGlyph('diamonds')).toBe('♦');
    expect(suitGlyph('spades')).toBe('♠');
    expect(suitGlyph('clubs')).toBe('♣');
  });
});

describe('suitColor', () => {
  it('hearts and diamonds are red; spades and clubs are black', () => {
    expect(suitColor('hearts')).toBe('red');
    expect(suitColor('diamonds')).toBe('red');
    expect(suitColor('spades')).toBe('black');
    expect(suitColor('clubs')).toBe('black');
  });
});

describe('rankLabel', () => {
  it('returns single-character labels', () => {
    expect(rankLabel('6')).toBe('6');
    expect(rankLabel('10')).toBe('10');
    expect(rankLabel('J')).toBe('J');
    expect(rankLabel('Q')).toBe('Q');
    expect(rankLabel('K')).toBe('K');
    expect(rankLabel('A')).toBe('A');
  });
});

describe('isRed', () => {
  it('hearts/diamonds true; spades/clubs false', () => {
    expect(isRed('hearts')).toBe(true);
    expect(isRed('diamonds')).toBe(true);
    expect(isRed('spades')).toBe(false);
    expect(isRed('clubs')).toBe(false);
  });
});
