---
phase: PROD-06-user-management
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - database/migrations/008_update_role_constraint.sql
  - database/schema.sql
autonomous: true

must_haves:
  truths:
    - "Database accepts super_admin role on user creation"
    - "Database accepts project_manager role on user creation"
    - "Database accepts team_member role on user creation"
    - "Database accepts client role on user creation"
    - "Existing users with 'admin' role are migrated to 'super_admin'"
  artifacts:
    - path: "database/migrations/008_update_role_constraint.sql"
      provides: "Role constraint migration for 4-role system"
      contains: "super_admin"
  key_links:
    - from: "database/migrations/008_update_role_constraint.sql"
      to: "users table role constraint"
      via: "ALTER TABLE"
      pattern: "ALTER.*users.*role"
---

<objective>
Create database migration to update user role constraint from 2-role system to 4-role system.

Purpose: The database schema currently only allows 'admin' and 'client' roles, but the codebase expects 'super_admin', 'project_manager', 'team_member', and 'client'. This mismatch will cause all user management operations to fail with constraint violations.

Output: Migration file that updates the role CHECK constraint and migrates existing 'admin' users to 'super_admin'.
</objective>

<execution_context>
@/Users/praburajasekaran/.claude/get-shit-done/workflows/execute-plan.md
@/Users/praburajasekaran/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/PROD-06-user-management/PROD-06-RESEARCH.md

Reference files:
@database/schema.sql (lines 15-16 for current role constraint)
@database/migrations/003_align_projects_schema.sql (example migration pattern)
@features/pending/core-foundation/04-database-schema.sql (reference for correct constraint)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create role constraint migration</name>
  <files>database/migrations/008_update_role_constraint.sql</files>
  <action>
Create a SQL migration file that:

1. First, migrate existing 'admin' users to 'super_admin':
```sql
UPDATE users SET role = 'super_admin' WHERE role = 'admin';
```

2. Drop the existing constraint:
```sql
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
```

3. Add the new constraint supporting all 4 roles:
```sql
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'project_manager', 'team_member', 'client'));
```

4. Also update the user_invitations table constraint:
```sql
ALTER TABLE user_invitations DROP CONSTRAINT IF EXISTS user_invitations_role_check;
ALTER TABLE user_invitations ADD CONSTRAINT user_invitations_role_check
  CHECK (role IN ('super_admin', 'project_manager', 'team_member', 'client'));
```

Use transaction wrapping (BEGIN/COMMIT) for safety.
Include clear comments explaining the migration purpose.
  </action>
  <verify>
Run: `cat database/migrations/008_update_role_constraint.sql`
Verify file contains:
- UPDATE statement for admin -> super_admin migration
- DROP CONSTRAINT for both users and user_invitations tables
- ADD CONSTRAINT with all 4 roles for both tables
- Transaction wrapping (BEGIN/COMMIT)
  </verify>
  <done>Migration file exists with correct SQL to update role constraints from 2-role to 4-role system</done>
</task>

<task type="auto">
  <name>Task 2: Update schema.sql reference</name>
  <files>database/schema.sql</files>
  <action>
Update the reference schema.sql to reflect the correct 4-role constraint.

Find line 15:
```sql
role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'client')),
```

Change to:
```sql
role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'project_manager', 'team_member', 'client')),
```

Also find line ~312 (user_invitations table):
```sql
role VARCHAR(50) NOT NULL CHECK (role IN ('client', 'team')),
```

Change to:
```sql
role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'project_manager', 'team_member', 'client')),
```

This keeps the schema.sql in sync with the actual database state after migration.
  </action>
  <verify>
Run: `grep -n "CHECK.*role.*IN" database/schema.sql`
Verify both role constraints show: ('super_admin', 'project_manager', 'team_member', 'client')
  </verify>
  <done>schema.sql reflects the 4-role system constraint for both users and user_invitations tables</done>
</task>

</tasks>

<verification>
1. Migration file exists at database/migrations/008_update_role_constraint.sql
2. Migration contains UPDATE for admin -> super_admin migration
3. Migration contains correct 4-role CHECK constraints
4. schema.sql updated with 4-role constraints
5. Both users and user_invitations tables addressed
</verification>

<success_criteria>
1. Migration file created with valid SQL syntax
2. Existing admin users will be migrated to super_admin
3. New 4-role constraint allows: super_admin, project_manager, team_member, client
4. Reference schema.sql updated to match migration outcome
5. Migration is transaction-safe (can be rolled back)
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-06-user-management/PROD-06-01-SUMMARY.md` with:
- Migration file path and content summary
- Schema changes made
- Any notes about migration order or dependencies
</output>
