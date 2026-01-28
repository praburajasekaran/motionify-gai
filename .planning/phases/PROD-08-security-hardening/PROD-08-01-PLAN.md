---
phase: PROD-08-security-hardening
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - netlify/functions/inquiries.ts
autonomous: true

must_haves:
  truths:
    - "Unauthenticated users cannot fetch all inquiries"
    - "Authenticated admins can still fetch all inquiries"
    - "Clients can still fetch their own inquiries with clientUserId filter"
    - "Public inquiry creation (POST) remains accessible without auth"
  artifacts:
    - path: "netlify/functions/inquiries.ts"
      provides: "Protected GET endpoint with role-based access"
      contains: "withAuth()"
  key_links:
    - from: "netlify/functions/inquiries.ts"
      to: "_shared/middleware.ts"
      via: "withAuth() middleware import"
      pattern: "withAuth\\(\\)"
---

<objective>
Add authentication middleware to the inquiries GET endpoint to prevent unauthorized access to all inquiry data.

Purpose: Close medium-severity security gap where unauthenticated users can fetch all inquiries. The GET endpoint without clientUserId filter exposes business-sensitive data (client contact info, quiz answers, inquiry status).

Output: Protected inquiries endpoint that requires authentication for admin listing but preserves public inquiry creation flow.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/PROD-08-security-hardening/PROD-08-RESEARCH.md
@netlify/functions/inquiries.ts
@netlify/functions/_shared/middleware.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add withAuth middleware to inquiries endpoint</name>
  <files>netlify/functions/inquiries.ts</files>
  <action>
Add withAuth() middleware to the compose() chain in netlify/functions/inquiries.ts.

IMPORTANT: Middleware order matters.
- withCORS() MUST be first (handles OPTIONS preflight)
- withAuth() comes AFTER withCORS()
- withRateLimit() comes last

Update the handler signature to accept auth parameter (AuthResult type).

The compose chain should be:
```typescript
export const handler = compose(
  withCORS(['GET', 'POST', 'PUT', 'OPTIONS']),
  withAuth(),
  withRateLimit(RATE_LIMITS.api, 'inquiries')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
```

Add import for AuthResult type from middleware:
```typescript
import { compose, withCORS, withAuth, withRateLimit, type NetlifyEvent, type NetlifyResponse, type AuthResult } from './_shared/middleware';
```

PRESERVE the existing behavior where:
- Clients can filter by their own clientUserId
- Admins can list all inquiries (no filter)
- Individual inquiry lookup by ID/number works for authenticated users
  </action>
  <verify>
Run `npm run build` to ensure TypeScript compilation passes.
Verify withAuth() is imported and used in compose chain.
  </verify>
  <done>
inquiries.ts has withAuth() in compose chain after withCORS() and accepts AuthResult parameter.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add role-based access control for GET requests</name>
  <files>netlify/functions/inquiries.ts</files>
  <action>
Update the GET handler logic to implement role-based access:

1. For listing all inquiries (no clientUserId filter):
   - Require admin role (super_admin or project_manager)
   - Reject clients trying to list all inquiries

2. For filtering by clientUserId:
   - Allow if user is admin (can see any client's inquiries)
   - Allow if user is client AND clientUserId matches their own userId
   - Reject if client tries to fetch another user's inquiries

3. For individual inquiry lookup by ID:
   - Admins can access any inquiry
   - Clients can only access inquiries where they are the client

Implementation approach:
```typescript
if (event.httpMethod === 'GET') {
  const { clientUserId } = event.queryStringParameters || {};

  // After withAuth(), auth is guaranteed to exist and be authorized
  const userRole = auth?.user?.role;
  const userId = auth?.user?.userId;
  const isAdmin = userRole === 'super_admin' || userRole === 'project_manager';

  // For listing all inquiries (admin only)
  if (!potentialId || potentialId === 'inquiries' || potentialId === 'api') {
    if (!clientUserId && !isAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required to list all inquiries' }),
      };
    }

    // If client is filtering by clientUserId, verify it matches their own ID
    if (clientUserId && !isAdmin && clientUserId !== userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Cannot access other users inquiries' }),
      };
    }
  }

  // ... rest of existing GET logic
}
```

For individual inquiry lookups, add ownership check before returning:
- If user is admin, allow access
- If user is client, verify inquiry.client_user_id matches their userId OR the inquiry was created without a client_user_id
  </action>
  <verify>
Run `npm run build` to ensure no TypeScript errors.
Review the logic flow to confirm:
- Admins can list all and filter
- Clients can only filter by their own userId
- Individual lookup respects ownership
  </verify>
  <done>
GET requests enforce role-based access: admins see all, clients only see their own.
  </done>
</task>

</tasks>

<verification>
1. Build passes: `npm run build` succeeds
2. Middleware order: withCORS() before withAuth() before withRateLimit()
3. Auth import: AuthResult type imported from middleware
4. Role check: Listing all inquiries requires admin role
5. Client filter: Clients can only fetch their own inquiries
</verification>

<success_criteria>
- Unauthenticated GET /inquiries returns 401 Unauthorized
- Client GET /inquiries (no filter) returns 403 Forbidden
- Client GET /inquiries?clientUserId=their-own-id returns their inquiries
- Client GET /inquiries?clientUserId=other-user-id returns 403 Forbidden
- Admin GET /inquiries returns all inquiries
- POST /inquiries (public form) still works (protected by auth but allows through for public submission)
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-08-security-hardening/PROD-08-01-SUMMARY.md`
</output>
