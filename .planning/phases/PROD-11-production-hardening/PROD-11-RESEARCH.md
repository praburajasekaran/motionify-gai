# Phase PROD-11: Production Hardening - Research

**Researched:** 2026-01-28
**Domain:** Database connection pooling, error monitoring, logging, environment configuration
**Confidence:** HIGH

## Summary

This phase hardens the existing Motionify portal infrastructure for production load (~15 concurrent clients, ~10 active proposals). The codebase already has a foundation: `pg` Pool-based database connection, custom structured logger, and basic health endpoint. The hardening adds production-grade connection pooling, centralized error monitoring via Sentry, and robust environment validation.

The key decision is to use `@neondatabase/serverless` driver instead of the current `pg` driver for optimized serverless connection handling. Sentry provides the unified error monitoring and breadcrumb-based logging, eliminating the need for a separate logging service. Environment validation uses Zod to fail fast on misconfiguration.

**Primary recommendation:** Replace the current `pg` driver with `@neondatabase/serverless` using HTTP-based queries for single requests, add Sentry for unified error/logging, and implement Zod-based environment validation that blocks production starts with localhost URLs.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @neondatabase/serverless | ^1.0.0 | PostgreSQL driver for serverless | HTTP-based, optimized for Netlify Functions, handles connection lifecycle automatically |
| @sentry/node | ^8.x | Error monitoring & breadcrumbs | Industry standard, serverless-aware, unified errors + logging |
| zod | ^3.24 | Environment validation | Already in project, type-safe, excellent error messages |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ws | ^8.x | WebSocket support for neon (optional) | Only if using transactions with Pool (not recommended for serverless) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @neondatabase/serverless | pg (current) | pg requires manual connection lifecycle management; neon HTTP is simpler for serverless |
| Sentry | Separate logging service (e.g., Logtail) | Sentry unifies errors+logs; separate service adds complexity and cost |
| Zod env validation | joi, env-schema | Zod already in project, same capability, no new dependency |

**Installation:**
```bash
npm install @neondatabase/serverless @sentry/node
```

## Architecture Patterns

### Recommended Project Structure
```
netlify/functions/
  _shared/
    db.ts              # Neon serverless driver (replace current pg)
    sentry.ts          # Sentry initialization and helpers
    env.ts             # Zod-based environment validation
    logger.ts          # Keep but integrate with Sentry breadcrumbs
    index.ts           # Re-exports all shared utilities
```

### Pattern 1: HTTP-Based Database Queries (Neon Serverless)
**What:** Use the `neon()` function for HTTP-based queries instead of Pool/Client
**When to use:** All single queries in Netlify Functions (most use cases)
**Example:**
```typescript
// Source: https://neon.com/docs/serverless/serverless-driver
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Single query - uses HTTP fetch, fastest for serverless
const users = await sql`SELECT * FROM users WHERE id = ${userId}`;

// Parameterized queries are safe from SQL injection
const result = await sql`INSERT INTO projects (name) VALUES (${name}) RETURNING *`;
```

### Pattern 2: Sentry Initialization with Breadcrumbs
**What:** Initialize Sentry once with production-appropriate settings
**When to use:** At the start of each function (lazy initialization pattern)
**Example:**
```typescript
// Source: https://docs.sentry.io/platforms/node/
import * as Sentry from '@sentry/node';

let sentryInitialized = false;

export function initSentry() {
  if (sentryInitialized) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.CONTEXT || 'development', // Netlify's CONTEXT
    tracesSampleRate: process.env.CONTEXT === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // Remove email from user context
      if (event.user?.email) {
        delete event.user.email;
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      // Filter noisy breadcrumbs in production
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null;
      }
      return breadcrumb;
    },
  });

  sentryInitialized = true;
}
```

### Pattern 3: Zod Environment Validation
**What:** Validate all environment variables at startup, fail fast
**When to use:** Before any function logic runs
**Example:**
```typescript
// Source: https://jfranciscosousa.com/blog/validating-environment-variables-with-zod/
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url().refine(
    (url) => !url.includes('localhost') || process.env.CONTEXT !== 'production',
    'DATABASE_URL cannot contain localhost in production'
  ),
  JWT_SECRET: z.string().min(32),
  SENTRY_DSN: z.string().url().optional(),
  CONTEXT: z.enum(['production', 'deploy-preview', 'branch-deploy', 'dev']).optional(),
  // Optional but recommended
  RESEND_API_KEY: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error('Environment validation failed:', result.error.format());
  if (process.env.CONTEXT === 'production') {
    throw new Error('Invalid production environment configuration');
  }
}

export const env = result.success ? result.data : (process.env as unknown as z.infer<typeof envSchema>);
```

