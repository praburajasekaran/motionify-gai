# Roadmap: Motionify Comment Thread System

**Project:** Motionify Comment Thread System
**Depth:** Quick (3-4 phases)
**Mode:** YOLO
**Created:** 2026-01-20

## Overview

Implementation roadmap for Fiverr/Upwork-style comment threads enabling real-time proposal negotiation between clients and superadmins. Structured for rapid delivery with minimal phases while maintaining full requirement coverage.

---

## Milestones

<details>
<summary>v1 Proposal Comments Feature — Phases 1-6 (shipped 2026-01-25)</summary>

**Delivered:** Fiverr/Upwork-style comment thread with real-time polling, file attachments, and email + in-app notifications.

**Key accomplishments:**
- Full comment system with posting, editing, real-time polling in both portals
- File attachments via R2 presigned URLs with proper metadata handling
- Email and in-app notifications triggered on new comments
- Smart UI features including auto-scroll, edit button constraints, attachment previews
- Gap closure including credential wiring fixes and database schema alignment

**Stats:**
- 6 phases, 14 plans
- 5 days development (2026-01-20 → 2026-01-25)
- 8/8 requirements delivered (100%)

**Git range:** `feat(01-01)` → `feat(06-01)`

**Full details:** See [.planning/milestones/v1-ROADMAP.md](.planning/milestones/v1-ROADMAP.md)
</details>

---

## Current Work

**Status:** Production Readiness Verification (PROD phases)

### Phase PROD-04: Deliverables System [Complete]
**Goal:** Verify file delivery workflow from creation through approval to final delivery

**Plans:** 5 plans (5/5 complete)

Plans:
- [x] PROD-04-01-PLAN.md — Add key ownership validation to r2-presign (CRITICAL SECURITY)
- [x] PROD-04-02-PLAN.md — Align file size limits (100MB) across schema, backend, frontend
- [x] PROD-04-03-PLAN.md — Add auth credentials and error handling to storage service
- [x] PROD-04-04-PLAN.md — Add permission validation to deliverables API
- [x] PROD-04-05-PLAN.md — Manual testing verification (checkpoint)

---

### Phase PROD-06: User Management [Complete]
**Goal:** Verify user CRUD, role management, invitations, and permissions

**Plans:** 3 plans (3/3 complete)

Plans:
- [x] PROD-06-01-PLAN.md — Fix database role constraint (4-role system migration)
- [x] PROD-06-02-PLAN.md — Fix credentials bug in UserManagement.tsx
- [x] PROD-06-03-PLAN.md — Manual UAT testing (checkpoint) + 8 bugs fixed

**Requirements:**
- USER-01: User Creation & Invitations ✓
- USER-02: Role Management ✓
- USER-03: User Deactivation ✓
- USER-04: Permission System ✓

---

### Phase PROD-08: Security Hardening [Complete]
**Goal:** Close medium-severity security gap in inquiries endpoint and complete credential wiring
**Priority:** Must Have
**Gap Closure:** Addresses audit items from v1-PROD-MILESTONE-AUDIT.md
**Completed:** 2026-01-28

**Plans:** 2 plans (2/2 complete)

Plans:
- [x] PROD-08-01-PLAN.md — Conditional auth for inquiries GET/PUT, role-based access
- [x] PROD-08-02-PLAN.md — Add credentials: 'include' to lib/inquiries.ts fetch calls

---

### Phase PROD-09: Payment Production Wiring [Complete]
**Goal:** Wire payment email notifications via Resend and complete webhook E2E testing
**Priority:** Should Have
**Gap Closure:** Addresses payment notification and webhook testing gaps from v1-PROD-MILESTONE-AUDIT.md
**Completed:** 2026-01-28

**Plans:** 2 plans (2/2 complete)

Plans:
- [x] PROD-09-01-PLAN.md — Wire email notifications into webhook handler (success + failure emails)
- [x] PROD-09-02-PLAN.md — E2E webhook integration testing with ngrok + Razorpay test mode

**Notes:** Email code verified working. Resend domain verification required for production (test mode only sends to account owner email).

---

### Phase PROD-10: UX Polish [Complete]
**Goal:** Improve client-facing status labels, add status timeline, implement edit restrictions, and wire status change notifications
**Priority:** Should Have
**Gap Closure:** Addresses UX inconsistencies from PROD-02
**Completed:** 2026-01-28

**Plans:** 4 plans (4/4 complete)

