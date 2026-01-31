# Lessons Learned: Motionify Project

A retrospective analysis of patterns, mistakes, and frameworks for becoming a better software engineer — based on the full development journey of the Motionify portal (2026-01-20 to 2026-01-29).

---

## Table of Contents

1. [The Biggest Recurring Mistake](#1-the-biggest-recurring-mistake)
2. [Architecture Mistakes](#2-architecture-mistakes)
3. [Planning & Estimation Mistakes](#3-planning--estimation-mistakes)
4. [What You Did Well](#4-what-you-did-well)
5. [Frameworks for Your Next Project](#5-frameworks-for-your-next-project)
6. [Prompting Skills Improvement](#6-prompting-skills-improvement)
7. [Checklist for Production Readiness](#7-checklist-for-production-readiness)

---

## 1. The Biggest Recurring Mistake

### The `credentials: 'include'` Problem

This single issue consumed **4 separate phases** of work:

| Phase | What Happened | Files Fixed |
|-------|--------------|-------------|
| Phase 5 | Credential wiring fix | 4 fetch calls |
| PROD-01-05 | Frontend cookie migration | 9 fetch calls |
| PROD-08-02 | Inquiries credentials | 3 fetch calls |
| PROD-13 | Credential wiring (again) | 7 fetch calls |

**Total: 23 fetch calls fixed across 4 phases over 9 days.**

Each time you thought the problem was solved, the milestone audit found more. This is the textbook case of a **systemic problem being treated with spot fixes**.

### Root Cause

There was no centralized fetch wrapper. Every API call was a raw `fetch()` with manually added options. When authentication moved from Bearer tokens to httpOnly cookies, every single `fetch()` call needed updating — and there were 37+ of them spread across `lib/proposals.ts`, `lib/inquiries.ts`, `lib/comments.ts`, `lib/attachments.ts`, `services/paymentApi.ts`, `NotificationContext.tsx`, and `CommentThread.tsx`.

### The Fix You Should Have Built

```typescript
// lib/api-client.ts
const API_BASE = import.meta.env.VITE_API_URL || '';

export async function apiFetch(path: string, options: RequestInit = {}) {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',  // ALWAYS included
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}
```

One file. One change. Zero phases needed for credential wiring.

### Framework: The DRY Infrastructure Rule

> Before writing the second instance of any cross-cutting concern (auth headers, error handling, base URLs, CORS), create a shared abstraction. The cost of creating it is 5 minutes. The cost of not creating it is entire phases of work finding and fixing every instance.

**Cross-cutting concerns that always need centralization:**
- HTTP client configuration (headers, credentials, base URL)
- Error handling patterns
- Authentication token attachment
- Request/response logging
- Retry logic

---

## 2. Architecture Mistakes

### 2a. No API Client Layer From Day One

You built `lib/proposals.ts`, `lib/inquiries.ts`, `lib/comments.ts`, `lib/attachments.ts`, and `services/paymentApi.ts` — five separate files, each with their own `fetch()` calls, their own error handling, their own base URL construction. When a cross-cutting change was needed (credentials), you had to touch every file.

**Next project:** Start with a single API client module. Every domain module imports from it. TanStack Query was already in the project — you could have used a custom `queryFn` wrapper that handled credentials globally.

### 2b. Two Portals, Duplicated Components

The admin portal (Vite SPA) and client portal (Next.js) share components like `CommentThread`, `CommentItem`, `CommentInput`, `ErrorState`, and `EmptyState` — but they're duplicated, not shared. Every bug fix and feature change had to be applied twice. The STATE.md even documents "Applied to both admin and client portal" repeatedly.

**Next project:** If you're going to have two frontends, consider:
- A shared component package (`packages/ui/`) in a monorepo
- Or a single framework (pick Next.js or Vite, not both)
- At minimum, shared utility functions (`lib/`) imported by both

### 2c. Polling Instead of Real-Time (The Right Call, Poorly Documented)

You chose 10-second polling over Ably/WebSocket for real-time comments. This was actually a good v1 decision. But the rationale wasn't established upfront in the requirements — it was discovered during research and became a "deferred to v2" item. This means the polling infrastructure was designed as temporary, leading to code that's neither optimized for polling (no ETags, no conditional requests) nor ready for WebSocket upgrade.

**Next project:** When you make a "good enough for now" decision, design the code as if that IS the final solution. Don't half-commit. If polling is the answer, optimize polling (ETags, 304 responses, exponential backoff on idle tabs).

### 2d. Migration Numbering Collisions

The planning docs reference PROD-13 as "Credential Wiring," but there's also a PROD-13 as "Extended Testing." The phases directory has both `PROD-13-credential-wiring/` and `PROD-13-extended-testing/`. One got renumbered to PROD-14, but the overlap caused confusion in planning documents. The deleted files in git status (`PROD-13-credential-wiring/`) confirm the renumbering happened mid-flight.

**Next project:** Use immutable identifiers. Once a phase gets a number, it keeps it forever. If priorities change, insert decimal phases (13.1) or use meaningful slugs instead of sequential numbers.

---

## 3. Planning & Estimation Mistakes

### 3a. "Quick Depth" Became 19 Phases

The project started as:
> Mode: YOLO | Depth: Quick (3 phases)

It ended as 6 v1 phases + 13 PROD phases = **19 phases total**. The original "3 phase" estimate was off by 6x.

This happened because:
1. **The scope expanded** from "comment thread feature" to "full production-ready portal"
2. **Verification revealed gaps** that required new phases (Phase 4, 5, 6 were all gap closure)
3. **Production hardening was not in the original scope** but became the majority of work

### Framework: The Scope Triangle

Before starting, categorize work into three buckets:

```
FEATURE WORK     → What the user sees (comments, payments, dashboard)
PLUMBING WORK    → What makes features work (auth, credentials, CORS, validation)
HARDENING WORK   → What makes it production-ready (error handling, monitoring, testing)
```

A realistic project plan allocates roughly:
- 30% Feature work
- 30% Plumbing work
- 40% Hardening work

Your original plan was ~90% feature work, 10% plumbing, 0% hardening. This is why 13 PROD phases appeared.

### 3b. Gap Closure as a Pattern

Look at the phase history:

```
Phase 3: Attachments & Notifications → 2 planned, 5 executed (3 gap closures)
Phase 4: Integration & Polish         → Entirely gap closure
Phase 5: Credential Wiring Fix        → Entirely gap closure
Phase 6: Schema Alignment             → Entirely gap closure
PROD-08: Security Hardening           → Gap closure from audit
PROD-13: Credential Wiring            → Gap closure from audit
PROD-14: More Credential Wiring       → Gap closure from audit
```

**7 out of 19 phases were gap closure** — work that should have been caught in the original phase. That's 37% of all phases being rework.

### Framework: The Pre-Flight Checklist

Before marking any phase as "planned," verify:

1. **Auth check:** Does every new endpoint have auth middleware?
2. **Credentials check:** Does every new fetch call have `credentials: 'include'`?
3. **Validation check:** Does every mutation endpoint have input validation?
4. **Error handling check:** Does every UI component handle loading/error/empty states?
5. **Both portals check:** If a feature exists in both portals, is the plan scoped to both?
6. **Migration check:** Does the database migration include rollback?

If you had run this checklist on Phase 2 (Core Comments), you would have caught the missing credentials, the missing validation, and the missing error states — eliminating Phases 4, 5, and 6 entirely.

### 3c. Over-Documentation, Under-Verification

The `.planning/` directory is excellent for tracking decisions. But the STATE.md file grew to 960+ lines of session logs, with duplicate content blocks (the phase progress section appears 3 times). This became noise rather than signal.

**Next project:** Keep STATE.md lean. It should have:
- Current position (5 lines)
- Last 3 decisions made
- Immediate next action

Move historical session logs to a separate `CHANGELOG.md` or let git history serve that purpose.

---

## 4. What You Did Well

### 4a. Systematic Security Hardening

PROD-01 was thorough:
- Mock auth completely removed (not just disabled)
- JWT in httpOnly cookies (not localStorage)
- Composable middleware pattern (withAuth, withSuperAdmin, withRateLimit)
- Path traversal prevention
- Filename sanitization
- Rate limiting on sensitive operations

This is better security practice than most production apps. The composable middleware pattern (`compose(withCORS, withAuth, withRateLimit)`) is genuinely elegant.

### 4b. Milestone Audit Process

Running `/gsd:audit-milestone` after each major milestone caught real bugs. The audit found 7 missing credential calls that would have caused 401 errors in production. Without this process, you would have deployed broken authentication.

### 4c. Verification-Driven Development

Every phase had verification — either formal VERIFICATION.md files or UAT results. This caught:
- The `rejected` vs `revision_requested` status mismatch in deliverables
- 8 bugs in user management (PROD-06)
- The duplicate file preview issue
- The scroll preservation regression

### 4d. Decision Documentation

The "Key Decisions" section in STATE.md is valuable. Future-you will thank past-you for documenting WHY conditional auth was chosen over `withAuth()` middleware for the inquiries endpoint.

### 4e. Commit Message Discipline

Consistent `type(scope): description` format throughout. `feat(PROD-08)`, `fix(09-02)`, `docs(PROD-13)` — this makes git log readable and bisectable.

---

## 5. Frameworks for Your Next Project

### Framework 1: The Infrastructure-First Sprint

**Before writing any feature code**, build these:

```
Day 0 Checklist:
[ ] Centralized API client (fetch wrapper with auth, base URL, error handling)
[ ] Shared component library (if multi-frontend)
[ ] Auth middleware (composable, already applied to all routes)
[ ] Input validation pattern (Zod schemas for all endpoints)
[ ] Error boundary / error state components
[ ] Environment validation module
[ ] Database migration runner with rollback support
[ ] CI pipeline (lint, type-check, test, build)
```

Cost: 1 day of setup. Savings: Eliminates gap closure phases entirely.

### Framework 2: The "Would This Break in Production?" Test

Before committing any code, mentally run through:

1. **What if the user is not logged in?** (auth check)
2. **What if the network fails?** (error handling)
3. **What if the input is malicious?** (validation)
4. **What if the database is slow?** (timeouts)
5. **What if this endpoint is called 1000 times per second?** (rate limiting)

You don't need to handle all of these perfectly, but you should at least have conscious answers. The credential wiring issue happened because question 1 wasn't asked for every new fetch call.

### Framework 3: The Feature Completeness Definition

A feature is not "done" when the happy path works. A feature is done when:

```
DONE =
  Happy path works                    +
  Error states handled                +
  Empty states handled                +
  Loading states handled              +
  Auth is wired (both backend + frontend) +
  Input is validated                  +
  Both portals updated (if applicable) +
  Mobile responsive                   +
  Accessibility basics met
```

Your PROD-10 through PROD-12 phases were entirely about completing features that were "done" on happy path but missing error states, empty states, and mobile responsiveness. If this definition was applied from Phase 1, those phases wouldn't exist.

### Framework 4: The Centralization Trigger

> The moment you write the same pattern for the second time, extract it.

Evidence from this project:
- `credentials: 'include'` written 37+ times → should have been in a wrapper
- Error handling duplicated across every API call → should have been in a wrapper
- Status config duplicated between portals → should have been in a shared package
- Component logic duplicated between portals → should have been shared

### Framework 5: The Phase Boundary Rule

Before starting a new phase, ask:

1. Is the previous phase actually complete? (Run the pre-flight checklist)
2. Are there any cross-cutting concerns from the previous phase that affect this one?
3. Will this phase introduce new fetch calls? (If yes, verify credentials upfront)
4. Will this phase touch both portals? (If yes, plan for both explicitly)

---

## 6. Prompting Skills Improvement

### 6a. Be Specific About Cross-Cutting Concerns

**Weak prompt:**
> "Add comment posting to the proposal page"

**Strong prompt:**
> "Add comment posting to the proposal page. Ensure: (1) the fetch call includes credentials: 'include' for cookie auth, (2) error states are handled with the ErrorState component, (3) loading states show a skeleton, (4) the feature is added to BOTH admin and client portals, (5) input is validated with Zod before submission"

The weak prompt produces a happy-path implementation. The strong prompt produces a production-ready implementation. The difference is 5 extra sentences.

### 6b. Front-Load Constraints

**Weak prompt:**
> "Create a payment webhook handler"

**Strong prompt:**
> "Create a payment webhook handler with these constraints:
> - Must verify HMAC SHA256 signature before processing
> - Must be idempotent (duplicate webhooks should not create duplicate records)
> - Must log all webhook events to payment_webhook_logs table
> - Must handle both payment.captured and payment.failed events
> - Must not block on email sending (use non-blocking .catch() pattern)
> - Must use the existing compose() middleware pattern"

The weak prompt requires back-and-forth and produces code that needs revision. The strong prompt gets it right in one pass.

### 6c. Reference Existing Patterns

**Weak prompt:**
> "Add auth to the inquiries endpoint"

**Strong prompt:**
> "Add auth to the inquiries endpoint. Follow the same pattern as proposals.ts which uses compose(withCORS, withAuth, ...). Note: POST must remain public (contact form), so use the conditional auth pattern from the requireAuthFromCookie function in _shared/auth.ts instead of withAuth middleware."

This saves the AI from guessing your architecture and produces code that matches your existing patterns.

### 6d. Ask for Verification Upfront

**Weak prompt:**
> "Build the admin dashboard"

**Strong prompt:**
> "Build the admin dashboard. After implementation, verify:
> - All metric cards show real data from dashboard-metrics API
> - Error and empty states are handled
> - Navigation links work from activity items to their resources
> - Build passes with no TypeScript errors
> List any issues found during verification."

This turns a "build and hope" cycle into a "build and verify" cycle.

### 6e. Scope Explicitly

**Weak prompt:**
> "Make the app production ready"

This prompt produced 13 PROD phases because "production ready" is unbounded.

**Strong prompt:**
> "I need to deploy this app. Audit the codebase for these specific blockers:
> 1. Any endpoints missing authentication middleware
> 2. Any fetch calls missing credentials: 'include'
> 3. Any mutation endpoints missing input validation
> 4. Any hardcoded localhost references
>
> Report findings only. Do not fix anything yet."

Bounded scope produces bounded work.

---

## 7. Checklist for Production Readiness

Use this for your next project. Check each item DURING development, not after.

### Authentication & Authorization
- [ ] All protected endpoints have auth middleware
- [ ] All frontend fetch calls include credentials/auth headers
- [ ] Role-based access is enforced on backend (not just UI hiding)
- [ ] Session restoration works after page refresh
- [ ] Logout clears all auth state

### Input & Validation
- [ ] All mutation endpoints validate input (Zod/Joi/etc.)
- [ ] File uploads have size limits enforced on backend
- [ ] File uploads have type restrictions enforced on backend
- [ ] Path traversal prevention on any file path inputs
- [ ] SQL injection prevention (parameterized queries)

### Error Handling
- [ ] Every API call has error handling (not just console.error)
- [ ] Error states shown to users (not blank screens)
- [ ] Empty states shown when data is empty (not blank screens)
- [ ] Loading states shown during fetches (not frozen UI)
- [ ] Network errors produce user-friendly messages

### Monitoring & Observability
- [ ] Error monitoring service configured (Sentry/etc.)
- [ ] Environment variables validated at startup
- [ ] No hardcoded secrets in code
- [ ] No localhost URLs in production config

### Testing
- [ ] Critical user flows have E2E tests
- [ ] Auth flow tested (login, session, logout)
- [ ] Payment flow tested (if applicable)
- [ ] Mobile responsiveness verified

---

## Summary: Your Top 5 Improvements

1. **Build a centralized API client before writing any feature code.** This single change would have eliminated 4 phases and 23 individual fixes.

2. **Apply the "feature completeness" definition from day one.** Error states, empty states, auth wiring, and validation are not "polish" — they are part of the feature.

3. **Run the pre-flight checklist before closing any phase.** Five questions that catch 80% of gap-closure work.

4. **Scope your prompts with explicit constraints and patterns.** Reference existing code. Name the middleware. Specify both portals. List verification criteria.

5. **Plan for plumbing and hardening upfront.** A realistic plan is 30% features, 30% plumbing, 40% hardening — not 90% features.

---

*Generated from analysis of 100+ commits, 19 phases, and 960+ lines of project state across the Motionify portal development (2026-01-20 to 2026-01-29).*
