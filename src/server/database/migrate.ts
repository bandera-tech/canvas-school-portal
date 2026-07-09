import { type Kysely, type MigrationProvider, Migrator } from 'kysely';
import * as initialMigration from './migrations/001_initial.js';
import type { Database } from './types.js';

const migrationProvider: MigrationProvider = {
  async getMigrations() {
    return { '001_initial': initialMigration };
  },
};

export async function migrateToLatest(db: Kysely<Database>): Promise<void> {
  const migrator = new Migrator({
    db,
    provider: migrationProvider,
  });
  const result = await migrator.migrateToLatest();
  if (result.error) throw result.error;
}
