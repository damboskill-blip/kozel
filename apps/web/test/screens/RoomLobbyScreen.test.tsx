import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RoomLobbyScreen } from '../../src/screens/RoomLobbyScreen.js';

const seats: any = [
  { seat: 0, playerId: 'p1', name: 'Alice', connected: true, ready: true },
  { seat: 1, playerId: null, name: null, connected: false, ready: false },
  { seat: 2, playerId: null, name: null, connected: false, ready: false },
  { seat: 3, playerId: null, name: null, connected: false, ready: false },
];

describe('RoomLobbyScreen', () => {
  it('displays room code', () => {
    render(<RoomLobbyScreen roomCode="AB1234" seats={seats} mySeat={null}
      onSit={vi.fn()} onLeave={vi.fn()} onReady={vi.fn()} />);
    expect(screen.getByText(/AB1234/)).toBeInTheDocument();
  });

  it('empty seat shows "Сесть" button; clicking calls onSit with seat index', () => {
    const onSit = vi.fn();
    render(<RoomLobbyScreen roomCode="AB1234" seats={seats} mySeat={null}
      onSit={onSit} onLeave={vi.fn()} onReady={vi.fn()} />);
    const btns = screen.getAllByText('Сесть');
    expect(btns).toHaveLength(3);
    fireEvent.click(btns[0]!);
    expect(onSit).toHaveBeenCalledWith(1);
  });

  it('when mySeat is set, shows leave + ready toggle', () => {
    const onReady = vi.fn();
    render(<RoomLobbyScreen roomCode="AB1234" seats={seats} mySeat={0}
      onSit={vi.fn()} onLeave={vi.fn()} onReady={onReady} />);
    expect(screen.getByText('Встать')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Жду'));
    expect(onReady).toHaveBeenCalledWith(false); // seat 0 is currently ready=true → toggle to false
  });
});
