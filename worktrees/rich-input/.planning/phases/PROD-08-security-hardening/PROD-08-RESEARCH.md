# Phase PROD-08: Security Hardening - Research

**Researched:** 2026-01-28
**Domain:** API Security, Cookie-Based Authentication, REST Authorization
**Confidence:** HIGH

## Summary

This phase addresses two specific security gaps identified in the v1 production milestone audit: an unprotected inquiries GET endpoint (medium severity) and missing credentials in frontend fetch calls (low severity). Both issues have straightforward solutions within the existing authentication architecture.

The codebase already has a mature authentication system with cookie-based JWT, a composable middleware pattern (withAuth, withCORS, withRateLimit), and credentials: 'include' used consistently across 60+ fetch calls. The fixes require minimal changes: adding withAuth() middleware to one endpoint and adding credentials: 'include' to two fetch calls.

**Primary recommendation:** Apply existing patterns. This is not architectural work but gap closure - use the withAuth() middleware already used on 19 other protected endpoints, and apply the credentials: 'include' pattern already used throughout the codebase.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Netlify Functions | N/A | Serverless API layer | Platform foundation, no alternative |
| pg (node-postgres) | 8.x | PostgreSQL client | Already in use for all DB operations |
| Existing middleware | N/A | withAuth(), withCORS(), withRateLimit() | Already implemented, battle-tested on 19+ endpoints |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cookie-parser | N/A | Extract JWT from cookies | Already abstracted in _shared/jwt.ts |
| crypto | Node built-in | JWT verification | Already in use in _shared/auth.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| withAuth() middleware | Manual auth checks | More code, inconsistent pattern, error-prone |
| credentials: 'include' | Manual cookie headers | Browser won't send httpOnly cookies, breaks auth |

**Installation:**
No new packages needed. All authentication infrastructure exists.

## Architecture Patterns

### Recommended Project Structure
```
netlify/functions/
├── inquiries.ts              # Add withAuth() here (line 63)
├── _shared/
│   ├── middleware.ts         # withAuth(), withCORS(), compose()
│   ├── auth.ts              # requireAuthFromCookie()
│   └── jwt.ts               # extractTokenFromCookie(), verifyJWT()
lib/
├── inquiries.ts             # Add credentials: 'include' (lines 58, 304)
```

### Pattern 1: Protected Endpoint with Composable Middleware
**What:** Chain withAuth() middleware to require authentication for an endpoint
**When to use:** Any endpoint that should only be accessible by authenticated users
**Example:**
```typescript
// Source: netlify/functions/inquiry-detail.ts (lines 20-24)
export const handler = compose(
  withCORS(['GET', 'PUT', 'OPTIONS']),
  withAuth(),
  withRateLimit(RATE_LIMITS.api, 'inquiry_detail')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  // auth.user.userId, auth.user.role available here
  // Handler code...
});
```

### Pattern 2: Cookie-Based Authentication Flow
**What:** Extract JWT from httpOnly cookie, verify, return user info
**When to use:** Every protected endpoint using withAuth()
**Example:**
```typescript
// Source: netlify/functions/_shared/auth.ts (lines 378-409)
export async function requireAuthFromCookie(event: NetlifyEvent): Promise<CookieAuthResult> {
    const cookieHeader = event.headers.cookie || event.headers.Cookie;
    const token = extractTokenFromCookie(cookieHeader);

    if (!token) {
        return {
            authorized: false,
            error: 'No authentication token provided',
            statusCode: 401,
        };
    }

    const result = verifyJWTFromLib(token);

    if (!result.valid) {
        return {
            authorized: false,
            error: result.error || 'Invalid authentication token',
            statusCode: 401,
        };
    }

    return {
        authorized: true,
        user: {
            userId: result.payload!.userId,
            email: result.payload!.email,
            role: result.payload!.role,
            fullName: result.payload!.fullName,
        },
    };
}
```

