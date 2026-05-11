import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card } from '../../src/components/Card.js';

describe('Card', () => {
  it('renders normal card with rank + suit glyph', () => {
    render(<Card card={{ kind: 'normal', rank: 'A', suit: 'hearts', id: 'A-hearts' }} />);
    const c = screen.getByTestId('card-A-hearts');
    expect(c).toHaveTextContent('A');
    expect(c).toHaveTextContent('♥');
  });

  it('renders joker with star', () => {
    render(<Card card={{ kind: 'joker', id: 'joker-1' }} />);
    expect(screen.getByTestId('card-joker-1')).toHaveTextContent('★');
  });

  it('renders face-down back (hidden)', () => {
    render(<Card card={{ kind: 'hidden' } as any} />);
    expect(screen.getByTestId('card-hidden')).toBeInTheDocument();
  });

  it('calls onClick when clickable', async () => {
    const onClick = vi.fn();
    render(<Card card={{ kind: 'normal', rank: '6', suit: 'spades', id: '6-spades' }} onClick={onClick} />);
    screen.getByTestId('card-6-spades').click();
    expect(onClick).toHaveBeenCalled();
  });

  it('applies selected style when selected=true', () => {
    render(<Card card={{ kind: 'normal', rank: '7', suit: 'clubs', id: '7-clubs' }} selected />);
    expect(screen.getByTestId('card-7-clubs').className).toMatch(/selected/);
  });
});
