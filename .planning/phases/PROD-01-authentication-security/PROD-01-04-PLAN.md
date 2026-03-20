# PROD-01-04: Enforce SSL in Production

**Phase:** PROD-01 (Authentication & Security)
**Priority:** Medium
**Estimated Effort:** 30 minutes
**Created:** 2026-01-24

---

## Goal

Remove SSL bypass options and enforce strict certificate validation for all database connections in production environments.

---

## Context

From RESEARCH.md:
- Current: `_shared/db.ts` line 25 allows `DISABLE_SSL_VALIDATION=true` env var to bypass certificate validation in production
- Risk: Man-in-the-middle attacks on database connections if SSL validation disabled
- Fix: Remove bypass option, always enforce SSL validation in production

**Current Code:**
```typescript
function getSSLConfig(): boolean | { rejectUnauthorized: boolean } {
    if (isProduction) {
        // In production, enable SSL with certificate validation
        // Set DISABLE_SSL_VALIDATION=true only if your DB provider requires it
        const disableValidation = process.env.DISABLE_SSL_VALIDATION === 'true';
        return disableValidation ? { rejectUnauthorized: false } : true;
    }
    // ...
}
```

**Target Code:**
```typescript
function getSSLConfig(): boolean | { rejectUnauthorized: boolean } {
    if (isProduction) {
        // Production: ALWAYS enforce SSL certificate validation
        return true;
    }
    // ...
}
```

---

## Tasks

### Task 1: Update Database SSL Configuration

**File:** `netlify/functions/_shared/db.ts`

**Changes:**

**Before (lines 21-35):**
```typescript
function getSSLConfig(): boolean | { rejectUnauthorized: boolean } {
    if (isProduction) {
        // In production, enable SSL with certificate validation
        // Set DISABLE_SSL_VALIDATION=true only if your DB provider requires it
        const disableValidation = process.env.DISABLE_SSL_VALIDATION === 'true';
        return disableValidation ? { rejectUnauthorized: false } : true;
    }

    // In development, check if SSL should be enabled
    if (process.env.DATABASE_SSL === 'true') {
        return { rejectUnauthorized: false };
    }

    return false;
}
```

**After:**
```typescript
function getSSLConfig(): boolean | { rejectUnauthorized: boolean } {
    if (isProduction) {
        // Production: ALWAYS enforce SSL certificate validation
        // This ensures encrypted connections with proper certificate verification
        return true;
    }

    // Development/Staging: Configurable SSL
    // Set DATABASE_SSL=true to enable SSL (useful for staging environments)
    // Set DATABASE_SSL=false to disable SSL (local development only)
    if (process.env.DATABASE_SSL === 'true') {
        // Enable SSL but allow self-signed certificates in development
        return { rejectUnauthorized: false };
    }

    if (process.env.DATABASE_SSL === 'false') {
        // Explicitly disable SSL (local development only)
        return false;
    }

    // Default in development: SSL enabled with self-signed cert support
    // This is safer than completely disabling SSL
    return { rejectUnauthorized: false };
}
```

**Rationale:**
- Production: No escape hatch - SSL always enforced
- Development: More explicit control via DATABASE_SSL env var
- Default: SSL enabled even in development (safer)

**Verification:**
- File compiles without errors
- No references to DISABLE_SSL_VALIDATION remain

### Task 2: Update Environment Variable Documentation

**File:** `.env.example` or `README.md`

**Remove:**
```bash
# DISABLE_SSL_VALIDATION=true  # DO NOT USE IN PRODUCTION
```

**Add:**
```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@host:5432/database

# SSL Configuration (Development/Staging only)
# Production always enforces SSL validation
# Options: true (enable SSL with self-signed support), false (disable - local only)
# Default: true (recommended for staging)
DATABASE_SSL=true
```

**Verification:**
- Documentation updated
- No references to DISABLE_SSL_VALIDATION

### Task 3: Check Other Database Connection Files

**Search for other database clients:**
```bash
grep -r "rejectUnauthorized" --include="*.ts" --include="*.js" --exclude-dir=node_modules
```

**Files to check:**
- `database/migrate.ts`
- `scripts/*` (any scripts that connect to database)
- `landing-page-new/src/lib/db.ts` (if exists)

**Action:**
For each file found, apply the same SSL enforcement logic:
- Production: `ssl: true`
- Development: `ssl: { rejectUnauthorized: false }` if DATABASE_SSL=true
- Default: Safe SSL configuration

**Example for migration scripts:**
```typescript
const isDevelopment = process.env.NODE_ENV !== 'production';

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: isDevelopment
        ? process.env.DATABASE_SSL === 'true'
            ? { rejectUnauthorized: false }
            : false
        : true, // Production: always strict SSL
});
```

**Verification:**
- All database connections use secure SSL config
- No bypass options in production code

### Task 4: Verify Database Provider SSL Support

**Action:**
1. Check database provider documentation (Neon, Supabase, Railway, etc.)
2. Verify SSL certificates are properly configured
3. Test connection with strict SSL validation

**Common Providers:**

**Neon:**
- ✅ Provides valid SSL certificates
- ✅ No additional configuration needed
- Connection string includes `?sslmode=require`

**Supabase:**
- ✅ Provides valid SSL certificates
- ✅ Connection pooler supports SSL
- Use pooler connection string for serverless

**Railway:**
- ✅ Provides valid SSL certificates
- ✅ No additional configuration needed

**Self-hosted PostgreSQL:**
- ⚠️ Requires manual SSL certificate setup
- Generate certificates: `openssl req -new -x509 -days 365 -nodes -text -out server.crt -keyout server.key`
- Configure PostgreSQL: `ssl = on` in postgresql.conf

**Verification:**
```bash
# Test SSL connection
psql "postgresql://user:password@host:5432/database?sslmode=require"
# Should connect without errors
```

