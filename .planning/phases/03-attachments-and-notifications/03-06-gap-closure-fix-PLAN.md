---
phase: 03-attachments-and-notifications
plan: 06
type: execute
wave: 1
depends_on: []
files_modified:
  - database/migrations/002_add_comments_and_notifications.sql
  - netlify/functions/r2-presign.ts
autonomous: true
gap_closure: true

must_haves:
  truths:
    - "Database has proposal_comments, comment_attachments, and notifications tables"
    - "R2 presign function uses V1 handler syntax"
    - "R2 presign function returns CORS headers on all responses"
  artifacts:
    - path: "database/migrations/002_add_comments_and_notifications.sql"
      contains: "CREATE TABLE IF NOT EXISTS proposal_comments"
    - path: "netlify/functions/r2-presign.ts"
      contains: "export const handler"
  key_links:
    - from: "netlify/functions/r2-presign.ts"
      to: "netlify/functions/_shared/cors.ts"
      via: "import { headers }"
---

<objective>
Fix critical infrastructure gaps preventing the comment system from functioning.
1. Create missing database tables (comments, attachments, notifications) to resolve 500 errors.
2. Refactor R2 presign function to V1 syntax to resolve CORS/load failures.

Purpose: Close diagnosed UAT blockers.
Output: Working database schema and accessible R2 presign API.
</objective>

<execution_context>
@~/.config/opencode/get-shit-done/workflows/execute-plan.md
@~/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/03-attachments-and-notifications/03-UAT.md
@netlify/functions/r2-presign.ts
@netlify/functions/_shared/cors.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Database Migration 002</name>
  <files>database/migrations/002_add_comments_and_notifications.sql</files>
  <action>
    Create a new SQL migration file with the following schema:

    1. `proposal_comments`:
       - `id` (UUID, PK, default gen_random_uuid())
       - `proposal_id` (UUID, not null)
       - `content` (TEXT, not null)
       - `author_id` (UUID, not null)
       - `author_type` (VARCHAR(20), check 'CLIENT' or 'ADMIN', not null)
       - `user_name` (VARCHAR(255), not null)
       - `created_at` (TIMESTAMPTZ, default NOW())
       - `updated_at` (TIMESTAMPTZ, default NOW())
       - Index on `proposal_id`

    2. `comment_attachments`:
       - `id` (UUID, PK, default gen_random_uuid())
       - `comment_id` (UUID, FK to proposal_comments.id ON DELETE CASCADE, not null)
       - `file_name` (VARCHAR(255), not null)
       - `file_size` (BIGINT, not null)
       - `file_type` (VARCHAR(100), not null)
       - `file_key` (TEXT, not null - R2 key)
       - `created_at` (TIMESTAMPTZ, default NOW())
       - Index on `comment_id`

    3. `notifications`:
       - `id` (UUID, PK, default gen_random_uuid())
       - `user_id` (UUID, not null)
       - `type` (VARCHAR(50), not null)
       - `message` (TEXT, not null)
       - `link` (TEXT)
       - `is_read` (BOOLEAN, default false)
       - `created_at` (TIMESTAMPTZ, default NOW())
       - Index on `user_id` and `is_read`

    Ensure `CREATE TABLE IF NOT EXISTS` is used.
  </action>
  <verify>
    Check file existence: `ls database/migrations/002_add_comments_and_notifications.sql`
  </verify>
  <done>
    Migration file exists with correct schema definitions.
  </done>
</task>

<task type="auto">
  <name>Task 2: Refactor R2 Presign Function to V1 Syntax</name>
  <files>netlify/functions/r2-presign.ts</files>
  <action>
    Refactor `netlify/functions/r2-presign.ts` to use Netlify Functions V1 syntax.

    1. Change `export default async (req: Request) =>` to `export const handler: Handler = async (event, context) =>`.
    2. Import `Handler` from `@netlify/functions`.
    3. Import `headers` from `./_shared/cors`.
    4. Replace `req` (Request object) logic with `event` (Event object) logic:
       - `req.method` -> `event.httpMethod`
       - `req.json()` -> `JSON.parse(event.body || '{}')`
       - `url.searchParams` -> `event.queryStringParameters`
    5. Ensure ALL responses (including errors and OPTIONS) return `{ statusCode: ..., headers, body: ... }`.
    6. Ensure `headers` are merged with any custom headers (like Content-Type).

    Note: Keep the existing S3Client and logic, just adapt the handler wrapper.
  </action>
  <verify>
    Run `grep "export const handler" netlify/functions/r2-presign.ts`
  </verify>
  <done>
    Function uses V1 syntax and imports shared CORS headers.
  </done>
</task>

<task type="auto">
  <name>Task 3: Apply Database Migration</name>
  <files>none</files>
  <action>
    Run the migration against the database.
    Since we don't have a direct `npm run migrate` command confirmed, use the psql/db tool pattern if available, or just create a script to run it.
    
    *Actually, for this environment, assume we can't run it directly without credentials. Just Verify the file exists and is ready for the deployment pipeline.*
    
    Update: The "Foundation" phase established `database/connection.ts`. We should probably create a quick script to apply the migration using the existing DB connection if possible.
    
    Create `scripts/run_migration_002.ts` that reads the SQL file and executes it using `database/connection.ts` (or `pg` driver directly).
    Run it with `npx ts-node scripts/run_migration_002.ts`.
    Delete the script after success.
  </action>
  <verify>
    Execution of the script returns success message.
  </verify>
  <done>
    Tables exist in the database.
  </done>
</task>

</tasks>

<verification>
Ensure migration file is valid SQL.
Ensure R2 function is valid TypeScript V1 syntax.
</verification>

<success_criteria>
- [ ] Migration 002 exists
- [ ] R2 presign function uses V1 syntax
- [ ] Tables created in DB (via script execution)
</success_criteria>

<output>
After completion, create `.planning/phases/03-attachments-and-notifications/03-06-SUMMARY.md`
</output>
