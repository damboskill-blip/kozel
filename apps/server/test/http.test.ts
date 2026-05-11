import { describe, it, expect, afterEach } from 'vitest';
import { buildServer } from '../src/server/http.js';
import type { FastifyInstance } from 'fastify';

describe('Fastify HTTP', () => {
  let app: FastifyInstance | null = null;

  afterEach(async () => {
    if (app) await app.close();
    app = null;
  });

  it('GET /health → 200 with ok=true', async () => {
    app = await buildServer({ db: { _kozel_test_: true } as any });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('GET /version → 200 with version field', async () => {
    app = await buildServer({ db: { _kozel_test_: true } as any });
    const res = await app.inject({ method: 'GET', url: '/version' });
    expect(res.statusCode).toBe(200);
    expect(res.json().version).toBeTypeOf('string');
  });
});
