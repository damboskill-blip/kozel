import type { FastifyInstance } from 'fastify';
import { Server as IoServer, type Socket } from 'socket.io';
import type { DB } from '../db/index.js';
import { handleHello } from './handlers/hello.js';
import { handleCreateRoom, handleJoinRoom, handleTakeSeat, handleLeaveSeat, broadcastSeats } from './handlers/lobby.js';
import { RoomRegistry } from '../lifecycle/room.js';
import { CreateRoomPayload, JoinRoomPayload, TakeSeatPayload, LeaveSeatPayload } from './wire.js';
import type { SocketData } from '@kozel/shared';

export async function attachIo(app: FastifyInstance, db: DB): Promise<void> {
  const io = new IoServer(app.server, { cors: { origin: true } });
  const registry = new RoomRegistry();

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
  });

  app.addHook('onClose', async () => { io.close(); });
}
