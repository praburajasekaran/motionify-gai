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
    - "Unauthenticated users cannot fetch all inquiries (GET)"
    - "Authenticated admins can still fetch all inquiries"
    - "Clients can still fetch their own inquiries with clientUserId filter"
    - "Public inquiry creation (POST) remains accessible without auth"
    - "Inquiry updates (PUT) require authentication"
  artifacts:
    - path: "netlify/functions/inquiries.ts"
      provides: "Protected GET/PUT with public POST"
      contains: "requireAuthFromCookie"
  key_links:
    - from: "netlify/functions/inquiries.ts"
      to: "_shared/auth.ts"
      via: "requireAuthFromCookie() direct import"
      pattern: "requireAuthFromCookie"
---

<objective>
Add conditional authentication to the inquiries endpoint: protect GET and PUT methods while keeping POST public for the contact form.

Purpose: Close medium-severity security gap where unauthenticated users can fetch all inquiries, while preserving the public contact form submission flow that doesn't require login.

Output: Protected inquiries endpoint that requires authentication for GET/PUT but allows unauthenticated POST.
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
@netlify/functions/_shared/auth.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Import requireAuthFromCookie and AuthResult for manual auth checks</name>
  <files>netlify/functions/inquiries.ts</files>
  <action>
Add imports for manual authentication. Do NOT use withAuth() middleware - it protects all methods including POST, which would break the public contact form.

Add to imports at top of file:
```typescript
import { requireAuthFromCookie, type CookieAuthResult } from './_shared/auth';
```

IMPORTANT: Do NOT add withAuth() to the compose() chain. The compose chain should remain:
```typescript
export const handler = compose(
  withCORS(['GET', 'POST', 'PUT', 'OPTIONS']),
  withRateLimit(RATE_LIMITS.api, 'inquiries')
)(async (event: NetlifyEvent) => {
```

This allows us to check auth conditionally inside the handler based on HTTP method.
  </action>
  <verify>
Run `npm run build` to ensure TypeScript compilation passes.
Verify requireAuthFromCookie is imported from _shared/auth.
Verify compose() chain does NOT include withAuth().
  </verify>
  <done>
inquiries.ts imports requireAuthFromCookie for manual auth checks, compose chain unchanged (no withAuth middleware).
  </done>
</task>

<task type="auto">
  <name>Task 2: Add conditional auth for GET and PUT methods only</name>
  <files>netlify/functions/inquiries.ts</files>
  <action>
Add authentication check inside the handler that only applies to GET and PUT methods. POST remains unauthenticated for public contact form.

At the start of the handler function (after `await client.connect();`), add:

```typescript
// Conditional authentication: GET and PUT require auth, POST is public
let auth: CookieAuthResult | null = null;
if (event.httpMethod === 'GET' || event.httpMethod === 'PUT') {
  auth = await requireAuthFromCookie(event);

  if (!auth.authorized) {
    return {
      statusCode: auth.statusCode || 401,
      headers,
      body: JSON.stringify({
        error: auth.error || 'Authentication required'
      }),
    };
  }
}
// POST requests proceed without auth (public contact form)
```

Then update the GET handler section to implement role-based access:

1. For listing all inquiries (no clientUserId filter):
   - Require admin role (super_admin or project_manager)
   - Reject clients trying to list all inquiries

2. For filtering by clientUserId:
   - Allow if user is admin (can see any client's inquiries)
   - Allow if user is client AND clientUserId matches their own userId
   - Reject if client tries to fetch another user's inquiries

Inside the GET block (after checking for specific inquiry ID lookup):
```typescript
if (event.httpMethod === 'GET') {
  const { clientUserId } = event.queryStringParameters || {};

  // auth is guaranteed to be non-null and authorized for GET
  const userRole = auth!.user?.role;
  const userId = auth!.user?.userId;
  const isAdmin = userRole === 'super_admin' || userRole === 'project_manager';

  // If not looking up by specific ID, apply listing restrictions
  if (!potentialId || potentialId === 'inquiries' || potentialId === 'api') {
    // Listing all inquiries requires admin role
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

  // For individual inquiry lookups, add ownership check after fetching
  // (existing code fetches by ID - add check before returning)
}
```

For individual inquiry lookup by ID, after fetching the inquiry but before returning:
```typescript
// After fetching individual inquiry by ID:
const inquiry = result.rows[0];

// Ownership check for individual lookup
if (!isAdmin && inquiry.client_user_id && inquiry.client_user_id !== userId) {
  return {
    statusCode: 403,
    headers,
    body: JSON.stringify({ error: 'Cannot access this inquiry' }),
  };
}
```

The PUT handler already exists - auth is already checked at handler entry, so it will return 401 for unauthenticated PUT requests.
  </action>
  <verify>
Run `npm run build` to ensure no TypeScript errors.
Review the logic flow to confirm:
- GET requires auth and enforces role-based access
- PUT requires auth
- POST proceeds without auth check (public form)
  </verify>
  <done>
GET/PUT require authentication with role-based access control, POST remains unauthenticated for public contact form.
  </done>
</task>

</tasks>

<verification>
1. Build passes: `npm run build` succeeds
2. Import check: requireAuthFromCookie imported from _shared/auth
3. No withAuth middleware: compose() chain does NOT include withAuth()
4. Conditional auth: Auth check inside handler applies only to GET/PUT
5. Role check: Listing all inquiries requires admin role
6. Client filter: Clients can only fetch their own inquiries
7. POST public: No auth check for POST method
</verification>

<success_criteria>
- Unauthenticated GET /inquiries returns 401 Unauthorized
- Unauthenticated PUT /inquiries returns 401 Unauthorized
- POST /inquiries (public form) works without authentication (200/201)
- Client GET /inquiries (no filter) returns 403 Forbidden
- Client GET /inquiries?clientUserId=their-own-id returns their inquiries
- Client GET /inquiries?clientUserId=other-user-id returns 403 Forbidden
- Admin GET /inquiries returns all inquiries
- npm run build succeeds
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-08-security-hardening/PROD-08-01-SUMMARY.md`
</output>
