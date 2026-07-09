import { getConfig } from '../config.js';
import { createDatabase } from './client.js';
import { migrateToLatest } from './migrate.js';
import { seedDatabase } from './seed.js';

const config = getConfig();
const db = createDatabase(config.DATABASE_URL);

try {
  await migrateToLatest(db);
  if (process.argv[2] === 'seed') await seedDatabase(db, config);
  console.log(
    process.argv[2] === 'seed' ? 'Database seeded.' : 'Database migrated.'
  );
} finally {
  await db.destroy();
}
