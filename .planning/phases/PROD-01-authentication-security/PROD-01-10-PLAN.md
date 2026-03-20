---
phase: PROD-01-authentication-security
plan: 10
type: execute
wave: 1
depends_on: []
files_modified:
  - netlify/functions/comments.ts
  - netlify/functions/attachments.ts
  - netlify/functions/activities.ts
  - netlify/functions/notifications.ts
  - netlify/functions/inquiry-detail.ts
autonomous: true
gap_closure: true

must_haves:
  truths:
    - "Comments GET requires authentication - unauthenticated requests return 401"
    - "Attachments GET requires authentication - unauthenticated requests return 401"
    - "Activities GET and POST require authentication - unauthenticated requests return 401"
    - "Notifications GET and PATCH require authentication - unauthenticated requests return 401"
    - "Inquiry-detail GET and PUT require authentication - unauthenticated requests return 401"
  artifacts:
    - path: "netlify/functions/comments.ts"
      provides: "Auth middleware in compose chain"
      contains: "withAuth()"
    - path: "netlify/functions/attachments.ts"
      provides: "Auth middleware in compose chain"
      contains: "withAuth()"
    - path: "netlify/functions/activities.ts"
      provides: "Auth middleware in compose chain"
      contains: "withAuth()"
    - path: "netlify/functions/notifications.ts"
      provides: "Auth middleware in compose chain"
      contains: "withAuth()"
    - path: "netlify/functions/inquiry-detail.ts"
      provides: "Auth middleware in compose chain"
      contains: "withAuth()"
  key_links:
    - from: "netlify/functions/comments.ts"
      to: "_shared/middleware.ts"
      via: "withAuth() import and compose"
      pattern: "compose.*withAuth"
    - from: "netlify/functions/notifications.ts"
      to: "_shared/middleware.ts"
      via: "withAuth() import and compose"
      pattern: "compose.*withAuth"
---

<objective>
Add authentication middleware to 5 supporting API endpoints that currently allow unauthenticated access.

Purpose: Close Gap 1 from PROD-01-VERIFICATION.md - supporting endpoints expose business data without authentication.

Output: All supporting endpoints require authentication via `withAuth()` in compose chain. Endpoint protection increases from 19 to 24 (73% coverage).
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/phases/PROD-01-authentication-security/PROD-01-VERIFICATION.md

