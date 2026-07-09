import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileMigrationProvider, type Kysely, Migrator } from 'kysely';
import type { Database } from './types.js';

export async function migrateToLatest(db: Kysely<Database>): Promise<void> {
  const directory = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'migrations'
  );
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: directory,
    }),
  });
  const result = await migrator.migrateToLatest();
  if (result.error) throw result.error;
}
