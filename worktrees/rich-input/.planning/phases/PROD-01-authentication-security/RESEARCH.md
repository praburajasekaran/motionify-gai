# Phase 1 Research: Authentication & Security

**Phase Goal:** Replace mock authentication with production-ready auth system and fix critical security vulnerabilities

**Created:** 2026-01-24
**Status:** Complete

---

## Current State Analysis

### ✅ Already Implemented (Good Foundation)

1. **Magic Link Authentication Backend**
   - `netlify/functions/auth-request-magic-link.ts`: Crypto token generation, database storage, email sending
   - `netlify/functions/auth-verify-magic-link.ts`: Token verification, session creation
   - Rate limiting: 5 requests per hour per email
   - Security: Email enumeration prevention (TC-AUTH-002)
   - 15-minute token expiration

2. **Database Infrastructure**
   - Connection pooling via `pg.Pool` in `_shared/db.ts`
   - Pool configuration: max 10 connections, 30s idle timeout, 10s connection timeout
   - Environment-based SSL configuration
   - Transaction support with automatic commit/rollback

3. **Rate Limiting Infrastructure**
   - Database-backed rate limiting in `_shared/rateLimit.ts`
   - Configurable windows and limits
   - Per-IP and per-user tracking
   - Predefined limits: magic link (5/hour), login (10/hour), API (100/minute), strict API (10/minute)

4. **Input Validation with Zod**
   - Comprehensive schemas in `_shared/validation.ts`
   - Email, UUID, password, name, phone, URL, date schemas
   - User role validation, pagination schemas
   - Transform functions for normalization (lowercase, trim)

### ❌ Critical Security Gaps

1. **Mock Authentication in Frontend**
   - `lib/auth.ts` lines 270-322: MOCK_USERS dictionary and setMockUser() function
   - `contexts/AuthContext.tsx` line 16: Imports setMockUser
   - Development-only code still active in production builds
   - **Risk:** Anyone can set themselves as Super Admin in production

2. **Insecure Session Storage**
   - `lib/auth.ts` lines 73-145: localStorage for token/user storage
   - `contexts/AuthContext.tsx` lines 48-49: Reads from localStorage
   - **Risk:** Tokens vulnerable to XSS attacks, no httpOnly protection
   - **Risk:** Session persists across browser restarts (security vs UX tradeoff)

3. **Missing Role Verification Middleware**
   - No centralized middleware to verify Super Admin role on admin endpoints
   - Each endpoint would need to manually check user role
   - **Risk:** Unauthorized access to admin functions if validation forgotten

4. **Incomplete Rate Limiting Coverage**
   - Rate limiting infrastructure exists but only used in `auth-request-magic-link.ts`
   - 60+ API endpoints have no rate limiting
   - **Risk:** DoS attacks, brute force, API abuse

5. **Incomplete Input Validation Coverage**
   - Validation schemas exist but only used in auth endpoints
   - Most API endpoints lack input validation
   - **Risk:** SQL injection, XSS, data corruption

6. **SSL Configuration Weakness**
   - `_shared/db.ts` line 25: DISABLE_SSL_VALIDATION env var allows bypassing certificate validation in production
   - **Risk:** Man-in-the-middle attacks on database connections

---

## Implementation Research

### 1. httpOnly Cookie vs localStorage

**Current:** JWT stored in localStorage (insecure)
**Target:** httpOnly cookies (XSS-proof)

**Challenges with Netlify Functions:**
- Netlify Functions are stateless serverless functions
- Cannot set httpOnly cookies directly from client-side fetch
- Need to set cookies in Netlify Function response headers

**Solution Pattern:**
```typescript
// In auth-verify-magic-link.ts response:
headers: {
  'Set-Cookie': `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`,
  ...corsHeaders
}

// In API functions, read cookie:
const token = event.headers.cookie?.match(/auth_token=([^;]+)/)?.[1];
```