### Pattern 3: Credentials Include for Cookie-Based Auth
**What:** Add credentials: 'include' to fetch calls to send httpOnly cookies
**When to use:** Every authenticated fetch call from frontend
**Example:**
```typescript
// Source: lib/inquiries.ts (lines 156-161) - ALREADY CORRECT
const response = await fetch(`${API_BASE_URL}/inquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inquiry),
    credentials: 'include',  // Sends httpOnly auth cookie
});
```

### Pattern 4: Right-to-Left Middleware Composition
**What:** Middleware executes right-to-left, outermost first
**When to use:** When ordering matters (e.g., CORS before auth, auth before rate limit)
**Example:**
```typescript
// Source: netlify/functions/_shared/middleware.ts (lines 186-192)
export function compose(...middlewares: Middleware[]): (handler: Handler) => Handler {
    return (handler: Handler) => {
        return middlewares.reduceRight(
            (composedHandler, middleware) => middleware(composedHandler),
            handler
        );
    };
}

// Execution order for compose(withCORS, withAuth, withRateLimit):
// 1. withCORS (validates origin, handles preflight)
// 2. withAuth (validates JWT from cookie)
// 3. withRateLimit (checks rate limits)
// 4. Handler (business logic)
```

### Anti-Patterns to Avoid
- **Missing withAuth():** Do not protect endpoints by checking auth manually inside the handler. Use the middleware pattern for consistency and correctness.
- **Forgetting credentials:** Do not make authenticated fetch calls without credentials: 'include'. The browser will not send httpOnly cookies, and the request will fail with 401.
- **Wrong middleware order:** Do not put withAuth() before withCORS(). CORS must be first to handle preflight requests correctly.
- **Manual cookie parsing:** Do not parse cookies manually. Use extractTokenFromCookie() from _shared/jwt.ts.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT verification | Custom crypto logic | verifyJWT() in _shared/auth.ts | Already handles expiration, signature, edge cases |
| Cookie extraction | String parsing | extractTokenFromCookie() in _shared/jwt.ts | Handles multiple cookies, encoding, edge cases |
| Auth middleware | Manual checks | withAuth() in _shared/middleware.ts | Consistent error responses, already tested on 19 endpoints |
| CORS handling | Custom headers | withCORS() in _shared/middleware.ts | Handles preflight, origin validation, method checks |
| Unauthorized response | Custom JSON | createUnauthorizedResponse() | Consistent error format across all endpoints |

**Key insight:** The authentication system is mature and battle-tested. Every helper function, middleware, and pattern needed for this phase already exists. Hand-rolling any part of the auth flow introduces bugs and inconsistency.

## Common Pitfalls

### Pitfall 1: Broken Object-Level Authorization (BOLA)
**What goes wrong:** Adding withAuth() checks "are you logged in?" but not "should you see THIS inquiry?" - an authenticated user can fetch inquiries they don't own by changing the ID in the URL.

**Why it happens:** BOLA (Broken Object-Level Authorization) is the #1 API security risk in OWASP API Security Top 10 2023. Developers assume authentication = authorization.

**How to avoid:** For the inquiries GET endpoint, there are three approaches:
1. **Admin-only access:** Use withProjectManager() or withSuperAdmin() instead of withAuth() if only admins should list all inquiries
2. **Filtered by user:** If clients can see their own inquiries, add WHERE client_user_id = $1 to the query using auth.user.userId
3. **Query parameter filtering:** The endpoint already supports ?clientUserId= parameter - ensure it's enforced based on the authenticated user's role

**Warning signs:**
- 401 errors turn into 200 responses after adding auth, but users can access data they shouldn't
- No role checks or ownership validation in the handler code
- Database queries that return all rows without filtering by user/role

### Pitfall 2: Missing credentials on Authenticated Calls
**What goes wrong:** Adding auth to the endpoint but forgetting credentials: 'include' in the frontend fetch call. The browser doesn't send the httpOnly cookie, auth fails with 401.

**Why it happens:** Fetch API defaults to credentials: 'same-origin', not 'include'. HttpOnly cookies require explicit credentials: 'include' to be sent.

**How to avoid:**
- Always add credentials: 'include' to fetch calls that hit protected endpoints
- Check Network tab in DevTools - if Cookie header is missing, credentials wasn't set
- Pattern already exists in 60+ places in the codebase - copy from lib/inquiries.ts line 160

**Warning signs:**
- 401 errors in the console for authenticated pages
- Cookie header missing in Network tab request headers
- Works in Postman (manual Cookie header) but fails in browser

### Pitfall 3: CORS Middleware Order
**What goes wrong:** Putting withAuth() before withCORS() causes preflight OPTIONS requests to fail with 401, breaking CORS for authenticated endpoints.

**Why it happens:** Preflight OPTIONS requests don't include credentials/cookies. If auth runs before CORS, the OPTIONS request fails authentication.

**How to avoid:**
- Always put withCORS() first in the compose() chain
- Pattern: compose(withCORS([methods]), withAuth(), withRateLimit(), ...)
- All 19 existing protected endpoints follow this pattern

**Warning signs:**
- CORS errors in browser console for protected endpoints
- OPTIONS requests return 401 instead of 200
- GET/POST works in Postman but fails in browser with CORS error

### Pitfall 4: Inconsistent Endpoint Protection
**What goes wrong:** Protecting the inquiries list endpoint but forgetting related endpoints (inquiry-detail, update, delete) creates security holes.

**Why it happens:** Each endpoint is a separate file. Easy to miss related endpoints when adding auth.

**How to avoid:**
- Audit all related endpoints together (inquiries.ts handles GET with inline ID extraction, inquiry-detail.ts handles GET/PUT with explicit ID)
- In this codebase, inquiry-detail.ts is ALREADY PROTECTED with withAuth() (line 22) - no action needed there
- Check the audit document for related issues (e.g., if inquiries GET is unprotected, are proposals GET, projects GET also unprotected?)

**Warning signs:**
- One endpoint protected, related endpoints unprotected
- Can't list inquiries, but can fetch specific inquiry by guessing ID
- Different endpoints return different error formats for auth failures

## Code Examples

Verified patterns from official sources:

### Adding withAuth() to Inquiries Endpoint
```typescript
// Source: Compare inquiries.ts (current) vs inquiry-detail.ts (correct pattern)
// File: netlify/functions/inquiries.ts

