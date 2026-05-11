import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useSocket } from '../socket/useSocket.js';
import type { ProjectedGameState, RoomSnapshot, SeatIndex, SeatPresence, Action } from '@kozel/shared';

export type RoomState = {
  roomCode: string | null;
  matchId: string | null;
  status: 'lobby' | 'playing' | 'finished' | null;
  mySeat: SeatIndex | null;
  seats: SeatPresence[];
  state: ProjectedGameState | null;
  createRoom: () => Promise<string | null>;
  joinRoom: (code: string) => Promise<RoomSnapshot | { error: string }>;
  takeSeat: (seat: SeatIndex) => Promise<{ ok: true } | { error: string }>;
  leaveSeat: () => Promise<{ ok: true }>;
  setReady: (ready: boolean) => Promise<{ ok: true } | { error: string }>;
  sendAction: (action: Action) => Promise<{ ok: true } | { error: string }>;
  claimIntercept: () => Promise<{ ok: true } | { error: string }>;
  addBot: () => Promise<{ ok: true } | { error: string }>;
};

const Ctx = createContext<RoomState | null>(null);

export function RoomProvider({ children }: { children: ReactNode }): JSX.Element {
  const { socket } = useSocket();
  const [snapshot, setSnapshot] = useState<{
    roomCode: string | null;
    matchId: string | null;
    status: 'lobby' | 'playing' | 'finished' | null;
    mySeat: SeatIndex | null;
    seats: SeatPresence[];
    state: ProjectedGameState | null;
  }>({ roomCode: null, matchId: null, status: null, mySeat: null, seats: [], state: null });

  useEffect(() => {
    const onSeats = (p: { seats: SeatPresence[] }): void => {
      setSnapshot((s) => ({ ...s, seats: p.seats }));
    };
    const onState = (p: { state: ProjectedGameState }): void => {
      setSnapshot((s) => ({ ...s, state: p.state }));
    };
    const onStarted = (): void => {
      setSnapshot((s) => ({ ...s, status: 'playing' }));
    };
    const onClosed = (): void => {
      setSnapshot({ roomCode: null, matchId: null, status: null, mySeat: null, seats: [], state: null });
    };
    socket.on('seats-updated', onSeats);
    socket.on('state-update', onState);
    socket.on('match-started', onStarted);
    socket.on('room-closed', onClosed);
    return () => {
      socket.off('seats-updated', onSeats);
      socket.off('state-update', onState);
      socket.off('match-started', onStarted);
      socket.off('room-closed', onClosed);
    };
  }, [socket]);

  const createRoom = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      socket.emit('create-room', {}, (resp: any) => {
        if (resp && resp.roomCode) {
          setSnapshot((s) => ({ ...s, roomCode: resp.roomCode, status: 'lobby' }));
          resolve(resp.roomCode);
        } else resolve(null);
      });
    });
  }, [socket]);

  const joinRoom = useCallback(async (code: string): Promise<RoomSnapshot | { error: string }> => {
    return new Promise((resolve) => {
      socket.emit('join-room', { roomCode: code }, (resp: any) => {
        if (resp && resp.roomCode) {
          setSnapshot({
            roomCode: resp.roomCode, matchId: resp.matchId, status: resp.status,
            mySeat: resp.mySeat, seats: resp.seats, state: resp.state,
          });
        }
        resolve(resp);
      });
    });
  }, [socket]);

  const takeSeat = useCallback(async (seat: SeatIndex) => {
    return new Promise<{ ok: true } | { error: string }>((resolve) => {
      socket.emit('take-seat', { seat }, (resp: any) => {
        if (resp.ok) setSnapshot((s) => ({ ...s, mySeat: seat }));
        resolve(resp);
      });
    });
  }, [socket]);

  const leaveSeat = useCallback(async () => {
    return new Promise<{ ok: true }>((resolve) => {
      socket.emit('leave-seat', {}, (resp: any) => {
        setSnapshot((s) => ({ ...s, mySeat: null }));
        resolve(resp);
      });
    });
  }, [socket]);

  const setReady = useCallback(async (ready: boolean) => {
    return new Promise<{ ok: true } | { error: string }>((resolve) => {
      socket.emit('ready', { ready }, resolve);
    });
  }, [socket]);

  const sendAction = useCallback(async (action: Action) => {
    return new Promise<{ ok: true } | { error: string }>((resolve) => {
      socket.emit('action', action, resolve);
    });
  }, [socket]);

  const claimIntercept = useCallback(async () => {
    return new Promise<{ ok: true } | { error: string }>((resolve) => {
      socket.emit('claim-intercept', {}, resolve);
    });
  }, [socket]);

  const addBot = useCallback(async () => {
    return new Promise<{ ok: true } | { error: string }>((resolve) => {
      socket.emit('add-bot', {}, resolve);
    });
  }, [socket]);

  return (
    <Ctx.Provider value={{
      ...snapshot,
      createRoom, joinRoom, takeSeat, leaveSeat, setReady, sendAction, claimIntercept, addBot,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useRoom(): RoomState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRoom must be used within RoomProvider');
  return v;
}