### Pattern 4: Health Endpoint with Pool Metrics
**What:** Expose database connectivity and pool stats for monitoring
**When to use:** Always have a `/api/health` endpoint
**Example:**
```typescript
// Source: https://node-postgres.com/apis/pool (for pool metrics concept)
// Adapted for neon serverless which uses HTTP
const healthStatus = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  checks: {
    database: { status: 'pass', latencyMs: 0 },
    environment: { status: 'pass' },
    // Note: neon HTTP doesn't have pool metrics like pg Pool
    // Connection management is handled by Neon infrastructure
  },
};

// Test database connectivity
const startTime = Date.now();
await sql`SELECT 1`;
healthStatus.checks.database.latencyMs = Date.now() - startTime;
```

### Anti-Patterns to Avoid
- **Creating Pool outside request handler:** In serverless, Pool/Client can't outlive a request. Use neon HTTP instead.
- **Global database connections:** Each function invocation should use fresh connections.
- **Logging sensitive data:** Always use beforeBreadcrumb to filter PII.
- **Hardcoding environment detection:** Use CONTEXT env var, not custom logic.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Connection pooling | Custom pool logic | @neondatabase/serverless | Neon handles pool at infrastructure level, HTTP queries are stateless |
| Error tracking | Custom error DB/logs | Sentry | Stack traces, deduplication, alerting, breadcrumbs all built-in |
| Log aggregation | Custom log storage | Sentry breadcrumbs | Tied to error context, searchable, no separate service cost |
| Env validation | Manual checks | Zod schema | Type-safe, detailed errors, already in project |
| Sensitive data scrubbing | Manual string filtering | Sentry beforeSend/beforeBreadcrumb | Centralized, consistent, handles edge cases |

**Key insight:** The serverless environment fundamentally changes connection pooling. Traditional pg Pool is designed for long-lived servers. Neon's HTTP-based driver is purpose-built for serverless where each request is isolated.

## Common Pitfalls

### Pitfall 1: Using pg Pool in Serverless
**What goes wrong:** Connections exhaust, pool never properly closes, cold starts are slow
**Why it happens:** pg Pool is designed for persistent servers, not ephemeral functions
**How to avoid:** Use `neon()` HTTP queries instead of Pool. Each query is a single HTTP request, no connection management needed.
**Warning signs:** "Connection timeout" errors, high cold start times, database connection limit errors

### Pitfall 2: Sentry Not Flushing in Serverless
**What goes wrong:** Errors captured but never sent; function terminates before Sentry transmits
**Why it happens:** Sentry sends events asynchronously; serverless functions terminate immediately after response
**How to avoid:** Call `await Sentry.flush(2000)` before returning from the handler
**Warning signs:** Errors logged locally but not appearing in Sentry dashboard

### Pitfall 3: Localhost URLs in Production
**What goes wrong:** Production app connects to non-existent localhost database
**Why it happens:** .env file copied without updating URLs, env var not set in Netlify
**How to avoid:** Zod validation that rejects localhost URLs when CONTEXT=production
**Warning signs:** "ECONNREFUSED" errors, database connection failures only in production

### Pitfall 4: Missing CONTEXT Environment Variable Locally
**What goes wrong:** Environment detection fails, wrong configuration applied
**Why it happens:** CONTEXT is set by Netlify automatically, not locally
**How to avoid:** Add `CONTEXT=dev` to local .env file, document in .env.example
**Warning signs:** Production config loading in development, or vice versa

### Pitfall 5: Breadcrumb Log Explosion
**What goes wrong:** Sentry quota exhausted, costs spike
**Why it happens:** Every console.log becomes a breadcrumb, production logging too verbose
**How to avoid:** Set production log level to Error+Warn only via beforeBreadcrumb filter
**Warning signs:** High Sentry event count, quota warnings

### Pitfall 6: Sensitive Data in Error Reports
**What goes wrong:** PII (emails, tokens) sent to Sentry
**Why it happens:** Error messages contain user data, request bodies logged
**How to avoid:** Use beforeSend to scrub user.email, configure sendDefaultPii: false
**Warning signs:** Emails visible in Sentry event details, compliance concerns

## Code Examples

Verified patterns from official sources:

### Neon Serverless HTTP Query
```typescript
// Source: https://neon.com/docs/serverless/serverless-driver
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Simple query
const users = await sql`SELECT * FROM users WHERE active = true`;

// Parameterized (SQL injection safe)
const user = await sql`SELECT * FROM users WHERE id = ${userId}`;

// Insert with returning
const [newProject] = await sql`
  INSERT INTO projects (name, client_id)
  VALUES (${name}, ${clientId})
  RETURNING *
