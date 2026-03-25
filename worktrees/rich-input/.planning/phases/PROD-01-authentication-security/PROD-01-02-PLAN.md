# PROD-01-02: Implement JWT Sessions with httpOnly Cookies

**Phase:** PROD-01 (Authentication & Security)
**Priority:** Critical
**Estimated Effort:** 2 hours
**Created:** 2026-01-24

---

## Goal

Replace insecure localStorage-based session storage with httpOnly cookie-based JWT sessions to prevent XSS token theft.

---

## Context

From RESEARCH.md:
- Current: JWT tokens stored in localStorage (vulnerable to XSS)
- Target: JWT tokens in httpOnly cookies (XSS-proof, auto-sent with requests)
- Challenge: Need to handle CORS with credentials: 'include' on all frontend requests
- Benefit: Tokens cannot be accessed by malicious JavaScript

**Current Flow:**
1. Magic link verified → JWT token returned in JSON response body
2. Frontend stores token in localStorage
3. Frontend manually adds `Authorization: Bearer ${token}` to every request

**New Flow:**
1. Magic link verified → JWT token set in httpOnly cookie via Set-Cookie header
2. Browser automatically sends cookie with every request to same origin
3. Backend extracts token from cookie, verifies JWT
4. Frontend never sees or handles token directly

---

## Tasks

### Task 1: Install Dependencies

**Command:**
```bash
npm install jsonwebtoken
npm install --save-dev @types/jsonwebtoken
```

**Verification:**
- `package.json` includes jsonwebtoken dependency
- TypeScript recognizes jsonwebtoken types

### Task 2: Create JWT Utilities Module

**File:** `netlify/functions/_shared/jwt.ts` (new file)

**Code:**
```typescript
/**
 * JWT Token Generation and Verification
 *
 * Provides stateless authentication using JSON Web Tokens:
 * - generateJWT: Create signed JWT with user claims
 * - verifyJWT: Validate JWT signature and expiration
 * - extractTokenFromCookie: Parse auth token from cookie header
 */

import jwt from 'jsonwebtoken';
import { createLogger } from './logger';

const logger = createLogger('jwt');

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION';
const JWT_ISSUER = 'motionify-platform';
const JWT_AUDIENCE = 'motionify-users';

if (!process.env.JWT_SECRET) {
    logger.warn('JWT_SECRET not set - using default (INSECURE for production)');
}

// Token expiration times
const TOKEN_EXPIRY_DEFAULT = '24h';      // 24 hours
const TOKEN_EXPIRY_REMEMBER = '7d';      // 7 days

export interface JWTPayload {
    userId: string;
    email: string;
    role: 'super_admin' | 'project_manager' | 'client' | 'team';
    fullName: string;
}

export interface JWTVerifyResult {
    valid: boolean;
    payload?: JWTPayload;
    error?: string;
}

/**
 * Generate a signed JWT token for authenticated user
 */
export function generateJWT(user: {
    id: string;
    email: string;
    role: string;
    full_name?: string;
    fullName?: string;
}, rememberMe: boolean = false): string {
    const payload: JWTPayload = {
        userId: user.id,
        email: user.email.toLowerCase(),
        role: user.role as any,
        fullName: user.full_name || user.fullName || user.email.split('@')[0],
    };

    const options: jwt.SignOptions = {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        expiresIn: rememberMe ? TOKEN_EXPIRY_REMEMBER : TOKEN_EXPIRY_DEFAULT,
    };

    return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Verify JWT token and extract payload
 */
export function verifyJWT(token: string): JWTVerifyResult {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
        }) as JWTPayload;

        return {
            valid: true,
            payload: decoded,
        };
    } catch (error: any) {
        logger.warn('JWT verification failed', { error: error.message });

        let errorMessage = 'Invalid token';
        if (error.name === 'TokenExpiredError') {
            errorMessage = 'Token expired';
        } else if (error.name === 'JsonWebTokenError') {
            errorMessage = 'Malformed token';
        }

        return {
            valid: false,
            error: errorMessage,
        };
    }
}

/**
 * Extract auth token from Cookie header
 */
export function extractTokenFromCookie(cookieHeader: string | undefined): string | null {
    if (!cookieHeader) return null;

    const match = cookieHeader.match(/auth_token=([^;]+)/);
    return match ? match[1] : null;
}

/**
 * Create Set-Cookie header value for auth token
 */
export function createAuthCookie(token: string, rememberMe: boolean): string {
    const maxAge = rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60; // seconds
    const isProduction = process.env.NODE_ENV === 'production';

    const cookieAttributes = [
        `auth_token=${token}`,
        'HttpOnly',
        'Path=/',
        `Max-Age=${maxAge}`,
        'SameSite=Strict',
    ];

    // Only set Secure flag in production (requires HTTPS)
    if (isProduction) {
        cookieAttributes.push('Secure');
    }

    return cookieAttributes.join('; ');
}

/**
 * Create Set-Cookie header to clear auth token (logout)
 */
export function createClearAuthCookie(): string {
    return 'auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict';
}
```

