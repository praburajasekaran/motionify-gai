# Codebase Concerns

**Analysis Date:** 2026-01-19

## Tech Debt

**Mock Authentication System:**
- Issue: Entire authentication system uses mock data and localStorage sessions
- Files: `contexts/AuthContext.tsx`, `landing-page-new/src/context/AuthContext.tsx`
- Impact: No real session management, security vulnerabilities, cannot deploy to production
- Fix approach: Implement real JWT-based authentication with magic link tokens, replace `setMockUser()` with proper session handling, migrate from localStorage to secure httpOnly cookies
- Priority: Critical - blocks production deployment

**Dual Codebase Structure:**
- Issue: Two parallel applications (root React app and `landing-page-new/` Next.js app) with overlapping functionality
- Files: Root level vs `landing-page-new/src/`
- Impact: Code duplication, inconsistent state management, difficulty maintaining feature parity
- Fix approach: Consolidate into single Next.js application or clearly separate concerns (landing vs portal), establish shared component library
- Priority: High - increases maintenance burden

**localStorage as Primary Data Store:**
- Issue: Critical application data stored in browser localStorage instead of database
- Files: `contexts/AuthContext.tsx`, `landing-page-new/src/lib/portal/AppContext.tsx`
- Impact: Data loss on browser clear, no multi-device sync, scalability issues
- Fix approach: Migrate all data persistence to PostgreSQL backend, use localStorage only for caching
- Priority: Critical - 57 instances across 18 files

**Incomplete Migration to Backend:**
- Issue: Many features have UI implemented but still use mock data instead of API calls
- Files: 149 files contain references to `mock` or `MOCK_` constants
- Impact: Features appear complete but don't persist data, confusing user experience
- Fix approach: Complete backend integration for all features, remove mock data
- Priority: High - affects user trust and data integrity

**Missing Super Admin Role Verification:**
- Issue: Multiple admin endpoints lack role verification from session/JWT
- Files: `netlify/functions/users-list.ts`, `netlify/functions/users-delete.ts`, `netlify/functions/users-update.ts`
- Impact: Any authenticated user could potentially perform admin operations
- Fix approach: Implement JWT verification middleware, add role check before all admin operations
- Priority: Critical - security vulnerability

**Excessive TypeScript Suppressions:**
- Issue: ErrorBoundary component uses 7 `@ts-ignore` statements to bypass type checking
- Files: `components/ErrorBoundary.tsx`
- Impact: Type safety compromised, potential runtime errors
- Fix approach: Fix actual type issues - properly type React class component state and props
- Priority: Medium - technical debt accumulation

## Known Bugs

**Missing Email Implementation:**
- Symptoms: Email notifications logged to console instead of sent
- Files: `netlify/functions/invitations-create.ts`, `netlify/functions/users-delete.ts`
- Trigger: Any action requiring email notification (invites, deactivation, project requests)
- Workaround: Check server console logs for simulated email content
- Priority: Critical - core feature not working

**Last Super Admin Protection:**
- Symptoms: System allows deactivating last Super Admin despite check
- Files: `netlify/functions/users-delete.ts` (line 74 TODO)
- Trigger: Attempt to deactivate the only remaining Super Admin
- Workaround: Logic exists but needs testing and completion
- Priority: High - can lock out entire system

## Security Considerations

**Database SSL Configuration:**
- Risk: All 27 database connections disable SSL certificate verification
- Files: All files in `netlify/functions/` containing `ssl: { rejectUnauthorized: false }`
- Current mitigation: None - SSL validation completely disabled
- Recommendations: Use proper SSL certificates for production database, enable certificate verification, use connection pooling
- Priority: Critical - man-in-the-middle attack vulnerability

**Excessive Console Logging:**
- Risk: Sensitive data potentially logged in production
- Files: 253 occurrences across 50 files including payment flows, authentication
- Current mitigation: None - console statements active in all environments
- Recommendations: Replace console.log with proper logging service, add environment checks, redact sensitive data
- Priority: High - PCI compliance and privacy concerns

**Type Safety Gaps:**
- Risk: Liberal use of `any` type bypasses TypeScript safety
- Files: 52 occurrences across 30 files
- Current mitigation: Some isolated to specific problematic areas
- Recommendations: Replace `any` with proper types, use `unknown` when type is truly dynamic
- Priority: Medium - increases runtime error risk

**Empty Catch Blocks:**
- Risk: Errors silently swallowed without handling
- Files: `netlify/functions/invitations-create.ts`, multiple files with `catch () {}` or `catch (e) {}`
- Current mitigation: None - errors ignored
- Recommendations: Log all errors, implement error reporting service, provide user feedback
- Priority: High - debugging nightmare in production

## Performance Bottlenecks

**Per-Request Database Connections:**
- Problem: Every Netlify function creates new PostgreSQL connection
- Files: All 27 files in `netlify/functions/` with `getDbClient()` pattern
- Cause: No connection pooling, connections created/destroyed per request
- Improvement path: Implement connection pooling with pg-pool, consider serverless-friendly database like Supabase
- Priority: High - will cause database connection exhaustion under load

**Large Component Files:**
- Problem: Extremely complex components with high cyclomatic complexity
- Files:
  - `landing-page-new/src/app/api/payments/__tests__/payments.test.ts` (982 lines)
  - `netlify/functions/tasks.ts` (862 lines)
  - `pages/ProjectDetail.tsx` (1,164 lines)
  - `landing-page-new/src/lib/portal/AppContext.tsx` (745 lines)
- Cause: Lack of component decomposition, mixing concerns
- Improvement path: Split into smaller focused components, extract business logic into services
- Priority: Medium - affects maintainability and testing

