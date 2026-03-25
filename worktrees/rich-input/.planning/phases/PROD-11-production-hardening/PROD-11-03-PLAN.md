---
phase: PROD-11-production-hardening
plan: 03
type: execute
wave: 2
depends_on: ["PROD-11-01", "PROD-11-02"]
files_modified:
  - netlify/functions/_shared/env.ts
  - netlify/functions/_shared/index.ts
  - .env.example
autonomous: true

must_haves:
  truths:
    - "Production startup fails if DATABASE_URL contains localhost"
    - "Production startup fails if JWT_SECRET is missing or too short"
    - "Development warns about missing optional vars"
    - "All env vars are documented in .env.example"
  artifacts:
    - path: "netlify/functions/_shared/env.ts"
      provides: "Zod-based environment validation"
      exports: ["env", "validateEnv", "isProduction"]
    - path: ".env.example"
      provides: "Environment variable documentation"
      contains: "SENTRY_DSN"
  key_links:
    - from: "netlify/functions/_shared/env.ts"
      to: "zod"
      via: "schema validation"
      pattern: "z\\.object"
    - from: "netlify/functions/_shared/env.ts"
      to: "process.env.CONTEXT"
      via: "Netlify environment detection"
      pattern: "process\\.env\\.CONTEXT"
---

<objective>
Add Zod-based environment validation with fail-fast in production.

Purpose: Prevent production deployment with invalid configuration. Catch localhost URLs in production DATABASE_URL, missing JWT_SECRET, and document all environment variables for easier setup.

Output:
- New env.ts module with Zod schema validation
- Updated .env.example with all environment variables
- Clear error messages for misconfiguration
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
@netlify/functions/_shared/index.ts
@.env.example
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create env.ts with Zod validation</name>
  <files>
    netlify/functions/_shared/env.ts
    netlify/functions/_shared/index.ts
  </files>
  <action>
1. Create `netlify/functions/_shared/env.ts`:

```typescript
/**
 * Environment Validation Module
 *
 * Validates all environment variables at startup using Zod:
 * - Fail fast in production if required vars missing
 * - Block localhost URLs in production DATABASE_URL
 * - Warn in development about missing optional vars
 */

import { z } from 'zod';

// Detect environment using Netlify's CONTEXT var (falls back to NODE_ENV)
const context = process.env.CONTEXT || process.env.NODE_ENV || 'development';
export const isProduction = context === 'production';
export const isDevelopment = context === 'development' || context === 'dev';
export const isDeployPreview = context === 'deploy-preview';
export const isBranchDeploy = context === 'branch-deploy';

/**
 * Environment variable schema
 */
const envSchema = z.object({
  // Required in all environments
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required').refine(
    (url) => {
      // Block localhost/127.0.0.1 in production
      if (isProduction && (url.includes('localhost') || url.includes('127.0.0.1'))) {
        return false;
      }
      return true;
    },
    { message: 'DATABASE_URL cannot contain localhost in production' }
  ),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // Netlify-provided (optional, auto-set by Netlify)
  CONTEXT: z.enum(['production', 'deploy-preview', 'branch-deploy', 'dev', 'development']).optional(),
  SITE_NAME: z.string().optional(),
  SITE_ID: z.string().optional(),
  URL: z.string().optional(),
  DEPLOY_URL: z.string().optional(),

  // API URLs
  VITE_API_URL: z.string().optional(),
  NEXT_PUBLIC_API_URL: z.string().optional(),
  PORTAL_URL: z.string().optional(),
  APP_URL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),

  // Error monitoring (strongly recommended)
  SENTRY_DSN: z.string().url().optional(),

  // Email service
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  ADMIN_NOTIFICATION_EMAIL: z.string().email().optional(),

  // Storage (R2)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  // Payment (Razorpay)
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),

  // SSL configuration (development only)
  DATABASE_SSL: z.enum(['true', 'false']).optional(),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),

  // Rate limiting
  RATE_LIMIT_MAGIC_LINK: z.string().optional(),
  RATE_LIMIT_LOGIN: z.string().optional(),
  RATE_LIMIT_API: z.string().optional(),

  // CORS
  CORS_ALLOWED_ORIGINS: z.string().optional(),

  // Feature flags
  ENABLE_RATE_LIMITING: z.enum(['true', 'false']).optional(),
  ENABLE_STRICT_CORS: z.enum(['true', 'false']).optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validation result with warnings for development
 */
interface ValidationResult {
  env: Env;
  warnings: string[];
  valid: boolean;
}

/**
 * Validate environment variables
 * - Throws in production if validation fails
 * - Returns warnings in development
 */
function validateEnv(): ValidationResult {
  const result = envSchema.safeParse(process.env);
  const warnings: string[] = [];

  if (!result.success) {
    const errors = result.error.format();
    const errorMessages = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`
    );

    console.error('Environment validation failed:');
    errorMessages.forEach((msg) => console.error(`  - ${msg}`));

    if (isProduction) {
      throw new Error(
        `Invalid production environment configuration:\n${errorMessages.join('\n')}`
      );
    }

    // In development, warn but continue
    warnings.push(...errorMessages);
  }

  // Check recommended vars in development
  if (!isProduction) {
    if (!process.env.SENTRY_DSN) {
      warnings.push('SENTRY_DSN not set - error monitoring disabled');
    }
    if (!process.env.RESEND_API_KEY) {
      warnings.push('RESEND_API_KEY not set - email sending disabled');
    }
    if (!process.env.RAZORPAY_KEY_ID) {
      warnings.push('RAZORPAY_KEY_ID not set - payment processing disabled');
    }
    if (!process.env.R2_ACCOUNT_ID) {
      warnings.push('R2_ACCOUNT_ID not set - file storage disabled');
    }
  }

  // Log warnings once on startup (only in development)
  if (warnings.length > 0 && !isProduction) {
    console.warn('Environment warnings:');
    warnings.forEach((w) => console.warn(`  - ${w}`));
  }

  return {
    env: result.success ? result.data : (process.env as unknown as Env),
    warnings,
    valid: result.success,
  };
}