**Tradeoffs:**
- ✅ Secure: XSS attacks cannot steal token
- ✅ Auto-sent: Browser includes cookie on every request
- ❌ CORS complexity: Need credentials: 'include' on all fetch calls
- ❌ No cross-domain: Cookie won't work across different domains (admin portal at different domain than client portal)

**Verdict:** Use httpOnly cookies for production. Require both portals on same domain or subdomains.

### 2. Role-Based Access Control Middleware

**Pattern:** Create reusable middleware functions

```typescript
// _shared/auth.ts
export async function requireAuth(event): Promise<AuthResult> {
  const token = extractToken(event);
  if (!token) return { authorized: false, error: 'No token' };

  const decoded = verifyJWT(token);
  if (!decoded) return { authorized: false, error: 'Invalid token' };

  const user = await getUserById(decoded.userId);
  return { authorized: true, user };
}

export async function requireSuperAdmin(event): Promise<AuthResult> {
  const auth = await requireAuth(event);
  if (!auth.authorized) return auth;

  if (auth.user.role !== 'super_admin') {
    return { authorized: false, error: 'Forbidden' };
  }

  return auth;
}

// Usage in endpoint:
const auth = await requireSuperAdmin(event);
if (!auth.authorized) {
  return { statusCode: 403, headers, body: JSON.stringify({ error: auth.error }) };
}
// Proceed with admin operation...
```

### 3. JWT Implementation

**Current:** Magic link tokens stored in database, but no JWT for session tokens
**Need:** JWT for stateless authentication after magic link verification

**Library:** Use `jsonwebtoken` package (already in dependencies based on import patterns)

**Flow:**
1. User clicks magic link → verify token from database
2. Generate JWT with user claims (userId, role, email)
3. Sign JWT with SECRET_KEY from env
4. Set JWT in httpOnly cookie
5. All API requests verify JWT signature + expiration
6. No database lookup needed for every request (stateless)

**JWT Payload:**
```typescript
{
  userId: string;
  email: string;
  role: 'super_admin' | 'project_manager' | 'client' | 'team';
  iat: number;  // issued at
  exp: number;  // expiration (7 days for rememberMe, 24 hours default)
}
```

### 4. Rate Limiting Middleware

**Current:** `checkRateLimit()` function exists but not wrapped in middleware

**Pattern:**
```typescript
// _shared/middleware.ts
export function withRateLimit(config: RateLimitConfig) {
  return async (event, handler) => {
    const identifier = extractIdentifier(event); // IP or userId
    const result = await checkRateLimit(identifier, event.path, config);

    if (!result.allowed) {
      return createRateLimitResponse(result, headers);
    }

    return handler(event);
  };
}

// Usage:
export const handler = withRateLimit(RATE_LIMITS.api)(async (event) => {
  // endpoint logic
});
```

**Application Strategy:**
- Default: Apply `RATE_LIMITS.api` (100/minute) to all endpoints
- Sensitive: Apply `RATE_LIMITS.apiStrict` (10/minute) to create/update/delete operations
- Auth: Already applied to magic link endpoints

### 5. Input Validation Middleware

**Current:** Zod schemas defined but validation scattered

**Pattern:**
```typescript
// _shared/middleware.ts
export function withValidation(schema: z.ZodSchema) {
  return async (event, handler) => {
    const validation = validateRequest(event.body, schema, origin);
    if (!validation.success) {
      return validation.response; // 400 with error details
    }

    return handler(event, validation.data);
  };
}

// Usage:
const createProposalSchema = z.object({
  title: nameSchema,
  description: z.string().min(10).max(5000),
  clientId: uuidSchema,
});

export const handler = withValidation(createProposalSchema)(async (event, data) => {
  // data is typed and validated
});
```

### 6. SSL Enforcement

**Current:** `DISABLE_SSL_VALIDATION` escape hatch exists

**Fix:**
1. Remove `DISABLE_SSL_VALIDATION` option entirely
2. In production: Always use `ssl: true` (certificate validation enabled)
3. In development: Use `ssl: { rejectUnauthorized: false }` only if explicitly needed
4. Document: If DB provider requires disabling validation, use intermediate approach (verify hostname but accept self-signed cert)

