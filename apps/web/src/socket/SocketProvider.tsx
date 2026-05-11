import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createSocket, type KozelSocket } from './client.js';

export type SocketCtx = {
  socket: KozelSocket;
  connected: boolean;
};

export const SocketContext = createContext<SocketCtx | null>(null);

export function SocketProvider({ children, url }: { children: ReactNode; url?: string }): JSX.Element {
  const socket = useMemo(() => createSocket(url), [url]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const onConnect = (): void => setConnected(true);
    const onDisconnect = (): void => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.connect();
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
    };
  }, [socket]);

  return <SocketContext.Provider value={{ socket, connected }}>{children}</SocketContext.Provider>;
}
