import Fastify, { type FastifyInstance } from 'fastify';
import type { DB } from '../db/index.js';

export type ServerOpts = { db: DB; logger?: boolean };

export async function buildServer(opts: ServerOpts): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false });

  app.get('/health', async () => ({ ok: true }));
  app.get('/version', async () => ({ version: '0.0.0' }));

  // db is attached for later use (Socket.IO handlers will reach in via decorator)
  app.decorate('db', opts.db);

  return app;
}