Reference patterns from existing protected endpoints:
- proposals.ts uses: `compose(withCORS([...]), withAuth(), withRateLimit(...))`
- projects.ts uses: `compose(withCORS([...]), withAuth(), withRateLimit(...))`
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add withAuth to comments.ts</name>
  <files>netlify/functions/comments.ts</files>
  <action>
    Add `withAuth()` to the compose chain in comments.ts:

    1. **Update import** - Add `withAuth` and `AuthResult` to the import from './_shared/middleware':

       **Before (line 5):**
       ```typescript
       import { compose, withCORS, withRateLimit, type NetlifyEvent } from './_shared/middleware';
       ```

       **After:**
       ```typescript
       import { compose, withCORS, withAuth, withRateLimit, type AuthResult, type NetlifyEvent } from './_shared/middleware';
       ```

    2. **Remove requireAuth import** (line 2):

       **Before:**
       ```typescript
       import { requireAuth } from './_shared/auth';
       ```

       **After:** Delete this line entirely.

    3. **Add withAuth to compose chain and update handler signature** (lines 43-46):

       **Before:**
       ```typescript
       export const handler = compose(
           withCORS(['GET', 'POST', 'PUT', 'OPTIONS']),
           withRateLimit(RATE_LIMITS.api, 'comments')
       )(async (event: NetlifyEvent) => {
       ```

       **After:**
       ```typescript
       export const handler = compose(
           withCORS(['GET', 'POST', 'PUT', 'OPTIONS']),
           withAuth(),
           withRateLimit(RATE_LIMITS.api, 'comments')
       )(async (event: NetlifyEvent, auth?: AuthResult) => {
       ```

    4. **Remove requireAuth block from POST handler** (lines 128-134):

       **Before:**
       ```typescript
       if (event.httpMethod === 'POST') {
           const authResult = await requireAuth(event);

           if (!('user' in authResult)) {
               return (authResult as { success: false; response: { statusCode: number; headers: Record<string, string>; body: string } }).response;
           }

           const user = authResult.user;
       ```

       **After:**
       ```typescript
       if (event.httpMethod === 'POST') {
           // After withAuth() middleware, auth is guaranteed
           const user = auth!.user;
       ```

       Note: Lines using `user.role`, `user.id`, `user.fullName` (e.g., lines 143, 157) remain unchanged - they already use the user object correctly.

    5. **Remove requireAuth block from PUT handler** (lines 265-271):

       **Before:**
       ```typescript
       if (event.httpMethod === 'PUT') {
           const authResult = await requireAuth(event);

           if (!('user' in authResult)) {
               return (authResult as { success: false; response: { statusCode: number; headers: Record<string, string>; body: string } }).response;
           }

           const user = authResult.user;
       ```

       **After:**
       ```typescript
       if (event.httpMethod === 'PUT') {
           // After withAuth() middleware, auth is guaranteed
           const user = auth!.user;
       ```

    This ensures ALL operations (GET, POST, PUT) require authentication via middleware.
  </action>
  <verify>
    Build passes: `cd /Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1 && npm run build:admin`

    Check withAuth in compose:
    `grep -n "withAuth()" netlify/functions/comments.ts`
  </verify>
  <done>
    comments.ts uses withAuth() in compose chain; GET, POST, PUT all require authentication; redundant requireAuth calls removed.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add withAuth to attachments.ts</name>
  <files>netlify/functions/attachments.ts</files>
  <action>
    Add `withAuth()` to the compose chain in attachments.ts:

    1. **Update import** - Add `withAuth` and `AuthResult` to the import from './_shared/middleware':

       **Before (line 6):**
       ```typescript
       import { compose, withCORS, withRateLimit, type NetlifyEvent } from './_shared/middleware';
       ```

       **After:**
       ```typescript
       import { compose, withCORS, withAuth, withRateLimit, type AuthResult, type NetlifyEvent } from './_shared/middleware';
       ```

    2. **Remove requireAuth import** (line 2):

       **Before:**
       ```typescript
       import { requireAuth } from './_shared/auth';
       ```

       **After:** Delete this line entirely.

    3. **Add withAuth to compose chain and update handler signature** (lines 84-87):

       **Before:**
       ```typescript
       export const handler = compose(
           withCORS(['GET', 'POST', 'OPTIONS']),
           withRateLimit(RATE_LIMITS.apiStrict, 'attachments')
       )(async (event: NetlifyEvent) => {
       ```

       **After:**
       ```typescript
       export const handler = compose(
           withCORS(['GET', 'POST', 'OPTIONS']),
           withAuth(),
           withRateLimit(RATE_LIMITS.apiStrict, 'attachments')
       )(async (event: NetlifyEvent, auth?: AuthResult) => {
       ```

    4. **Remove requireAuth block from POST handler** (lines 225-231):

       **Before:**
       ```typescript
       if (event.httpMethod === 'POST') {
           const authResult = await requireAuth(event);

           if (!('user' in authResult)) {
               return (authResult as { success: false; response: { statusCode: number; headers: Record<string, string>; body: string } }).response;
           }

           const user = authResult.user;
       ```

       **After:**
       ```typescript
       if (event.httpMethod === 'POST') {
           // After withAuth() middleware, auth is guaranteed
           const user = auth!.user;
       ```

       Note: The existing code at line 266 that uses `user.id` remains unchanged - it already uses the user object correctly.

    This ensures ALL operations (GET, POST) require authentication via middleware.
  </action>
  <verify>
    Build passes: `cd /Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1 && npm run build:admin`

    Check withAuth in compose:
    `grep -n "withAuth()" netlify/functions/attachments.ts`
  </verify>
  <done>
    attachments.ts uses withAuth() in compose chain; GET and POST both require authentication; redundant requireAuth call removed.
  </done>
