# Phase 5: Credential Wiring Fix - Research

**Researched:** 2026-01-25
**Domain:** Cookie-based authentication with Fetch API
**Confidence:** HIGH

## Summary

Phase 5 addresses 2 integration gaps exposed by PROD-01 security hardening: missing `credentials: 'include'` on fetch calls in client portal comment editing and admin portal notifications. Post-PROD-01, all API endpoints require httpOnly cookie-based authentication, but 4 fetch calls across 2 files were not updated to include credentials.

This is a surgical fix: add one line (`credentials: 'include'`) to 4 fetch call sites. The pattern is well-established throughout the codebase with 28+ files already using it correctly.

**Primary recommendation:** Add `credentials: 'include'` to all 4 fetch calls. No refactoring needed - the pattern matches existing usage in api-transformers.ts, api-config.ts, and 26 other files.

## Standard Stack

### Core Browser API
| API | Version | Purpose | Why Standard |
|-----|---------|---------|--------------|
| Fetch API | Native | HTTP requests with credential control | Built into all modern browsers, no library needed |

### Cookie Attributes (Already Configured)
| Attribute | Value | Purpose | Status |
|-----------|-------|---------|--------|
| HttpOnly | true | XSS protection (JavaScript cannot access) | ✅ Already set in auth-verify-magic-link.ts |
| Secure | true | HTTPS-only transmission | ✅ Already set |
| SameSite | Strict | CSRF protection | ✅ Already set |
| Path | / | Cookie available across all routes | ✅ Already set |
| Max-Age | 604800 (7d) or 86400 (24h) | Session duration | ✅ Already set |

### CORS Configuration (Already Configured)
| Header | Value | Purpose | Status |
|--------|-------|---------|--------|
| Access-Control-Allow-Credentials | true | Enable cookie transmission | ✅ Already in cors.ts |
| Access-Control-Allow-Origin | Specific origin (never *) | Required with credentials:true | ✅ Already in cors.ts |
| Access-Control-Allow-Methods | GET, POST, PUT, PATCH, DELETE, OPTIONS | Allow all needed methods | ✅ Already in cors.ts |

**No installation needed** - using native browser Fetch API.

## Architecture Patterns

### Established Pattern: credentials: 'include'

**Location:** 28 files already implement this correctly

**Reference implementations:**
- `lib/api-config.ts` line 73: Centralized API client wrapper
- `landing-page-new/src/lib/portal/utils/api-transformers.ts` lines 136, 164, 193, 219: All HTTP method helpers
- `landing-page-new/src/lib/portal/api/auth.api.ts` lines 30, 106, 184, 220: All auth endpoints
- `shared/utils/api.client.ts` line 41: Generic API request wrapper

### Pattern 1: Direct Fetch with Credentials

**What:** Add `credentials: 'include'` to fetch options
**When to use:** All fetch calls to Netlify Functions after PROD-01
**Example:**

```typescript
// Source: landing-page-new/src/components/CommentThread.tsx line 51
const response = await fetch(url, {
    credentials: 'include',
});
```

### Pattern 2: Fetch with Request Body

**What:** Add `credentials: 'include'` alongside headers and body
**When to use:** POST, PUT, PATCH, DELETE requests
**Example:**

```typescript
// Source: landing-page-new/src/lib/portal/utils/api-transformers.ts line 159
return apiCall<T>(
    () => fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
    }),
    // ...
);
```

### Pattern 3: Centralized API Helper (Preferred for New Code)

**What:** Use api-transformers.ts helpers that include credentials automatically
**When to use:** New API calls in client portal (not applicable to this phase)
**Example:**

```typescript
// Source: landing-page-new/src/lib/portal/utils/api-transformers.ts
import { apiGet, apiPost, apiPatch } from '@/lib/portal/utils/api-transformers';

// Credentials automatically included
const result = await apiPatch<ResponseType>(url, body, {
    defaultError: 'Operation failed',
});
```

### Anti-Patterns to Avoid

**❌ Don't:** Assume credentials are sent by default
```typescript
// WRONG - cookies NOT sent
const response = await fetch(url);
```

**✅ Do:** Always explicitly include credentials
```typescript
// CORRECT - cookies sent
const response = await fetch(url, { credentials: 'include' });
```