**Verification:**
- File compiles without TypeScript errors
- Exports all required functions

### Task 3: Create Auth Middleware Module

**File:** `netlify/functions/_shared/auth.ts` (new file)

**Code:**
```typescript
/**
 * Authentication Middleware
 *
 * Provides reusable authentication checks for API endpoints:
 * - requireAuth: Verify user is authenticated
 * - requireSuperAdmin: Verify user is Super Admin
 * - requireProjectManager: Verify user is PM or Super Admin
 */

import { verifyJWT, extractTokenFromCookie } from './jwt';
import { getCorsHeaders } from './cors';
import { createLogger } from './logger';

const logger = createLogger('auth-middleware');

export interface AuthResult {
    authorized: boolean;
    user?: {
        userId: string;
        email: string;
        role: string;
        fullName: string;
    };
    error?: string;
    statusCode?: number;
}

export interface NetlifyEvent {
    headers: Record<string, string>;
    [key: string]: any;
}

/**
 * Extract and verify JWT from request cookies
 */
export async function requireAuth(event: NetlifyEvent): Promise<AuthResult> {
    const cookieHeader = event.headers.cookie || event.headers.Cookie;
    const token = extractTokenFromCookie(cookieHeader);

    if (!token) {
        return {
            authorized: false,
            error: 'No authentication token provided',
            statusCode: 401,
        };
    }

    const result = verifyJWT(token);

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

/**
 * Verify user is Super Admin
 */
export async function requireSuperAdmin(event: NetlifyEvent): Promise<AuthResult> {
    const auth = await requireAuth(event);

    if (!auth.authorized) {
        return auth;
    }

    if (auth.user!.role !== 'super_admin') {
        logger.warn('Forbidden: Super Admin required', {
            userId: auth.user!.userId,
            role: auth.user!.role,
        });

        return {
            authorized: false,
            error: 'Forbidden: Super Admin access required',
            statusCode: 403,
        };
    }

    return auth;
}

/**
 * Verify user is Project Manager or Super Admin
 */
export async function requireProjectManager(event: NetlifyEvent): Promise<AuthResult> {
    const auth = await requireAuth(event);

    if (!auth.authorized) {
        return auth;
    }

    const allowedRoles = ['super_admin', 'project_manager'];
    if (!allowedRoles.includes(auth.user!.role)) {
        logger.warn('Forbidden: Project Manager required', {
            userId: auth.user!.userId,
            role: auth.user!.role,
        });

        return {
            authorized: false,
            error: 'Forbidden: Project Manager or Super Admin access required',
            statusCode: 403,
        };
    }

    return auth;
}

/**
 * Create standardized unauthorized response
 */
export function createUnauthorizedResponse(auth: AuthResult, origin?: string) {
    const headers = getCorsHeaders(origin);

    return {
        statusCode: auth.statusCode || 401,
        headers,
        body: JSON.stringify({
            error: {
                code: auth.statusCode === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED',
                message: auth.error || 'Authentication required',
            },
        }),
    };
}
```

