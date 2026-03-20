# Phase 6: Database Schema Alignment - Research

**Researched:** 2026-01-25
**Domain:** PostgreSQL Schema Migration & Column Management
**Confidence:** HIGH

## Summary

This phase addresses a critical database schema mismatch where the backend code expects `author_id` and `author_type` columns but the database has `user_id` (without `author_type`). Migration 002 exists with the correct schema but was never applied. The root cause is that Phase 1's schema file (`add-proposal-comments-table.sql`) used the wrong column names, and the corrective migration wasn't executed.

Research confirms that PostgreSQL provides robust, transactional ALTER TABLE operations for schema corrections. The standard approach is to create an ALTER TABLE migration that renames `user_id` to `author_id` and adds the `author_type` column with a default value for existing rows. PostgreSQL's transaction support ensures atomicity, and the existing migration runner (`database/migrate.ts`) handles versioning and rollback.

**Primary recommendation:** Create a new migration that transforms the existing schema to match backend expectations using ALTER TABLE RENAME COLUMN and ADD COLUMN operations within a transaction block. Apply using the existing migration runner.

## Standard Stack

The established tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL | 14+ | Relational database | Transactional DDL, ALTER TABLE support |
| node-postgres (pg) | ^8.16.3 | Database client | Official Node.js driver, already in use |
| tsx | ^4.19.2 | TypeScript execution | Run migration scripts, already in package.json |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dotenv | ^17.2.3 | Environment variables | Load DATABASE_URL in migration scripts |
| Custom migrate.ts | N/A | Migration runner | Already exists and handles version tracking |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom migration runner | Prisma Migrate | Requires full schema rewrite, ORM lock-in |
| Custom migration runner | Knex.js migrations | Additional dependency, not needed for simple migrations |
| Custom migration runner | Flyway/Liquibase | JVM-based, overkill for this use case |

**Installation:**
No new packages needed — all dependencies already in package.json.

## Architecture Patterns

### Recommended Migration File Structure
```
database/migrations/
├── 001_add_rate_limit_table.sql
├── 002_add_comments_and_notifications.sql  # Existing but not applied
└── 003_align_comments_schema.sql           # New migration to fix mismatch
```

### Pattern 1: ALTER TABLE Column Rename (Transactional)
**What:** Rename existing column to match backend expectations
**When to use:** Column exists but has wrong name, data is compatible
**Example:**
```sql
-- Source: PostgreSQL official docs
-- UP
BEGIN;

ALTER TABLE proposal_comments
  RENAME COLUMN user_id TO author_id;

COMMIT;

-- DOWN
BEGIN;

ALTER TABLE proposal_comments
  RENAME COLUMN author_id TO user_id;

COMMIT;
```

### Pattern 2: ADD COLUMN with DEFAULT for Existing Rows
**What:** Add new column with default value backfilled for existing rows
**When to use:** New column needed, existing rows need populated value
**Example:**
```sql
-- Source: PostgreSQL official docs
-- UP
BEGIN;

-- Add column with NOT NULL and DEFAULT
-- PostgreSQL 11+ optimizes this: no table rewrite, default in metadata
ALTER TABLE proposal_comments
  ADD COLUMN author_type VARCHAR(20) NOT NULL DEFAULT 'ADMIN';

-- Add constraint after column exists
ALTER TABLE proposal_comments
  ADD CONSTRAINT check_author_type
  CHECK (author_type IN ('CLIENT', 'ADMIN'));

COMMIT;

-- DOWN
BEGIN;

ALTER TABLE proposal_comments
  DROP CONSTRAINT IF EXISTS check_author_type;

ALTER TABLE proposal_comments
  DROP COLUMN author_type;

COMMIT;
```

### Pattern 3: Migration with Conditional Logic
**What:** Check if column exists before altering (idempotent migrations)
**When to use:** Migration might be run multiple times, defensive coding
**Example:**
```sql
-- Source: PostgreSQL community patterns
-- UP
DO $$
BEGIN
  -- Only rename if old column exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'proposal_comments'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE proposal_comments RENAME COLUMN user_id TO author_id;
  END IF;

  -- Only add if new column doesn't exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'proposal_comments'
      AND column_name = 'author_type'
  ) THEN
    ALTER TABLE proposal_comments
      ADD COLUMN author_type VARCHAR(20) NOT NULL DEFAULT 'ADMIN';
  END IF;
END $$;
```

