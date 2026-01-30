# Phase PROD-11: Production Hardening - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Prepare infrastructure for production load — database connection pooling, error monitoring, logging infrastructure, and environment configuration. This phase hardens existing functionality; no new features.

**Scale context:** ~15 concurrent clients, ~10 active proposals at a time.

</domain>

<decisions>
## Implementation Decisions

### Connection Pooling
- Use `@neondatabase/serverless` driver (optimized for serverless, HTTP-based)
- Medium pool size (20-30 connections) — appropriate for expected load
- Queue requests when pool exhausted (wait for connection rather than fail immediately)
- Create `/api/health` endpoint for monitoring DB connectivity
- Expose pool metrics (active, idle, waiting) in health endpoint response

### Claude's Discretion (Pooling)
- Connection timeout handling (fast fail vs patient retry)
- Idle connection keep-alive duration
- Pool configuration approach (single shared pool vs separate read/write)

### Error Handling
- Use Sentry for error monitoring
- Generic user-facing error messages ("Something went wrong") — no technical details exposed
- Keep current API error format (no structural changes)

### Claude's Discretion (Errors)
- Whether to include error IDs (ERR-abc123) for support lookup

### Logging Strategy
- Use Sentry with breadcrumbs (single service for errors + logs)
- Production log levels: Error + Warn only (minimal, lower costs)

### Claude's Discretion (Logging)
- Sensitive data redaction rules
- Request/response body logging policy

### Environment Configuration
- Maintain `.env.example` file with all required vars documented
- Netlify env vars only for secrets management (no external secrets manager)
- Simple env-based feature flags (FEATURE_X_ENABLED=true)
- Warn in dev if sensitive env vars missing (helps local setup)
- Block localhost URLs in production (fail if DATABASE_URL etc contain localhost)

### Claude's Discretion (Environment)
- Startup validation behavior (fail fast vs warn)
- Staging vs production site separation approach
- Runtime environment detection method (NETLIFY_CONTEXT vs NODE_ENV)

</decisions>

<specifics>
## Specific Ideas

- Health endpoint should return pool stats for debugging production issues
- Sentry breadcrumbs provide context trail leading up to errors
- Feature flags enable gradual rollout without code deploys
- Localhost blocking prevents accidental dev config in production

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: PROD-11-production-hardening*
*Context gathered: 2026-01-28*