Plans:
- [x] PROD-10-01-PLAN.md — Create centralized STATUS_CONFIG with professional client-facing labels
- [x] PROD-10-02-PLAN.md — Add status timeline component showing proposal history
- [x] PROD-10-03-PLAN.md — Implement edit restrictions with super admin force edit
- [x] PROD-10-04-PLAN.md — Wire status change notifications (email + in-app)

---

### Phase PROD-11: Production Hardening [Complete]
**Goal:** Prepare infrastructure for production load — error monitoring, logging infrastructure, and environment configuration
**Priority:** Must Have (blocks deployment)
**Completed:** 2026-01-28

**Plans:** 3 plans (3/3 complete)

Plans:
- [x] PROD-11-01-PLAN.md — Neon HTTP driver (rolled back - pg Pool retained for compatibility)
- [x] PROD-11-02-PLAN.md — Sentry error monitoring with breadcrumb logging
- [x] PROD-11-03-PLAN.md — Zod-based environment validation, block localhost in production

**Key deliverables:**
- Sentry: Error monitoring with breadcrumb context trail and sensitive data scrubbing
- Logging: Sentry breadcrumbs (production: error + warn only)
- Environment: Zod validation, fail-fast on misconfiguration
- Note: @neondatabase/serverless installed for future use; pg Pool retained for existing code compatibility

---

### Phase PROD-12: Performance & Polish [Complete]
**Goal:** Optimize performance and refine UX for client demo - load testing, mobile responsiveness, and consistent UI feedback
**Priority:** Should Have
**Completed:** 2026-01-29

**Plans:** 5 plans (5/5 complete)

Plans:
- [x] PROD-12-01-PLAN.md — Artillery load testing setup (API + frontend scenarios)
- [x] PROD-12-02-PLAN.md — Mobile responsiveness tests (Playwright device emulation)
- [x] PROD-12-03-PLAN.md — ErrorState and EmptyState UI components (both portals)
- [x] PROD-12-04-PLAN.md — Apply ErrorState/EmptyState across all list pages
- [x] PROD-12-05-PLAN.md — Core Web Vitals monitoring (web-vitals + Sentry)

---

### Phase 9: Admin Features [Planned]
**Goal:** Build admin dashboard with real metrics, activity log with real data, and administrative oversight tools
**Priority:** Should Have

**Plans:** 3 plans

Plans:
- [ ] 09-01-PLAN.md — Create activities table migration + dashboard-metrics endpoint + enhance activities API
- [ ] 09-02-PLAN.md — Rewrite Dashboard with real metrics and interactive expandable cards
- [ ] 09-03-PLAN.md — Rewrite ActivityLogs with real API data, all/my toggle, and Load More

---

### Phase PROD-13: Extended Testing [Planned]
**Goal:** Complete remaining manual tests requiring browser/Gemini
**Priority:** Nice to Have
**Gap Closure:** Addresses test coverage gaps from PROD-05

Plans:
- [ ] PROD-13-01-PLAN.md — Manual testing checkpoint (15 task management tests)

---

### Phase PROD-14: Frontend Credential Wiring [Complete]
**Goal:** Add `credentials: 'include'` to 7 fetch calls accessing protected endpoints
**Priority:** Must Have (blocks deployment)
**Gap Closure:** Addresses critical integration gaps from v1-PROD-MILESTONE-AUDIT.md
**Completed:** 2026-01-28

**Plans:** 3 plans (3/3 complete)

Plans:
- [x] PROD-14-01-PLAN.md — Add credentials to lib/proposals.ts (3 calls)
- [x] PROD-14-02-PLAN.md — Add credentials to lib/inquiries.ts (1 call)
- [x] PROD-14-03-PLAN.md — Add credentials to services/paymentApi.ts (3 calls)

---

## Phases

