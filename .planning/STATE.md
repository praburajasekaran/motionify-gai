# State: Motionify Comment Thread System

**Project Reference**

| Field | Value |
|-------|-------|
| **Feature** | Proposal Comments Feature |
| **Core Value** | Clients and superadmins can communicate naturally during proposal negotiation without artificial turn restrictions |
| **Mode** | YOLO |
| **Depth** | Quick (3 phases) |
| **Created** | 2026-01-20 |

---

## Current Position

| Field | Value |
|-------|-------|
| **Current Phase** | PROD-01 - Authentication & Security |
| **Current Plan** | PROD-01-10: Supporting Endpoint Authentication [Complete] |
| **Status** | Production security hardening in progress |
| **Progress** | PROD-01: 10/11 plans complete (91%) |

```
Phase 1: Foundation (Database, API, Embedded UI)     [Complete]
Phase 2: Core Comment Experience (Posting, Real-time) [Complete]
Phase 3: Attachments & Notifications                  [Complete]
  ✓ 03-01: File Attachments on Comments              [Complete]
  ✓ 03-02: Email & In-App Notifications              [Complete]
  ✓ 03-03: Client Portal Notification Infrastructure [Complete - Gap Closure]
  ✓ 03-04: Backend Robustness (CORS, DB Safety)      [Complete - Gap Closure]
  ✓ 03-05: Client Frontend Integration               [Complete - Gap Closure]
Phase 4: Integration & Polish (Gap Closure)           [In Progress]
  ✓ 04-01: Wire edit handlers & attachment flow      [Complete]
  ✓ 04-03: Fix duplicate file preview                [Complete - Gap Closure]
  ✓ 04-04: Smart auto-scroll for new comments        [Complete - Gap Closure]
  ✓ 04-05: Edit Button Visibility Logic              [Complete - Just Now]
────────────────────────────────────────────────────────────────
Overall: 80% complete | Phase 4 nearing completion | Next: /gsd:audit-milestone v1
```

---

## Performance Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Requirements Mapped | 8/8 | 100% | ✅ |
| Phases | 3 | 3-4 (quick depth) | ✅ |
| Must Have Requirements | 4 | All covered | ✅ |
| Dependencies Resolved | 5/5 | Existing infrastructure | ✅ |
| Phase 1 Plans Completed | 1/1 | 100% | ✅ |
| Phase 1 Duration | ~15 min | 4-6 hours | ✅ Under budget |
| Phase 2 Plans Completed | 2/2 | 100% | ✅ |
| Phase 2 Duration | ~7 min | 2-4 hours | ✅ Under budget |
| Phase 2 Gaps Fixed | 2/2 | 100% | ✅ |
| Phase 3 Plans Completed | 5/5 | 100% | ✅ |
| Phase 3 Duration | ~20 min | 1-2 hours | ✅ Under budget |
| Phase 3 Gap Closure | 3 plans | Client notifications, Backend robustness, Frontend integration | ✅ |
| Phase 4 Plans Completed | 2/2 | 100% | ✅ |
| Phase 4 Duration | ~18 min | 30 min | ✅ Under budget |
| Phase 4 Gap Closure | 4 gaps | Attachment flow, Scroll preservation, Edit handlers, Auto-scroll | ✅ |

---

## Accumulated Context

### Key Decisions

