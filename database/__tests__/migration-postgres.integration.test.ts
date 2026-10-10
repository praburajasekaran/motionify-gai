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
import { bootstrapDatabase } from '../bootstrap';

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

  it('bootstraps an empty database without accounts, supports migrate up, and refuses existing data', async () => {
    const pool = await createDatabase('contract_bootstrap');
    try {
      await bootstrapDatabase(pool);
      assert.equal((await pool.query('SELECT count(*) FROM users')).rows[0].count, '0');
      assert.equal((await verifyDatabaseContract(pool)).ready, true);
      assert.equal((await pool.query('SELECT count(*) FROM migrations')).rows[0].count, '35');
      for (let attempt = 0; attempt < 2; attempt++) {
        execFileSync(process.execPath, ['--import', 'tsx', 'database/migrate.ts', 'up'], {
          env: { ...process.env, DATABASE_URL: pool.options.connectionString, DATABASE_SSL: 'false' }, stdio: 'pipe',
        });
      }
      const user = await pool.query("INSERT INTO users (email, full_name, role) VALUES ('bootstrap@example.test', 'Synthetic client', 'client') RETURNING id");
      const project = await pool.query("INSERT INTO projects (project_number) VALUES ('BOOTSTRAP-TEST') RETURNING id");
      const task = await pool.query("INSERT INTO tasks (project_id, title, assigned_to) VALUES ($1, 'Persisted task', $2) RETURNING id", [project.rows[0].id, user.rows[0].id]);
      await pool.query("INSERT INTO task_comments (task_id, user_id, user_name, content) VALUES ($1, $2, 'Synthetic client', 'Persisted comment')", [task.rows[0].id, user.rows[0].id]);
      await pool.query('INSERT INTO task_followers (task_id, user_id) VALUES ($1, $2)', [task.rows[0].id, user.rows[0].id]);
      await assert.rejects(bootstrapDatabase(pool), /empty public schema/);
      assert.equal((await pool.query('SELECT content FROM task_comments')).rows[0].content, 'Persisted comment');
      assert.equal((await pool.query('SELECT count(*) FROM task_followers')).rows[0].count, '1');
      assert.equal((await pool.query('SELECT count(*) FROM migrations')).rows[0].count, '35');
    } finally { await pool.end(); }
  });

  it('reconciles existing runtime columns from the live catalog without changing saved data', async () => {
    const pool = await createDatabase('contract_live_runtime');
    try {
      await bootstrapDatabase(pool);
      await pool.query(`
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        ALTER TABLE tasks ALTER COLUMN id SET DEFAULT uuid_generate_v4(),
          ALTER COLUMN is_client_visible SET DEFAULT true;
        ALTER TABLE task_comments ALTER COLUMN id SET DEFAULT uuid_generate_v4();
        ALTER TABLE comment_attachments DROP COLUMN file_key,
          ALTER COLUMN r2_key TYPE VARCHAR(255), ALTER COLUMN r2_key SET NOT NULL;
        ALTER TABLE magic_link_tokens ALTER COLUMN id SET DEFAULT uuid_generate_v4(),
          ALTER COLUMN token TYPE TEXT, ALTER COLUMN remember_me DROP NOT NULL,
          ALTER COLUMN created_at DROP NOT NULL, ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE pending_inquiry_verifications
          DROP CONSTRAINT pending_inquiry_verifications_token_key,
          ALTER COLUMN created_at DROP NOT NULL, ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
        DELETE FROM migrations WHERE version >= '031';
      `);
      const actor = (await pool.query("INSERT INTO users (email, full_name, role) VALUES ('runtime-drift@example.test', 'Synthetic client', 'client') RETURNING id")).rows[0].id;
      const project = (await pool.query("INSERT INTO projects (project_number) VALUES ('RUNTIME-DRIFT') RETURNING id")).rows[0].id;
      const task = (await pool.query("INSERT INTO tasks (project_id, title, created_by) VALUES ($1, 'Existing visible task', $2) RETURNING id", [project, actor])).rows[0].id;
      await pool.query("INSERT INTO task_comments (task_id, user_id, content) VALUES ($1, $2, 'Existing comment')", [task, actor]);
      const comment = (await pool.query("INSERT INTO proposal_comments (proposal_id, content, author_id, author_type, user_name) VALUES (gen_random_uuid(), 'Attachment owner', $1, 'CLIENT', 'Synthetic client') RETURNING id", [actor])).rows[0].id;
      await pool.query("INSERT INTO comment_attachments (comment_id, file_name, file_size, file_type, r2_key) VALUES ($1, 'existing.pdf', 17, 'application/pdf', 'synthetic/existing.pdf')", [comment]);
      await pool.query("INSERT INTO magic_link_tokens (email, token, expires_at, remember_me, created_at) VALUES ('runtime-drift@example.test', 'synthetic-magic-token', NOW() + INTERVAL '1 hour', NULL, NULL)");
      await pool.query("INSERT INTO pending_inquiry_verifications (email, token, payload, expires_at, created_at) VALUES ('runtime-drift@example.test', 'synthetic-inquiry-token', '{\"preserved\":true}', NOW() + INTERVAL '1 hour', '2020-01-02T03:04:05Z')");
      const saved = (await pool.query(`SELECT
        (SELECT jsonb_agg(jsonb_build_object('id', id, 'title', title, 'visible', is_client_visible)) FROM tasks) AS tasks,
        (SELECT jsonb_agg(jsonb_build_object('id', id, 'content', content)) FROM task_comments) AS comments,
        (SELECT jsonb_agg(jsonb_build_object('id', id, 'r2_key', r2_key)) FROM comment_attachments) AS attachments,
        (SELECT jsonb_agg(jsonb_build_object('id', id, 'token', token, 'expires_at', expires_at)) FROM magic_link_tokens) AS magic,
        (SELECT jsonb_agg(to_jsonb(p)) FROM pending_inquiry_verifications p) AS inquiries`)).rows[0];
      for (let attempt = 0; attempt < 2; attempt++) {
        execFileSync(process.execPath, ['--import', 'tsx', 'database/migrate.ts', 'up'], {
          env: { ...process.env, DATABASE_URL: pool.options.connectionString, DATABASE_SSL: 'false' }, stdio: 'inherit',
        });
      }
      assert.deepEqual((await verifyDatabaseContract(pool)).issues, []);
      assert.deepEqual((await pool.query(`SELECT
        (SELECT jsonb_agg(jsonb_build_object('id', id, 'title', title, 'visible', is_client_visible)) FROM tasks) AS tasks,
        (SELECT jsonb_agg(jsonb_build_object('id', id, 'content', content)) FROM task_comments) AS comments,
        (SELECT jsonb_agg(jsonb_build_object('id', id, 'r2_key', r2_key)) FROM comment_attachments) AS attachments,
        (SELECT jsonb_agg(jsonb_build_object('id', id, 'token', token, 'expires_at', expires_at)) FROM magic_link_tokens) AS magic,
        (SELECT jsonb_agg(to_jsonb(p)) FROM pending_inquiry_verifications p) AS inquiries`)).rows[0], saved);
      const magic = (await pool.query('SELECT remember_me, created_at IS NOT NULL AS has_created_at FROM magic_link_tokens')).rows[0];
      assert.deepEqual(magic, { remember_me: false, has_created_at: true });
      const nextTask = (await pool.query("INSERT INTO tasks (project_id, title, created_by) VALUES ($1, 'New private task', $2) RETURNING id, is_client_visible", [project, actor])).rows[0];
      assert.equal(nextTask.is_client_visible, false);
      assert.match(nextTask.id, /^[0-9a-f-]{36}$/i);
      await assert.rejects(pool.query("INSERT INTO pending_inquiry_verifications (email, token, payload, expires_at) VALUES ('runtime-drift@example.test', 'synthetic-inquiry-token', '{}', NOW() + INTERVAL '1 hour')"),
        (error: unknown) => Boolean(error && typeof error === 'object' && (error as { code?: string }).code === '23505'));
    } finally { await pool.end(); }
  });

  it('rolls back authentication reconciliation for overlong or duplicate tokens', async () => {
    const migration = await readFile(new URL('../migrations/035_authentication_runtime.sql', import.meta.url), 'utf8');
    for (const [name, expectedCode] of [['overlong', '22001'], ['duplicate', '23505']] as const) {
      const pool = await createDatabase(`contract_auth_${name}`);
      try {
        await bootstrapDatabase(pool);
        await pool.query(`ALTER TABLE magic_link_tokens ALTER COLUMN token TYPE TEXT,
          ALTER COLUMN remember_me DROP NOT NULL, ALTER COLUMN created_at DROP NOT NULL;
          ALTER TABLE pending_inquiry_verifications DROP CONSTRAINT pending_inquiry_verifications_token_key;`);
        const token = name === 'overlong' ? 'x'.repeat(256) : 'synthetic-short-token';
        await pool.query("INSERT INTO magic_link_tokens (email, token, expires_at, remember_me, created_at) VALUES ('rollback@example.test', $1, NOW() + INTERVAL '1 hour', NULL, NULL)", [token]);
        if (name === 'duplicate') {
          await pool.query("INSERT INTO pending_inquiry_verifications (email, token, payload, expires_at) SELECT 'rollback@example.test', 'synthetic-duplicate', '{}', NOW() + INTERVAL '1 hour' FROM generate_series(1, 2)");
        }
        const saved = (await pool.query('SELECT id, token, remember_me, created_at FROM magic_link_tokens')).rows;
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await assert.rejects(client.query(migration),
            (error: unknown) => Boolean(error && typeof error === 'object' && (error as { code?: string }).code === expectedCode));
          await client.query('ROLLBACK');
        } finally { client.release(); }
        assert.deepEqual((await pool.query('SELECT id, token, remember_me, created_at FROM magic_link_tokens')).rows, saved);
        assert.equal((await pool.query("SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'magic_link_tokens' AND column_name = 'token'")).rows[0].data_type, 'text');
        assert.equal((await pool.query('SELECT count(*) FROM pending_inquiry_verifications')).rows[0].count, name === 'duplicate' ? '2' : '0');
      } finally { await pool.end(); }
    }
  });

  it('gives legacy uploads stable file identities without guessing old feedback attribution', async () => {
    const pool = await createDatabase('contract_legacy_uploads');
    try {
      await bootstrapDatabase(pool);
      const actor = (await pool.query("INSERT INTO users (email, full_name, role) VALUES ('legacy@example.test', 'Synthetic client', 'client') RETURNING id")).rows[0].id;
      const project = (await pool.query("INSERT INTO projects (project_number) VALUES ('LEGACY-UPLOAD-TEST') RETURNING id")).rows[0].id;
      const deliverable = (await pool.query("INSERT INTO deliverables (project_id, name, beta_file_key, final_file_key) VALUES ($1, 'Legacy video', $2, $3) RETURNING id",
        [project, `projects/${project}/beta/old.mp4`, `projects/${project}/final/old.mp4`])).rows[0].id;
      await pool.query("INSERT INTO revision_requests (deliverable_id, project_id, requested_by, feedback_text) VALUES ($1, $2, $3, 'Old feedback without a file identity')", [deliverable, project, actor]);
      const migration = await readFile(new URL('../migrations/033_file_feedback.sql', import.meta.url), 'utf8');
      await pool.query(migration);
      const original = (await pool.query('SELECT id, is_final, file_category FROM deliverable_files WHERE deliverable_id = $1 ORDER BY is_final', [deliverable])).rows;
      await pool.query(migration);
      assert.deepEqual((await pool.query('SELECT id, is_final, file_category FROM deliverable_files WHERE deliverable_id = $1 ORDER BY is_final', [deliverable])).rows, original);
      assert.equal(original.length, 2);
      assert.equal(original[0].file_category, 'video');
      assert.equal(original[0].is_final, false);
      assert.equal(original[1].is_final, true);
      assert.equal((await pool.query('SELECT reviewed_file_id FROM revision_requests WHERE deliverable_id = $1', [deliverable])).rows[0].reviewed_file_id, null);
    } finally { await pool.end(); }
  });

  it('rolls back a failed bootstrap without leaving partial tables or accounts', async () => {
    const pool = await createDatabase('contract_bootstrap_failure');
    try {
      await pool.query("CREATE TYPE task_stage AS ENUM ('pending')");
      await assert.rejects(bootstrapDatabase(pool), /already exists/);
      assert.equal((await pool.query("SELECT count(*) FROM pg_tables WHERE schemaname = 'public'")).rows[0].count, '0');
    } finally { await pool.end(); }
  });

  it('prepares only receipt migration 030 and safely repeats preparation', async () => {
    const pool = await createDatabase('contract_receipt_preparation');
    try {
      await pool.query(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
      await pool.query(await readFile(new URL('../migrations/009_payment_webhook_logs.sql', import.meta.url), 'utf8'));
      await pool.query(`CREATE TABLE migrations (version VARCHAR(20) PRIMARY KEY, name VARCHAR(255) NOT NULL);
        INSERT INTO migrations VALUES ('029', 'reconcile_membership_nullability')`);
      for (let attempt = 0; attempt < 2; attempt++) {
        execFileSync(process.execPath, ['--import', 'tsx', 'database/prepare-payment-receipts.ts'], {
          env: { ...process.env, DATABASE_URL: pool.options.connectionString, DATABASE_SSL: 'false' },
          stdio: 'pipe',
        });
      }
      const versions = await pool.query('SELECT version, name FROM migrations ORDER BY version');
      assert.deepEqual(versions.rows, [
        { version: '029', name: 'reconcile_membership_nullability' },
        { version: '030', name: 'payment_receipts' },
      ]);
      assert.equal((await pool.query('SELECT count(*) FROM payment_receipts')).rows[0].count, '0');
    } finally {
      await pool.end();
    }
  });

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
        await pool.query("CREATE TABLE IF NOT EXISTS payments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), status VARCHAR(50) NOT NULL DEFAULT 'pending', razorpay_order_id VARCHAR(255) UNIQUE)");
        await pool.query(await readFile(new URL('../migrations/009_payment_webhook_logs.sql', import.meta.url), 'utf8'));
        const receipts = await readFile(new URL('../migrations/030_payment_receipts.sql', import.meta.url), 'utf8');
        await pool.query(receipts.split('-- DOWN')[0]);
        await pool.query(await readFile(new URL('../migrations/002_add_comments_and_notifications.sql', import.meta.url), 'utf8'));
        const delivery = await readFile(new URL('../migrations/031_delivery_runtime.sql', import.meta.url), 'utf8');
        await pool.query(delivery);
        await pool.query(delivery);
        await pool.query(await readFile(new URL('../migrations/032_deliverable_assignment.sql', import.meta.url), 'utf8'));
        await pool.query('CREATE TABLE IF NOT EXISTS deliverable_files (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), deliverable_id UUID)');
        await pool.query('ALTER TABLE deliverable_files ADD COLUMN IF NOT EXISTS file_key TEXT, ADD COLUMN IF NOT EXISTS file_name TEXT, ADD COLUMN IF NOT EXISTS file_category TEXT, ADD COLUMN IF NOT EXISTS is_final BOOLEAN, ADD COLUMN IF NOT EXISTS label TEXT');
        await pool.query('ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS beta_file_key TEXT, ADD COLUMN IF NOT EXISTS final_file_key TEXT');
        await pool.query('ALTER TABLE deliverable_files ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid()');
        await pool.query('CREATE TABLE IF NOT EXISTS revision_requests (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), deliverable_id UUID)');
        await pool.query(await readFile(new URL('../migrations/033_file_feedback.sql', import.meta.url), 'utf8'));
        await pool.query(await readFile(new URL('../migrations/034_private_thumbnails.sql', import.meta.url), 'utf8'));
        await pool.query('CREATE TABLE IF NOT EXISTS inquiries (id UUID PRIMARY KEY DEFAULT gen_random_uuid())');
        await pool.query(await readFile(new URL('../migrations/035_authentication_runtime.sql', import.meta.url), 'utf8'));
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
        const user = await pool.query<{ id: string }>("INSERT INTO users (email, full_name, role) VALUES ('contract@example.test', 'Synthetic client', 'client') RETURNING id");

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
