import 'dotenv/config';
import pg from 'pg';
import { bootstrapDatabase } from './bootstrap';
import { getDatabaseSslConfig } from './connection';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: getDatabaseSslConfig(process.env) });
try {
  await bootstrapDatabase(pool);
  console.log('Empty database bootstrapped and schema contract verified. No accounts provisioned.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Database bootstrap failed');
  process.exitCode = 1;
} finally {
  await pool.end();
}
