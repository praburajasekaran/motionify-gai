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

### Phase PROD-04: Deliverables System
**Goal:** Verify file delivery workflow from creation through approval to final delivery

**Plans:** 5 plans

Plans:
- [ ] PROD-04-01-PLAN.md — Add key ownership validation to r2-presign (CRITICAL SECURITY)
- [ ] PROD-04-02-PLAN.md — Align file size limits (100MB) across schema, backend, frontend
- [ ] PROD-04-03-PLAN.md — Add auth credentials and error handling to storage service
- [ ] PROD-04-04-PLAN.md — Add permission validation to deliverables API
- [ ] PROD-04-05-PLAN.md — Manual testing verification (checkpoint)

**Wave Structure:**
| Wave | Plans | Notes |
|------|-------|-------|
| 1 | PROD-04-01, PROD-04-02 | Security fixes (parallel) |
| 2 | PROD-04-03, PROD-04-04 | API improvements (parallel, depends on Wave 1) |
| 3 | PROD-04-05 | Manual verification (checkpoint, depends on Wave 2) |

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
| PROD-04. Deliverables System | PROD | 0/5 | In Progress | - |

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
| DEL-01: Deliverable Creation | PROD-04 | Must Have | Pending |
| DEL-02: Approval Workflow | PROD-04 | Must Have | Pending |
| DEL-03: R2 File Storage | PROD-04 | Must Have | Pending |
| DEL-04: Permissions | PROD-04 | Must Have | Pending |

**v1 Coverage:** 8/8 requirements mapped (100%)
**PROD-04 Coverage:** 0/4 requirements verified
**Phases:** 6 complete, 1 in progress

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

*Last updated: 2026-01-25 (PROD-04 planned)*