**Inefficient State Updates:**
- Problem: Excessive React hooks in large components causing re-renders
- Files: Large components like `ProjectDetail.tsx`, `AppContext.tsx`
- Cause: Deeply nested state, lack of memoization
- Improvement path: Use React.memo, useMemo, useCallback, consider state management library
- Priority: Medium - UI lag with complex state

## Fragile Areas

**Magic Link Token Cleanup:**
- Files: `netlify/functions/auth-verify-magic-link.ts`, `database/schema.sql`
- Why fragile: No automatic token expiry cleanup, tokens accumulate indefinitely
- Safe modification: Add scheduled cleanup function, index expires_at column
- Test coverage: No automated tests found
- Priority: Medium - database bloat over time

**Permission System:**
- Files: `lib/permissions.ts`, `utils/deliverablePermissions.ts`
- Why fragile: Complex role-based logic scattered across codebase
- Safe modification: Centralize all permission checks, add unit tests for each permission
- Test coverage: Manual testing documented in docs/PERMISSION_AUDIT_REPORT.md
- Priority: High - security-critical code

**Error Boundary Implementation:**
- Files: `components/ErrorBoundary.tsx`
- Why fragile: Heavy use of type suppressions, class component in hooks-based codebase
- Safe modification: Rewrite as functional component with error boundary hook, fix type issues
- Test coverage: None detected
- Priority: Medium - critical error handling path

**Task State Machine:**
- Files: `landing-page-new/src/lib/portal/utils/taskStateTransitions.ts`
- Why fragile: Complex state transition logic, no validation enforcement at API level
- Safe modification: Add state transition tests, enforce transitions in backend
- Test coverage: UI tests only via e2e/admin-functional.spec.ts
- Priority: Medium - can result in invalid task states

## Scaling Limits

**Netlify Functions Architecture:**
- Current capacity: Cold start per function invocation, 10-second timeout
- Limit: High-latency database queries will timeout
- Scaling path: Migrate to long-running API server (Express/Fastify), implement connection pooling
- Priority: High - will fail under production load

**File Storage Approach:**
- Current capacity: Cloudflare R2 configured but not fully integrated
- Limit: Large file uploads may timeout in serverless functions
- Scaling path: Implement direct-to-R2 presigned URLs, client-side chunked uploads
- Priority: Medium - documented in docs/R2_LIFECYCLE.md

**Session Storage:**
- Current capacity: localStorage limited to ~5-10MB per domain
- Limit: Cannot scale beyond single browser
- Scaling path: Migrate to JWT tokens with server-side session store
- Priority: Critical - blocks multi-device support

## Dependencies at Risk

**@ts-ignore Usage:**
- Risk: TypeScript suppressions indicate underlying type incompatibilities
- Impact: Future TypeScript upgrades may break
- Migration plan: Fix actual type issues, upgrade to latest @types packages
- Priority: Low - contained to specific components

**Dual Next.js Instances:**
- Risk: Running both Vite dev server and Next.js dev server simultaneously
- Impact: Port conflicts, resource consumption
- Migration plan: Consolidate to single framework per VERTICAL_SLICE_PLAN.md
- Priority: Medium - developer experience issue

## Missing Critical Features

**No Logging Infrastructure:**
- Problem: All logging via console.log with no aggregation
- Blocks: Production debugging, error monitoring, audit trails
- Priority: High - cannot troubleshoot production issues

**No Rate Limiting:**
- Problem: API endpoints unprotected from abuse
- Blocks: Production deployment, security compliance
- Priority: Critical - DoS vulnerability

**No Input Validation:**
- Problem: Limited request validation in Netlify functions
- Blocks: Data integrity, security hardening
- Priority: High - SQL injection and data corruption risk

**No Database Migrations:**
- Problem: Multiple `.sql` files in `database/` folder with no migration system
- Blocks: Schema versioning, safe deployments
- Priority: High - cannot track schema changes

**No Integration Tests:**
- Problem: Only E2E tests (Playwright) exist, no API integration tests
- Blocks: Backend confidence, refactoring safety
- Priority: Medium - high regression risk

## Test Coverage Gaps

**Netlify Functions:**
- What's not tested: All 27 serverless functions have no unit tests
- Files: Entire `netlify/functions/` directory
- Risk: API changes can break silently
- Priority: High - critical business logic untested

**Payment Flow:**
- What's not tested: Razorpay integration has mock tests only
- Files: `landing-page-new/src/app/api/payments/__tests__/payments.test.ts` (982 lines of mocks)
- Risk: Real payment failures in production
- Priority: Critical - financial transactions at risk

**Permission System:**
- What's not tested: No automated tests for permission checks
- Files: `lib/permissions.ts`, `utils/deliverablePermissions.ts`
- Risk: Authorization bypass vulnerabilities
- Priority: Critical - security controls unverified

**Database Schema:**
- What's not tested: No schema validation tests
- Files: `database/schema.sql` and multiple migration files
- Risk: Schema drift, constraint violations
- Priority: High - data integrity issues

**File Upload/Download:**
- What's not tested: R2 integration incomplete, no upload tests
- Files: `services/storage.ts`, R2 presign endpoints
- Risk: File corruption, access control bypass
- Priority: High - core deliverable feature

**Magic Link Authentication:**
- What's not tested: Token generation and validation logic
- Files: `netlify/functions/auth-request-magic-link.ts`, `netlify/functions/auth-verify-magic-link.ts`
- Risk: Authentication bypass, token replay attacks
- Priority: Critical - primary authentication method

---

*Concerns audit: 2026-01-19*
