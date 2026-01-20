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
| **Current Phase** | Phase 2: Core Comment Experience |
| **Current Plan** | 02-01-comment-editing-PLAN.md (Complete) |
| **Status** | Phase in progress |
| **Progress** | 🟢 Comment editing complete - 1/1 plans done |

```
Phase 1: Foundation (Database, API, Embedded UI)     [Complete]
Phase 2: Core Comment Experience (Posting, Real-time) [In Progress]
Phase 3: Attachments & Notifications                  [Pending]
────────────────────────────────────────────────────────────────
Overall: 33% complete | 1/3 phases done | 1/2 plans done in Phase 2
```
Phase 1: Foundation (Database, API, Embedded UI)     [Complete]
Phase 2: Core Comment Experience (Posting, Real-time) [Pending]
Phase 3: Attachments & Notifications                  [Pending]
───────────────────────────────────────────────────────────────
Overall: 33% complete | 1/3 phases done | Ready for Phase 2
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

### Technical Context

**Infrastructure Completed:**
- `proposal_comments` table with proper schema (UUIDs, indexes, foreign keys)
- `netlify/functions/comments.ts` API with GET/POST endpoints
- `lib/comments.ts` API client functions
- CommentThread, CommentItem, CommentInput components for admin SPA
- CommentThread, CommentItem, CommentInput components for Next.js client portal
- Integration in admin ProposalDetail.tsx (before Response Tracking)
- Integration in client proposal page (after ProposalActions)

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
|-----|-------|-----------------|
| R2 presign CORS for direct uploads | Phase 3 | Review existing `/api/r2-presign` implementation |
| Ably pricing at scale | v2 | Evaluate if polling UX sufficient before upgrade |
| Real-time updates | Phase 2 | Add polling or Ably integration |
| @mentions parsing/rendering | Phase 2 | Implement mention detection and notifications |
| Comment replies/threading | Phase 2 | Add parent_id FK to comments table |

---

## Session Continuity

### Last Session (2026-01-20)

1. **Project initialized** via `/gsd-new-project`
2. **Requirements defined** in `.planning/REQUIREMENTS.md` (8 requirements)
3. **Research synthesized** from `.planning/research/SUMMARY.md`
4. **Roadmap created** with 3 phases covering all requirements
5. **Phase 1 planned and executed** - All 5 tasks completed
   - Database migration created and committed
   - Comments API implemented with auth
   - React components created for both portals
   - Admin integration complete
   - Client integration complete
6. **Phase 2 planned and executed** - Comment editing
   - PUT endpoint added to comments API
   - Edit UI added to admin CommentItem
   - Edit UI added to client CommentItem

### Next Actions

1. **Phase 2 continued** - Plan next task for core comment experience:
   - Real-time updates (polling or Ably)
   - @mentions parsing and notifications
   - Comment threading/replies (optional)

**Phase 1 Summary:** `.planning/phases/01-foundation/01-01-foundation-impl-SUMMARY.md`
**Phase 2 Summary:** `.planning/phases/02-core-comment-experience/02-01-SUMMARY.md`

---

## Quick Reference

| File | Purpose |
|------|---------|
| `.planning/PROJECT.md` | Project definition and core value |
| `.planning/REQUIREMENTS.md` | Formal requirements with REQ-IDs |
| `.planning/ROADMAP.md` | Phase structure and success criteria |
| `.planning/phases/01-foundation/01-01-foundation-impl-SUMMARY.md` | Phase 1 completion report |
| `.planning/phases/02-core-comment-experience/02-01-SUMMARY.md` | Phase 2 Plan 1 completion report |
| `.planning/research/SUMMARY.md` | Research synthesis (stack, architecture, pitfalls) |

---

*Last updated: 2026-01-20*
