# Database Migration Order

This document defines the **exact order** in which database schemas must be migrated to avoid foreign key constraint violations and ensure all dependencies are met.

## Critical Rules

1. **Never skip migrations or change the order**
2. **Run migrations sequentially, not in parallel**
3. **Verify each migration completes successfully before proceeding to the next**
4. **Do NOT use `task-following` schema - it has been deprecated**

---

## Migration Sequence

### Phase 1: Core Foundation (MUST run first)

#### 1. core-foundation
**File:** `features/core-foundation/04-database-schema.sql`
**Tables:** users, projects, deliverables, files, activities
**Dependencies:** None
**Why first:** All other schemas reference these tables

**⚠️ IMPORTANT - Circular Dependency Resolution:**
This schema contains a circular dependency between `deliverables` and `files`:
- Files belong to deliverables (`files.deliverable_id → deliverables.id`)
- Deliverables reference specific files (`deliverables.beta_file_id → files.id`, `deliverables.final_file_id → files.id`)

**The schema handles this correctly by:**
1. Creating `deliverables` table with UUID columns but NO foreign key constraints
2. Creating `files` table with FK to `deliverables`
3. Adding FK constraints from `deliverables` to `files` via ALTER TABLE (lines 328-334)

**Do NOT modify this order or the migration will fail with FK constraint violations.**

**Verification:**
```sql
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users');
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects');
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deliverables');
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'files');
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activities');
```

---

### Phase 2: Authentication & Admin (Run after core-foundation)

#### 2. authentication-system
**File:** `features/authentication-system/04-database-schema.sql`
**Tables:** sessions, password_reset_tokens, email_verification_tokens
**Dependencies:** users (from core-foundation)
**Why second:** Required for user authentication across all features

**Verification:**
```sql
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions');
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'password_reset_tokens');
```

#### 3. admin-features
**File:** `features/admin-features/04-database-schema.sql`
**Tables:** None (adds columns to users and projects)
**Dependencies:** users, projects (from core-foundation), activities (from core-foundation)
**Why third:** Extends core tables with admin-specific fields

**Verification:**
```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'is_active'
);
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'projects' AND column_name = 'status'
);
```

---

### Phase 3: Supporting Features (Order matters within phase)

#### 4. team-management
**File:** `features/team-management/04-database-schema.sql`
**Tables:** project_team, project_invitations
**Dependencies:** projects, users (from core-foundation)
**Why fourth:** Many features check project_team for permissions

**Verification:**
```sql
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_team');
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_invitations');
```

#### 5. notifications-system
**File:** `features/notifications-system/04-database-schema.sql`
**Tables:** notifications, user_notification_preferences, notification_email_queue
**Dependencies:** users, projects (from core-foundation)
**Why fifth:** Other features create notifications

**Verification:**
```sql
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications');
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_notification_preferences');
```

---

### Phase 4: Core Features (Order matters)

#### 6. core-task-management
**File:** `features/core-task-management/04-database-schema.sql`
**Tables:** tasks, task_assignments, task_followers
**Dependencies:** projects, deliverables, users (from core-foundation)
**Why sixth:** Tasks are referenced by feedback-and-revisions

**Verification:**
```sql
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks');
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_assignments');
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_followers');
```

#### 7. feedback-and-revisions
**File:** `features/feedback-and-revisions/04-database-schema.sql`
**Tables:** task_comments, file_comments, comment_mentions, revision_requests, additional_revision_requests
**Dependencies:** tasks (from core-task-management), files, deliverables, projects, users (from core-foundation), notifications (from notifications-system)
**Why seventh:** Defines canonical comment tables used by other features

**Verification:**
```sql
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_comments');
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'file_comments');
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revision_requests');
```

**IMPORTANT NOTE:** This schema defines the canonical `task_comments` and `file_comments` tables. Other features reference but do not redefine these tables.

---

### Phase 5: Business Logic Features (Can run in any order within phase)

#### 8. file-management
**File:** `features/file-management/04-database-schema.sql`
**Tables:** file_downloads
**Dependencies:** files (from core-foundation), users, deliverables, projects
**Note:** References file_comments from feedback-and-revisions

**Verification:**
```sql
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'file_downloads');
```

#### 9. inquiry-to-project
**File:** `features/inquiry-to-project/04-database-schema.sql`
**Tables:** inquiries, proposals, proposal_feedback, inquiry_notes
**Dependencies:** users, projects (from core-foundation)

**Verification:**
```sql
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inquiries');
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proposals');
```

#### 10. project-terms-acceptance
**File:** `features/project-terms-acceptance/04-database-schema.sql`
**Tables:** project_terms, project_terms_acceptance, project_terms_revisions
**Dependencies:** projects, users, project_team (from team-management)

**Verification:**
```sql
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_terms');
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_terms_acceptance');
```

#### 11. deliverable-approval
**File:** `features/deliverable-approval/04-database-schema.sql`
**Tables:** deliverable_approvals, additional_revision_requests
**Dependencies:** deliverables, files (from core-foundation), projects, users, project_team (from team-management)
**Note:** References deliverables and files but doesn't create them (they're in core-foundation)

**Verification:**
```sql
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deliverable_approvals');
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'additional_revision_requests');
```

#### 12. payment-workflow
**File:** `features/payment-workflow/04-database-schema.sql`
**Tables:** payments, project_payment_status, invoices, deliverable_access_control, payment_reminders, payment_webhook_logs, payment_audit_logs
**Dependencies:** projects, deliverables, users (from core-foundation)

**Verification:**
```sql
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments');
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_payment_status');
```