### Task 5: Update Deployment Configuration

**Netlify Environment Variables:**

1. Go to Netlify dashboard → Site settings → Environment variables
2. Verify `DATABASE_URL` is set correctly
3. Verify `NODE_ENV=production` is set
4. Remove `DISABLE_SSL_VALIDATION` if it exists
5. Ensure no `DATABASE_SSL` variable (production uses default SSL)

**Staging Environment:**

If you have a staging environment:
1. Set `NODE_ENV=staging` or `NODE_ENV=development`
2. Set `DATABASE_SSL=true` (enables SSL with self-signed support)
3. Test database connectivity

**Verification:**
- Production env vars configured correctly
- Staging env vars configured correctly
- No SSL bypass variables in production

### Task 6: Test Database Connectivity

**Local Development Test:**
```bash
# Test with SSL enabled
DATABASE_SSL=true npm run dev
# Should connect successfully

# Test with SSL disabled (local only)
DATABASE_SSL=false npm run dev
# Should connect successfully
```

**Staging Test:**
```bash
# Deploy to staging
npm run deploy:staging

# Check function logs for database connection
netlify functions:log

# Should see successful database connections
# Should NOT see SSL errors
```

**Production Test:**
```bash
# Deploy to production
npm run deploy:production

# Monitor logs for SSL-related errors
netlify functions:log --production

# Execute a test query through an endpoint
curl https://your-domain.com/.netlify/functions/health-check

# Should return success (indicates DB connection working)
```

**Verification:**
- Local development connects with and without SSL
- Staging connects with SSL validation disabled
- Production connects with strict SSL validation
- No connection errors in logs

---

## Verification Steps

### 1. Code Audit
```bash
# Search for SSL bypass code
grep -r "DISABLE_SSL_VALIDATION" --include="*.ts" --include="*.js" --exclude-dir=node_modules

# Expected: Zero results
```

### 2. Environment Variable Audit
```bash
# Check .env files
grep "DISABLE_SSL_VALIDATION" .env .env.example .env.production .env.local 2>/dev/null

# Expected: Zero results or commented out
```

### 3. Production Connection Test
```bash
# From production environment
NODE_ENV=production node -e "
const { Client } = require('pg');
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true, // Strict validation
});
client.connect()
    .then(() => console.log('✅ Production SSL connection successful'))
    .catch(err => console.error('❌ SSL connection failed:', err.message))
    .finally(() => client.end());
"
```

### 4. Certificate Validation Test
```bash
# Test SSL certificate validity
openssl s_client -connect your-database-host.com:5432 -starttls postgres

# Look for:
# ✅ Verify return code: 0 (ok)
# ❌ Verify return code: 20 (unable to verify) - indicates invalid certificate
```

---

## Success Criteria

- [ ] `_shared/db.ts` removes DISABLE_SSL_VALIDATION option
- [ ] Production always uses `ssl: true` (strict validation)
- [ ] Development has explicit SSL control via DATABASE_SSL env var
- [ ] All other database connection files updated
- [ ] Environment variables updated (remove DISABLE_SSL_VALIDATION)
- [ ] Database provider supports SSL certificates
- [ ] Local development connects successfully
- [ ] Staging connects successfully
- [ ] Production connects successfully with strict SSL
- [ ] No SSL bypass variables in production environment

---

## Rollback Plan

If SSL enforcement breaks production:

1. **Immediate:**
   ```typescript
   // Temporary hotfix in _shared/db.ts
   return process.env.EMERGENCY_DISABLE_SSL === 'true'
       ? { rejectUnauthorized: false }
       : true;
   ```

2. **Investigation:**
   - Check database provider SSL certificate status
   - Verify connection string includes SSL parameters
   - Review database provider documentation

3. **Permanent Fix:**
   - Configure database SSL certificates properly
   - Update connection string if needed
   - Remove hotfix once SSL working

---

## Dependencies

**Requires:**
- None (independent from other Phase 1 tasks)

**Blocks:**
- None (can run in parallel with other tasks)

---

## Notes

**Why Enforce SSL?**
- Prevents man-in-the-middle attacks on database traffic
- Ensures data in transit is encrypted
- Required for compliance (GDPR, HIPAA, SOC 2)
- Industry best practice

**PostgreSQL SSL Modes:**
- `disable`: No SSL (insecure)
- `allow`: Try SSL, fallback to non-SSL (insecure)
- `prefer`: Try SSL, fallback to non-SSL (insecure)
- `require`: Require SSL but don't verify certificate (partial)
- `verify-ca`: Require SSL and verify certificate authority (secure)
- `verify-full`: Require SSL and verify hostname (most secure)

Our implementation:
- Production: `ssl: true` (equivalent to verify-full)
- Development: `ssl: { rejectUnauthorized: false }` (equivalent to require)

**Database Provider Notes:**
- Most modern cloud providers (Neon, Supabase, Railway) have SSL enabled by default
- Self-hosted PostgreSQL requires manual certificate configuration
- Connection poolers (PgBouncer, etc.) may need separate SSL configuration

---

## Health Check Endpoint (Optional Enhancement)

**File:** `netlify/functions/health-check.ts` (new file)

```typescript
import { query } from './_shared/db';

export const handler = async () => {
    try {
        await query('SELECT 1');
        return {
            statusCode: 200,
            body: JSON.stringify({
                status: 'healthy',
                database: 'connected',
                ssl: process.env.NODE_ENV === 'production' ? 'enforced' : 'configurable',
            }),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                status: 'unhealthy',
                database: 'disconnected',
                error: error.message,
            }),
        };
    }
};
```

Use this endpoint to verify database connectivity after deployment.

---

*Plan ready for execution via /gsd:execute-phase*