| Decision | Rationale | Status |
|----------|-----------|--------|
| 3 phases (not 5) | "Quick" depth → combine research suggestions into fewer phases | Applied |
| Polling for real-time (not Ably) | Simpler v1; Ably upgrade possible in v2 | Applied |
| Comment editing included | Could Have priority; valuable for corrections | Applied |
| Ably deferred to v2 | True real-time nice-to-have; polling sufficient for MVP | Applied |
| Denormalized user_name column | Avoid joins on reads for better performance | Applied |
| Separate component sets for portals | Admin SPA and Next.js have different import paths | Applied |
| 10-second polling interval | Balances freshness with server load | Applied |
| Page Visibility API for battery efficiency | Only poll when page is visible | Applied |
| since parameter for efficient polling | Reduces data transfer by fetching only new comments | Applied |
| Environment variable for API URL | Removes hardcoded localhost, allows per-environment configuration | Applied |
| R2 presigned URLs for file uploads | Leverage existing infrastructure, no custom storage needed | Applied |
| Permissive UUID regex | Strict RFC regex rejected valid UUIDs; prioritize compatibility | Applied |
| Centralized CORS headers | Ensure all API responses (even errors) have proper CORS | Applied |
| Callback prop for attachment flow | Use onAttachmentsChange to sync child state to parent ref | Applied |
| Export child types for parent use | Export PendingAttachment from CommentInput for CommentThread type safety | Applied |
| Remove from uploadingFiles after completion | Prevent duplicate file preview by cleaning up uploadingFiles when upload completes | Applied |
| Production SSL enforcement | Always use strict SSL validation (ssl: true) for database connections in production to prevent MITM attacks | Applied |
| Development SSL flexibility | Use DATABASE_SSL env var for dev/staging control; default to SSL with self-signed cert support | Applied |
| Mock auth complete removal | Remove mock authentication entirely rather than environment-gating to eliminate attack surface | Applied |
| JWT standard library | Use jsonwebtoken library instead of custom crypto implementation for industry-standard JWT handling | Applied |
| httpOnly cookies for tokens | Store JWT tokens in httpOnly cookies to prevent XSS token theft | Applied |
| Cookie-based auth middleware | Create separate cookie-based auth functions alongside Bearer token auth for backward compatibility | Applied |
| Composable middleware pattern | Right-to-left execution order (like function composition) for predictable middleware stacking | Applied |
| Strict rate limiting for mutations | 10 req/min for sensitive operations, 100 req/min for reads to balance security with UX | Applied |
| Path traversal prevention | Reject file keys containing .. or starting with / to prevent directory traversal attacks | Applied |
| Filename sanitization | Replace special chars with _ in uploaded filenames to prevent injection attacks | Applied |
| Frontend credentials pattern | All fetch calls must include credentials: 'include' for cookie-based auth; centralized in api-config/api-transformers | Applied |
| Cookie session restoration | AuthContext relies solely on /auth-me API for session restoration; no localStorage fallback to ensure cookies are single source of truth | Applied |
| Schema-based input validation | All POST/PUT/PATCH endpoints use Zod schemas from _shared/schemas.ts for consistent validation and error handling | Applied |
| Payment-specific schemas | Payment endpoints (create-order, verify, manual-complete) use dedicated schemas matching their workflow-specific payloads | Applied |

### Technical Context

**Infrastructure Completed:**
- `proposal_comments` table with proper schema (UUIDs, indexes, foreign keys)
- `netlify/functions/comments.ts` API with GET/POST/PUT endpoints
- `lib/comments.ts` API client functions
- `comment_attachments` table with foreign key to comments
- `netlify/functions/attachments.ts` API with GET/POST endpoints
- `lib/attachments.ts` client library for both portals
- `netlify/functions/send-email.ts` with `sendCommentNotificationEmail` function
- CommentThread, CommentItem, CommentInput components for admin SPA
- CommentThread, CommentItem, CommentInput components for Next.js client portal
- Integration in admin ProposalDetail.tsx (before Response Tracking)
- Integration in client proposal page (after ProposalActions)
- Real-time polling with 10-second interval in both portals
- since parameter for efficient polling API optimization
- File upload UI with progress tracking
- Attachment display and download functionality
- Email notification on new comments (sender excluded)
- In-app notification creation in notifications table
- NotificationContext integration for comment notifications
- Client portal NotificationContext at `landing-page-new/src/contexts/NotificationContext.tsx`
- Client portal NotificationProvider in `landing-page-new/src/app/layout.tsx`
- Client portal CommentThread notification trigger
- Client portal NotificationBell using NotificationContext
- **Robust Error Handling:** CORS headers on all responses, safe DB connections
- **Validation:** Permissive UUID regex, 10MB file limit, file type restrictions
- **Attachment Data Flow:** CommentInput → onAttachmentsChange callback → CommentThread → pendingAttachmentsRef
- **PendingAttachment Type:** Exported from CommentInput for parent component type safety
- **Scroll Preservation:** scrollPosRef tracks position, restores on polling updates when user actively reading
- **Smart Auto-Scroll:** isNearBottom() + scrollToBottom() auto-scroll when near bottom, preserve when reading middle
- **Edit Handlers:** handleEdit passed to CommentItem, inline editing functional for comment owners