</task>

<task type="auto">
  <name>Task 3: Add withAuth to activities.ts, notifications.ts, and inquiry-detail.ts</name>
  <files>
    netlify/functions/activities.ts
    netlify/functions/notifications.ts
    netlify/functions/inquiry-detail.ts
  </files>
  <action>
    Add `withAuth()` to compose chain in all three files:

    **activities.ts:**
    1. Add `withAuth, type AuthResult` to the import from './_shared/middleware'
    2. Add `withAuth()` between `withCORS` and `withRateLimit`:
       ```typescript
       export const handler = compose(
         withCORS(['GET', 'POST', 'OPTIONS']),
         withAuth(),
         withRateLimit(RATE_LIMITS.api, 'activities')
       )(async (event: NetlifyEvent, auth?: AuthResult) => {
       ```

    **notifications.ts:**
    1. Add `withAuth, type AuthResult` to the import from './_shared/middleware'
    2. Add `withAuth()` between `withCORS` and `withRateLimit`:
       ```typescript
       export const handler = compose(
           withCORS(['GET', 'PATCH', 'OPTIONS']),
           withAuth(),
           withRateLimit(RATE_LIMITS.api, 'notifications')
       )(async (event: NetlifyEvent, auth?: AuthResult) => {
       ```

    **inquiry-detail.ts:**
    1. Add `withAuth, type AuthResult` to the import from './_shared/middleware'
    2. Add `withAuth()` between `withCORS` and `withRateLimit`:
       ```typescript
       export const handler = compose(
         withCORS(['GET', 'PUT', 'OPTIONS']),
         withAuth(),
         withRateLimit(RATE_LIMITS.api, 'inquiry_detail')
       )(async (event: NetlifyEvent, auth?: AuthResult) => {
       ```

    Note: inquiries.ts (the main inquiry endpoint) remains public for POST (new client inquiry form) but we protect inquiry-detail which is used for viewing specific inquiry details and updates.
  </action>
  <verify>
    Build passes: `cd /Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1 && npm run build:admin`

    Check all three have withAuth:
    `grep -l "withAuth()" netlify/functions/activities.ts netlify/functions/notifications.ts netlify/functions/inquiry-detail.ts`
  </verify>
  <done>
    activities.ts, notifications.ts, and inquiry-detail.ts all use withAuth() in compose chain; all operations require authentication.
  </done>
</task>

</tasks>

<verification>
After all tasks complete:

1. **Auth middleware applied:**
   ```bash
   grep -l "withAuth()" netlify/functions/{comments,attachments,activities,notifications,inquiry-detail}.ts | wc -l
   # Should output: 5
   ```

2. **No redundant requireAuth imports in updated files:**
   ```bash
   grep "requireAuth" netlify/functions/comments.ts netlify/functions/attachments.ts
   # Should output: nothing (imports removed)
   ```

3. **Build verification:**
   ```bash
   npm run build:admin && npm run build:client
   # Both should pass
   ```

4. **Protected endpoint count:**
   ```bash
   grep -l "withAuth\|withSuperAdmin\|withProjectManager" netlify/functions/*.ts | grep -v "_shared" | wc -l
   # Should output: 24 (up from 19)
   ```
</verification>

<success_criteria>
- withAuth() added to compose chain in 5 endpoint files
- Redundant requireAuth() calls removed from comments.ts and attachments.ts
- All builds pass (admin Vite + client Next.js)
- Protected endpoint count increases from 19 to 24
- Unauthenticated requests to these endpoints return 401 Unauthorized
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-01-authentication-security/PROD-01-10-SUMMARY.md`
</output>
