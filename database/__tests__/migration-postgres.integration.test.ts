import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import pg from 'pg';
import { fileURLToPath } from 'node:url';
import { LATEST_SCHEMA_MIGRATION, verifyDatabaseContract } from '../contract';

const { Pool } = pg;

function executable(name: string): string | null {
  const pathValue = process.env.PATH?.split(':')
    .map((directory) => join(directory, name))
    .find(existsSync);
  return pathValue ?? null;
}

async function availablePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

const initdb = executable('initdb');
const pgCtl = executable('pg_ctl');
const createdb = executable('createdb');
const postgresAvailable = Boolean(initdb && pgCtl && createdb);

describe('migration 028 PostgreSQL execution', { skip: !postgresAvailable }, () => {
  let clusterRoot = '';
  let dataDirectory = '';
  let port = 0;

  before(async () => {
    clusterRoot = await mkdtemp(join(tmpdir(), 'motionify-migration-'));
    dataDirectory = join(clusterRoot, 'data');
    port = await availablePort();
    execFileSync(initdb!, ['-D', dataDirectory, '-A', 'trust', '--no-locale', '-E', 'UTF8'], { stdio: 'ignore' });
    execFileSync(pgCtl!, ['-D', dataDirectory, '-l', join(clusterRoot, 'postgres.log'), '-o', `-F -p ${port}`, '-w', 'start'], { stdio: 'ignore' });
  });

  after(async () => {
    if (dataDirectory && pgCtl) {
      try {
        execFileSync(pgCtl, ['-D', dataDirectory, '-m', 'fast', '-w', 'stop'], { stdio: 'ignore' });
      } catch {
        // The temp cluster may already be stopped after a failed assertion.
      }
    }
    if (clusterRoot) await rm(clusterRoot, { recursive: true, force: true });
  });

  async function createDatabase(name: string): Promise<pg.Pool> {
    execFileSync(createdb!, ['-h', '127.0.0.1', '-p', String(port), name], { stdio: 'ignore' });
    return new Pool({ connectionString: `postgresql://127.0.0.1:${port}/${name}` });
  }

  async function recordMigration(pool: pg.Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(
      `INSERT INTO migrations (version, name)
       VALUES ($1, $2)
       ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name`,
      [LATEST_SCHEMA_MIGRATION.version, LATEST_SCHEMA_MIGRATION.name]
    );
  }

  it('converts the legacy project status enum while preserving its default', async () => {
    const migrationSql = await readFile(fileURLToPath(new URL(
      '../migrations/018_add_project_settings_fields.sql',
      import.meta.url
    )), 'utf8');
    const pool = await createDatabase('contract_migration_018');

    try {
      await pool.query(`
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";
        CREATE TYPE project_status AS ENUM ('draft', 'active', 'in_review');
        CREATE TABLE projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          status project_status NOT NULL DEFAULT 'active',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await pool.query(migrationSql);

      const statusColumn = await pool.query<{
        data_type: string;
        column_default: string | null;
      }>(`
        SELECT data_type, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'projects'
          AND column_name = 'status'
      `);
      assert.equal(statusColumn.rows[0].data_type, 'character varying');
      assert.match(statusColumn.rows[0].column_default ?? '', /active/i);

      const enumType = await pool.query<{ type_exists: boolean }>(
        `SELECT to_regtype('public.project_status') IS NOT NULL AS type_exists`
      );
      assert.equal(enumType.rows[0].type_exists, false);
    } finally {
      await pool.end();
    }
  });

  it('indexes the runtime task assignee column', async () => {
    const migrationSql = await readFile(fileURLToPath(new URL(
      '../migrations/022_add_performance_indexes.sql',
      import.meta.url
    )), 'utf8');
    const pool = await createDatabase('contract_migration_022');

    try {
      await pool.query(`
        CREATE TABLE tasks (project_id UUID, assigned_to UUID, stage TEXT);
        CREATE TABLE activities (
          project_id UUID,
          inquiry_id UUID,
          user_id UUID,
          created_at TIMESTAMPTZ
        );
        CREATE TABLE project_team (project_id UUID, user_id UUID);
        CREATE TABLE deliverable_files (deliverable_id UUID);
        CREATE TABLE rate_limit_entries (created_at TIMESTAMPTZ);
      `);

      await pool.query(migrationSql);

      const assigneeIndex = await pool.query<{ indexdef: string }>(`
        SELECT indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'tasks'
          AND indexname = 'idx_tasks_assigned_to'
      `);
      assert.equal(assigneeIndex.rows.length, 1);
      assert.match(assigneeIndex.rows[0].indexdef, /\(assigned_to\)/i);
    } finally {
      await pool.end();
    }
  });

  it('backfills nullable membership fields before enforcing the contract', async () => {
    const migrationSql = await readFile(fileURLToPath(new URL(
      '../migrations/029_reconcile_membership_nullability.sql',
      import.meta.url
    )), 'utf8');
    const pool = await createDatabase('contract_migration_029');

    try {
      await pool.query(`
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";
        CREATE TABLE project_team (
          id UUID,
          is_primary_contact BOOLEAN,
          added_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ
        );
        CREATE TABLE project_invitations (id UUID, status VARCHAR(50));
        INSERT INTO project_team (id, created_at)
        VALUES (gen_random_uuid(), NOW() - INTERVAL '1 day');
        INSERT INTO project_invitations (id, status)
        VALUES (gen_random_uuid(), NULL);
      `);

      await pool.query(migrationSql);

      const nullRows = await pool.query<{ count: string }>(`
        SELECT COUNT(*)::text AS count
        FROM project_team
        WHERE is_primary_contact IS NULL OR added_at IS NULL
      `);
      assert.equal(nullRows.rows[0].count, '0');

      const invitation = await pool.query<{ status: string }>(
        'SELECT status FROM project_invitations LIMIT 1'
      );
      assert.equal(invitation.rows[0].status, 'pending');

      const nullableColumns = await pool.query<{ count: string }>(`
        SELECT COUNT(*)::text AS count
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (
            (table_name = 'project_team' AND column_name IN ('is_primary_contact', 'added_at'))
            OR (table_name = 'project_invitations' AND column_name = 'status')
          )
          AND is_nullable = 'YES'
      `);
      assert.equal(nullableColumns.rows[0].count, '0');
    } finally {
      await pool.end();
    }
  });

  it('applies to both a clean schema and the production-shaped drift fixture', async () => {
    const schemaSql = await readFile(fileURLToPath(new URL('../schema.sql', import.meta.url)), 'utf8');
    const driftSql = await readFile(fileURLToPath(new URL('./fixtures/pre-028-production-drift.sql', import.meta.url)), 'utf8');
    const reconciliationSql = await readFile(fileURLToPath(new URL(
      '../migrations/028_reconcile_runtime_contracts.sql',
      import.meta.url
    )), 'utf8');
    const nullabilitySql = await readFile(fileURLToPath(new URL(
      '../migrations/029_reconcile_membership_nullability.sql',
      import.meta.url
    )), 'utf8');

    for (const [databaseName, setupSql] of [
      ['contract_clean', schemaSql],
      ['contract_drift', driftSql],
    ] as const) {
      const pool = await createDatabase(databaseName);
      try {
        await pool.query(setupSql);
        await pool.query(reconciliationSql);
        await pool.query(nullabilitySql);
        await recordMigration(pool);

        const result = await verifyDatabaseContract(pool);
        assert.equal(result.ready, true, JSON.stringify(result.issues));

        const statuses = await pool.query<{ status: string }>(
          'SELECT DISTINCT status FROM projects ORDER BY status'
        );
        assert.ok(statuses.rows.every(({ status }) => ['active', 'in_review'].includes(status) || databaseName === 'contract_clean'));

        const project = await pool.query<{ id: string }>(
          databaseName === 'contract_clean'
            ? `INSERT INTO projects (project_number, status)
               VALUES ('PROJECT-UNIQUE-KEY-TEST', 'active')
               RETURNING id`
            : 'SELECT id FROM projects ORDER BY id LIMIT 1'
        );
        const user = await pool.query<{ id: string }>('SELECT id FROM users ORDER BY id LIMIT 1');

        await pool.query(
          `INSERT INTO project_files (project_id, file_name, r2_key, uploaded_by)
           VALUES ($1, 'first.pdf', 'projects/shared/object.pdf', $2)`,
          [project.rows[0].id, user.rows[0].id]
        );
        await assert.rejects(
          pool.query(
            `INSERT INTO project_files (project_id, file_name, r2_key, uploaded_by)
             VALUES ($1, 'second.pdf', 'projects/shared/object.pdf', $2)`,
            [project.rows[0].id, user.rows[0].id]
          ),
          (error: unknown) => Boolean(error && typeof error === 'object' && (error as { code?: string }).code === '23505')
        );

        await pool.query(
          `INSERT INTO sessions (user_id, token, jwt_token_hash, expires_at)
           VALUES ($1, 'session-a', 'shared-jwt-hash', NOW() + INTERVAL '1 hour')`,
          [user.rows[0].id]
        );
        await assert.rejects(
          pool.query(
            `INSERT INTO sessions (user_id, token, jwt_token_hash, expires_at)
             VALUES ($1, 'session-b', 'shared-jwt-hash', NOW() + INTERVAL '1 hour')`,
            [user.rows[0].id]
          ),
          (error: unknown) => Boolean(error && typeof error === 'object' && (error as { code?: string }).code === '23505')
        );

        const deliverable = databaseName === 'contract_clean'
          ? await pool.query<{ id: string }>(
            `INSERT INTO deliverables (project_id, name)
             VALUES ($1, 'Generated ID') RETURNING id`,
            [project.rows[0].id]
          )
          : await pool.query<{ id: string }>(
            'INSERT INTO deliverables (project_id) VALUES ($1) RETURNING id',
            [project.rows[0].id]
          );
        assert.match(deliverable.rows[0].id, /^[0-9a-f-]{36}$/i);
      } finally {
        await pool.end();
      }
    }
  });

  it('stops with an actionable diagnostic for incomplete legacy project requests', async () => {
    const driftSql = await readFile(fileURLToPath(new URL('./fixtures/pre-028-production-drift.sql', import.meta.url)), 'utf8');
    const migrationSql = await readFile(fileURLToPath(new URL(
      '../migrations/028_reconcile_runtime_contracts.sql',
      import.meta.url
    )), 'utf8');
    const pool = await createDatabase('contract_incomplete_requests');

    try {
      await pool.query(driftSql);
      await pool.query(`
        CREATE TABLE project_requests (
          id UUID,
          status VARCHAR(50),
          created_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ
        );
        INSERT INTO project_requests (id, status) VALUES (gen_random_uuid(), 'new');
      `);

      await assert.rejects(
        pool.query(migrationSql),
        (error: unknown) => Boolean(
          error
          && typeof error === 'object'
          && (error as { code?: string }).code === '23502'
          && /missing required request data/i.test((error as { message?: string }).message ?? '')
        )
      );
    } finally {
      await pool.end();
    }
  });
});