**Existing Infrastructure:**
- Vite SPA admin portal: `pages/admin/ProposalDetail.tsx`
- Next.js client portal: `landing-page-new/src/app/proposal/[proposalId]/page.tsx`
- PostgreSQL database with connection pooling
- Netlify Functions for API layer
- R2 presign for file uploads
- NotificationContext.tsx for in-app notifications
- Resend for email

### Known Gaps (Deferred)

| Gap | Phase | Action Required |
|-----|-------|----------------|
| Ably pricing at scale | v2 | Evaluate if polling UX sufficient before upgrade |
| @mentions parsing/rendering | Future | Not in v1 scope |
| Comment replies/threading | Future | Flat comments for v1 (like Fiverr) |

---

## Session Continuity

### This Session (2026-01-25)

**PROD-01-10 - Supporting Endpoint Authentication Completed:**
- Added withAuth() middleware to 5 supporting endpoints
- Comments.ts: GET, POST, PUT now require authentication
- Attachments.ts: GET, POST now require authentication
- Activities.ts: GET, POST now require authentication
- Notifications.ts: GET, PATCH now require authentication
- Inquiry-detail.ts: GET, PUT now require authentication
- Removed redundant requireAuth() calls from comments.ts and attachments.ts
- Protected endpoint count increased from 19 to 24 (67% coverage)
- Created PROD-01-10-SUMMARY.md
- Commits: 552cc37 (comments), b025563 (attachments), 2e36ac8 (3 remaining endpoints)
- Duration: 4 minutes

**PROD-01-08 - Input Validation Middleware Completed:**
- Applied Zod schemas to 14 mutation endpoints (POST/PUT/PATCH)
- Added validation to comments (2), attachments (1), inquiries (1), payments (3)
- Created 3 payment-specific schemas (createOrder, verify, manualComplete)
- Removed 189 lines of manual validation code, added 42 lines of schemas
- All invalid payloads now return 400 with consistent Zod error details
- Both builds pass (admin Vite, client Next.js)
- Created PROD-01-08-SUMMARY.md
- Commits: 55776a9 (comments/attachments/inquiries), eb7c260 (payments)
- Duration: 3 minutes

**PROD-01-09 - Cookie Session Restoration Completed:**
- Fixed cookie-based session restoration in client portal AuthContext
- Removed localStorage session caching and fallback logic
- Client portal now relies solely on /auth-me API with credentials: 'include'
- Verified admin portal already correctly implemented (no changes needed)
- Session now persists across page refreshes using httpOnly cookies
- Work split across two commits: d90362f (verifyMagicLink fix), 9918be2 (AuthContext fix)
- Created PROD-01-09-SUMMARY.md
- Duration: 2 minutes
- **Status:** Cookie authentication flow now fully functional end-to-end

**PROD-01-05 - Frontend Cookie Migration Completed:**
- Completed migration to cookie-based authentication for all frontend API calls
- Added credentials: 'include' to 9 remaining fetch calls in client portal
- Modified: NotificationContext.tsx (3 calls), lib/attachments.ts (4 calls), components/CommentThread.tsx (2 calls)
- Verified admin portal already using /auth-me and /auth-logout endpoints (from PROD-01-02)
- Verified client portal already prioritizing cookie sessions over localStorage (from PROD-01-02)
- Both portals now fully cookie-aware - httpOnly cookies sent with all API requests
- Created PROD-01-05-SUMMARY.md
- Commit: d49138f (feat: add credentials: 'include' to all client portal fetch calls)
- Duration: 4 minutes

