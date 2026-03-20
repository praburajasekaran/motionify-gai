---
phase: PROD-11-production-hardening
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - netlify/functions/_shared/db.ts
  - netlify/functions/health.ts
  - package.json
autonomous: true

must_haves:
  truths:
    - "Database queries work with neon HTTP driver"
    - "Health endpoint returns DB latency metrics"
    - "No pg Pool lifecycle management needed"
  artifacts:
    - path: "netlify/functions/_shared/db.ts"
      provides: "Neon serverless HTTP-based queries"
      contains: "@neondatabase/serverless"
    - path: "netlify/functions/health.ts"
      provides: "Health check with DB latency"
      exports: ["handler"]
  key_links:
    - from: "netlify/functions/_shared/db.ts"
      to: "DATABASE_URL"
      via: "neon() initialization"
      pattern: "neon\\(.*DATABASE_URL"
---

<objective>
Replace pg Pool-based database connection with @neondatabase/serverless HTTP driver.

Purpose: The current pg Pool is designed for long-lived servers, not serverless functions. Neon's HTTP driver eliminates connection lifecycle management, reducing cold starts and preventing connection exhaustion.

Output:
- Updated db.ts using neon HTTP queries
- Health endpoint with DB latency measurement
- Package.json with @neondatabase/serverless dependency
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/PROD-11-production-hardening/PROD-11-CONTEXT.md
@.planning/phases/PROD-11-production-hardening/PROD-11-RESEARCH.md
@netlify/functions/_shared/db.ts
@netlify/functions/health.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install @neondatabase/serverless and rewrite db.ts</name>
  <files>
    package.json
    netlify/functions/_shared/db.ts
  </files>
  <action>
1. Install the neon serverless driver:
   ```bash
   npm install @neondatabase/serverless
   ```

2. Rewrite `netlify/functions/_shared/db.ts` to use neon HTTP queries:

   - Import `neon` from `@neondatabase/serverless`
   - Create `sql` function using `neon(DATABASE_URL)` with 5-second timeout via fetchOptions
   - Export a `query()` function that wraps sql tagged template calls
   - Export a `transaction()` function using `sql.transaction([...])` for multi-statement transactions
   - Remove Pool/Client references entirely (not needed for HTTP driver)
   - Keep the SSL config logic ONLY for the environment detection (isProduction)
   - Add connection timeout of 5 seconds using AbortSignal.timeout(5000)

   Key pattern from research:
   ```typescript
   import { neon } from '@neondatabase/serverless';

   const sql = neon(process.env.DATABASE_URL!, {
     fetchOptions: { signal: AbortSignal.timeout(5000) }
   });

   // Single query
   const result = await sql`SELECT * FROM users WHERE id = ${userId}`;
   ```

3. Maintain backward compatibility:
   - Keep `query(text, params)` signature for existing code
   - Use sql tagged template internally
   - For parameterized queries, convert params array to tagged template
  </action>
  <verify>
    `npm run build` succeeds for Netlify functions
    `grep -r "import.*pg" netlify/functions/_shared/db.ts` returns no results
    `grep "@neondatabase/serverless" netlify/functions/_shared/db.ts` returns match
  </verify>
  <done>
    db.ts uses neon HTTP driver, pg Pool removed, build passes
  </done>
</task>

<task type="auto">
  <name>Task 2: Update health endpoint for neon driver</name>
  <files>
    netlify/functions/health.ts
  </files>
  <action>
1. Update health.ts to work with the new neon-based db.ts:

   - Import `query` from `./_shared` (same as before, signature unchanged)
   - The `query('SELECT 1')` call should still work since we maintained the interface
   - Add environment field showing `process.env.CONTEXT || 'development'`
   - Keep existing service configuration checks (email, storage, payment)

2. Enhance health response to include:
   - `environment: process.env.CONTEXT || 'development'`
   - Note: Neon HTTP doesn't have pool metrics like pg Pool; connection management is handled by Neon infrastructure

3. Add errorTracking service check for Sentry (prepare for Plan 02):
   ```typescript
   errorTracking: {
     status: process.env.SENTRY_DSN ? 'pass' : 'warn',
     configured: !!process.env.SENTRY_DSN
   }
   ```
  </action>
  <verify>
    `npm run build` succeeds
    Start local server and hit `curl http://localhost:8888/.netlify/functions/health` returns 200 with latencyMs
  </verify>
  <done>
    Health endpoint works with neon driver, shows environment and DB latency
  </done>
</task>

</tasks>

<verification>
1. Run `npm run build` - should pass without errors
2. Run `npm run dev` and test health endpoint
3. Verify no pg Pool imports remain in db.ts
4. Verify database queries still work (health check SELECT 1)
</verification>

<success_criteria>
- @neondatabase/serverless installed and used in db.ts
- pg Pool completely removed from db.ts
- Health endpoint returns DB latency and environment
- All existing database queries continue to work
- Build passes for both admin and client portals
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-11-production-hardening/PROD-11-01-SUMMARY.md`
</output>
