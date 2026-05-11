import type { FastifyInstance } from 'fastify';
import { Server as IoServer, type Socket } from 'socket.io';
import type { DB } from '../db/index.js';
import { handleHello } from './handlers/hello.js';
import { handleCreateRoom, handleJoinRoom, handleTakeSeat, handleLeaveSeat, broadcastSeats, handleReady, tryStartMatch } from './handlers/lobby.js';
import { handleAction } from './handlers/action.js';
import { handleClaimIntercept } from './handlers/intercept.js';
import { RoomRegistry } from '../lifecycle/room.js';
import { CreateRoomPayload, JoinRoomPayload, TakeSeatPayload, LeaveSeatPayload, ReadyPayload, ActionPayload, ClaimInterceptPayload } from './wire.js';
import type { SocketData } from '@kozel/shared';

export async function attachIo(app: FastifyInstance, db: DB): Promise<void> {
  const io = new IoServer(app.server, { cors: { origin: true } });
  const registry = new RoomRegistry();

  // Eager-load active matches into the in-memory registry.
  {
    const { listActiveMatches, getSeats } = await import('../db/repo-matches.js');
    const { findPlayerById } = await import('../db/repo-players.js');
    const { emptySeats } = await import('../lifecycle/room.js');
    for (const m of listActiveMatches(db)) {
      const seats = emptySeats();
      for (const s of getSeats(db, m.id)) {
        if (s.player_id) {
          const p = findPlayerById(db, s.player_id);
          seats[s.seat] = {
            seat: s.seat as 0 | 1 | 2 | 3,
            playerId: s.player_id, name: p?.name ?? null,
            connected: false, ready: !!s.ready,
            socketId: null, disconnectedAt: Date.now(),
          };
        }
      }
      registry.register({
        matchId: m.id, roomCode: m.roomCode, state: m.state, status: m.status,
        seats, turnTimer: null, interceptTimer: null,
      });
    }
  }

  io.on('connection', (socket: Socket) => {
    const data = socket.data as SocketData;
    data.matchId = null;

    socket.on('hello', (raw, cb: (resp: any) => void) => {
      try {
        const result = handleHello(db, raw, `Player ${Math.floor(Math.random() * 9000 + 1000)}`);
        data.playerId = result.playerId;
        cb({ playerId: result.playerId, reconnectToken: result.reconnectToken });
      } catch (err) {
        cb({ error: 'hello-failed', message: String(err) });
      }
    });

    socket.on('create-room', (raw, cb: (resp: any) => void) => {
      const parsed = CreateRoomPayload.safeParse(raw);
      if (!parsed.success) return cb({ error: 'invalid-payload' });
      if (!data.playerId) return cb({ error: 'not-authed' });
      cb(handleCreateRoom(db, registry, socket));
    });

    socket.on('join-room', (raw, cb: (resp: any) => void) => {
      const parsed = JoinRoomPayload.safeParse(raw);
      if (!parsed.success) return cb({ error: 'invalid-payload' });
      if (!data.playerId) return cb({ error: 'not-authed' });
      cb(handleJoinRoom(db, registry, socket, parsed.data));
    });

    socket.on('take-seat', (raw, cb: (resp: any) => void) => {
      const parsed = TakeSeatPayload.safeParse(raw);
      if (!parsed.success) return cb({ error: 'invalid-payload' });
      if (!data.playerId) return cb({ error: 'not-authed' });
      const r = handleTakeSeat(db, registry, socket, parsed.data.seat as 0 | 1 | 2 | 3);
      cb(r);
      if ('ok' in r) {
        const room = registry.byMatchId(data.matchId!);
        if (room) broadcastSeats(io, room);
      }
    });

    socket.on('leave-seat', (raw, cb: (resp: any) => void) => {
      const parsed = LeaveSeatPayload.safeParse(raw);
      if (!parsed.success) return cb({ error: 'invalid-payload' });
      if (!data.playerId) return cb({ error: 'not-authed' });
      const r = handleLeaveSeat(db, registry, socket);
      cb(r);
      if ('ok' in r) {
        const room = registry.byMatchId(data.matchId!);
        if (room) broadcastSeats(io, room);
      }
    });

    socket.on('ready', async (raw, cb: (resp: any) => void) => {
      const parsed = ReadyPayload.safeParse(raw);
      if (!parsed.success) return cb({ error: 'invalid-payload' });
      if (!data.playerId) return cb({ error: 'not-authed' });
      const r = handleReady(db, registry, socket, parsed.data.ready);
      cb(r);
      if ('ok' in r) {
        const room = registry.byMatchId(data.matchId!);
        if (room) {
          broadcastSeats(io, room);
          await tryStartMatch(db, io, room);
        }
      }
    });

    socket.on('action', async (raw, cb: (resp: any) => void) => {
      const parsed = ActionPayload.safeParse(raw);
      if (!parsed.success) return cb({ error: 'invalid-payload' });
      if (!data.playerId) return cb({ error: 'not-authed' });
      const r = await handleAction(db, registry, io, socket, parsed.data as any);
      cb(r);
    });

    socket.on('claim-intercept', (raw, cb: (resp: any) => void) => {
      const parsed = ClaimInterceptPayload.safeParse(raw);
      if (!parsed.success) return cb({ error: 'invalid-payload' });
      if (!data.playerId) return cb({ error: 'not-authed' });
      cb(handleClaimIntercept(db, registry, io, socket));
    });
  });

  app.addHook('onClose', async () => { io.close(); });
}
