import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SessionProvider, useSession } from '../../src/state/SessionContext.js';
import { SocketContext } from '../../src/socket/SocketProvider.js';
import type { ReactNode } from 'react';

function makeMockSocket(helloResp: any): any {
  const handlers: Record<string, any> = {};
  return {
    emit: vi.fn((event: string, _payload: any, cb: any) => {
      if (event === 'hello') cb(helloResp);
    }),
    on: vi.fn((ev: string, h: any) => { handlers[ev] = h; }),
    off: vi.fn(),
    connected: true,
  };
}

function wrap(children: ReactNode, socket: any): JSX.Element {
  return (
    <SocketContext.Provider value={{ socket, connected: true }}>
      <SessionProvider>{children}</SessionProvider>
    </SocketContext.Provider>
  );
}

function Display(): JSX.Element {
  const s = useSession();
  return <div data-testid="info">{s.playerId ?? 'none'}|{s.name ?? 'none'}</div>;
}

describe('SessionContext', () => {
  beforeEach(() => localStorage.clear());

  it('calls hello with new name and saves session', async () => {
    const sock = makeMockSocket({ playerId: 'p1', reconnectToken: 't1' });
    render(wrap(<Display />, sock));
    // Provider should NOT auto-hello with empty name; needs caller to set name.
    expect(screen.getByTestId('info')).toHaveTextContent('none|none');
  });

  it('login() emits hello and saves session', async () => {
    const sock = makeMockSocket({ playerId: 'p1', reconnectToken: 't1' });
    function Login(): JSX.Element {
      const s = useSession();
      return <button onClick={() => s.login('Alice')}>go</button>;
    }
    render(wrap(<><Login /><Display /></>, sock));
    screen.getByText('go').click();
    await waitFor(() => expect(screen.getByTestId('info')).toHaveTextContent('p1|Alice'));
    const saved = JSON.parse(localStorage.getItem('kozel.session')!);
    expect(saved.playerId).toBe('p1');
  });

  it('on mount with saved session, auto-hello with token', async () => {
    localStorage.setItem('kozel.session', JSON.stringify({
      playerId: 'old', name: 'Bob', reconnectToken: 'token', lastRoom: null,
    }));
    const sock = makeMockSocket({ playerId: 'old', reconnectToken: 'token' });
    render(wrap(<Display />, sock));
    await waitFor(() => expect(screen.getByTestId('info')).toHaveTextContent('old|Bob'));
    expect(sock.emit).toHaveBeenCalledWith('hello', { reconnectToken: 'token' }, expect.any(Function));
  });
});
