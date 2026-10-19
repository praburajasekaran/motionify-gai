import { readFile, readdir } from 'node:fs/promises';
import pg from 'pg';
import { LATEST_SCHEMA_MIGRATION, verifyDatabaseContract } from './contract';

const SNAPSHOT_MIGRATIONS: Record<string, string> = {
  '003': 'Canonical project number and client columns are in schema.sql.',
  '006': 'Task comments already contain user_name.',
  '007': 'The task stage enum already includes both review states.',
  '008': 'User invitations and current roles are in schema.sql.',
  '012': 'Canonical membership and invitation tables are in schema.sql.',
  '013': 'Proposal revisions_included is in schema.sql.',
  '014': 'Project files and their indexes are in schema.sql.',
  '015': 'Proposal revisions_description is in schema.sql.',
  '017': 'Project name is in schema.sql.',
  '020': 'Client-assignment backfill has no records in an empty database.',
  '021': 'Fresh databases do not provision privileged accounts.',
  '026': 'Activity backfill has no records in an empty database.',
};

export async function bootstrapDatabase(pool: pg.Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(79204131)');
    const existing = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);
    if (existing.rows.length) {
      throw new Error('Bootstrap requires an empty public schema. Use db:migrate for an existing database.');
    }
    await client.query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
    await client.query(`CREATE TABLE migrations (
      id SERIAL PRIMARY KEY, version VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL, applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`);
    const files = (await readdir(new URL('./migrations/', import.meta.url)))
      .filter(file => /^\d{3}_.+\.sql$/.test(file) && file.slice(0, 3) <= LATEST_SCHEMA_MIGRATION.version)
      .sort();
    for (const file of files) {
      const version = file.slice(0, 3);
      if (!SNAPSHOT_MIGRATIONS[version]) {
        const sql = await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8');
        const up = sql.match(/--\s*UP\s*\n([\s\S]*?)(?=--\s*DOWN|$)/i);
        await client.query(up ? up[1] : sql);
      }
      await client.query('INSERT INTO migrations (version, name) VALUES ($1, $2)',
        [version, file.slice(4, -4)]);
    }
    const contract = await verifyDatabaseContract(client);
    if (!contract.ready) {
      throw new Error(`Bootstrap contract failed: ${JSON.stringify(contract.issues)}`);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