// Validate on module load
const validationResult = validateEnv();

/**
 * Validated environment variables
 * Access via env.DATABASE_URL, env.JWT_SECRET, etc.
 */
export const env = validationResult.env;

/**
 * Validation warnings (empty in production, may have warnings in dev)
 */
export const envWarnings = validationResult.warnings;

/**
 * Whether environment validation passed
 */
export const envValid = validationResult.valid;

/**
 * Re-export validateEnv for testing or manual re-validation
 */
export { validateEnv };
```

2. Update `netlify/functions/_shared/index.ts` to export env utilities:

   Add at the end of the file:
   ```typescript
   export {
     env,
     envWarnings,
     envValid,
     isProduction,
     isDevelopment,
     isDeployPreview,
     isBranchDeploy,
     validateEnv,
   } from './env';
   ```
  </action>
  <verify>
    `npm run build` succeeds
    `ls netlify/functions/_shared/env.ts` file exists
    `grep "localhost.*production" netlify/functions/_shared/env.ts` returns match
    `grep "env" netlify/functions/_shared/index.ts` returns match
  </verify>
  <done>
    env.ts validates all environment variables with Zod, blocks localhost in production
  </done>
</task>

<task type="auto">
  <name>Task 2: Update .env.example with all variables</name>
  <files>
    .env.example
  </files>
  <action>
Update `.env.example` to include:

1. Add CONTEXT variable section (Netlify-provided):
   ```
   # -----------------------------------------------------------------------------
   # Netlify Environment (auto-set by Netlify, set manually for local dev)
   # -----------------------------------------------------------------------------
   # Values: production | deploy-preview | branch-deploy | dev
   CONTEXT=dev
   ```

2. Add Sentry configuration section:
   ```
   # -----------------------------------------------------------------------------
   # Error Monitoring - Sentry (Recommended)
   # -----------------------------------------------------------------------------
   # Get DSN from https://sentry.io -> Project Settings -> Client Keys
   # SENTRY_DSN=https://xxxx@o123.ingest.sentry.io/456
   ```

3. Add Razorpay webhook secret (missing from current example):
   ```
   # Webhook secret for verifying Razorpay webhook signatures
   # Get from https://dashboard.razorpay.com/app/webhooks
   RAZORPAY_WEBHOOK_SECRET=xxxxx
   ```

4. Reorganize sections for clarity:
   - Group required vs optional clearly
   - Add comments explaining when each variable is needed
   - Ensure all variables from env.ts schema are documented
  </action>
  <verify>
    `grep "SENTRY_DSN" .env.example` returns match
    `grep "CONTEXT" .env.example` returns match
    `grep "RAZORPAY_WEBHOOK_SECRET" .env.example` returns match
  </verify>
  <done>
    .env.example documents all environment variables including SENTRY_DSN and CONTEXT
  </done>
</task>

</tasks>

<verification>
1. Run `npm run build` - should pass without errors
2. Verify env.ts exports: env, isProduction, validateEnv
3. Verify .env.example contains SENTRY_DSN, CONTEXT, all required vars
4. Test locally: Remove DATABASE_URL and verify warning in dev
5. Test validation: Set CONTEXT=production with localhost DATABASE_URL, verify error
</verification>

<success_criteria>
- env.ts uses Zod for type-safe validation
- Production fails fast if DATABASE_URL contains localhost
- Production fails fast if JWT_SECRET missing or < 32 chars
- Development logs warnings for missing optional vars
- .env.example documents all variables with clear comments
- Build passes
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-11-production-hardening/PROD-11-03-SUMMARY.md`
</output>
