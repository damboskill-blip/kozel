import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useSocket } from '../socket/useSocket.js';
import type { SeatIndex } from '@kozel/shared';

export type ChatMsg = { from: SeatIndex; name: string; text: string; at: number };

export type ChatState = {
  messages: ChatMsg[];
  send: (text: string) => Promise<{ ok: true } | { error: string }>;
};

const Ctx = createContext<ChatState | null>(null);
const MAX = 200;

export function ChatProvider({ children }: { children: ReactNode }): JSX.Element {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<ChatMsg[]>([]);

  useEffect(() => {
    const onChat = (p: ChatMsg): void => {
      setMessages((prev) => {
        const next = [...prev, p];
        return next.length > MAX ? next.slice(next.length - MAX) : next;
      });
    };
    socket.on('chat', onChat);
    return () => { socket.off('chat', onChat); };
  }, [socket]);

  const send = useCallback(async (text: string) => {
    return new Promise<{ ok: true } | { error: string }>((resolve) => {
      socket.emit('chat', { text }, resolve);
    });
  }, [socket]);

  return <Ctx.Provider value={{ messages, send }}>{children}</Ctx.Provider>;
}

export function useChat(): ChatState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useChat must be used within ChatProvider');
  return v;
}