`;

// Transaction (if needed, requires different approach)
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);
const results = await sql.transaction([
  sql`INSERT INTO orders (product) VALUES ('widget')`,
  sql`UPDATE inventory SET count = count - 1 WHERE product = 'widget'`,
]);
```

### Sentry Error Capture with Context
```typescript
// Source: https://docs.sentry.io/platforms/javascript/guides/node/usage/
import * as Sentry from '@sentry/node';

export async function handler(event) {
  initSentry();

  try {
    // Add breadcrumb for request context
    Sentry.addBreadcrumb({
      category: 'http',
      message: `${event.httpMethod} ${event.path}`,
      level: 'info',
    });

    // Your handler logic
    const result = await processRequest(event);

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    // Capture with additional context
    Sentry.captureException(error, {
      extra: {
        path: event.path,
        method: event.httpMethod,
      },
    });

    // Flush before returning (critical for serverless)
    await Sentry.flush(2000);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Something went wrong' }),
    };
  }
}
```

### Environment Validation Module
```typescript
// Source: https://jfranciscosousa.com/blog/validating-environment-variables-with-zod/
import { z } from 'zod';

const isProduction = process.env.CONTEXT === 'production';

const envSchema = z.object({
  // Required
  DATABASE_URL: z.string().url().refine(
    (url) => {
      if (isProduction && (url.includes('localhost') || url.includes('127.0.0.1'))) {
        return false;
      }
      return true;
    },
    { message: 'DATABASE_URL cannot contain localhost in production' }
  ),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // Netlify-provided
  CONTEXT: z.enum(['production', 'deploy-preview', 'branch-deploy', 'dev']).optional(),
  SITE_NAME: z.string().optional(),
  SITE_ID: z.string().optional(),
  URL: z.string().optional(),

  // Optional services
  SENTRY_DSN: z.string().url().optional(),
  RESEND_API_KEY: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): { env: Env; warnings: string[] } {
  const result = envSchema.safeParse(process.env);
  const warnings: string[] = [];

  if (!result.success) {
    const errors = result.error.format();
    console.error('Environment validation failed:', JSON.stringify(errors, null, 2));

    if (isProduction) {
      throw new Error('Invalid production environment configuration');
    }

    // In development, warn but continue
    warnings.push('Environment validation failed - some features may not work');
  }

  // Check for recommended vars in development
  if (!isProduction) {
    if (!process.env.SENTRY_DSN) {
      warnings.push('SENTRY_DSN not set - error monitoring disabled');
    }
    if (!process.env.RESEND_API_KEY) {
      warnings.push('RESEND_API_KEY not set - email sending disabled');
    }
  }

  return {
    env: result.success ? result.data : (process.env as unknown as Env),
    warnings,
  };
}

export const { env, warnings: envWarnings } = validateEnv();

// Log warnings on startup
if (envWarnings.length > 0 && !isProduction) {
  console.warn('Environment warnings:', envWarnings);
}
```

