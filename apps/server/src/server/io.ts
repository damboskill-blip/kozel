import type { FastifyInstance } from 'fastify';
import { Server as IoServer, type Socket } from 'socket.io';
import type { DB } from '../db/index.js';
import { handleHello } from './handlers/hello.js';

export type SocketData = {
  playerId: string;
  matchId: string | null;
};

export async function attachIo(app: FastifyInstance, db: DB): Promise<void> {
  const io = new IoServer(app.server, {
    cors: { origin: true },
  });

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
  });

  app.addHook('onClose', async () => {
    io.close();
  });
}
