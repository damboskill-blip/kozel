import { useContext } from 'react';
import { SocketContext, type SocketCtx } from './SocketProvider.js';

export function useSocket(): SocketCtx {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
