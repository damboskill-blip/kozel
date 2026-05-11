import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DB } from '../db/index.js';

export type ServerOpts = { db: DB; logger?: boolean; webDist?: string };

export async function buildServer(opts: ServerOpts): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false });

  app.get('/health', async () => ({ ok: true }));
  app.get('/version', async () => ({ version: '0.0.0' }));

  app.decorate('db', opts.db);

  const webDist = opts.webDist
    ? resolve(opts.webDist)
    : resolve(process.cwd(), '../web/dist');
  if (existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist, prefix: '/', wildcard: false });
    app.setNotFoundHandler((req, reply) => {
      if (req.method !== 'GET' || req.url.startsWith('/socket.io')) {
        reply.code(404).send({ error: 'not-found' });
        return;
      }
      reply.sendFile('index.html');
    });
  }

  return app;
}