```typescript
function getSSLConfig(): boolean | { rejectUnauthorized: boolean } {
  if (isProduction) {
    // Production: ALWAYS enforce SSL certificate validation
    return true;
  }

  // Development: Only disable SSL if DATABASE_SSL=false explicitly set
  if (process.env.DATABASE_SSL === 'false') {
    return false;
  }

  // Development default: SSL enabled but accept self-signed certs
  return { rejectUnauthorized: false };
}
```

---

## Migration Strategy

### Phase 1.1: Remove Mock Auth

**Goal:** Eliminate development-only mock authentication from production builds

**Steps:**
1. Remove `MOCK_USERS` export and `setMockUser` function from `lib/auth.ts`
2. Remove `setMockUser` import from `contexts/AuthContext.tsx`
3. Remove any dev UI components that call `setMockUser`
4. Update development workflow to use real magic link flow (check terminal for magic link URL)

**Verification:**
- Search codebase for "MOCK_USER" and "setMockUser" - should find zero results
- Build production bundle, verify no mock auth code included

### Phase 1.2: Implement JWT Sessions

**Goal:** Replace localStorage tokens with httpOnly cookie-based JWT sessions

**Steps:**
1. Add `jsonwebtoken` to dependencies
2. Create `_shared/jwt.ts` with `generateJWT()` and `verifyJWT()` functions
3. Update `auth-verify-magic-link.ts` to generate JWT and set httpOnly cookie
4. Create `_shared/auth.ts` middleware with `extractAuthToken()`, `requireAuth()`, `requireSuperAdmin()`
5. Update all API functions to use `requireAuth()` or `requireSuperAdmin()`
6. Update frontend to send `credentials: 'include'` on all fetch calls
7. Remove localStorage token storage from `lib/auth.ts` and `contexts/AuthContext.tsx`

**Verification:**
- Inspect browser cookies - should see `auth_token` httpOnly cookie
- Inspect localStorage - should NOT see `auth_token` key
- Use browser DevTools Network tab - verify cookie sent on all requests

### Phase 1.3: Apply Middleware to All Endpoints

**Goal:** Ensure all API endpoints have auth, rate limiting, and input validation

**Steps:**
1. Create `_shared/middleware.ts` with composable middleware functions
2. Define Zod schemas for all endpoint request bodies
3. Wrap each endpoint handler with appropriate middleware chain
4. Document middleware usage in `_shared/README.md`

**Verification:**
- Audit all 60+ files in `netlify/functions/` directory
- Check each function has `requireAuth` or `requireSuperAdmin`
- Check each POST/PUT/PATCH has input validation
- Check all endpoints have rate limiting

### Phase 1.4: Enforce SSL in Production

**Goal:** Remove SSL bypass option for production environments

**Steps:**
1. Update `_shared/db.ts` to remove `DISABLE_SSL_VALIDATION` support in production
2. Set `ssl: true` unconditionally when `NODE_ENV === 'production'`
3. Update deployment docs to require SSL-enabled database
4. Test with staging database

**Verification:**
- Deploy to staging
- Attempt to connect to database
- Verify SSL handshake successful
- Check logs for SSL errors

---

## Security Checklist

Before marking Phase 1 complete:

- [ ] No mock auth code in production bundle
- [ ] Sessions use httpOnly cookies (not localStorage)
- [ ] All admin endpoints verify Super Admin role
- [ ] All endpoints have rate limiting
- [ ] All POST/PUT/PATCH endpoints validate input
- [ ] Database connections use SSL with certificate validation
- [ ] JWT tokens have reasonable expiration (24h default, 7d with rememberMe)
- [ ] Logout properly clears cookie
- [ ] CORS configured correctly for cookie credentials
- [ ] No hardcoded secrets in codebase

---

## Files to Modify

### High Priority (Core Auth Flow)

