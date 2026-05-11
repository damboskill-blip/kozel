import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PlayedTrick } from '../../src/components/PlayedTrick.js';

const trick = {
  leader: 0,
  leadCount: 1,
  played: [
    { by: 0, faceDown: false, cards: [{ kind: 'normal', rank: 'A', suit: 'hearts', id: 'A-hearts' }] },
    { by: 1, faceDown: true, cards: [{ kind: 'hidden' }] },
  ],
} as any;

const names = ['Alice', 'Bob', 'Carol', 'Dave'];

describe('PlayedTrick', () => {
  it('renders each seat that played', () => {
    render(<PlayedTrick trick={trick} mySeat={0} seatNames={names} />);
    expect(screen.getByTestId('played-seat-0')).toBeInTheDocument();
    expect(screen.getByTestId('played-seat-1')).toBeInTheDocument();
  });

  it('renders nothing when trick is null', () => {
    const { container } = render(<PlayedTrick trick={null} mySeat={0} seatNames={names} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('places mySeat at bottom and partner at top regardless of absolute seat', () => {
    // From seat 2's POV: 2=bottom, 3=right, 0=top, 1=left.
    render(<PlayedTrick trick={trick} mySeat={2} seatNames={names} />);
    expect(screen.getByTestId('played-seat-0').className).toMatch(/top/);
    expect(screen.getByTestId('played-seat-1').className).toMatch(/left/);
  });

  it('labels each play with the player name from seatNames', () => {
    render(<PlayedTrick trick={trick} mySeat={0} seatNames={names} />);
    expect(screen.getByTestId('played-seat-0').textContent).toContain('Alice');
    expect(screen.getByTestId('played-seat-1').textContent).toContain('Bob');
  });
});
