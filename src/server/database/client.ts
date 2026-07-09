import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { Database } from './types.js';

export function createDatabase(databaseUrl: string): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString: databaseUrl, max: 10 }) as never,
    }),
  });
}
