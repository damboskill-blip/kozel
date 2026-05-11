import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { RoomProvider, useRoom } from '../../src/state/RoomContext.js';
import { SocketContext } from '../../src/socket/SocketProvider.js';
import type { ReactNode } from 'react';

function makeMockSocket(): any {
  const handlers: Record<string, any> = {};
  return {
    handlers,
    emit: vi.fn(),
    on: vi.fn((ev: string, h: any) => { handlers[ev] = h; }),
    off: vi.fn((ev: string) => { delete handlers[ev]; }),
    connected: true,
  };
}

function Display(): JSX.Element {
  const r = useRoom();
  return (
    <div data-testid="info">
      {r.roomCode ?? 'no-room'}|{r.mySeat ?? 'none'}|{r.state?.phase.kind ?? 'no-state'}
    </div>
  );
}

function wrap(children: ReactNode, sock: any): JSX.Element {
  return (
    <SocketContext.Provider value={{ socket: sock, connected: true }}>
      <RoomProvider>{children}</RoomProvider>
    </SocketContext.Provider>
  );
}

describe('RoomContext', () => {
  it('starts with no room', () => {
    const sock = makeMockSocket();
    render(wrap(<Display />, sock));
    expect(screen.getByTestId('info')).toHaveTextContent('no-room|none|no-state');
  });

  it('joinRoom emits and stores snapshot', async () => {
    const sock = makeMockSocket();
    sock.emit = vi.fn((event: string, _p: any, cb: any) => {
      if (event === 'join-room') cb({ roomCode: 'AB1234', matchId: 'm1', status: 'lobby', mySeat: null, seats: [], state: null });
    });
    function Joiner(): JSX.Element {
      const r = useRoom();
      return <button onClick={() => r.joinRoom('AB1234')}>join</button>;
    }
    render(wrap(<><Joiner /><Display /></>, sock));
    await act(async () => { screen.getByText('join').click(); });
    expect(screen.getByTestId('info')).toHaveTextContent('AB1234|none|no-state');
  });

  it('state-update event updates state', () => {
    const sock = makeMockSocket();
    render(wrap(<Display />, sock));
    act(() => {
      sock.handlers['state-update']?.({ state: { phase: { kind: 'lead', leader: 0 } } });
    });
    expect(screen.getByTestId('info')).toHaveTextContent('lead');
  });
});
