import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useSocket } from '../socket/useSocket.js';
import { loadSession, saveSession, clearSession } from '../lib/storage.js';

export type SessionState = {
  playerId: string | null;
  name: string | null;
  reconnectToken: string | null;
  login: (name: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }): JSX.Element {
  const { socket } = useSocket();
  const [state, setState] = useState<{ playerId: string | null; name: string | null; token: string | null }>(() => {
    const s = loadSession();
    return s ? { playerId: s.playerId, name: s.name, token: s.reconnectToken } : { playerId: null, name: null, token: null };
  });

  // On mount, if we have a stored token, send hello to verify and refresh.
  useEffect(() => {
    if (!state.token) return;
    socket.emit('hello', { reconnectToken: state.token }, (resp: any) => {
      if (resp && resp.playerId) {
        const next = { playerId: resp.playerId, name: state.name, token: resp.reconnectToken };
        setState(next);
        saveSession({
          playerId: next.playerId!, name: next.name ?? '', reconnectToken: next.token!,
          lastRoom: loadSession()?.lastRoom ?? null,
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (name: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      socket.emit('hello', { name }, (resp: any) => {
        if (resp && resp.playerId) {
          setState({ playerId: resp.playerId, name, token: resp.reconnectToken });
          saveSession({
            playerId: resp.playerId, name, reconnectToken: resp.reconnectToken,
            lastRoom: loadSession()?.lastRoom ?? null,
          });
        }
        resolve();
      });
    });
  }, [socket]);

  const logout = useCallback(() => {
    clearSession();
    setState({ playerId: null, name: null, token: null });
  }, []);

  return (
    <Ctx.Provider value={{
      playerId: state.playerId, name: state.name, reconnectToken: state.token, login, logout,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSession(): SessionState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession must be used within SessionProvider');
  return v;
}
