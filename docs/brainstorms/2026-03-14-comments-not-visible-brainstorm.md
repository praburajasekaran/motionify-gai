# Comments Not Visible — Bug Investigation
**Date:** 2026-03-14

## What We're Investigating

Client-reported bugs:
1. Comments are not shown as history after the client sends one
2. As admin, client comments are not visible in email, activity, or notifications

## Root Cause Summary

Five distinct bugs were found across the comments feature.

---

## Bug 1 (Critical): No Client-Facing Route for `CommentThread`

**File:** `App.tsx`

The `CommentThread` component is only rendered in `pages/admin/ProposalDetail.tsx`, which is behind the admin route `/admin/proposals/:proposalId`. There is **no client-facing route** that renders proposal comments.

Client routes only include `/payment/:proposalId` and `/projects/:id/:tab?` — neither renders the proposal comment thread.

**Impact:** Clients literally cannot see or submit proposal comments in the portal.

---

## Bug 2 (Critical): Stale Closure in Polling `useEffect`

**File:** `components/proposals/CommentThread.tsx` lines 62–91

The `setInterval` for `pollForNewComments` captures the initial `lastPolledAt` value (always `null`) because `pollForNewComments` is not in the `useEffect` dependency array. Every poll call fetches all comments from the beginning, and deduplication logic prevents them from re-rendering.

**Impact:** New comments never appear without a full page reload.

---

## Bug 3 (Critical): Notification Insert Fails with FK Constraint Violation

**File:** `netlify/functions/comments.ts` lines 228–242

The `notifications` INSERT passes `proposalId` for the `project_id` column, which has a `REFERENCES projects(id)` foreign key constraint. This throws a constraint violation that is silently caught and logged as `❌ Failed to create in-app notification`.

**Impact:** Admin receives no in-app notification when a client comments.

---

## Bug 4 (Significant): Comments Not Written to `activities` Table

**File:** `netlify/functions/comments.ts`

The POST handler never calls the activities API to insert a `COMMENT_ADDED` activity row. The `ProjectDetail.tsx` activity feed has `case 'COMMENT_ADDED'` in its renderer — the UI is ready, but no data is ever written.

**Impact:** Client comments never appear in the admin activity feed.

---

## Bug 5 (Moderate): Email Link Points to Non-Existent Route

**File:** `netlify/functions/send-email.ts` line 422

The email notification constructs the link as `/proposal/<id>`, but the admin portal uses basename `/portal` and the actual route is `/portal/admin/proposals/:proposalId`. The link redirects to the homepage.

**Impact:** Even if admin receives the email, the "View on Portal" link is broken.

---

## Fix Approach

### Option A: Fix All 5 Bugs (Recommended)
Fix each bug independently:
1. Add a client-facing proposal view or embed `CommentThread` in the existing client project page
2. Fix stale closure with `useCallback` + `useRef` for `lastPolledAt`
3. Fix notifications INSERT — look up actual `project_id` from proposal before inserting
4. Add activity row write inside `comments.ts` POST handler
5. Fix email link to use correct admin portal URL

### Option B: Fix Critical Path Only (Client-visible + Notifications)
Fix bugs 1, 2, and 3 first — these cover the reported user-facing symptoms. Bugs 4 and 5 are lower urgency.

## Key Decisions

- **Where should clients see proposal comments?** Options: dedicated `/proposals/:id` page, or embed in the existing project detail view
- **How to get `project_id` for notification?** Do a `SELECT project_id FROM proposals WHERE id = $1` before the notification INSERT

## Open Questions

- Should the client comment view be a new standalone page or part of the existing project view?
- Should we backfill `activities` rows for comments that were submitted but not logged?