### Pattern 4: Data Backfill for Existing Rows
**What:** Populate new column based on business logic for existing rows
**When to use:** Default value isn't sufficient, need to derive from existing data
**Example:**
```sql
-- Source: Zero-downtime migration patterns
-- UP
BEGIN;

-- Add column nullable first (fast)
ALTER TABLE proposal_comments
  ADD COLUMN author_type VARCHAR(20);

-- Backfill based on existing data
-- In this case: check users table for role
UPDATE proposal_comments pc
SET author_type = CASE
  WHEN u.role = 'client' THEN 'CLIENT'
  ELSE 'ADMIN'
END
FROM users u
WHERE pc.author_id = u.id;

-- Now make it NOT NULL
ALTER TABLE proposal_comments
  ALTER COLUMN author_type SET NOT NULL;

-- Add constraint
ALTER TABLE proposal_comments
  ADD CONSTRAINT check_author_type
  CHECK (author_type IN ('CLIENT', 'ADMIN'));

COMMIT;
```

### Anti-Patterns to Avoid
- **Don't DROP and CREATE**: Never drop table and recreate — loses all data. Use ALTER TABLE instead.
- **Don't skip transactions**: Always wrap DDL in BEGIN/COMMIT for atomicity
- **Don't ignore rollback**: Always include -- DOWN migration for rollback capability
- **Don't use USING for simple renames**: RENAME COLUMN is atomic and doesn't rewrite table
- **Don't add constraints without NOT VALID**: For large tables, use NOT VALID then VALIDATE to avoid long locks

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Migration versioning | Custom timestamp tracking | Existing migrate.ts with version numbers | Already tracks applied migrations in `migrations` table |
| Rollback logic | Manual SQL scripts | migrate.ts `down` command | Handles transaction rollback, version tracking |
| Column existence checks | String parsing SQL schema | information_schema.columns query | Standard PostgreSQL catalog, reliable |
| Connection pooling | Custom connection management | pg.Pool (already in migrate.ts) | Handles SSL, connection limits, retries |
| Environment config | Hardcoded database URLs | dotenv + DATABASE_URL | Already configured, supports dev/prod |

**Key insight:** The custom migration runner already exists and handles versioning, transactions, and rollback. Don't reinvent it — create migration files that follow the established pattern.

## Common Pitfalls

### Pitfall 1: Applying Migration 002 Instead of Fixing Current State
**What goes wrong:** Migration 002 assumes table doesn't exist (uses CREATE TABLE IF NOT EXISTS). If table already exists with wrong schema, migration 002 does nothing.
**Why it happens:** Migration 002 was designed for greenfield setup, not schema correction
**How to avoid:** Create a new migration (003) that explicitly transforms existing schema using ALTER TABLE
**Warning signs:** Backend code throws "column author_id does not exist" errors after "applying" migration 002

