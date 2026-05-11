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

  it('shows two team labels and one "Сесть" button per team with free spots', () => {
    render(<RoomLobbyScreen roomCode="AB1234" seats={seats} mySeat={null}
      onSit={vi.fn()} onLeave={vi.fn()} onReady={vi.fn()} />);
    expect(screen.getByText('Команда 1')).toBeInTheDocument();
    expect(screen.getByText('Команда 2')).toBeInTheDocument();
    // Команда 1 has Alice in seat 0 + empty seat 2 → 1 button; Команда 2 empty → 1 button
    const btns = screen.getAllByText('Сесть');
    expect(btns).toHaveLength(2);
  });

  it('clicking "Сесть" on Команда 1 with seat 0 taken assigns seat 2 (other spot in team)', () => {
    const onSit = vi.fn();
    render(<RoomLobbyScreen roomCode="AB1234" seats={seats} mySeat={null}
      onSit={onSit} onLeave={vi.fn()} onReady={vi.fn()} />);
    // Buttons are rendered in team order: Команда 1, Команда 2.
    const btns = screen.getAllByText('Сесть');
    fireEvent.click(btns[0]!);
    expect(onSit).toHaveBeenCalledWith(2);
    fireEvent.click(btns[1]!);
    expect(onSit).toHaveBeenCalledWith(1); // first empty in Команда 2 = seat 1
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