**PROD-01-06 - Business Endpoint Authentication Completed:**
- Verified authentication middleware applied to 8 critical business endpoints
- Work completed in commit 2c1998c (feat: apply auth middleware to business endpoints)
- Protected endpoints: proposals, proposal-detail, projects, projects-accept-terms, project-members-remove, deliverables, tasks, payments
- Endpoint coverage increased from 6 to 13 (36% of 36 total endpoints)
- Created PROD-01-06-SUMMARY.md
- Duration: <1 minute (verification only, implementation was pre-existing)

**PROD-01-03 - Apply Security Middleware to All API Endpoints Executed:**
- Executed `/gsd:execute-phase` on PROD-01-03-PLAN.md (Security Middleware)
- Created composable middleware system (withAuth, withSuperAdmin, withProjectManager, withRateLimit, withValidation, withCORS)
- Completed comprehensive security audit of all 36 API endpoints
- Created 17 validation schemas for all entities (proposals, projects, tasks, payments, etc.)
- Secured 5 critical endpoints: invitations-create, invitations-revoke, users-settings, r2-presign, auth-me
- Closed 3 critical vulnerabilities: unauthorized user management, unrestricted file uploads, missing rate limits
- Path traversal prevention in r2-presign (reject ../../../etc/passwd attacks)
- Filename sanitization to prevent injection attacks
- 28 endpoints remain for systematic hardening (documented in audit)
- Created PROD-01-03-SUMMARY.md
- Duration: 40 minutes
- **Next:** PROD-01-05 to systematically apply middleware to remaining 28 endpoints

**PROD-01-02 - JWT Sessions with httpOnly Cookies Executed:**
- Executed `/gsd:execute-phase` on PROD-01-02-PLAN.md (Authentication Security)
- Installed jsonwebtoken library for standards-based JWT handling
- Created jwt.ts module with generateJWT, verifyJWT, cookie management functions
- Added cookie-based auth middleware (requireAuthFromCookie, requireSuperAdmin, requireProjectManager)
- Updated magic link verification to set httpOnly cookies instead of returning tokens in response
- Added credentials: 'include' to admin portal api-config.ts and auth.api.ts
- Created /auth-me endpoint to return current user from JWT cookie
- Created /auth-logout endpoint to clear auth cookie
- Security enhancement: JWT tokens in httpOnly cookies prevent XSS token theft
- Created PROD-01-02-SUMMARY.md
- Duration: 7 minutes
- **Note:** Additional Next.js portal files need credentials: 'include' added (proposals.ts, inquiries.ts, etc.)

**PROD-01-01 - Remove Mock Authentication Executed:**
- Executed `/gsd:execute-phase` on PROD-01-01-PLAN.md (Authentication Security)
- Removed MOCK_USERS and setMockUser from lib/auth.ts (59 lines)
- Cleaned mock auth imports from contexts/AuthContext.tsx
- Verified client portal AuthContext already clean
- Deleted unused landing-page-new/src/lib/auth/mock-data.ts
- Updated development documentation for magic link workflow
- Codebase search confirms zero mock auth references
- Production bundles verified clean of mock auth code
- Security enhancement: Eliminated authentication bypass vulnerability
- Created PROD-01-01-SUMMARY.md
- Duration: 6 minutes

**PROD-01-04 - Enforce SSL in Production Executed:**
- Executed `/gsd:execute-phase` on PROD-01-04-PLAN.md (Production Security Enhancement)
- Removed DISABLE_SSL_VALIDATION bypass option from all database configuration
- Enforced strict SSL validation (ssl: true) for all production database connections
- Updated 4 database connection files (shared/db.ts, migrate.ts, Next.js db.ts, debug script)
- Verified Neon database provider supports SSL with valid certificates
- Successfully tested both development and production SSL modes
- Cleaned up environment variable documentation (.env.example)
- Security enhancement: Protects against man-in-the-middle attacks on database connections
- Created PROD-01-04-SUMMARY.md
- Duration: 4 minutes