**Verification:**
- File compiles without errors
- Exports all middleware functions

### Task 4: Update Magic Link Verification to Set Cookie

**File:** `netlify/functions/auth-verify-magic-link.ts`

**Changes:**

1. Add imports at top:
```typescript
import { generateJWT, createAuthCookie } from './_shared/jwt';
```

2. Replace success response (around line 175):

**Before:**
```typescript
return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
        success: true,
        data: {
            user: transformedUser,
            token: 'some-jwt-token', // placeholder
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
    }),
};
```

**After:**
```typescript
// Generate JWT
const jwtToken = generateJWT(user, rememberMe || false);
const expiresAt = new Date(
    Date.now() + (rememberMe ? 7 * 24 : 24) * 60 * 60 * 1000
).toISOString();

// Set httpOnly cookie
const authCookie = createAuthCookie(jwtToken, rememberMe || false);

return {
    statusCode: 200,
    headers: {
        ...headers,
        'Set-Cookie': authCookie,
    },
    body: JSON.stringify({
        success: true,
        data: {
            user: transformedUser,
            expiresAt,
            // Note: token NOT included in response (set in cookie only)
        },
    }),
};
```

**Verification:**
- Function compiles
- Response includes Set-Cookie header
- Response body does NOT include token

### Task 5: Update Frontend to Use Cookies

**Files to modify:**
- `lib/api-config.ts`
- `landing-page-new/src/lib/api-config.ts`

**Changes in both files:**

Find all `fetch()` calls and add `credentials: 'include'`:

```typescript
const response = await fetch(url, {
    method,
    headers: {
        'Content-Type': 'application/json',
        ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include', // ← ADD THIS LINE
});
```

**Verification:**
- All fetch calls include `credentials: 'include'`
- Cookies sent with every API request

### Task 6: Update AuthContext to Read from JWT Cookie

**File:** `contexts/AuthContext.tsx` and `landing-page-new/src/context/AuthContext.tsx`

**Changes:**

1. Remove localStorage token storage logic (keep user storage for now as cache)
2. Update `loadUser` to call a new endpoint `/auth/me` that returns current user from JWT cookie
3. Update `logout` to call `/auth/logout` endpoint that clears cookie

**New approach:**
```typescript
const loadUser = useCallback(async () => {
    try {
        // Call /auth/me which reads JWT from cookie
        const response = await fetch(`${API_BASE}/auth/me`, {
            credentials: 'include',
        });

        if (response.ok) {
            const { user } = await response.json();
            setUserState(user);
        } else {
            setUserState(null);
        }
    } catch (error) {
        console.error('Failed to load user:', error);
        setUserState(null);
    } finally {
        setIsLoading(false);
    }
}, []);

const logout = useCallback(async () => {
    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
        });
    } catch (error) {
        console.error('Logout failed:', error);
    }
    setUserState(null);
    window.location.href = '/#/login';
}, []);
```

**Verification:**
- User loaded from cookie on page load
- Logout clears cookie
- No token in localStorage

### Task 7: Create Auth Status and Logout Endpoints

**File:** `netlify/functions/auth-me.ts` (new file)

```typescript
import { requireAuth, createUnauthorizedResponse } from './_shared/auth';
import { getCorsHeaders, validateCors } from './_shared';

export const handler = async (event: any) => {
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);

    const corsResult = validateCors(event);
    if (corsResult) return corsResult;

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    const auth = await requireAuth(event);
    if (!auth.authorized) {
        return createUnauthorizedResponse(auth, origin);
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            user: {
                id: auth.user!.userId,
                email: auth.user!.email,
                role: auth.user!.role,
                name: auth.user!.fullName,
            },
        }),
    };
};
```

