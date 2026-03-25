---
phase: PROD-11-production-hardening
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - netlify/functions/_shared/sentry.ts
  - netlify/functions/_shared/logger.ts
  - netlify/functions/_shared/index.ts
  - package.json
autonomous: true

must_haves:
  truths:
    - "Errors are captured and sent to Sentry"
    - "Breadcrumbs provide context trail for errors"
    - "Sentry flushes before serverless function returns"
    - "Sensitive data is redacted from Sentry events"
  artifacts:
    - path: "netlify/functions/_shared/sentry.ts"
      provides: "Sentry initialization and helpers"
      exports: ["initSentry", "captureError", "addBreadcrumb", "flushSentry"]
    - path: "netlify/functions/_shared/logger.ts"
      provides: "Logger with Sentry breadcrumb integration"
      contains: "addBreadcrumb"
  key_links:
    - from: "netlify/functions/_shared/sentry.ts"
      to: "SENTRY_DSN"
      via: "Sentry.init configuration"
      pattern: "Sentry\\.init.*dsn"
    - from: "netlify/functions/_shared/logger.ts"
      to: "netlify/functions/_shared/sentry.ts"
      via: "breadcrumb integration"
      pattern: "addBreadcrumb"
---

<objective>
Add Sentry error monitoring with breadcrumb-based logging integration.

Purpose: Centralized error monitoring with automatic context capture. Sentry breadcrumbs replace separate logging infrastructure, providing error trail without additional service costs.

Output:
- New sentry.ts module with initialization and helpers
- Updated logger.ts with Sentry breadcrumb integration
- Package.json with @sentry/node dependency
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
@netlify/functions/_shared/logger.ts
@netlify/functions/_shared/index.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install @sentry/node and create sentry.ts module</name>
  <files>
    package.json
    netlify/functions/_shared/sentry.ts
  </files>
  <action>
1. Install Sentry:
   ```bash
   npm install @sentry/node
   ```

2. Create `netlify/functions/_shared/sentry.ts`:

```typescript
/**
 * Sentry Error Monitoring Module
 *
 * Provides centralized error tracking with:
 * - Lazy initialization (only init once per cold start)
 * - Breadcrumb logging for error context
 * - Sensitive data scrubbing
 * - Serverless-aware flush before response
 */

import * as Sentry from '@sentry/node';

let sentryInitialized = false;

// Environment detection using Netlify's CONTEXT var
const isProduction = process.env.CONTEXT === 'production' || process.env.NODE_ENV === 'production';

/**
 * Initialize Sentry. Safe to call multiple times (no-op after first init).
 */
export function initSentry(): void {
  if (sentryInitialized) return;
  if (!process.env.SENTRY_DSN) {
    // Sentry not configured - skip initialization
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.CONTEXT || process.env.NODE_ENV || 'development',
    tracesSampleRate: isProduction ? 0.1 : 1.0, // 10% in prod, 100% in dev
    sendDefaultPii: false, // Don't auto-send PII

    beforeSend(event) {
      // Scrub sensitive data from user context
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }

      // Scrub request headers
      if (event.request?.headers) {
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
        for (const header of sensitiveHeaders) {
          if (event.request.headers[header]) {
            event.request.headers[header] = '[REDACTED]';
          }
        }
      }

      return event;
    },

    beforeBreadcrumb(breadcrumb) {
      // Filter noisy console breadcrumbs in production
      if (isProduction) {
        if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
          return null;
        }
      }

      // Redact sensitive data from breadcrumb messages
      if (breadcrumb.message) {
        breadcrumb.message = redactSensitiveString(breadcrumb.message);
      }

      return breadcrumb;
    },
  });

  sentryInitialized = true;
}

/**
 * Redact known sensitive patterns from strings
 */
function redactSensitiveString(str: string): string {
  // Redact JWT tokens
  str = str.replace(/eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, '[JWT_REDACTED]');
  // Redact API keys (common patterns)
  str = str.replace(/(?:api[_-]?key|apikey|secret)[=:]\s*["']?[a-zA-Z0-9_-]{20,}["']?/gi, '[API_KEY_REDACTED]');
  return str;
}

/**
 * Generate error ID for support lookup
 * Format: ERR-{timestamp-base36}-{random}
 */
export function generateErrorId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ERR-${timestamp}-${random}`;
}