---

## ❌ DO NOT MIGRATE

### task-following
**Status:** ⚠️ **DEPRECATED**
**File:** `features/task-following/04-database-schema.sql`
**Reason:** Functionality has been fully integrated into core-task-management
**See:** `features/task-following/DEPRECATED.md`

---

## Dependency Graph

```
core-foundation (1)
    ├── authentication-system (2)
    ├── admin-features (3)
    ├── team-management (4)
    ├── notifications-system (5)
    ├── core-task-management (6)
    │   └── feedback-and-revisions (7)
    │       ├── file-management (8)
    │       └── deliverable-approval (11)
    ├── inquiry-to-project (9)
    ├── project-terms-acceptance (10)
    └── payment-workflow (12)
```

---

## Key Dependencies Explained

### Why core-foundation must be first:
- **users:** Referenced by ALL features for user relationships
- **projects:** Referenced by ALL features for project scoping
- **deliverables:** Referenced by tasks, files, revisions, approvals, payments
- **files:** Referenced by comments, deliverables, downloads
- **activities:** Used by ALL features for audit logging

### Why authentication-system is second:
- Sessions table needed for user authentication
- Referenced by admin-features for session invalidation

### Why admin-features is third:
- Adds critical columns (is_active, status) to users and projects
- These columns are referenced by other features' logic

### Why team-management is fourth:
- project_team table is checked for permissions across features
- Must exist before file-management, project-terms-acceptance, deliverable-approval

### Why notifications-system is fifth:
- Notifications are created by many features
- Must exist before features that create notifications

### Why core-task-management comes before feedback-and-revisions:
- tasks table must exist before task_comments can be created
- task_followers must exist before auto-follow triggers can work

### Why feedback-and-revisions comes before file-management:
- Defines canonical file_comments table
- file-management references but doesn't create this table

---

## Migration Script Template

```bash
#!/bin/bash
set -e  # Exit on any error

echo "Starting database migrations..."

# Phase 1: Core Foundation
echo "Phase 1: Core Foundation"
psql -d $DB_NAME -f features/core-foundation/04-database-schema.sql
echo "✓ core-foundation complete"

# Phase 2: Authentication & Admin
echo "Phase 2: Authentication & Admin"
psql -d $DB_NAME -f features/authentication-system/04-database-schema.sql
echo "✓ authentication-system complete"

psql -d $DB_NAME -f features/admin-features/04-database-schema.sql
echo "✓ admin-features complete"

# Phase 3: Supporting Features
echo "Phase 3: Supporting Features"
psql -d $DB_NAME -f features/team-management/04-database-schema.sql
echo "✓ team-management complete"

psql -d $DB_NAME -f features/notifications-system/04-database-schema.sql
echo "✓ notifications-system complete"

# Phase 4: Core Features
echo "Phase 4: Core Features"
psql -d $DB_NAME -f features/core-task-management/04-database-schema.sql
echo "✓ core-task-management complete"

psql -d $DB_NAME -f features/feedback-and-revisions/04-database-schema.sql
echo "✓ feedback-and-revisions complete"

# Phase 5: Business Logic Features
echo "Phase 5: Business Logic Features"
psql -d $DB_NAME -f features/file-management/04-database-schema.sql
echo "✓ file-management complete"

psql -d $DB_NAME -f features/inquiry-to-project/04-database-schema.sql
echo "✓ inquiry-to-project complete"

psql -d $DB_NAME -f features/project-terms-acceptance/04-database-schema.sql
echo "✓ project-terms-acceptance complete"

psql -d $DB_NAME -f features/deliverable-approval/04-database-schema.sql
echo "✓ deliverable-approval complete"

psql -d $DB_NAME -f features/payment-workflow/04-database-schema.sql
echo "✓ payment-workflow complete"

echo "✅ All migrations complete!"
```

---

## Rollback Strategy

If a migration fails:

1. **Stop immediately** - Do not proceed with subsequent migrations
2. **Identify the error** - Check PostgreSQL logs for constraint violations
3. **Fix the schema** - Update the SQL file to resolve the issue
4. **Rollback** - Drop tables created in the failed migration
5. **Re-run** - Execute the corrected migration
6. **Continue** - Proceed with remaining migrations only after success

---

## Common Issues & Solutions

### Issue: Foreign key constraint violation
**Cause:** Dependency table doesn't exist yet
**Solution:** Check migration order, ensure dependency was migrated first

### Issue: Duplicate table error
**Cause:** Table already exists from previous partial migration
**Solution:** Drop the table or use `CREATE TABLE IF NOT EXISTS`

### Issue: Circular dependency
**Cause:** Two tables reference each other
**Solution:** Create tables without foreign keys first, then add FKs via ALTER TABLE

**Example - Files ↔ Deliverables in core-foundation:**
The core-foundation schema handles this correctly:
1. `deliverables` table created with `beta_file_id` and `final_file_id` columns (UUID only, no FK)
2. `files` table created with `deliverable_id UUID NOT NULL REFERENCES deliverables(id)`
3. ALTER TABLE adds FK constraints from `deliverables` to `files` (lines 328-334)

This sequence ensures both tables exist before FK constraints are enforced.

### Issue: Function already exists
**Cause:** Function defined in multiple schemas
**Solution:** Use `CREATE OR REPLACE FUNCTION` and follow canonical locations

---

## Verification After All Migrations

Run this query to verify all tables exist:

```sql
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

Expected: 37 tables total

---

**Last Updated:** January 18, 2025
**Maintained By:** Development Team
**Version:** 1.0
