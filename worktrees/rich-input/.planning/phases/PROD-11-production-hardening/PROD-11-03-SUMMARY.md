---
phase: PROD-11-production-hardening
plan: 03
subsystem: infra
tags: [zod, environment-validation, configuration, netlify, production-safety]

# Dependency graph
requires:
  - phase: PROD-11-01
    provides: Neon serverless database connection with timeout
  - phase: PROD-11-02
    provides: Sentry error monitoring infrastructure
provides:
  - Zod-based environment validation with fail-fast production mode
  - Localhost detection preventing production misconfiguration
  - Development warnings for missing optional services
  - Comprehensive environment variable documentation
affects: [all future phases, deployment, production monitoring]

# Tech tracking
tech-stack:
  added: [zod (already present, now used for env validation)]
  patterns: [module-load validation, environment detection via CONTEXT, fail-fast production]

key-files:
  created:
    - netlify/functions/_shared/env.ts
  modified:
    - netlify/functions/_shared/index.ts
    - .env.example

key-decisions:
  - "Validate environment on module load (not lazy) to fail fast before any functions execute"
  - "Block localhost URLs in production DATABASE_URL to prevent dev database access"
  - "Warn in development for missing optional vars (SENTRY_DSN, RESEND_API_KEY, etc.) rather than failing"
  - "Use CONTEXT env var for environment detection (Netlify standard) with NODE_ENV fallback"

patterns-established:
  - "Environment detection: isProduction, isDevelopment, isDeployPreview, isBranchDeploy helpers"
  - "Validated env object: Import { env } from './_shared' for type-safe environment access"
  - "Fail-fast production: Throw on validation failure, warn and continue in development"

# Metrics
duration: 1m 48s
completed: 2026-01-28
---

# Phase PROD-11 Plan 03: Environment Validation Summary

**Zod-based environment validation prevents production deployment with localhost DATABASE_URL, missing JWT_SECRET, or unconfigured services**

## Performance

- **Duration:** 1 min 48 sec
- **Started:** 2026-01-28T15:20:36Z
- **Completed:** 2026-01-28T15:22:24Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created env.ts module with comprehensive Zod schema validation
- Blocks localhost and 127.0.0.1 in production DATABASE_URL
- Validates JWT_SECRET minimum 32 characters requirement
- Documents all environment variables including SENTRY_DSN, CONTEXT, RAZORPAY_WEBHOOK_SECRET
- Development mode warns about missing optional services without failing

## Task Commits

Each task was committed atomically:

1. **Task 1: Create env.ts with Zod validation** - `0d66720` (feat)
2. **Task 2: Update .env.example with all variables** - `e788f65` (docs)

## Files Created/Modified

- `netlify/functions/_shared/env.ts` - Environment validation module with Zod schema, blocks localhost in production
- `netlify/functions/_shared/index.ts` - Exports env utilities (env, isProduction, validateEnv, etc.)
- `.env.example` - Added CONTEXT, SENTRY_DSN, RAZORPAY_WEBHOOK_SECRET with explanatory comments

## Decisions Made

**1. Module-load validation (not lazy)**
- Validates environment immediately when module loads
- Rationale: Fail fast before any serverless function executes, prevents partial failures mid-request

**2. Localhost blocking in production**
- Refines DATABASE_URL to reject localhost/127.0.0.1 in production
- Rationale: Prevents production functions from trying to connect to local development database

**3. Development warnings (not errors)**
- Warns about missing SENTRY_DSN, RESEND_API_KEY, RAZORPAY_KEY_ID, R2_ACCOUNT_ID
- Rationale: Allows local development without full service setup, but alerts developer to missing integrations

**4. CONTEXT-based environment detection**
- Uses Netlify's CONTEXT env var (production/deploy-preview/branch-deploy/dev)
- Falls back to NODE_ENV if CONTEXT not set
- Rationale: Netlify's standard environment detection, more accurate than NODE_ENV alone

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without issues.

## User Setup Required

**Environment variables must be configured:**

1. **Production deployment:**
   - Ensure DATABASE_URL does not contain localhost or 127.0.0.1
   - Ensure JWT_SECRET is at least 32 characters (generate with `openssl rand -base64 32`)
   - Set SENTRY_DSN for error monitoring (get from sentry.io)
   - Set RAZORPAY_WEBHOOK_SECRET for webhook verification

2. **Local development:**
   - Copy .env.example to .env
   - Set CONTEXT=dev or CONTEXT=development
   - Optional services will warn if missing but won't prevent startup

3. **Verification:**
   - Start functions locally: `npm run dev`
   - Check console for environment warnings (expected in development)
   - No errors should appear if DATABASE_URL and JWT_SECRET are valid

## Next Phase Readiness

- Environment validation prevents misconfiguration at deploy time
- Clear error messages guide developers to fix environment issues
- Development warnings highlight missing integrations without blocking local work
- Ready for PROD-11-04 (if planned) or next production hardening phase
- All production must-have truths enforced:
  - DATABASE_URL validated (no localhost in production)
  - JWT_SECRET validated (minimum 32 characters)
  - Optional vars documented and warned about in development

---
*Phase: PROD-11-production-hardening*
*Completed: 2026-01-28*