/**
 * Capture an exception with error ID
 * Returns the error ID for inclusion in user-facing response
 */
export function captureError(error: unknown, context?: Record<string, any>): string {
  const errorId = generateErrorId();

  initSentry(); // Ensure initialized

  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: {
        errorId,
        ...context,
      },
      tags: {
        errorId,
      },
    });
  }

  return errorId;
}

/**
 * Add a breadcrumb for context trail
 */
export function addBreadcrumb(
  category: string,
  message: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, any>
): void {
  initSentry();

  if (process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb({
      category,
      message,
      level,
      data,
      timestamp: Date.now() / 1000,
    });
  }
}

/**
 * CRITICAL: Flush Sentry before returning from serverless function
 * Must be awaited to ensure events are transmitted
 */
export async function flushSentry(timeout = 2000): Promise<void> {
  if (process.env.SENTRY_DSN && sentryInitialized) {
    await Sentry.flush(timeout);
  }
}

/**
 * Set user context for error tracking
 */
export function setUser(userId: string, role?: string): void {
  initSentry();

  if (process.env.SENTRY_DSN) {
    Sentry.setUser({
      id: userId,
      // Note: email intentionally omitted for privacy
      ...(role && { role }),
    });
  }
}

/**
 * Clear user context (call on logout or request end)
 */
export function clearUser(): void {
  if (process.env.SENTRY_DSN) {
    Sentry.setUser(null);
  }
}

// Re-export Sentry for advanced use cases
export { Sentry };
```
  </action>
  <verify>
    `npm run build` succeeds
    `grep "@sentry/node" package.json` returns match
    `ls netlify/functions/_shared/sentry.ts` file exists
  </verify>
  <done>
    sentry.ts module created with init, capture, breadcrumb, and flush functions
  </done>
</task>

<task type="auto">
  <name>Task 2: Integrate Sentry breadcrumbs into logger</name>
  <files>
    netlify/functions/_shared/logger.ts
    netlify/functions/_shared/index.ts
  </files>
  <action>
1. Update `netlify/functions/_shared/logger.ts`:

   - Import `addBreadcrumb` from `./sentry`
   - In the `log()` function, after console output, also add a Sentry breadcrumb
   - Map log levels to Sentry levels: debug->debug, info->info, warn->warning, error->error
   - Only add breadcrumbs for warn and error in production (per CONTEXT.md: "Error + Warn only")
   - Keep existing console logging unchanged

   Add after existing console.log in the log function:
   ```typescript
   // Add Sentry breadcrumb for context trail
   // In production, only capture warn and error level
   const shouldAddBreadcrumb = !isProduction || (level === 'warn' || level === 'error');
   if (shouldAddBreadcrumb) {
     addBreadcrumb(
       functionName,
       message,
       level === 'warn' ? 'warning' : level,
       entry.data
     );
   }
   ```

2. Update `netlify/functions/_shared/index.ts`:

   - Add exports for Sentry utilities:
   ```typescript
   export {
     initSentry,
     captureError,
     addBreadcrumb,
     flushSentry,
     setUser,
     clearUser,
     generateErrorId,
   } from './sentry';
   ```
  </action>
  <verify>
    `npm run build` succeeds
    `grep "addBreadcrumb" netlify/functions/_shared/logger.ts` returns match
    `grep "sentry" netlify/functions/_shared/index.ts` returns match
  </verify>
  <done>
    Logger integrates with Sentry breadcrumbs, sentry utilities exported from index.ts
  </done>
</task>

</tasks>

<verification>
1. Run `npm run build` - should pass without errors
2. Verify sentry.ts exports: initSentry, captureError, addBreadcrumb, flushSentry
3. Verify logger.ts imports and uses addBreadcrumb
4. Verify index.ts re-exports sentry utilities
</verification>

<success_criteria>
- @sentry/node installed
- sentry.ts provides initialization with lazy init pattern
- sentry.ts scrubs sensitive data (emails, API keys, JWTs)
- sentry.ts generates human-readable error IDs (ERR-xxx-xxx format)
- Logger adds Sentry breadcrumbs for warn/error in production
- flushSentry() exported for use before serverless function returns
- Build passes
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-11-production-hardening/PROD-11-02-SUMMARY.md`
</output>
