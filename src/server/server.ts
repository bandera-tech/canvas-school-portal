import { Redis } from 'ioredis';
import { NextServer } from 'next/dist/server/next.js';
import { buildApi } from './app.js';
import { getConfig } from './config.js';
import { createDatabase } from './database/client.js';
import { migrateToLatest } from './database/migrate.js';

const config = getConfig();
const db = createDatabase(config.DATABASE_URL);
const redis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: 2 });
const web = new NextServer({
  dev: config.NODE_ENV !== 'production',
  dir: process.cwd(),
});

await migrateToLatest(db);
await web.prepare();
const app = await buildApi({ db, redis, config });
const handle = web.getRequestHandler();

app.setNotFoundHandler(async (request, reply) => {
  reply.hijack();
  await handle(request.raw, reply.raw);
});

const close = async () => {
  await app.close();
  await redis.quit();
  await db.destroy();
};
process.on('SIGINT', close);
process.on('SIGTERM', close);

await app.listen({ host: '0.0.0.0', port: config.PORT });