All v1 phases complete. See [milestones/v1-ROADMAP.md](.planning/milestones/v1-ROADMAP.md) for full details.

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|---------|-----------|
| 1. Foundation | v1 | 1/1 | Complete | 2026-01-20 |
| 2. Core Comment Experience | v1 | 2/2 | Complete | 2026-01-20 |
| 3. Attachments & Notifications | v1 | 5/5 | Complete | 2026-01-20 |
| 4. Integration & Polish | v1 | 4/4 | Complete | 2026-01-21 |
| 5. Credential Wiring Fix | v1 | 1/1 | Complete | 2026-01-25 |
| 6. Schema Alignment | v1 | 1/1 | Complete | 2026-01-25 |
| PROD-04. Deliverables System | PROD | 5/5 | Complete | 2026-01-27 |
| PROD-05. Task Management | PROD | 1/1 | Complete | 2026-01-27 |
| PROD-06. User Management | PROD | 3/3 | Complete | 2026-01-28 |
| PROD-08. Security Hardening | PROD | 2/2 | Complete | 2026-01-28 |
| PROD-09. Payment Production Wiring | PROD | 2/2 | Complete | 2026-01-28 |
| PROD-10. UX Polish | PROD | 4/4 | Complete | 2026-01-28 |
| PROD-11. Production Hardening | PROD | 3/3 | Complete | 2026-01-28 |
| PROD-12. Performance & Polish | PROD | 5/5 | Complete | 2026-01-29 |
| 9. Admin Features | PROD | 0/3 | Planned | - |
| PROD-13. Extended Testing | PROD | 0/1 | Planned | - |
| PROD-14. Frontend Credential Wiring | PROD | 3/3 | Complete | 2026-01-28 |

---

## Coverage Summary

| Requirement | Phase | Priority | Status |
|-------------|-------|----------|--------|
| COMM-01: Unlimited Comment Exchange | Phase 2 | Must Have | Complete |
| COMM-02: Real-Time Comment Updates | Phase 2, 4 | Must Have | Complete |
| COMM-03: File Attachments on Comments | Phase 3, 4 | Should Have | Complete |
| COMM-04: Email Notifications on Comments | Phase 3 | Should Have | Complete |
| COMM-05: In-App Notifications | Phase 3, 5 | Should Have | Complete |
| COMM-06: Comment Editing | Phase 2, 4, 5, 6 | Could Have | Complete |
| COMM-07: Comments Embedded in Proposal Page | Phase 1 | Must Have | Complete |
| COMM-08: Persistent Comments | Phase 1 | Must Have | Complete |
| DEL-01: Deliverable Creation | PROD-04 | Must Have | Verified |
| DEL-02: Approval Workflow | PROD-04 | Must Have | Verified |
| DEL-03: R2 File Storage | PROD-04 | Must Have | Verified |
| DEL-04: Permissions | PROD-04 | Must Have | Verified |
| USER-01: User Creation & Invitations | PROD-06 | Must Have | Verified |
| USER-02: Role Management | PROD-06 | Must Have | Verified |
| USER-03: User Deactivation | PROD-06 | Must Have | Verified |
| USER-04: Permission System | PROD-06 | Must Have | Verified |

**v1 Coverage:** 8/8 requirements mapped (100%)
**PROD-04 Coverage:** 4/4 requirements verified
**PROD-06 Coverage:** 4/4 requirements verified
**Phases:** 12 complete, 3 planned (code cleanup + extended testing)

---

## Tech Debt Closure (from v1-PROD-MILESTONE-AUDIT)

| Item | Phase | Priority | Status |
|------|-------|----------|--------|
| Inquiries GET unprotected | PROD-08 | Must | Complete |
| Missing credentials in inquiries | PROD-08 | Must | Complete |
| Payment emails console.log only | PROD-09 | Should | Complete |
| Webhook E2E testing incomplete | PROD-09 | Should | Complete |
| Client status label translation | PROD-10 | Should | Complete |
| Proposal edit restriction | PROD-10 | Should | Complete |
| Status timeline view | PROD-10 | Should | Complete |
| Status change notifications | PROD-10 | Should | Complete |
| Production hardening (DB, errors, env) | PROD-11 | Must | Planned |
| Unused 'review' enum | PROD-12 | Nice | Planned |
| Frontend status casing | PROD-12 | Nice | Planned |
| 15 additional tests | PROD-13 | Nice | Planned |
| lib/proposals.ts credentials | PROD-14 | Must | Complete |
| lib/inquiries.ts credentials | PROD-14 | Must | Complete |
| paymentApi.ts credentials | PROD-14 | Must | Complete |

---

## Research Flags (Deferred Implementation)

The following require additional research before planning but are covered in current phase structure:

| Item | Phase | Notes |
|------|-------|-------|
| Ably real-time (vs polling) | Phase 2 | Polling used for v1. Ably upgrade possible in v2. |
| R2 presign CORS configuration | Phase 3 | Confirm existing API supports direct uploads |
| File type allowlist validation | Phase 3 | Define allowed types; existing validation may apply |
| Multipart upload for >100MB | Future | Required if deliverables exceed 100MB single-part limit |

---

*Last updated: 2026-01-29 (PROD-12 Performance & Polish complete)*