### Previous Session (2026-01-21)

**Phase 4 Plan 5 - Edit Button Visibility Logic Executed:**
- Executed `/gsd:execute-phase` on 04-05-PLAN.md
- Implemented edit button visibility logic that only shows edit option on user's own comments when no subsequent replies exist from other users
- Added `computeHasSubsequentReplies` helper function to both admin and client CommentThread
- Passes `hasSubsequentReplies` prop from CommentThread to CommentItem
- Updated CommentItem interface to include `hasSubsequentReplies` prop with default value `false`
- Updated edit button conditional: `{isOwner && !hasSubsequentReplies && !isEditing && ...}`
- Edit button now only appears on most recent comment without replies from other users
- Self-replies do NOT hide edit button (same user replying to self is allowed)
- Applied identical logic to both admin and client portals
- Created 04-05-SUMMARY.md
- Updated STATE.md

**Phase 4 Plan 4 - Smart Auto-Scroll Executed:**
- Executed `/gsd:execute-phase` on 04-04-PLAN.md
- Implemented smart auto-scroll that shows new comments when user near bottom
- Added isNearBottom() helper to detect if user within 100px of bottom
- Added scrollToBottom() helper for smooth auto-scroll animation
- Updated pollForNewComments to auto-scroll when user near bottom
- Updated handleSubmit to always scroll after posting own comment
- Preserves scroll position when user reading middle of thread
- Applied to both admin and client portal CommentThread components
- Both builds pass successfully
- Created 04-04-SUMMARY.md
- Updated STATE.md
- **Gap 6 closed:** New comments now auto-scroll when user near bottom

**Phase 4 Plan 3 - Fix Duplicate File Preview Executed:**
- Executed `/gsd:execute-phase` on 04-03-PLAN.md
- Fixed duplicate file preview by removing completed uploads from uploadingFiles after adding to pendingAttachments
- Applied fix to both admin portal and client portal CommentInput components
- Uploaded files now appear once in preview (not duplicated)
- Created 04-03-SUMMARY.md
- Updated STATE.md

**Phase 4 Complete - All Gaps Closed:**
- Executed `/gsd:execute-phase` on 04-01-PLAN.md
- Fixed attachment data flow: Added onAttachmentsChange callback prop to wire CommentInput → CommentThread
- Verified scroll preservation already correctly implemented (no changes needed)
- Verified edit handler already correctly wired (no changes needed)
- All 3 critical gaps from v1 milestone audit now closed:
  - ✅ COMM-03: Attachments now link to comments on submit
  - ✅ COMM-02: Scroll position preserved during polling
  - ✅ COMM-06: Edit handlers functional and accessible
- Phase 4 complete in 13 minutes
- Next: `/gsd:audit-milestone v1` to verify all gaps resolved

### Previous Session (2026-01-20)

**Phase 3 Gap Closure Executed:**
- **03-04 Backend Robustness:** Fixed CORS on errors, safe DB connections, relaxed UUID validation.
- **03-05 Frontend Integration:** Updated API paths for R2 presign, set 10MB file limit in UI.
- **Verification:** Passed 6/6 must-have checks.
- **Status:** Phase 3 fully complete and verified.

**Phase 3 Plan 3 (Gap Closure - Client Portal Notifications) Previously Completed:**
- Created NotificationContext for client portal
- Integrated NotificationProvider in client portal layout
- Added notification trigger to client CommentThread
- Updated NotificationBell to use NotificationContext instead of AppContext
- Both admin and client portal builds pass
- Created 03-03-SUMMARY.md
- Updated STATE.md

**Phase 3 Plan 2 (Notifications) Previously Completed:**
- Verified backend notification infrastructure already implemented
- sendCommentNotificationEmail function exists in send-email.ts
- Comments API already triggers email + in-app notifications on POST
- NotificationContext already supports 'comment_created' type
- Added notification integration to admin CommentThread (pollForNewComments)
- Both admin and client portal builds pass
- Created 03-02-SUMMARY.md
- Updated STATE.md to mark phase complete

