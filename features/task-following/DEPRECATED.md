# Task Following Feature - DEPRECATED

**Status:** ⚠️ DEPRECATED - Do not use this schema

## Reason for Deprecation

The task following functionality has been **fully integrated** into the core-task-management feature.

## Migration Notes

- The `task_followers` table is now defined in `features/core-task-management/04-database-schema.sql`
- All task following logic (assignments, commenting, manual following) is handled by core-task-management
- The `notifications_enabled` column has been added for muting support

## What to Use Instead

Use the core-task-management schema for all task following needs:
- **Table:** `task_followers` (defined in core-task-management)
- **Columns:** id, task_id, user_id, followed_at, source, can_unfollow, notifications_enabled
- **Auto-follow triggers:**
  - On assignment: `trigger_auto_follow_on_assignment`
  - On comment: `trigger_auto_follow_on_comment` (references task_comments from feedback-and-revisions)

## Schema File

The `04-database-schema.sql` file in this directory should **NOT** be used in migrations.

---

**Date Deprecated:** January 18, 2025
**Replaced By:** features/core-task-management/04-database-schema.sql
