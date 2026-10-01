import 'dotenv/config';
import pg from 'pg';
import { getDatabaseSslConfig } from './connection';
import { verifyDatabaseContract } from './contract';

const { Pool } = pg;

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: getDatabaseSslConfig(process.env),
  });

  try {
    const result = await verifyDatabaseContract(pool);
    if (!result.ready) {
      console.error(`Database contract is not ready for ${result.latestMigration}`);
      for (const issue of result.issues) {
        console.error(`- ${issue.code}: ${issue.object}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log(`Database contract ready (${result.latestMigration})`);
  } finally {
    await pool.end();
  }
}

main().catch(() => {
  console.error('Database contract verification failed');
  process.exitCode = 1;
});
