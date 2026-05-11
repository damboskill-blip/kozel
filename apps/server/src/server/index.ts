import { openDb } from '../db/index.js';
import { buildServer } from './http.js';
import { attachIo } from './io.js';

const PORT = Number(process.env['PORT'] ?? 3001);
const DB_PATH = process.env['DB_PATH'] ?? './kozel.db';

async function main(): Promise<void> {
  const db = openDb(DB_PATH);
  const app = await buildServer({ db, logger: true });
  await attachIo(app, db);
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`kozel server listening on :${PORT}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