1. `lib/auth.ts`
   - Remove lines 270-322 (MOCK_USERS, setMockUser)
   - Remove localStorage storage functions (keep for backward compat during migration)
   - Update to read from cookies instead

2. `contexts/AuthContext.tsx`
   - Remove setMockUser import
   - Update to read user from cookie-based JWT
   - Remove localStorage fallback

3. `landing-page-new/src/context/AuthContext.tsx`
   - Same changes as admin portal AuthContext

4. `netlify/functions/_shared/jwt.ts` (new file)
   - generateJWT(user, rememberMe)
   - verifyJWT(token)
   - JWT_SECRET from environment

5. `netlify/functions/_shared/auth.ts` (new file)
   - extractAuthToken(event) - read from cookie
   - requireAuth(event) - verify JWT, return user
   - requireSuperAdmin(event) - verify role
   - requireProjectManager(event) - verify role
   - createAuthResponse(authorized, headers) - standardized 401/403 responses

6. `netlify/functions/auth-verify-magic-link.ts`
   - Generate JWT after magic link verification
   - Set httpOnly cookie in response headers
   - Remove token from JSON response body (only set cookie)

### Medium Priority (Middleware Application)

7. `netlify/functions/_shared/middleware.ts` (new file)
   - withAuth(roleRequired?)
   - withRateLimit(config)
   - withValidation(schema)
   - compose(...middlewares) - chain multiple middlewares

8. All API endpoints in `netlify/functions/*.ts` (60+ files)
   - Apply auth middleware
   - Apply rate limiting
   - Apply input validation where needed

### Low Priority (Infrastructure Hardening)

9. `netlify/functions/_shared/db.ts`
   - Remove DISABLE_SSL_VALIDATION option
   - Enforce strict SSL in production

10. Frontend fetch calls throughout app
    - Add `credentials: 'include'` to all API calls
    - Update error handling for 401/403 responses

---

## Testing Strategy

### Unit Tests
- JWT generation and verification
- Middleware composition
- Rate limit calculations
- Input validation schemas

### Integration Tests
1. **Auth Flow:**
   - Request magic link → receive email → click link → JWT cookie set → can access protected endpoints
2. **Role Authorization:**
   - Super Admin can access admin endpoints
   - Project Manager cannot access super admin endpoints
   - Client cannot access admin endpoints
3. **Rate Limiting:**
   - Exceed rate limit → 429 response
   - Wait for window reset → requests allowed again
4. **Input Validation:**
   - Invalid input → 400 response with clear error messages
   - Valid input → request processed

### Manual UAT
1. Login flow from both portals
2. Cookie persistence across page refreshes
3. Logout clears cookie
4. Invalid token → redirect to login
5. Expired token → redirect to login
6. Admin-only endpoints reject non-admin users

---

## Success Criteria

**AUTH-01: Real Magic Link Authentication**
- ✅ No mock auth code remains
- ✅ JWT-based sessions with httpOnly cookies
- ✅ Magic link flow works end-to-end
- ✅ Sessions persist across browser restarts

**AUTH-02: Session Management**
- ✅ JWT stored in httpOnly cookie
- ✅ Token expiration enforced (24h default, 7d with rememberMe)
- ✅ Logout clears cookie
- ✅ Multi-device support via JWT claims

**AUTH-03: Role-Based Access Control**
- ✅ Middleware verifies user role on every request
- ✅ Super Admin endpoints reject non-admin users
- ✅ Permission validation on all protected routes

**SEC-01: Database Security**
- ✅ SSL certificate validation enabled in production
- ✅ Connection pooling configured correctly
- ✅ No SSL bypass options in production

**SEC-02: API Security**
- ✅ Rate limiting on all endpoints
- ✅ Input validation with Zod on all POST/PUT/PATCH
- ✅ SQL injection prevented (parameterized queries already in use)
- ✅ XSS protection (httpOnly cookies, input sanitization)

---

*Research complete - ready for plan creation*