**❌ Don't:** Use `credentials: 'same-origin'` (the default)
- Admin portal domain: `motionify.studio`
- Client portal domain: `portal.motionify.studio`
- API domain: `motionify.studio/.netlify/functions`
- Subdomains are considered cross-origin unless cookie domain set to `.motionify.studio`

**✅ Do:** Always use `credentials: 'include'` for cookie-based auth

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie parsing | Custom cookie string parser | Browser handles automatically with credentials: 'include' | HttpOnly cookies are invisible to JavaScript; browser sends them |
| CORS configuration | Custom preflight handling | Existing cors.ts getCorsHeaders() | Already configured with Access-Control-Allow-Credentials: true |
| API client wrapper | New fetch abstraction | Existing api-transformers.ts helpers | Already includes credentials, error handling, type safety |
| Session management | Manual token refresh | JWT expiration in cookies | Server-side expiration already enforced |

**Key insight:** Cookie-based auth is simpler than token-based auth once configured. The browser handles cookie storage, transmission, and security. The only requirement is `credentials: 'include'`.

## Common Pitfalls

### Pitfall 1: Default credentials Behavior is Unsafe

**What goes wrong:** Fetch defaults to `credentials: 'same-origin'`, which doesn't send cookies to subdomains
**Why it happens:** Developers assume cookies are sent automatically like in older XMLHttpRequest
**How to avoid:** Always explicitly set `credentials: 'include'` on every fetch call to Netlify Functions
**Warning signs:** 401 Unauthorized errors in browser console despite being logged in

### Pitfall 2: Missing credentials After Refactoring

**What goes wrong:** Refactoring fetch calls loses credentials option
**Why it happens:** Copy-pasting basic fetch examples without credentials
**How to avoid:** Use api-transformers.ts helpers that include credentials by default
**Warning signs:** Code works in development (same-origin) but breaks in production (cross-origin)

### Pitfall 3: credentials with CORS Wildcard

**What goes wrong:** Server sets `Access-Control-Allow-Origin: *` with credentials
**Why it happens:** Misunderstanding CORS requirements
**How to avoid:** CORS config must specify exact origin when credentials: true (already correct in cors.ts)
**Warning signs:** Browser console error: "Credential is not supported if the CORS header 'Access-Control-Allow-Origin' is '*'"

### Pitfall 4: Forgetting credentials on Error Paths

**What goes wrong:** Success path has credentials, retry/fallback paths don't
**Why it happens:** Incremental bug fixes without checking all code paths
**How to avoid:** Search codebase for all fetch calls to same endpoint
**Warning signs:** Feature works initially but fails on retry

### Pitfall 5: SameSite Cookie Confusion

**What goes wrong:** Believing `SameSite=Strict` blocks subdomain requests
**Why it happens:** Misunderstanding "same-site" vs "same-origin"
**How to avoid:** Understand same-site includes subdomains (motionify.studio and portal.motionify.studio are same-site)
**Warning signs:** None - SameSite=Strict is correct and already configured

## Code Examples

Verified patterns from official sources:

### Example 1: GET with Credentials

```typescript
// Source: landing-page-new/src/components/CommentThread.tsx lines 51-53
const response = await fetch(url, {
    credentials: 'include',
});
```

**Use case:** Fetching data from authenticated endpoints (comments, notifications)

### Example 2: POST with Credentials

```typescript
// Source: landing-page-new/src/components/CommentThread.tsx lines 66-74
const response = await fetch(`${API_BASE}/comments`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
});
```

**Use case:** Creating resources (comments, projects)

### Example 3: PUT with Credentials (The Fix)

```typescript
// FIX for landing-page-new/src/components/CommentThread.tsx lines 262-268
const handleEdit = async (id: string, newContent: string) => {
    const response = await fetch(`${API_BASE}/comments`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include', // <-- ADD THIS LINE
        body: JSON.stringify({ id, content: newContent }),
    });
    if (response.ok) {
        const result = await response.json();
        setComments(prev => prev.map(c => c.id === id ? result.comment : c));
    }
};
```

### Example 4: PATCH with Credentials (The Fix)

```typescript
// FIX for contexts/NotificationContext.tsx lines 114-118
await fetch(`${API_BASE}/notifications`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // <-- ADD THIS LINE
    body: JSON.stringify({ userId: user.id, notificationId: id }),
});
```

### Example 5: GET with Query Params and Credentials (The Fix)

