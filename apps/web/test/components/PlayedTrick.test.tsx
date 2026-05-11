import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PlayedTrick } from '../../src/components/PlayedTrick.js';

const trick = {
  leader: 0,
  leadCount: 1,
  played: [
    { seat: 0, faceDown: false, cards: [{ kind: 'normal', rank: 'A', suit: 'hearts', id: 'A-hearts' }] },
    { seat: 1, faceDown: true, cards: [{ kind: 'hidden' }] },
  ],
} as any;

describe('PlayedTrick', () => {
  it('renders each play in order', () => {
    render(<PlayedTrick trick={trick} />);
    expect(screen.getByTestId('played-seat-0')).toBeInTheDocument();
    expect(screen.getByTestId('played-seat-1')).toBeInTheDocument();
  });

  it('renders nothing when trick is null', () => {
    const { container } = render(<PlayedTrick trick={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
