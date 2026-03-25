# PROD-01-03: Apply Security Middleware to All API Endpoints

**Phase:** PROD-01 (Authentication & Security)
**Priority:** High
**Estimated Effort:** 3-4 hours
**Created:** 2026-01-24

---

## Goal

Apply authentication, rate limiting, and input validation middleware to all 60+ API endpoints to prevent unauthorized access, abuse, and invalid data.

---

## Context

From RESEARCH.md:
- Rate limiting infrastructure exists but only used in `auth-request-magic-link.ts`
- Input validation (Zod schemas) exists but only used in auth endpoints
- No centralized auth verification on most endpoints
- 60+ API functions need security hardening

**Current State:** Each endpoint manually (or doesn't) check auth, validate input, and rate limit
**Target State:** Composable middleware applied declaratively to all endpoints

---

## Tasks

### Task 1: Create Middleware Composition Utility

**File:** `netlify/functions/_shared/middleware.ts` (new file)

**Code:**
```typescript
/**
 * Composable Middleware for Netlify Functions
 *
 * Provides reusable middleware that can be composed together:
 * - withAuth: Require authentication
 * - withRateLimit: Apply rate limiting
 * - withValidation: Validate request body
 * - compose: Chain multiple middlewares
 */

import { z } from 'zod';
import { requireAuth, requireSuperAdmin, requireProjectManager, createUnauthorizedResponse, type AuthResult } from './auth';
import { checkRateLimit, createRateLimitResponse, getClientIP, type RateLimitConfig } from './rateLimit';
import { validateRequest } from './validation';
import { getCorsHeaders, validateCors } from './cors';
import { createLogger, getCorrelationId } from './logger';

const logger = createLogger('middleware');

export interface NetlifyEvent {
    httpMethod: string;
    headers: Record<string, string>;
    body: string | null;
    path: string;
    queryStringParameters?: Record<string, string>;
}

export interface NetlifyResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
}

export type Handler = (event: NetlifyEvent, auth?: AuthResult) => Promise<NetlifyResponse>;
export type Middleware = (handler: Handler) => Handler;

/**
 * Require authentication - any authenticated user
 */
export function withAuth(): Middleware {
    return (handler: Handler) => async (event: NetlifyEvent) => {
        const auth = await requireAuth(event);

        if (!auth.authorized) {
            const origin = event.headers.origin || event.headers.Origin;
            return createUnauthorizedResponse(auth, origin);
        }

        return handler(event, auth);
    };
}

/**
 * Require Super Admin role
 */
export function withSuperAdmin(): Middleware {
    return (handler: Handler) => async (event: NetlifyEvent) => {
        const auth = await requireSuperAdmin(event);

        if (!auth.authorized) {
            const origin = event.headers.origin || event.headers.Origin;
            return createUnauthorizedResponse(auth, origin);
        }

        return handler(event, auth);
    };
}

/**
 * Require Project Manager or Super Admin role
 */
export function withProjectManager(): Middleware {
    return (handler: Handler) => async (event: NetlifyEvent) => {
        const auth = await requireProjectManager(event);

        if (!auth.authorized) {
            const origin = event.headers.origin || event.headers.Origin;
            return createUnauthorizedResponse(auth, origin);
        }

        return handler(event, auth);
    };
}

/**
 * Apply rate limiting
 */
export function withRateLimit(config: RateLimitConfig, action?: string): Middleware {
    return (handler: Handler) => async (event: NetlifyEvent) => {
        const origin = event.headers.origin || event.headers.Origin;
        const headers = getCorsHeaders(origin);

        // Get identifier (authenticated user or IP)
        let identifier: string;
        try {
            const auth = await requireAuth(event);
            identifier = auth.user?.userId || getClientIP(event.headers);
        } catch {
            identifier = getClientIP(event.headers);
        }

        const actionName = action || event.path || 'api';
        const result = await checkRateLimit(identifier, actionName, config);

        if (!result.allowed) {
            return createRateLimitResponse(result, headers);
        }

        return handler(event);
    };
}

/**
 * Validate request body against Zod schema
 */
export function withValidation(schema: z.ZodSchema): Middleware {
    return (handler: Handler) => async (event: NetlifyEvent) => {
        const origin = event.headers.origin || event.headers.Origin;

        const validation = validateRequest(event.body, schema, origin);
        if (!validation.success) {
            return validation.response;
        }

        // Attach validated data to event for handler to use
        (event as any).validatedData = validation.data;

        return handler(event);
    };
}

/**
 * Compose multiple middlewares together
 * Middlewares are applied right-to-left (like function composition)
 *
 * Example:
 * export const handler = compose(
 *   withAuth(),
 *   withRateLimit(RATE_LIMITS.api),
 *   withValidation(createProposalSchema)
 * )(async (event, auth) => {
 *   // Handler code here
 * });
 */
export function compose(...middlewares: Middleware[]): (handler: Handler) => Handler {
    return (handler: Handler) => {
        return middlewares.reduceRight(
            (composedHandler, middleware) => middleware(composedHandler),
            handler
        );
    };
}

/**
 * Standard CORS + Method validation wrapper
 */
export function withCORS(allowedMethods: string[]): Middleware {
    return (handler: Handler) => async (event: NetlifyEvent) => {
        const origin = event.headers.origin || event.headers.Origin;
        const headers = getCorsHeaders(origin);

        // Handle preflight
        const corsResult = validateCors(event);
        if (corsResult) return corsResult;

        // Validate method
        if (!allowedMethods.includes(event.httpMethod)) {
            return {
                statusCode: 405,
                headers,
                body: JSON.stringify({
                    error: {
                        code: 'METHOD_NOT_ALLOWED',
                        message: `Method ${event.httpMethod} not allowed. Allowed: ${allowedMethods.join(', ')}`,
                    },
                }),
            };
        }

        return handler(event);
    };
}
```

**Verification:**
- File compiles without errors
- Exports all middleware functions

### Task 2: Create Endpoint Audit Spreadsheet

**File:** `.planning/phases/PROD-01-authentication-security/ENDPOINT_AUDIT.md`

**Create table:**

```markdown
# API Endpoint Security Audit

| Endpoint | Auth Required | Role Required | Rate Limit | Input Validation | Status |
|----------|---------------|---------------|------------|------------------|--------|
| auth-request-magic-link | No | None | ✅ 5/hour | ✅ email schema | ✅ Done |
| auth-verify-magic-link | No | None | ❌ None | ✅ token schema | 🔧 Add rate limit |
| auth-me | ✅ Yes | Any | ❌ None | N/A (GET) | 🔧 Add rate limit |
| auth-logout | ✅ Yes | Any | ❌ None | N/A (POST) | ✅ Done |
| proposals (GET) | ✅ Yes | Any | ❌ None | N/A | 🔧 Add rate limit |
| proposals (POST) | ✅ Yes | PM/Admin | ❌ None | ❌ No schema | 🔧 Add all |
| ... (continue for all 60+ endpoints) |
```

**Action:**
1. List all files in `netlify/functions/` directory
2. For each file, document: required auth, required role, rate limit, validation
3. Mark status: ✅ Done, 🔧 Needs work, ❌ Critical gap

**Verification:**
- All endpoints documented
- Priority endpoints identified

### Task 3: Apply Middleware to High-Priority Endpoints

**Priority 1: User Management (Highly Sensitive)**

Files to update:
- `netlify/functions/users-settings.ts`
- `netlify/functions/invitations-create.ts`
- `netlify/functions/invitations-accept.ts`
- `netlify/functions/invitations-revoke.ts`

**Pattern:**
```typescript
import { compose, withCORS, withSuperAdmin, withRateLimit, withValidation } from './_shared/middleware';
import { RATE_LIMITS } from './_shared/rateLimit';
import { z } from 'zod';

const createInvitationSchema = z.object({
    email: z.string().email(),
    role: z.enum(['super_admin', 'project_manager', 'client', 'team']),
    full_name: z.string().min(1).max(255),
});

export const handler = compose(
    withCORS(['POST']),
    withSuperAdmin(),
    withRateLimit(RATE_LIMITS.apiStrict),
    withValidation(createInvitationSchema)
)(async (event, auth) => {
    const data = (event as any).validatedData;
    // Original handler logic here
    // Can access auth.user for authenticated user info
});
```

**Verification:**
- User management endpoints require Super Admin
- Requests are rate limited
- Input is validated before processing

**Priority 2: Proposals (Core Business Logic)**

Files to update:
- `netlify/functions/proposals.ts`
- `netlify/functions/proposal-detail.ts`

**Pattern:**
```typescript
export const handler = compose(
    withCORS(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    withAuth(), // Any authenticated user
    withRateLimit(RATE_LIMITS.api),
    event.httpMethod !== 'GET' ? withValidation(proposalSchema) : (h => h)
)(async (event, auth) => {
    // Check method-specific auth
    if (['POST', 'PUT', 'DELETE'].includes(event.httpMethod)) {
        // Require PM or Admin for mutations
        if (!['super_admin', 'project_manager'].includes(auth!.user!.role)) {
            return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden' }) };
        }
    }

    // Original handler logic
});
```

**Priority 3: Comments (Already Implemented)**

Files to update:
- `netlify/functions/comments.ts`

**Apply:**
- withAuth() for all methods
- withRateLimit(RATE_LIMITS.api)
- withValidation for POST/PUT

**Priority 4: All Remaining Endpoints**

For each remaining endpoint:
1. Determine required auth level (none, any, PM, admin)
2. Add appropriate rate limit (strict for writes, normal for reads)
3. Add validation schema for POST/PUT/PATCH
4. Apply middleware with `compose()`

### Task 4: Create Validation Schemas for Common Entities

**File:** `netlify/functions/_shared/schemas.ts` (new file)

**Code:**
```typescript
import { z } from 'zod';
import { emailSchema, uuidSchema, nameSchema, dateSchema } from './validation';

// Proposal schemas
export const createProposalSchema = z.object({
    title: nameSchema,
    description: z.string().min(10).max(10000),
    clientId: uuidSchema,
    projectId: uuidSchema.optional(),
    dueDate: dateSchema.optional(),
});

export const updateProposalSchema = createProposalSchema.partial();

// Comment schemas
export const createCommentSchema = z.object({
    proposalId: uuidSchema,
    content: z.string().min(1).max(5000),
    attachmentIds: z.array(uuidSchema).optional(),
});

export const updateCommentSchema = z.object({
    id: uuidSchema,
    content: z.string().min(1).max(5000),
});

// Deliverable schemas
export const createDeliverableSchema = z.object({
    proposalId: uuidSchema,
    title: nameSchema,
    description: z.string().max(2000).optional(),
    dueDate: dateSchema.optional(),
});

// Project schemas
export const createProjectSchema = z.object({
    name: nameSchema,
    description: z.string().max(5000).optional(),
    clientId: uuidSchema,
});

// Task schemas
export const createTaskSchema = z.object({
    projectId: uuidSchema,
    title: nameSchema,
    description: z.string().max(5000).optional(),
    assignedTo: uuidSchema.optional(),
    dueDate: dateSchema.optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

// Export all schemas
export const SCHEMAS = {
    proposal: {
        create: createProposalSchema,
        update: updateProposalSchema,
    },
    comment: {
        create: createCommentSchema,
        update: updateCommentSchema,
    },
    deliverable: {
        create: createDeliverableSchema,
    },
    project: {
        create: createProjectSchema,
    },
    task: {
        create: createTaskSchema,
    },
};
```

**Verification:**
- All entity schemas defined
- Schemas enforce data integrity

### Task 5: Update Remaining Endpoints

**Systematic approach:**

For each file in `netlify/functions/*.ts`:

1. Add imports:
```typescript
import { compose, withCORS, withAuth, withSuperAdmin, withProjectManager, withRateLimit, withValidation } from './_shared/middleware';
import { RATE_LIMITS } from './_shared/rateLimit';
import { SCHEMAS } from './_shared/schemas';
```

2. Wrap handler with appropriate middleware:
```typescript
// Example: Protected endpoint requiring PM
export const handler = compose(
    withCORS(['GET', 'POST']),
    withProjectManager(),
    withRateLimit(RATE_LIMITS.api),
    // Only validate on POST
    event => event.httpMethod === 'POST'
        ? withValidation(SCHEMAS.proposal.create)(event)
        : event
)(async (event, auth) => {
    // Original handler logic
});
```

3. Update handler to use validated data:
```typescript
const data = (event as any).validatedData || JSON.parse(event.body || '{}');
```

4. Use auth.user instead of manually parsing JWT:
```typescript
// BEFORE:
const token = event.headers.authorization?.replace('Bearer ', '');
const decoded = verifyJWT(token);
const userId = decoded.userId;

// AFTER:
const userId = auth!.user!.userId;
```

**Verification:**
- All endpoints have appropriate middleware
- No manual JWT parsing remaining
- All POST/PUT/PATCH endpoints validate input

---

## Verification Steps

### 1. Endpoint Coverage Check

```bash
# Count total endpoints
ls netlify/functions/*.ts | wc -l

# Check which endpoints lack middleware
grep -L "withAuth\|withSuperAdmin\|withProjectManager" netlify/functions/*.ts

# Should return zero or only public endpoints (auth-request-magic-link, etc.)
```

### 2. Rate Limiting Test

```bash
# Rapid-fire requests to an endpoint
for i in {1..150}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "Cookie: auth_token=$TOKEN" \
    https://your-domain.com/.netlify/functions/proposals
done

# Expected: First 100 return 200, rest return 429 (Too Many Requests)
```

### 3. Input Validation Test

```bash
# Send invalid data
curl -X POST https://your-domain.com/.netlify/functions/proposals \
  -H "Cookie: auth_token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "", "description": "test"}'

# Expected: 400 Bad Request with validation error message
```

### 4. Authorization Test

```bash
# Client user trying to access admin endpoint
curl -H "Cookie: auth_token=$CLIENT_TOKEN" \
  https://your-domain.com/.netlify/functions/users-settings

# Expected: 403 Forbidden
```

---

## Success Criteria

- [ ] Middleware composition utility created
- [ ] Endpoint audit completed (all 60+ endpoints documented)
- [ ] All user management endpoints require Super Admin
- [ ] All proposal endpoints require authentication
- [ ] All POST/PUT/PATCH endpoints validate input
- [ ] All endpoints have rate limiting
- [ ] Common entity schemas defined
- [ ] No manual JWT parsing in endpoints (use auth middleware)
- [ ] Rate limiting prevents >100 requests/minute per user
- [ ] Invalid input returns 400 with clear error messages
- [ ] Unauthorized requests return 401/403

---

## Rollback Plan

If middleware breaks endpoints:
1. Revert specific endpoint changes
2. Test middleware composition in isolation
3. Fix bugs in middleware functions
4. Re-apply to endpoints incrementally

---

## Dependencies

**Requires:**
- PROD-01-02 (JWT sessions and auth middleware)

**Blocks:**
- None (final step in Phase 1 auth/security)

---

## Notes

**Middleware Composition Order:**
The order matters - middlewares are applied right-to-left:
```typescript
compose(
    withCORS(['POST']),        // 4. Applied last (outermost)
    withAuth(),                // 3. Applied third
    withRateLimit(),           // 2. Applied second
    withValidation(schema)     // 1. Applied first (innermost)
)(handler);
```

So the execution order is: CORS → Auth → Rate Limit → Validation → Handler

**Performance:**
- Rate limiting uses database queries (add index on rate_limit_entries table)
- Consider Redis for rate limiting in high-traffic scenarios
- JWT verification is fast (no database lookup)

---

*Plan ready for execution via /gsd:execute-phase*
