import 'dotenv/config';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { getDatabaseSslConfig } from './connection';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: getDatabaseSslConfig(process.env) });

try {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '10s'");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('schema:payment-receipts', 0))");
    const prerequisite = await client.query("SELECT version FROM migrations WHERE version = '029' AND name = 'reconcile_membership_nullability'");
    if (prerequisite.rows.length !== 1) throw new Error('Existing database contract migration 029 is required');
    const applied = await client.query("SELECT name FROM migrations WHERE version = '030'");
    if (applied.rows.length && applied.rows[0].name !== 'payment_receipts') throw new Error('Migration 030 has a different identity');
    if (!applied.rows.length) {
      const sql = await readFile(new URL('./migrations/030_payment_receipts.sql', import.meta.url), 'utf8');
      await client.query(sql.split('-- DOWN')[0].replace('-- UP', ''));
      await client.query("INSERT INTO migrations (version, name) VALUES ('030', 'payment_receipts')");
    }
    await client.query('COMMIT');
    console.log('Payment receipt migration ready (030_payment_receipts)');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Payment receipt migration failed');
  process.exitCode = 1;
} finally {
  await pool.end();
}
