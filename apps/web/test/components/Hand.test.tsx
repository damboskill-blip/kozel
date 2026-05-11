import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Hand } from '../../src/components/Hand.js';

const cards = [
  { kind: 'normal', rank: 'A', suit: 'hearts', id: 'A-hearts' } as const,
  { kind: 'normal', rank: 'K', suit: 'spades', id: 'K-spades' } as const,
  { kind: 'normal', rank: 'Q', suit: 'clubs', id: 'Q-clubs' } as const,
];

describe('Hand', () => {
  it('renders all cards', () => {
    render(<Hand cards={cards} selectedIds={[]} onToggle={() => {}} />);
    expect(screen.getByTestId('card-A-hearts')).toBeInTheDocument();
    expect(screen.getByTestId('card-K-spades')).toBeInTheDocument();
    expect(screen.getByTestId('card-Q-clubs')).toBeInTheDocument();
  });

  it('clicking a card calls onToggle with its id', () => {
    const onToggle = vi.fn();
    render(<Hand cards={cards} selectedIds={[]} onToggle={onToggle} />);
    fireEvent.click(screen.getByTestId('card-A-hearts'));
    expect(onToggle).toHaveBeenCalledWith('A-hearts');
  });

  it('marks selected cards', () => {
    render(<Hand cards={cards} selectedIds={['K-spades']} onToggle={() => {}} />);
    expect(screen.getByTestId('card-K-spades').className).toMatch(/selected/);
    expect(screen.getByTestId('card-A-hearts').className).not.toMatch(/selected/);
  });

  it('disables clicks when interactive=false', () => {
    const onToggle = vi.fn();
    render(<Hand cards={cards} selectedIds={[]} onToggle={onToggle} interactive={false} />);
    fireEvent.click(screen.getByTestId('card-A-hearts'));
    expect(onToggle).not.toHaveBeenCalled();
  });
});