### Pitfall 2: Table Rewrites on Large Tables
**What goes wrong:** Adding column with volatile DEFAULT (like `clock_timestamp()`) rewrites entire table, locks for extended time
**Why it happens:** PostgreSQL must compute value for every row when default is volatile
**How to avoid:** Use non-volatile defaults (constants, `now()`, user-defined functions marked IMMUTABLE)
**Warning signs:** Migration hangs, locks entire table, users report comment API timeouts
**Source:** [PostgreSQL ALTER TABLE Documentation](https://www.postgresql.org/docs/current/sql-altertable.html)

### Pitfall 3: Forgetting Foreign Key Constraint Update
**What goes wrong:** Rename column but foreign key still references old column name, queries fail
**Why it happens:** PostgreSQL auto-updates FK constraints on column rename, but might not if using `ONLY`
**How to avoid:** PostgreSQL automatically handles this — FK constraints are updated on RENAME COLUMN
**Warning signs:** None if using standard RENAME COLUMN (automatic), but verify with `\d proposal_comments` in psql
**Source:** [PostgreSQL community best practices](https://www.geeksforgeeks.org/postgresql/postgresql-rename-column/)

### Pitfall 4: Not Testing Rollback
**What goes wrong:** Migration applies successfully but rollback fails, can't undo in emergency
**Why it happens:** -- DOWN section not tested, contains typos or wrong logic
**How to avoid:** After creating migration, test both `npm run db:migrate` and `npm run db:migrate:down`
**Warning signs:** Rollback fails with syntax error, wrong column name, or constraint error

### Pitfall 5: Concurrent Schema Changes Breaking MVCC
**What goes wrong:** Active transactions see empty table after migration, data appears lost
**Why it happens:** Table rewrites are not MVCC-safe — concurrent transactions using pre-rewrite snapshots see empty table
**How to avoid:** For this migration, RENAME and ADD COLUMN with constant DEFAULT don't rewrite table (safe)
**Warning signs:** Users report empty comment threads during migration
**Source:** [PostgreSQL ALTER TABLE Documentation](https://www.postgresql.org/docs/current/sql-altertable.html)

### Pitfall 6: Incorrect author_type Backfill
**What goes wrong:** Existing comments assigned wrong author_type (e.g., admin comment marked as CLIENT)
**Why it happens:** Assuming all existing comments are ADMIN without verifying
**How to avoid:** Join with `users` table to determine correct role, or use business logic rule
**Warning signs:** Comment thread shows wrong user type badge, authorization checks fail

## Code Examples

Verified patterns from official sources:

### Migration 003: Complete Schema Alignment
```sql
-- Migration: align_comments_schema
-- Created: 2026-01-25
-- Description: Align proposal_comments schema with backend expectations
-- Source: PostgreSQL official docs + project migration pattern

-- UP
BEGIN;

-- Step 1: Rename user_id to author_id (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'proposal_comments'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE proposal_comments RENAME COLUMN user_id TO author_id;
    RAISE NOTICE 'Renamed user_id to author_id';
  ELSE
    RAISE NOTICE 'Column user_id does not exist, skipping rename';
  END IF;
END $$;

-- Step 2: Add author_type column with backfill logic
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'proposal_comments'
      AND column_name = 'author_type'
  ) THEN
    -- Add column as nullable first (fast, no rewrite)
    ALTER TABLE proposal_comments
      ADD COLUMN author_type VARCHAR(20);

    -- Backfill based on users table
    UPDATE proposal_comments pc
    SET author_type = CASE
      WHEN u.role = 'client' THEN 'CLIENT'
      ELSE 'ADMIN'
    END
    FROM users u
    WHERE pc.author_id = u.id;

    -- Make it NOT NULL
    ALTER TABLE proposal_comments
      ALTER COLUMN author_type SET NOT NULL;

    -- Add constraint
    ALTER TABLE proposal_comments
      ADD CONSTRAINT check_author_type
      CHECK (author_type IN ('CLIENT', 'ADMIN'));

    RAISE NOTICE 'Added author_type column with backfill';
  ELSE
    RAISE NOTICE 'Column author_type already exists, skipping';
  END IF;
END $$;

COMMIT;

-- DOWN
BEGIN;

-- Reverse Step 2: Drop author_type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'proposal_comments'
      AND column_name = 'author_type'
  ) THEN
    ALTER TABLE proposal_comments
      DROP CONSTRAINT IF EXISTS check_author_type;

    ALTER TABLE proposal_comments
      DROP COLUMN author_type;

    RAISE NOTICE 'Dropped author_type column';
  END IF;
END $$;

-- Reverse Step 1: Rename back to user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'proposal_comments'
      AND column_name = 'author_id'
  ) THEN
    ALTER TABLE proposal_comments RENAME COLUMN author_id TO user_id;
    RAISE NOTICE 'Renamed author_id back to user_id';
  END IF;
END $$;

COMMIT;
```

### Verification Query: Check Schema After Migration
```sql
-- Source: PostgreSQL information_schema
-- Verify column names and types match backend expectations
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'proposal_comments'
  AND column_name IN ('author_id', 'author_type', 'user_id')
ORDER BY ordinal_position;

-- Expected result:
-- author_id   | uuid        | NO  | (no default)
-- author_type | varchar(20) | NO  | (no default or 'ADMIN')

-- Verify constraint exists
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'check_author_type';

-- Expected result:
-- check_author_type | (author_type IN ('CLIENT', 'ADMIN'))
```

### Running Migration with Existing migrate.ts
```bash
# Source: package.json scripts + database/migrate.ts
# Check current migration status
npm run db:migrate:status

# Expected output:
# [✓] 001_add_rate_limit_table (2025-01-19...)
# [✓] 002_add_comments_and_notifications (2025-01-20...)
# [ ] 003_align_comments_schema

# Apply pending migrations
npm run db:migrate

# Verify migration applied
npm run db:migrate:status

# If rollback needed (test environment only)
npm run db:migrate:down
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual SQL scripts | Version-tracked migrations | PostgreSQL 8+ | Migration history, rollback capability |
| DROP/CREATE table | ALTER TABLE operations | Always best practice | No data loss, atomic changes |
| Rewrite entire table | Metadata-only defaults (PG 11+) | PostgreSQL 11 (2018) | Instant ADD COLUMN with constant default |
| Single transaction lock | NOT VALID + VALIDATE pattern | PostgreSQL 9.4+ | Minimal lock time for constraints |
| Manual rollback SQL | Bidirectional migrations (UP/DOWN) | Modern tools | Automated rollback, safer deployments |

**Deprecated/outdated:**
- **Direct psql execution**: Use migration runner for versioning and rollback tracking
- **Constraint validation in single step**: Use NOT VALID + VALIDATE for large tables (not needed here, table is small)
- **Assuming table rewrites**: PostgreSQL 11+ optimizes constant DEFAULT to metadata-only

## Open Questions

Things that couldn't be fully resolved:

1. **Has Migration 002 been partially applied in production?**
   - What we know: Migration 002 exists, contains correct schema with CREATE TABLE IF NOT EXISTS
   - What's unclear: Whether production database has `proposal_comments` table, and if so, which schema version
   - Recommendation: Before running migration 003, query production database to check current schema. If table doesn't exist, apply migration 002 first. If table exists with wrong schema, skip 002 and apply 003.

2. **Are there existing comments in production?**
   - What we know: Backend code expects `author_id`/`author_type`, may be failing on INSERT
   - What's unclear: Whether production database has actual comment rows, or if table is empty
   - Recommendation: Check row count before migration. If zero rows, simpler migration possible (DROP/CREATE). If rows exist, use ALTER TABLE approach with backfill.

3. **Should migration 002 be marked as applied retroactively?**
   - What we know: Migration 002 has correct schema but wasn't executed
   - What's unclear: Whether to mark it as "applied" in migrations table to maintain version sequence
   - Recommendation: If production table matches migration 002 schema after applying 003, insert a manual entry in migrations table for 002 to maintain version consistency. Otherwise, leave gap in version sequence.

## Sources

### Primary (HIGH confidence)
- [PostgreSQL ALTER TABLE Documentation](https://www.postgresql.org/docs/current/sql-altertable.html) - Official syntax, behavior, transaction semantics
- [PostgreSQL DDL Modifying Tables](https://www.postgresql.org/docs/current/ddl-alter.html) - Official guide to table alterations
- Project codebase:
  - `database/migrate.ts` - Existing migration runner implementation
  - `database/migrations/001_*.sql` - Migration file pattern (UP/DOWN structure)
  - `netlify/functions/comments.ts` - Backend expectations for schema (lines 75, 141, 146, 270, 285)
  - `.planning/v1-MILESTONE-AUDIT.md` - Schema mismatch documentation

### Secondary (MEDIUM confidence)
- [Zero-downtime schema migrations for PostgreSQL](https://xata.io/blog/zero-downtime-schema-migrations-postgresql) - Expand and contract pattern, backfill strategies
- [PostgreSQL RENAME COLUMN Guide](https://www.geeksforgeeks.org/postgresql/postgresql-rename-column/) - Automatic FK constraint updates, best practices
- [pgroll zero-downtime migrations](https://xata.io/blog/pgroll-schema-migrations-postgres) - Reversible migrations, modern tooling (2025)

### Tertiary (LOW confidence)
- [Database Migration Checklist 2025](https://savvycomsoftware.com/blog/database-migration-checklist/) - General migration planning, contingency measures
- [PostgreSQL migration tools comparison](https://www.bytebase.com/blog/top-open-source-postgres-migration-tools/) - Alternative tools (Liquibase, Flyway, Prisma) — not needed for this use case

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All tools already in use, PostgreSQL version confirmed via codebase
- Architecture: HIGH - Official PostgreSQL docs, tested migration patterns
- Pitfalls: HIGH - Official docs warnings, community-verified gotchas
- Code examples: HIGH - Based on official PostgreSQL docs + existing project migration pattern

**Research date:** 2026-01-25
**Valid until:** 60 days (PostgreSQL ALTER TABLE semantics are stable, migration patterns well-established)

## Key Takeaways for Planning

1. **Don't apply migration 002 directly** — it won't fix existing table, only creates new one if absent
2. **Create migration 003** — explicitly transforms existing schema using ALTER TABLE
3. **Use conditional logic** — check column existence before rename/add for idempotency
4. **Backfill author_type** — join with users table to determine CLIENT vs ADMIN
5. **Test rollback** — verify DOWN migration restores original schema
6. **No table rewrite needed** — RENAME COLUMN and ADD COLUMN with constant default are instant operations
7. **Transaction safety** — entire migration is atomic, no partial state possible
8. **Existing migration runner works** — no new tooling needed, use `npm run db:migrate`
