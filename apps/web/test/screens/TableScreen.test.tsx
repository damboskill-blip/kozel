import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TableScreen } from '../../src/screens/TableScreen.js';

const baseState: any = {
  matchId: 'm', roomCode: 'R', seats: [], sdachaNumber: 1,
  hands: [
    [{ kind: 'normal', rank: 'A', suit: 'hearts', id: 'A-hearts' }, { kind: 'normal', rank: '7', suit: 'spades', id: '7-spades' }],
    { count: 6 }, { count: 6 }, { count: 6 },
  ],
  stock: [], trump: 'hearts', trumpCardVisible: null,
  phase: { kind: 'lead', leader: 0 },
  currentTrick: null, nextLeader: 0,
  scores: { sdacha: { A: 0, B: 0 }, match: { A: 0, B: 0 } },
  log: [],
};

const seats: any = [
  { seat: 0, playerId: 'p0', name: 'Alice', connected: true, ready: true },
  { seat: 1, playerId: 'p1', name: 'Bob', connected: true, ready: true },
  { seat: 2, playerId: 'p2', name: 'Carol', connected: true, ready: true },
  { seat: 3, playerId: 'p3', name: 'Dave', connected: true, ready: true },
];

describe('TableScreen', () => {
  it('renders my hand and three opponents', () => {
    render(<TableScreen state={baseState} seats={seats} mySeat={0}
      onAction={vi.fn()} onClaimIntercept={vi.fn()} onSendChat={vi.fn()} chatMessages={[]} />);
    expect(screen.getByTestId('card-A-hearts')).toBeInTheDocument();
    expect(screen.getAllByTestId('seat-panel')).toHaveLength(3);
  });

  it('shows lead button when phase=lead and selecting card enables it', () => {
    const onAction = vi.fn();
    render(<TableScreen state={baseState} seats={seats} mySeat={0}
      onAction={onAction} onClaimIntercept={vi.fn()} onSendChat={vi.fn()} chatMessages={[]} />);
    fireEvent.click(screen.getByTestId('card-A-hearts'));
    fireEvent.click(screen.getByText(/Ход/));
    expect(onAction).toHaveBeenCalledWith({ kind: 'lead', by: 0, cardIds: ['A-hearts'] });
  });
});