**File:** `netlify/functions/auth-logout.ts` (new file)

```typescript
import { createClearAuthCookie } from './_shared/jwt';
import { getCorsHeaders, validateCors } from './_shared';

export const handler = async (event: any) => {
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);

    const corsResult = validateCors(event);
    if (corsResult) return corsResult;

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    return {
        statusCode: 200,
        headers: {
            ...headers,
            'Set-Cookie': createClearAuthCookie(),
        },
        body: JSON.stringify({ success: true, message: 'Logged out' }),
    };
};
```

**Verification:**
- `/auth/me` returns current user from JWT cookie
- `/auth/logout` clears the auth cookie

---

## Verification Steps

### 1. JWT Generation Test
```bash
# Test JWT generation with Node.js
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId: 'test', role: 'super_admin' }, 'secret', { expiresIn: '24h' });
console.log('Token:', token);
const decoded = jwt.verify(token, 'secret');
console.log('Decoded:', decoded);
"
```

### 2. Magic Link Login Flow
1. Request magic link: POST to `/auth/request-magic-link`
2. Check email or terminal for magic link URL
3. Click magic link
4. Verify redirect to dashboard
5. Open browser DevTools → Application → Cookies
6. Verify `auth_token` cookie exists with HttpOnly flag

### 3. Cookie Security Attributes
- HttpOnly: ✓ (JavaScript cannot access)
- Secure: ✓ (HTTPS only in production)
- SameSite: Strict (CSRF protection)
- Path: / (available to all routes)
- Max-Age: 86400 (24 hours) or 604800 (7 days with rememberMe)

### 4. API Request with Cookie
```bash
# After logging in, copy cookie value
curl -H "Cookie: auth_token=<token>" https://your-domain.com/.netlify/functions/auth/me
# Should return user object
```

### 5. Logout Test
1. Login
2. Verify cookie exists
3. Click logout
4. Verify cookie cleared (Max-Age=0)
5. Try accessing protected endpoint → 401

---

## Success Criteria

- [ ] JWT utilities module created and tested
- [ ] Auth middleware module created with role checks
- [ ] Magic link verification sets httpOnly cookie
- [ ] Frontend sends `credentials: 'include'` on all requests
- [ ] AuthContext loads user from cookie (not localStorage)
- [ ] `/auth/me` endpoint returns current user from JWT
- [ ] `/auth/logout` endpoint clears cookie
- [ ] Cookie has HttpOnly, Secure (prod), SameSite=Strict attributes
- [ ] Token not visible in localStorage or response body
- [ ] Login flow works end-to-end with cookies
- [ ] Logout clears cookie and redirects to login

---

## Rollback Plan

If cookie-based auth breaks:
1. Revert commits from this plan
2. Restore localStorage-based auth temporarily
3. Debug cookie/CORS issues
4. Re-attempt with fixes

---

## Dependencies

**Requires:**
- PROD-01-01 (Mock auth removed)

**Blocks:**
- PROD-01-03 (Middleware application) - Need auth middleware first

---

## Environment Variables

Add to `.env` and deployment environment:

```bash
# JWT Secret (REQUIRED - use strong random value)
JWT_SECRET=<generate-with-openssl-rand-base64-32>

# Generate secret:
openssl rand -base64 32
```

---

## Notes

**CORS Considerations:**
- Both portals must be on same domain/subdomain for cookies to work
- If admin portal at `admin.motionify.studio` and client portal at `portal.motionify.studio`, both can share cookies from `*.motionify.studio` domain
- If completely different domains, cookies won't work (need token-based auth instead)

**Security Benefits:**
- XSS attacks cannot steal token (httpOnly)
- Token automatically sent (no manual header management)
- SameSite=Strict prevents CSRF
- Secure flag ensures HTTPS-only in production

---

*Plan ready for execution via /gsd:execute-phase*