```typescript
// FIX for contexts/NotificationContext.tsx line 87
const response = await fetch(`${API_BASE}/notifications?userId=${user.id}`, {
    credentials: 'include', // <-- ADD THIS LINE
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage JWT tokens | httpOnly cookie JWT | PROD-01 (2026-01-24) | All fetch calls must include credentials |
| Authorization: Bearer header | Cookie-based auth | PROD-01 (2026-01-24) | No manual Authorization header needed |
| credentials: 'same-origin' (default) | credentials: 'include' | PROD-01 (2026-01-24) | Explicit opt-in for cross-origin cookies |
| Individual CORS headers per endpoint | Centralized cors.ts | PROD-01 (2026-01-24) | Consistent CORS config across 73 endpoints |

**Deprecated/outdated:**
- **localStorage token storage:** Removed in PROD-01 (XSS vulnerability)
- **Manual Authorization headers:** No longer needed; cookies sent automatically
- **credentials: 'omit':** Never use - prevents authentication

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge | Status |
|---------|--------|---------|--------|------|--------|
| fetch credentials: 'include' | 42+ | 39+ | 10.1+ | 14+ | ✅ Universal support |
| HttpOnly cookies | All | All | All | All | ✅ Universal support |
| SameSite=Strict | 51+ | 60+ | 12+ | 16+ | ✅ Universal support |
| CORS with credentials | All | All | All | All | ✅ Universal support |

**Verdict:** No polyfills needed. All features supported in all modern browsers.

## Security Considerations

### Already Hardened (PROD-01)

✅ **XSS Protection:** HttpOnly prevents JavaScript access to tokens
✅ **CSRF Protection:** SameSite=Strict prevents cross-site requests
✅ **MITM Protection:** Secure flag requires HTTPS
✅ **Token Expiration:** JWT exp claim enforced server-side
✅ **CORS Lockdown:** Specific origins only, no wildcard

### This Phase

✅ **No new security risks:** Only adding credentials to existing secure endpoints
✅ **No credential exposure:** Cookies never exposed to JavaScript
✅ **No CORS changes needed:** Access-Control-Allow-Credentials already true

## Open Questions

**None.** All aspects of cookie-based authentication with Fetch API are well-documented and already implemented in the codebase.

## Sources

### Primary (HIGH confidence)

**MDN Web Docs (Official W3C Documentation):**
- [Fetch API credentials property](https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials) - Official specification for credentials option
- [Using HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies) - HttpOnly, Secure, SameSite attributes
- [CORS Credentials](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) - Access-Control-Allow-Credentials requirements
- [Set-Cookie Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie) - Cookie attribute specifications

**Codebase (Verified Implementations):**
- `lib/api-config.ts` line 73 - Centralized API client with credentials
- `landing-page-new/src/lib/portal/utils/api-transformers.ts` - All HTTP helpers include credentials
- `netlify/functions/_shared/cors.ts` - CORS configuration with Access-Control-Allow-Credentials
- `netlify/functions/_shared/jwt.ts` - JWT cookie generation and verification
- `.planning/phases/PROD-01-authentication-security/RESEARCH.md` - Cookie-based auth migration strategy

### Secondary (MEDIUM confidence)

**Web Security Articles (2025-2026):**
- [Handling cookies with Fetch's credentials](https://zellwk.com/blog/fetch-credentials/) - Practical guide to credentials option
- [Cross-Origin Cookie Authentication with CORS Credentials](https://codesignal.com/learn/courses/enabling-customizing-cors-in-your-typescript-rest-api/lessons/cross-origin-cookie-authentication-with-cors-credentials) - CORS with credentials patterns
- [How to Pass Cookies with Fetch or Axios Requests](https://sabe.io/blog/javascript-pass-cookies-fetch-axios) - Credentials include usage

### Tertiary (Project-Specific)

- `.planning/v1-MILESTONE-AUDIT.md` - Gap identification from audit
- `landing-page-new/src/components/CommentThread.tsx` lines 261-273 - Client portal edit handler (missing credentials)
- `contexts/NotificationContext.tsx` lines 87, 114, 133 - Admin portal notification calls (missing credentials)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Native browser API, no library dependencies
- Architecture: HIGH - Pattern used in 28+ files across codebase
- Pitfalls: HIGH - Common issues documented in MDN and observed in audit

**Research date:** 2026-01-25
**Valid until:** 2027-01-25 (stable web standard, unlikely to change)

---

**Research complete - ready for plan creation**
