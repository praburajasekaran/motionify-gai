# Database Schema Ownership

This document defines which feature **owns** each database table. The owning feature is responsible for:
- Creating the table in its `04-database-schema.sql`
- Defining the table structure and constraints
- Managing migrations for that table
- Documenting the table's purpose and usage

Other features may **reference** these tables via foreign keys, but must not redefine or alter them.

---

## Ownership Rules

1. **Each table has exactly ONE owner**
2. **Only the owning feature can modify the table structure**
3. **Other features can reference tables via foreign keys**
4. **Never duplicate table definitions across features**
5. **If a table needs to be shared, it should be in core-foundation**

---

## Table Ownership Map

### Core Foundation

**Feature:** `core-foundation`
**File:** `features/core-foundation/04-database-schema.sql`

| Table | Owner | Purpose | Referenced By |
|-------|-------|---------|---------------|
| `users` | core-foundation | User accounts and authentication | ALL features |
| `projects` | core-foundation | Core project data | ALL features |
| `deliverables` | core-foundation | Project deliverables | file-management, deliverable-approval, payment-workflow, core-task-management |
| `files` | core-foundation | File metadata for deliverables | file-management, deliverable-approval, feedback-and-revisions |
| `activities` | core-foundation | System-wide audit log | ALL features |

**Why core-foundation?**
- These tables are fundamental to the entire system
- Referenced by nearly every other feature
- Must be created first in migration order

---

### Authentication System

**Feature:** `authentication-system`
**File:** `features/authentication-system/04-database-schema.sql`

| Table | Owner | Purpose | Referenced By |
|-------|-------|---------|---------------|
| `sessions` | authentication-system | Active user sessions | admin-features |
| `password_reset_tokens` | authentication-system | Password reset flow | None |
| `email_verification_tokens` | authentication-system | Email verification | None |

---

### Admin Features

**Feature:** `admin-features`
**File:** `features/admin-features/04-database-schema.sql`

| Table | Owner | Purpose | Referenced By |
|-------|-------|---------|---------------|
| *(None)* | - | Adds columns to users and projects | - |

**Note:** This feature extends existing tables rather than creating new ones.

**Columns Added:**
- `users.is_active` (BOOLEAN)
- `users.last_login_at` (TIMESTAMP)
- `projects.status` (VARCHAR)
- `projects.category` (VARCHAR)
- `projects.priority` (VARCHAR)

---

### Team Management

**Feature:** `team-management`
**File:** `features/team-management/04-database-schema.sql`

| Table | Owner | Purpose | Referenced By |
|-------|-------|---------|---------------|
| `project_team` | team-management | Project team members | ALL features (for permission checks) |
| `project_invitations` | team-management | Team member invitations | None |

---

### Notifications System

**Feature:** `notifications-system`
**File:** `features/notifications-system/04-database-schema.sql`

| Table | Owner | Purpose | Referenced By |
|-------|-------|---------|---------------|
| `notifications` | notifications-system | User notifications | ALL features |
| `user_notification_preferences` | notifications-system | Notification settings | None |
| `notification_email_queue` | notifications-system | Email delivery queue | None |

---

### Core Task Management

**Feature:** `core-task-management`
**File:** `features/core-task-management/04-database-schema.sql`

| Table | Owner | Purpose | Referenced By |
|-------|-------|---------|---------------|
| `tasks` | core-task-management | Project tasks | feedback-and-revisions |
| `task_assignments` | core-task-management | Task assignments | None |
| `task_followers` | core-task-management | Task followers/watchers | None |

---

### Feedback and Revisions

**Feature:** `feedback-and-revisions`
**File:** `features/feedback-and-revisions/04-database-schema.sql`

| Table | Owner | Purpose | Referenced By |
|-------|-------|---------|---------------|
| `task_comments` | **feedback-and-revisions** | Comments on tasks | file-management, deliverable-approval |
| `file_comments` | **feedback-and-revisions** | Comments on files | file-management |
| `comment_mentions` | feedback-and-revisions | @ mentions in comments | None |
| `revision_requests` | feedback-and-revisions | Revision requests | None |
| `additional_revision_requests` | feedback-and-revisions | Extra revision purchases | deliverable-approval (references only) |

**⚠️ CRITICAL:** `task_comments` and `file_comments` are **canonical** tables owned by feedback-and-revisions. Other features reference but DO NOT redefine these tables.

---

### File Management

**Feature:** `file-management`
**File:** `features/file-management/04-database-schema.sql`

| Table | Owner | Purpose | Referenced By |
|-------|-------|---------|---------------|
| `file_downloads` | file-management | File download tracking | None |

