---
phase: PROD-11-production-hardening
plan: 02
subsystem: infra
tags: [sentry, error-monitoring, logging, breadcrumbs, serverless]

# Dependency graph
requires:
  - phase: PROD-11-01
    provides: Neon HTTP driver and health endpoint
provides:
  - Centralized error monitoring with Sentry integration
  - Breadcrumb-based logging for error context
  - Sensitive data scrubbing across error events
  - Serverless-aware error tracking with flush support
affects: [all-phases]

# Tech tracking
tech-stack:
  added: [@sentry/node v10.37.0]
  patterns:
    - Lazy Sentry initialization (init once per cold start)
    - Breadcrumb integration with structured logging
    - Production-only error/warn breadcrumb capture
    - Sensitive data redaction (JWT, API keys, emails)

key-files:
  created:
    - netlify/functions/_shared/sentry.ts
  modified:
    - netlify/functions/_shared/logger.ts
    - netlify/functions/_shared/index.ts
    - package.json

key-decisions:
  - "Lazy initialization pattern: initSentry() is no-op if already initialized, safe to call multiple times"
  - "Environment detection via Netlify CONTEXT var or NODE_ENV fallback"
  - "Trace sample rate: 10% in production, 100% in development"
  - "Production breadcrumb filtering: only warn and error levels captured to reduce noise"
  - "Human-readable error IDs: ERR-{timestamp-base36}-{random} format for support lookups"
  - "Sensitive data scrubbing: JWT tokens, API keys, authorization headers, cookies redacted"
  - "Privacy-first user context: email and IP address intentionally excluded"

patterns-established:
  - "Sentry breadcrumb integration: logger.ts automatically adds breadcrumbs on each log call"
  - "Serverless flush pattern: flushSentry() must be awaited before function returns"
  - "Shared exports: all Sentry utilities exported from _shared/index.ts for easy importing"

# Metrics
duration: 3min
completed: 2026-01-28
---

# Phase PROD-11 Plan 02: Sentry Error Monitoring Summary

**Sentry error monitoring with breadcrumb-based logging, sensitive data scrubbing, and serverless-aware flush support**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-28T15:14:01Z
- **Completed:** 2026-01-28T15:17:08Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Sentry error monitoring module with lazy initialization and privacy controls
- Logger automatically adds breadcrumbs to provide error context trail
- Sensitive data scrubbing (JWT tokens, API keys, emails, auth headers)
- Human-readable error IDs (ERR-xxx-xxx format) for support lookup
- Production-optimized breadcrumb filtering (warn/error only)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @sentry/node and create sentry.ts module** - `243e4a3` (feat)
2. **Task 2: Integrate Sentry breadcrumbs into logger** - `b8101d2` (feat)

## Files Created/Modified
- `netlify/functions/_shared/sentry.ts` - Sentry initialization with lazy init, error capture, breadcrumbs, sensitive data scrubbing, user context, and serverless flush
- `netlify/functions/_shared/logger.ts` - Added addBreadcrumb integration after console logging in both createLogger and createLoggerWithContext
- `netlify/functions/_shared/index.ts` - Exported all Sentry utilities (initSentry, captureError, addBreadcrumb, flushSentry, setUser, clearUser, generateErrorId)
- `package.json` - Added @sentry/node v10.37.0 dependency

## Decisions Made

**1. Lazy initialization pattern**
- initSentry() checks sentryInitialized flag and is no-op if already initialized
- Safe to call multiple times without duplicate initialization
- Ensures Sentry initialized before first use in serverless cold start

**2. Production breadcrumb filtering**
- Only warn and error level breadcrumbs captured in production
- Reduces noise from debug/info logs
- Aligns with CONTEXT.md requirement: "Error + Warn only"

**3. Sensitive data scrubbing**
- beforeSend hook scrubs email, IP address, authorization headers, cookies
- beforeBreadcrumb hook redacts JWT tokens and API keys from messages
- Privacy-first: user context excludes email even though Sentry supports it

**4. Human-readable error IDs**
- Format: ERR-{timestamp-base36}-{random}
- Example: ERR-LQWR5C3-A4KT
- Base36 timestamp for sortability, random suffix for uniqueness
- Included in both Sentry tags and extra data for searchability

**5. Environment detection**
- Uses Netlify's CONTEXT env var (production, deploy-preview, branch-deploy, dev)
- Falls back to NODE_ENV if CONTEXT not available
- Trace sample rate: 10% in production, 100% in development

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration.**

Before Sentry monitoring works, add to environment variables:

```bash
SENTRY_DSN=https://your-sentry-dsn@sentry.io/your-project-id
```

**Setup steps:**
1. Create Sentry account at https://sentry.io
2. Create new project (select Node.js platform)
3. Copy DSN from project settings
4. Add SENTRY_DSN to Netlify environment variables
5. Deploy to enable error tracking

**Verification:**
```bash
# Sentry will be initialized on first serverless function invocation
# Check Sentry dashboard for incoming events
```

**Note:** Sentry module is designed to work without SENTRY_DSN set (no-op mode). Development and testing work normally without Sentry configuration.

## Next Phase Readiness

- Error monitoring infrastructure complete
- Ready for PROD-11-03: Integration of captureError() into existing error handlers
- Ready for PROD-11-04: Webhook and payment error monitoring
- flushSentry() available for serverless functions (must await before returning response)
- Breadcrumbs automatically captured via logger (no additional integration needed)

**No blockers.**

---
*Phase: PROD-11-production-hardening*
*Completed: 2026-01-28*
