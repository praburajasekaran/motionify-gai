---
phase: PROD-06-user-management
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - database/migrations/008_create_user_invitations_and_roles.sql
  - database/schema.sql
autonomous: true

must_haves:
  truths:
    - "Database accepts super_admin role on user creation"
    - "Database accepts project_manager role on user creation"
    - "Database accepts team_member role on user creation"
    - "Database accepts client role on user creation"
    - "Existing users with 'admin' role are migrated to 'super_admin'"
    - "user_invitations table exists and accepts invitations"
  artifacts:
    - path: "database/migrations/008_create_user_invitations_and_roles.sql"
      provides: "Creates user_invitations table and updates role constraints"
      contains: "CREATE TABLE user_invitations"
  key_links:
    - from: "database/migrations/008_create_user_invitations_and_roles.sql"
      to: "users table role constraint"
      via: "ALTER TABLE"
      pattern: "ALTER.*users.*role"
---

<objective>
Create database migration to: (1) create the missing user_invitations table, and (2) update user role constraint from 2-role system to 4-role system.

Purpose: The codebase (invitations-create.ts, invitations-revoke.ts) references a user_invitations table that doesn't exist in the schema. Additionally, the database schema currently only allows 'admin' and 'client' roles, but the codebase expects 'super_admin', 'project_manager', 'team_member', and 'client'.

Output: Migration file that creates user_invitations table and updates role CHECK constraints.
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
@database/schema.sql (lines 15-16 for current role constraint, lines 306-344 for project_invitations as pattern)
@database/migrations/003_align_projects_schema.sql (example migration pattern)
@netlify/functions/invitations-create.ts (shows expected user_invitations columns)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create user_invitations table and role migration</name>
  <files>database/migrations/008_create_user_invitations_and_roles.sql</files>
  <action>
Create a SQL migration file that:

1. Create the user_invitations table (required by invitations-create.ts):
```sql
-- User invitations table for admin-level user invitations
-- Different from project_invitations which is for project team invitations
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'project_manager', 'team_member', 'client')),
  full_name VARCHAR(255),
  token VARCHAR(500) UNIQUE NOT NULL,
  invited_by UUID REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_invitations
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires ON user_invitations(expires_at);

-- Trigger for updated_at
CREATE TRIGGER update_user_invitations_updated_at
  BEFORE UPDATE ON user_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

2. Migrate existing 'admin' users to 'super_admin':
```sql
UPDATE users SET role = 'super_admin' WHERE role = 'admin';
```

3. Update the users table role constraint:
```sql
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'project_manager', 'team_member', 'client'));
```

Use transaction wrapping (BEGIN/COMMIT) for safety.
Include clear comments explaining the migration purpose.
  </action>
  <verify>
Run: `cat database/migrations/008_create_user_invitations_and_roles.sql`
Verify file contains:
- CREATE TABLE user_invitations with all required columns
- Indexes for email, token, status, expires_at
- UPDATE statement for admin -> super_admin migration
- ALTER TABLE for users role constraint
- Transaction wrapping (BEGIN/COMMIT)
  </verify>
  <done>Migration file creates user_invitations table and updates users role constraint</done>
</task>

<task type="auto">
  <name>Task 2: Update schema.sql reference</name>
  <files>database/schema.sql</files>
  <action>
Update the reference schema.sql to reflect the new state after migration.

1. Update users table role constraint (line 15):
Find:
```sql
role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'client')),
```
Change to:
```sql
role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'project_manager', 'team_member', 'client')),
```

2. Add user_invitations table definition AFTER the project_invitations table (after line ~344):
```sql
-- ============================================================================
-- 10. USER_INVITATIONS TABLE (for admin-level user creation)
-- ============================================================================
CREATE TABLE user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'project_manager', 'team_member', 'client')),
  full_name VARCHAR(255),
  token VARCHAR(500) UNIQUE NOT NULL,
  invited_by UUID REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_invitations
CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_user_invitations_token ON user_invitations(token);
CREATE INDEX idx_user_invitations_status ON user_invitations(status);
CREATE INDEX idx_user_invitations_expires ON user_invitations(expires_at);

-- Trigger for updated_at
CREATE TRIGGER update_user_invitations_updated_at
  BEFORE UPDATE ON user_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

This keeps schema.sql in sync with the actual database state after migration.
  </action>
  <verify>
Run: `grep -n "user_invitations\|super_admin" database/schema.sql`
Verify:
- users role constraint shows super_admin
- user_invitations table definition exists
  </verify>
  <done>schema.sql includes user_invitations table and 4-role constraint for users table</done>
</task>

</tasks>

<verification>
1. Migration file exists at database/migrations/008_create_user_invitations_and_roles.sql
2. Migration creates user_invitations table with correct columns matching invitations-create.ts expectations
3. Migration contains UPDATE for admin -> super_admin migration
4. Migration contains correct 4-role CHECK constraint for users table
5. schema.sql updated with user_invitations table and 4-role constraint
</verification>

<success_criteria>
1. Migration file created with valid SQL syntax
2. user_invitations table created with columns: id, email, role, full_name, token, invited_by, status, expires_at, accepted_at, revoked_at, revoked_by, created_at, updated_at
3. Existing admin users will be migrated to super_admin
4. New 4-role constraint allows: super_admin, project_manager, team_member, client
5. Reference schema.sql updated to match migration outcome
6. Migration is transaction-safe (can be rolled back)
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-06-user-management/PROD-06-01-SUMMARY.md` with:
- Migration file path and content summary
- Schema changes made
- Any notes about migration order or dependencies
</output>