**References but does NOT own:**
- `files` (owned by core-foundation)
- `file_comments` (owned by feedback-and-revisions)

---

### Inquiry to Project

**Feature:** `inquiry-to-project`
**File:** `features/inquiry-to-project/04-database-schema.sql`

| Table | Owner | Purpose | Referenced By |
|-------|-------|---------|---------------|
| `inquiries` | inquiry-to-project | Customer inquiries | None |
| `proposals` | inquiry-to-project | Project proposals | None |
| `proposal_feedback` | inquiry-to-project | Feedback on proposals | None |
| `inquiry_notes` | inquiry-to-project | Internal notes | None |

---

### Project Terms Acceptance

**Feature:** `project-terms-acceptance`
**File:** `features/project-terms-acceptance/04-database-schema.sql`

| Table | Owner | Purpose | Referenced By |
|-------|-------|---------|---------------|
| `project_terms` | project-terms-acceptance | Project terms documents | None |
| `project_terms_acceptance` | project-terms-acceptance | Terms acceptance records | None |
| `project_terms_revisions` | project-terms-acceptance | Terms revision history | None |

---

### Deliverable Approval

**Feature:** `deliverable-approval`
**File:** `features/deliverable-approval/04-database-schema.sql`

| Table | Owner | Purpose | Referenced By |
|-------|-------|---------|---------------|
| `deliverable_approvals` | deliverable-approval | Approval tracking | None |
| *(additional_revision_requests)* | **feedback-and-revisions** | Extra revisions | None |

**References but does NOT own:**
- `deliverables` (owned by core-foundation)
- `files` (owned by core-foundation)
- `additional_revision_requests` (owned by feedback-and-revisions - NOT deliverable-approval)

**⚠️ NOTE:** The schema file may reference `additional_revision_requests`, but this table is owned by feedback-and-revisions.

---

### Payment Workflow

**Feature:** `payment-workflow`
**File:** `features/payment-workflow/04-database-schema.sql`

| Table | Owner | Purpose | Referenced By |
|-------|-------|---------|---------------|
| `payments` | payment-workflow | Payment transactions | None |
| `project_payment_status` | payment-workflow | Project payment tracking | None |
| `invoices` | payment-workflow | Invoice records | None |
| `deliverable_access_control` | payment-workflow | Deliverable access | None |
| `payment_reminders` | payment-workflow | Payment reminders | None |
| `payment_webhook_logs` | payment-workflow | Razorpay webhook logs | None |
| `payment_audit_logs` | payment-workflow | Payment audit trail | None |

---

## ❌ Deprecated / Not Owned

### task-following
**Status:** DEPRECATED
**Reason:** Merged into core-task-management
**Do NOT use** this schema

---

## Common Mistakes to Avoid

### ❌ WRONG: Redefining tables in multiple features

```sql
-- In feature-a/04-database-schema.sql
CREATE TABLE files (
  id UUID PRIMARY KEY,
  ...
);

-- In feature-b/04-database-schema.sql
CREATE TABLE files (  -- ❌ WRONG! Table already owned by core-foundation
  id UUID PRIMARY KEY,
  ...
);
```

### ✅ CORRECT: Referencing existing tables

```sql
-- In feature-b/04-database-schema.sql
CREATE TABLE my_feature_table (
  id UUID PRIMARY KEY,
  file_id UUID REFERENCES files(id),  -- ✅ CORRECT: Reference only
  ...
);
```

---

## Resolving Ownership Conflicts

If you find a table defined in multiple places:

1. **Identify the canonical owner** (usually the feature that logically owns the concept)
2. **Check MIGRATION_ORDER.md** (earlier migrations take precedence)
3. **Remove duplicate definitions** from non-owning features
4. **Update this document** to reflect the resolution
5. **Notify the team** of the change

---

## Adding a New Table

When adding a new table:

1. **Determine ownership:** Which feature logically owns this table?
2. **Check if it's widely used:** If used by 3+ features → consider adding to core-foundation
3. **Update this document:** Add the table to the appropriate section
4. **Update MIGRATION_ORDER.md:** If needed, adjust migration order
5. **Document foreign keys:** List which features will reference this table

---

## Verification Query

Run this to see which schemas define which tables:

```sql
WITH table_schemas AS (
  SELECT
    table_name,
    COUNT(*) as definition_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
  GROUP BY table_name
  HAVING COUNT(*) > 1
)
SELECT * FROM table_schemas;
```

**Expected result:** 0 rows (no tables defined multiple times)

---

**Last Updated:** 2025-11-19
**Maintained By:** Development Team
**Version:** 1.0
