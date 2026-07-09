import { Redis } from 'ioredis';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApi } from './app.js';
import { getConfig } from './config.js';
import { createDatabase } from './database/client.js';
import { migrateToLatest } from './database/migrate.js';
import { seedDatabase } from './database/seed.js';

const runIntegration = process.env.RUN_INTEGRATION === '1';
const suite = runIntegration ? describe : describe.skip;

suite('HTTP API', () => {
  const config = getConfig({
    ...process.env,
    DATABASE_URL:
      process.env.DATABASE_URL ??
      'postgres://postgres:postgres@localhost:5432/concentrate-quiz',
    REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
    JWT_SECRET:
      process.env.JWT_SECRET ??
      'integration-secret-that-is-longer-than-thirty-two-characters',
  });
  const db = createDatabase(config.DATABASE_URL);
  const redis = new Redis(config.REDIS_URL);
  let app: Awaited<ReturnType<typeof buildApi>>;
  let adminCookie = '';

  beforeAll(async () => {
    await migrateToLatest(db);
    await seedDatabase(db, config);
    app = await buildApi({ db, redis, config });
    await app.ready();
    const login = await request(app.server).post('/api/auth/login').send({
      email: 'admin@canvas.test',
      password: config.DEMO_ADMIN_PASSWORD,
    });
    adminCookie = login.headers['set-cookie'][0];
  });

  afterAll(async () => {
    await app.close();
    await redis.quit();
    await db.destroy();
  });

  it('authenticates and returns the current user', async () => {
    const response = await request(app.server)
      .get('/api/auth/me')
      .set('Cookie', adminCookie);
    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      role: 'admin',
      status: 'active',
    });
  });

  it('protects role-specific routes', async () => {
    const response = await request(app.server)
      .get('/api/teacher/classes')
      .set('Cookie', adminCookie);
    expect(response.status).toBe(403);
  });

  it('serves every public statistics shape to authenticated users', async () => {
    for (const path of [
      '/api/v0/stats/average-grades',
      '/api/v0/stats/teacher-names',
      '/api/v0/stats/student-names',
      '/api/v0/stats/classes',
    ]) {
      const response = await request(app.server)
        .get(path)
        .set('Cookie', adminCookie);
      expect(response.status, path).toBe(200);
    }
  });
});