// BEFORE (line 63):
export const handler = compose(
  withCORS(['GET', 'POST', 'PUT', 'OPTIONS']),
  withRateLimit(RATE_LIMITS.api, 'inquiries')
)(async (event: NetlifyEvent) => {

// AFTER:
export const handler = compose(
  withCORS(['GET', 'POST', 'PUT', 'OPTIONS']),
  withAuth(),  // Add this line
  withRateLimit(RATE_LIMITS.api, 'inquiries')
)(async (event: NetlifyEvent, auth?: AuthResult) => {  // Add auth parameter
  // Now auth.user.userId, auth.user.role available
  // Can filter queries by user/role
```

### Adding credentials to Frontend Fetch Calls
```typescript
// Source: lib/inquiries.ts
// File: lib/inquiries.ts

// Line 58 - getInquiries() - MISSING credentials
// BEFORE:
const response = await fetch(`${API_BASE_URL}/inquiries`);

// AFTER:
const response = await fetch(`${API_BASE_URL}/inquiries`, {
    credentials: 'include',
});

// Line 304 - getInquiriesByClientUserId() - MISSING credentials
// BEFORE:
const response = await fetch(`${API_BASE_URL}/inquiries?clientUserId=${encodeURIComponent(clientUserId)}`);

// AFTER:
const response = await fetch(`${API_BASE_URL}/inquiries?clientUserId=${encodeURIComponent(clientUserId)}`, {
    credentials: 'include',
});
```

### Optional: Role-Based Authorization
```typescript
// Source: netlify/functions/_shared/middleware.ts (lines 87-98)
// If inquiries should only be accessible by admins/project managers:

export const handler = compose(
  withCORS(['GET', 'POST', 'PUT', 'OPTIONS']),
  withProjectManager(),  // Instead of withAuth() - requires 'project_manager' or 'super_admin' role
  withRateLimit(RATE_LIMITS.api, 'inquiries')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  // Only admins/PMs reach here
  // Can return all inquiries without filtering
});
```

### Optional: User-Specific Filtering
```typescript
// Source: Pattern from netlify/functions/inquiries.ts (lines 111-119)
// If clients should see their own inquiries, admins see all:

if (event.httpMethod === 'GET') {
    const userRole = auth?.user?.role;
    const userId = auth?.user?.userId;

    let query = 'SELECT * FROM inquiries ORDER BY created_at DESC';
    const params: any[] = [];

    // If client role, filter by their user ID
    if (userRole === 'client') {
        query = `
            SELECT i.* FROM inquiries i
            LEFT JOIN proposals p ON i.id = p.inquiry_id
            WHERE i.client_user_id = $1 OR (p.client_user_id = $1 AND i.client_user_id IS NULL)
            ORDER BY i.created_at DESC
        `;
        params.push(userId);
    }
    // If admin/PM, return all inquiries (no filter)

    const result = await client.query(query, params);
    // ...
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bearer token in headers | Cookie-based JWT (httpOnly) | PROD-01 (Phase 1) | More secure (XSS-resistant), requires credentials: 'include' |
| Manual auth checks | Composable middleware (withAuth) | PROD-01 | Consistent, testable, less error-prone |
| Individual CORS headers | withCORS() middleware | PROD-01 | Handles preflight, origin validation automatically |
| credentials: 'same-origin' | credentials: 'include' | Ongoing | Required for cookie-based auth, already used in 60+ places |

**Deprecated/outdated:**
- Bearer token in Authorization header: Still supported for backward compatibility (auth.ts has extractToken() for Bearer tokens), but cookie-based JWT is preferred
- Manual cookie parsing: Use extractTokenFromCookie() from _shared/jwt.ts instead

## Open Questions

Things that couldn't be fully resolved:

1. **Authorization level for inquiries GET endpoint**
   - What we know: Audit says "returns all inquiries without auth" (medium severity)
   - What's unclear: Should admins see all inquiries, or should everyone see only their own?
   - Recommendation: Start with withAuth() + role-based filtering (clients see their own, admins see all). This is the safest default. Can be adjusted based on user feedback.

2. **Impact of adding auth on public inquiry creation**
   - What we know: POST /inquiries has two code paths - public form (no auth required) vs admin-created inquiry (auth required), detected by payload shape (lines 134, 167)
   - What's unclear: Will adding withAuth() break the public contact form?
   - Recommendation: If POST must remain public, split into two endpoints: POST /inquiries (public, no auth) and POST /admin/inquiries (authenticated). OR use conditional auth (check for cookie, proceed without if missing for POST only). Existing code suggests POST should remain partially public.

3. **Credentials on updateInquiry calls**
   - What we know: Audit lists lines 58 and 304 as missing credentials
   - What's unclear: updateInquiry() at line 200 also lacks credentials: 'include'
   - Recommendation: Add credentials: 'include' to all fetch calls in lib/inquiries.ts that hit authenticated endpoints (getInquiries, updateInquiry, getInquiriesByClientUserId). Better to over-include than miss one.

## Sources

### Primary (HIGH confidence)
- Codebase inspection:
  - netlify/functions/inquiries.ts - Endpoint to be protected
  - netlify/functions/inquiry-detail.ts - Reference implementation with withAuth()
  - netlify/functions/_shared/middleware.ts - Composable middleware pattern
  - netlify/functions/_shared/auth.ts - Cookie-based JWT authentication
  - lib/inquiries.ts - Frontend fetch calls missing credentials
  - 19 other protected endpoints using withAuth() (proposals.ts, projects.ts, tasks.ts, etc.)

### Secondary (MEDIUM confidence)
- [MDN: Request credentials property](https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials) - Official documentation on credentials: 'include'
- [MDN: Using the Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) - Fetch API behavior with cookies
- [Netlify Security Checklist](https://docs.netlify.com/resources/checklists/security-checklist/) - Environment variables, secrets management
- [Wisp CMS: Securing JWT with httpOnly Cookies](https://www.wisp.blog/blog/ultimate-guide-to-securing-jwt-authentication-with-httponly-cookies) - httpOnly, secure, sameSite attributes
- [Medium: JWT vs Cookies in 2026](https://medium.com/@msbytedev/jwt-vs-cookies-in-2026-1008f7c24334) - Modern practice: JWT stored in httpOnly cookies

### Tertiary (LOW confidence)
- [OWASP API Security Top 10 2023: API1 - BOLA](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/) - Broken Object-Level Authorization guidance
- [Levo.ai: REST API Security Best Practices 2026](https://www.levo.ai/resources/blogs/rest-api-security-best-practices) - General REST API security
- [Stack Overflow: REST API Authentication Best Practices](https://stackoverflow.blog/2021/10/06/best-practices-for-authentication-and-authorization-for-rest-apis/) - Authentication vs authorization distinction

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All infrastructure exists, no new dependencies
- Architecture: HIGH - 19 examples of withAuth() pattern, 60+ examples of credentials: 'include'
- Pitfalls: MEDIUM - BOLA is well-documented risk, but authorization level decision depends on product requirements

**Research date:** 2026-01-28
**Valid until:** 2026-04-28 (90 days - stable domain, mature patterns, unlikely to change)