### Health Endpoint with Metrics
```typescript
// Enhanced health check for production
import { neon } from '@neondatabase/serverless';
import { env } from './_shared/env';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  environment: string;
  checks: {
    database: { status: 'pass' | 'fail'; latencyMs?: number; error?: string };
    environment: { status: 'pass' | 'fail'; missing?: string[] };
    services: {
      email: { configured: boolean };
      storage: { configured: boolean };
      payment: { configured: boolean };
      errorTracking: { configured: boolean };
    };
  };
}

export async function handler(event) {
  const sql = neon(env.DATABASE_URL);

  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: env.CONTEXT || 'unknown',
    checks: {
      database: { status: 'pass' },
      environment: { status: 'pass' },
      services: {
        email: { configured: !!env.RESEND_API_KEY },
        storage: { configured: !!(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID) },
        payment: { configured: !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) },
        errorTracking: { configured: !!env.SENTRY_DSN },
      },
    },
  };

  // Test database
  try {
    const start = Date.now();
    await sql`SELECT 1`;
    health.checks.database.latencyMs = Date.now() - start;
  } catch (error: any) {
    health.checks.database = { status: 'fail', error: error.message };
    health.status = 'unhealthy';
  }

  // Check critical services
  if (!health.checks.services.errorTracking.configured) {
    health.status = health.status === 'healthy' ? 'degraded' : health.status;
  }

  return {
    statusCode: health.status === 'unhealthy' ? 503 : 200,
    body: JSON.stringify(health),
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| pg Pool for serverless | @neondatabase/serverless HTTP | 2024+ | Eliminates connection management complexity |
| Separate logging service | Sentry breadcrumbs | 2023+ | Unified error + log context |
| Manual env validation | Zod schemas | 2022+ | Type-safe, fail-fast validation |
| NODE_ENV detection | CONTEXT env var (Netlify) | 2020+ | Platform-native environment detection |

**Deprecated/outdated:**
- **@sentry/serverless**: Renamed to @sentry/aws-serverless in v8; use @sentry/node for Netlify
- **pg Pool in serverless**: While still works, not optimized for ephemeral functions
- **Console.log for production logging**: Loses context, no aggregation, no alerting

## Open Questions

Things that couldn't be fully resolved:

1. **Error IDs for Support Lookup**
   - What we know: User decided this is Claude's discretion
   - What's unclear: Whether to generate IDs client-side or use Sentry event IDs
   - Recommendation: Use Sentry event IDs exposed via `event.event_id` in beforeSend; include in generic error response for support lookup

2. **Connection Timeout Strategy**
   - What we know: User left this to Claude's discretion
   - What's unclear: Optimal timeout for Neon HTTP queries
   - Recommendation: Use `fetchOptions: { signal: AbortSignal.timeout(5000) }` for 5-second timeout; this is appropriate for small-scale app

3. **Request/Response Body Logging**
   - What we know: User left to Claude's discretion
   - What's unclear: Balance between debugging value and data volume
   - Recommendation: Log request body in breadcrumbs for non-GET requests only, redact known sensitive fields, max 1KB

## Sources

### Primary (HIGH confidence)
- [Neon Serverless Driver Docs](https://neon.com/docs/serverless/serverless-driver) - HTTP query pattern, serverless recommendations
- [Sentry Node.js Docs](https://docs.sentry.io/platforms/node/) - Init configuration, breadcrumbs, error capture
- [Sentry Sensitive Data](https://docs.sentry.io/platforms/javascript/data-management/sensitive-data/) - beforeSend hook, data scrubbing
- [node-postgres Pool API](https://node-postgres.com/apis/pool) - Pool metrics properties (for reference)
- [Netlify Functions Env Vars](https://docs.netlify.com/build/functions/environment-variables/) - SITE_NAME, SITE_ID, URL variables
- [Netlify Environment Overview](https://docs.netlify.com/build/environment-variables/overview/) - CONTEXT values, deploy contexts

### Secondary (MEDIUM confidence)
- [Zod Environment Validation Blog](https://jfranciscosousa.com/blog/validating-environment-variables-with-zod/) - Validation pattern, safeParse usage
- [Neon GitHub CONFIG.md](https://github.com/neondatabase/serverless/blob/main/CONFIG.md) - Advanced neonConfig options

### Tertiary (LOW confidence)
- WebSearch results for serverless best practices 2026 - General patterns confirmed with official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Neon and Sentry docs verified all patterns
- Architecture: HIGH - Patterns directly from official documentation
- Pitfalls: HIGH - Well-documented serverless gotchas from multiple sources

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - these are stable technologies)

---

## Claude's Discretion Recommendations

Based on research, here are recommendations for areas left to Claude's discretion:

### Connection Pooling Discretion

**Connection timeout handling:** Use 5-second timeout with patient retry (1 retry). This balances responsiveness with reliability for small-scale app.
```typescript
const sql = neon(env.DATABASE_URL, {
  fetchOptions: { signal: AbortSignal.timeout(5000) }
});
```

**Idle connection keep-alive:** N/A for HTTP-based driver; each request is independent.

**Pool configuration:** Single shared neon instance per function invocation; no separate read/write pools needed at this scale.

### Error Handling Discretion

**Error IDs:** YES - Include error IDs. Use pattern `ERR-{timestamp-base36}-{random}` for human-readable IDs. Store Sentry event ID as correlation.
```typescript
const errorId = `ERR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
// Response: { error: "Something went wrong", errorId: "ERR-L5K2M1-A3B4" }
```

### Logging Discretion

**Sensitive data redaction:** Extend existing SENSITIVE_FIELDS list to include: `password`, `token`, `jwt`, `secret`, `authorization`, `cookie`, `apiKey`, `api_key`, `credit_card`, `ssn`, `email` (partial), `phone` (partial), `ip_address`.

**Request/response body logging:** Log request bodies for non-GET requests only, truncate to 1KB, redact sensitive fields. Don't log response bodies (reduces noise).

### Environment Discretion

**Startup validation behavior:** Fail fast in production (throw on invalid config), warn in development (log and continue).

**Staging vs production separation:** Use Netlify's CONTEXT env var (`production`, `deploy-preview`, `branch-deploy`, `dev`). No custom staging detection needed.

**Runtime environment detection:** Use `process.env.CONTEXT` (Netlify-provided) as primary, fall back to `process.env.NODE_ENV` if CONTEXT unavailable.
```typescript
const isProduction = process.env.CONTEXT === 'production' || process.env.NODE_ENV === 'production';
```
