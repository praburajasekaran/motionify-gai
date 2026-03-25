---
title: "Migration fails with 'column does not exist' due to CREATE TABLE IF NOT EXISTS schema mismatch"
date: 2026-01-29
category: database-issues
tags:
  - postgresql
  - migrations
  - schema-mismatch
  - CREATE-TABLE-IF-NOT-EXISTS
  - index-creation
module: database/migrations
symptoms:
  - "Error: column \"removed_at\" does not exist when running migrate.ts"
  - "Migration 012_create_project_team_tables failed during index creation"
  - "Partial index creation fails on column that should exist in the table"
severity: medium
resolved: true
---

# Migration fails with "column does not exist" due to CREATE TABLE IF NOT EXISTS

## Problem

Running `npx tsx database/migrate.ts up` for migration 012 failed:

```
Found 1 pending migration(s)
Running: 012_create_project_team_tables
Error: column "removed_at" does not exist
```

The migration creates `project_team` and `project_invitations` tables. The `removed_at` column was defined in the CREATE TABLE statement, yet PostgreSQL reported it did not exist when creating a partial index.

## Investigation

1. Confirmed the SQL file contained `removed_at TIMESTAMPTZ` in the column definitions
2. Confirmed the partial index `WHERE removed_at IS NULL` referenced this column
3. Identified that `CREATE TABLE IF NOT EXISTS project_team` was used
4. Discovered the `project_team` table already existed from a prior manual SQL run with a different (older) schema missing `removed_at`
5. Confirmed the migration runner wraps execution in a transaction (`BEGIN` / `COMMIT` / `ROLLBACK`)

## Root Cause

`CREATE TABLE IF NOT EXISTS` silently skips table creation when the table already exists, regardless of whether the existing schema matches. The migration assumed the table would have the new schema, but the pre-existing table had an older schema without `removed_at`.

Sequence:
1. `CREATE TABLE IF NOT EXISTS project_team (... removed_at ...)` -- skipped (table exists)
2. `CREATE INDEX ... WHERE removed_at IS NULL` -- fails (column missing from pre-existing table)
3. Transaction rolls back, but the pre-existing table (created outside migrations) persists
4. Re-running the migration hits the same error

## Solution

**Before (broken):**
```sql
-- UP
CREATE TABLE IF NOT EXISTS project_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  removed_at TIMESTAMPTZ,
  -- ...
);

CREATE INDEX idx_project_team_active ON project_team(project_id) WHERE removed_at IS NULL;
```

**After (fixed):**
```sql
-- UP

-- Drop partially-created tables from failed migration attempt
DROP TABLE IF EXISTS project_invitations;
DROP TABLE IF EXISTS project_team;

CREATE TABLE project_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  removed_at TIMESTAMPTZ,
  -- ...
);

CREATE INDEX idx_project_team_active ON project_team(project_id) WHERE removed_at IS NULL;
```

Key changes:
1. Added `DROP TABLE IF EXISTS` for both tables before CREATE statements
2. Removed `IF NOT EXISTS` from `CREATE TABLE project_team`
3. Drop order respects foreign key dependencies (invitations before team)

## Why It Works

- **DROP ensures clean slate**: Any leftover tables from prior attempts are removed
- **Transaction safety**: If anything fails after DROP, the entire transaction rolls back (PostgreSQL supports transactional DDL), so DROP is also rolled back
- **`IF EXISTS` on DROP is safe**: If tables don't exist, the statement is a no-op

## Prevention

- **Never use `CREATE TABLE IF NOT EXISTS` in migrations** -- use `DROP TABLE IF EXISTS` followed by `CREATE TABLE` instead. The migration runner guarantees each migration runs exactly once, so `IF NOT EXISTS` is unnecessary and masks schema mismatches.
- **Never create tables outside the migration system** -- all schema changes should go through `database/migrate.ts`
- **If a migration fails, check for leftover artifacts** before re-running. The transaction rollback only affects changes made within the transaction, not pre-existing objects.
- **Follow the established pattern**: Migrations 001, 008, 011, and 012 all use the DROP-then-CREATE approach.

## Best Practices

1. Use `DROP TABLE IF EXISTS` before `CREATE TABLE` in migrations that create new tables
2. Drop tables in reverse dependency order (child tables first)
3. Run migrations against a clean database in CI to catch schema issues early
4. The migration runner wraps each migration in a transaction -- rely on this for atomicity rather than `IF NOT EXISTS` guards

## Related

- `database/migrations/011_create_activities_table.sql` -- uses the same DROP-then-CREATE pattern
- `database/migrations/001_add_rate_limit_table.sql` -- earliest example of this pattern
- `database/migrate.ts` -- migration runner with transaction wrapping