**Phase 3 Plan 1 (File Attachments) Previously Completed:**
- Verified all required artifacts exist and are complete
- Confirmed database schema migration file is ready
- Confirmed attachments API handles GET/POST with full validation
- Confirmed client libraries provide all required functions
- Confirmed UI components have file upload and display functionality
- Build verification passed for both portals
- Created completion summary at `03-01-SUMMARY.md`

### Previous Session (2026-01-20)

1. **Project initialized** via `/gsd-new-project`
2. **Requirements defined** in `.planning/REQUIREMENTS.md` (8 requirements)
3. **Roadmap created** with 3 phases covering all requirements
4. **Phase 1 planned and executed** - All 5 tasks completed
5. **Phase 2 Plan 1 executed** - Comment editing
6. **Phase 2 Plan 2 executed** - Real-time polling
7. **Phase 2 verified and gaps fixed**
8. **Phase 3 Plan 1 executed** - File Attachments

### Next Actions

1. **Re-audit milestone** - Verify all gaps closed → `/gsd:audit-milestone v1`
2. **Complete milestone** - Archive v1.0 when audit passes → `/gsd:complete-milestone v1`

**Phase 3 Plans:**
- `.planning/phases/03-attachments-and-notifications/03-01-PLAN.md`
- `.planning/phases/03-attachments-and-notifications/03-02-PLAN.md`
- `.planning/phases/03-attachments-and-notifications/03-03-PLAN.md` (Gap Closure)
- `.planning/phases/03-attachments-and-notifications/03-04-PLAN.md` (Gap Closure)
- `.planning/phases/03-attachments-and-notifications/03-05-PLAN.md` (Gap Closure)

**Phase 4 Plans:**
- `.planning/phases/04-integration-and-polish/04-01-PLAN.md` (Gap Closure)
- `.planning/phases/04-integration-and-polish/04-05-PLAN.md` (Gap Closure - Edit button logic)

---

## Quick Reference

| File | Purpose |
|------|---------|
| `.planning/PROJECT.md` | Project definition and core value |
| `.planning/REQUIREMENTS.md` | Formal requirements with REQ-IDs |
| `.planning/ROADMAP.md` | Phase structure and success criteria |
| `.planning/phases/01-foundation/01-01-foundation-impl-SUMMARY.md` | Phase 1 completion report |
| `.planning/phases/02-core-comment-experience/02-01-SUMMARY.md` | Phase 2 Plan 1 completion report |
| `.planning/phases/02-core-comment-experience/02-02-SUMMARY.md` | Phase 2 Plan 2 completion report |
| `.planning/phases/02-core-comment-experience/02-VERIFICATION.md` | Phase 2 verification report |
| `.planning/phases/03-attachments-and-notifications/03-01-SUMMARY.md` | Phase 3 Plan 1 completion report |
| `.planning/phases/03-attachments-and-notifications/03-02-SUMMARY.md` | Phase 3 Plan 2 completion report |
| `.planning/phases/03-attachments-and-notifications/03-03-SUMMARY.md` | Phase 3 Plan 3 gap closure report |
| `.planning/phases/03-attachments-and-notifications/03-04-SUMMARY.md` | Phase 3 Plan 4 backend fixes report |
| `.planning/phases/03-attachments-and-notifications/03-05-SUMMARY.md` | Phase 3 Plan 5 frontend fixes report |
| `.planning/phases/03-attachments-and-notifications/03-VERIFICATION.md` | Phase 3 verification report |
| `.planning/phases/04-integration-and-polish/04-01-SUMMARY.md` | Phase 4 Plan 1 gap closure report |
| `.planning/phases/04-integration-and-polish/04-03-SUMMARY.md` | Phase 4 Plan 3 gap closure report |
| `.planning/phases/04-integration-and-polish/04-04-SUMMARY.md` | Phase 4 Plan 4 gap closure report |
| `.planning/research/SUMMARY.md` | Research synthesis (stack, architecture, pitfalls) |

---

*Last updated: 2026-01-21*
