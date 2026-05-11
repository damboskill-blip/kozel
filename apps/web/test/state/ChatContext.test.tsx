import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ChatProvider, useChat } from '../../src/state/ChatContext.js';
import { SocketContext } from '../../src/socket/SocketProvider.js';

function makeMockSocket(): any {
  const handlers: Record<string, any> = {};
  return {
    handlers,
    emit: vi.fn(),
    on: vi.fn((ev: string, h: any) => { handlers[ev] = h; }),
    off: vi.fn(),
    connected: true,
  };
}

function Display(): JSX.Element {
  const c = useChat();
  return <div data-testid="msgs">{c.messages.map((m) => `${m.from}:${m.text}`).join('|')}</div>;
}

describe('ChatContext', () => {
  it('appends incoming chat messages', () => {
    const sock = makeMockSocket();
    render(
      <SocketContext.Provider value={{ socket: sock, connected: true }}>
        <ChatProvider><Display /></ChatProvider>
      </SocketContext.Provider>,
    );
    act(() => {
      sock.handlers['chat']?.({ from: 0, name: 'Alice', text: 'hi', at: 1 });
      sock.handlers['chat']?.({ from: 1, name: 'Bob', text: 'hello', at: 2 });
    });
    expect(screen.getByTestId('msgs')).toHaveTextContent('0:hi|1:hello');
  });

  it('caps messages at 200', () => {
    const sock = makeMockSocket();
    render(
      <SocketContext.Provider value={{ socket: sock, connected: true }}>
        <ChatProvider><Display /></ChatProvider>
      </SocketContext.Provider>,
    );
    act(() => {
      for (let i = 0; i < 250; i++) {
        sock.handlers['chat']?.({ from: 0, name: 'X', text: `m${i}`, at: i });
      }
    });
    const text = screen.getByTestId('msgs').textContent!;
    expect(text.split('|').length).toBe(200);
  });
});
