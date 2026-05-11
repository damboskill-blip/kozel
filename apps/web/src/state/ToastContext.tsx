import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useSocket } from '../socket/useSocket.js';
import type { EphemeralEvent } from '@kozel/shared';

export type Toast = { id: number; event: EphemeralEvent; at: number };

export type ToastState = {
  toasts: Toast[];
  dismiss: (id: number) => void;
};

const Ctx = createContext<ToastState | null>(null);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const { socket } = useSocket();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const onEphemeral = (p: { events: EphemeralEvent[] }): void => {
      setToasts((prev) => [
        ...prev,
        ...p.events.map((e) => ({ id: nextId++, event: e, at: Date.now() })),
      ].slice(-30));
    };
    socket.on('ephemeral', onEphemeral);
    return () => { socket.off('ephemeral', onEphemeral); };
  }, [socket]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return <Ctx.Provider value={{ toasts, dismiss }}>{children}</Ctx.Provider>;
}

export function useToasts(): ToastState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToasts must be used within ToastProvider');
  return v;
}
