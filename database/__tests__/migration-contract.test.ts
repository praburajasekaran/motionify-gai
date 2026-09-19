import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CANONICAL_PROJECT_STATUSES, LATEST_SCHEMA_MIGRATION } from '../contract';

const migrationPath = fileURLToPath(new URL(
  `../migrations/${LATEST_SCHEMA_MIGRATION.version}_${LATEST_SCHEMA_MIGRATION.name}.sql`,
  import.meta.url
));
const schemaPath = fileURLToPath(new URL('../schema.sql', import.meta.url));
const driftFixturePath = fileURLToPath(new URL(
  './fixtures/pre-028-production-drift.sql',
  import.meta.url
));

const migrationSql = readFileSync(migrationPath, 'utf8');
const schemaSql = readFileSync(schemaPath, 'utf8');
const driftFixtureSql = readFileSync(driftFixturePath, 'utf8');

describe('runtime contract reconciliation migration', () => {
  it('is additive and contains every required reconciliation surface', () => {
    assert.match(migrationSql, /CREATE TABLE IF NOT EXISTS project_requests/i);
    assert.match(migrationSql, /deliverables ALTER COLUMN id SET DEFAULT gen_random_uuid\(\)/i);
    assert.match(migrationSql, /ALTER COLUMN status TYPE VARCHAR\(50\)/i);
    assert.match(migrationSql, /ADD COLUMN IF NOT EXISTS jwt_token_hash/i);
    assert.match(migrationSql, /idx_sessions_jwt_token_hash/i);
    assert.match(migrationSql, /CREATE UNIQUE INDEX IF NOT EXISTS idx_project_files_r2_key/i);
    assert.match(migrationSql, /Cannot reconcile project_requests/i);
    assert.match(migrationSql, /CREATE TABLE IF NOT EXISTS project_team/i);
    assert.match(migrationSql, /CREATE TABLE IF NOT EXISTS project_invitations/i);
    assert.match(migrationSql, /project_invitations ADD COLUMN IF NOT EXISTS accepted_by/i);
    assert.match(migrationSql, /idx_project_team_user_project/i);
    assert.doesNotMatch(migrationSql, /DROP\s+(?:TABLE|COLUMN)/i);
  });

  it('keeps canonical project statuses synchronized with schema and migration', () => {
    for (const status of CANONICAL_PROJECT_STATUSES) {
      assert.match(migrationSql, new RegExp(`'${status}'`));
      assert.match(schemaSql, new RegExp(`'${status}'`));
    }
  });

  it('retains a fixture with the production-shaped pre-migration drift', () => {
    assert.doesNotMatch(driftFixtureSql, /CREATE TABLE project_requests/i);
    assert.match(driftFixtureSql, /status project_status/i);
    assert.match(driftFixtureSql, /'in_progress'/i);
    assert.match(driftFixtureSql, /'review'/i);
    assert.doesNotMatch(driftFixtureSql, /jwt_token_hash/i);
    assert.match(
      driftFixtureSql,
      /CREATE TABLE deliverables\s*\(\s*id UUID PRIMARY KEY,/i
    );
    assert.doesNotMatch(
      driftFixtureSql,
      /CREATE TABLE deliverables\s*\(\s*id UUID PRIMARY KEY DEFAULT/i
    );
  });
});
