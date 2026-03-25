---
title: "fix: Repair comment visibility, notifications, activity, and email link bugs"
type: fix
date: 2026-03-14
---

# fix: Repair Comment System — 5 Bugs

## Overview

Five interconnected bugs prevent the comment feature from working end-to-end. Clients cannot see comments after sending them, and admins receive no notifications, activity entries, or working email links when clients comment. All five bugs are independent and can be fixed atomically.

---

## Bug Inventory

| # | Severity | File | Root Cause |
|---|----------|------|-----------|
| 1 | Critical | `components/proposals/CommentThread.tsx` | Stale closure — polling `useEffect` dep array missing `pollForNewComments` |
| 2 | Critical | `App.tsx` + `pages/ProjectDetail.tsx` | No client-facing route/view renders `CommentThread` |
| 3 | Critical | `netlify/functions/comments.ts` | `notifications` INSERT passes `proposalId` for FK column `project_id` → constraint violation |
| 4 | Significant | `netlify/functions/comments.ts` | No `COMMENT_ADDED` activity row written after comment creation |
| 5 | Moderate | `netlify/functions/send-email.ts` | Email link built as `/proposal/:id` — route does not exist; correct path is `/portal/admin/proposals/:id` |

---

## Fix 1 — Stale Closure in `CommentThread.tsx` Polling

**File:** `components/proposals/CommentThread.tsx`

### Problem

The `useEffect` (line ~83) starts a `setInterval` calling `pollForNewComments`. The dependency array is `[proposalId]` only, so the interval callback captures the initial value of `lastPolledAt` (always `null`) forever. Every poll sends `since=null`, fetches all comments from the beginning, and the dedup logic filters them out — so new comments never appear until page reload.

### Fix

Use a `useRef` to hold the latest `lastPolledAt` value that the interval callback reads, instead of closing over the state directly. This avoids stale closure without needing to recreate the interval on every state change.

```tsx
// Add a ref that stays current alongside state
const lastPolledAtRef = useRef<string | null>(null);

// Keep ref in sync whenever state updates
useEffect(() => {
  lastPolledAtRef.current = lastPolledAt;
}, [lastPolledAt]);

// In pollForNewComments — read from ref, not state
const newComments = await getComments(proposalId, lastPolledAtRef.current || undefined);
```

The existing `useEffect` dependency array `[proposalId]` remains unchanged — we no longer need `pollForNewComments` in it because the function now reads from a ref that is always current.

### Files to change
- `components/proposals/CommentThread.tsx`
  - Add `lastPolledAtRef` ref declaration near `lastPolledAt` state (line ~37)
  - Add `useEffect` to sync ref with state
  - Change `pollForNewComments` to read `lastPolledAtRef.current` instead of `lastPolledAt`

---

## Fix 2 — Add Comments Section to Client Project Detail

**Files:** `pages/ProjectDetail.tsx`

### Problem

`CommentThread` is only rendered in `pages/admin/ProposalDetail.tsx`. The client-facing project page (`/projects/:id/:tab?`) has no comment view. The user decision (from brainstorm) is to embed comments in the existing project detail page.

### Fix

Add a **Comments** section inside the existing **Overview** tab of `ProjectDetail.tsx`. It should:
- Only render when a `proposalId` is associated with the project (look up from `project.inquiryId` or a proposal relation — check how `ProposalDetail` receives its `proposalId`).
- Use the existing `CommentThread` component.
- Be gated so it only shows when a linked proposal exists.

How to find `proposalId` from the project detail page:
- The project data likely contains an `inquiryId` or a `proposalId` field — check `lib/projects.ts` and the `projects` table schema. If not already fetched, add it to the project query.
- Alternatively, look up the proposal by `inquiry_id` on the project.

### Acceptance Criteria
- Client navigates to `/projects/:id` and sees a **Comments** section in the Overview tab.
- Existing comments load on mount.
- Client can type and submit a new comment.
- Submitted comment appears immediately in the list.
- New comments from polling appear without page reload (fixes Bug 1).

### Files to change
- `pages/ProjectDetail.tsx`
  - Import `CommentThread`
  - Locate the Overview tab content block (`TabsContent value="overview"`, line ~799)
  - Add `<CommentThread proposalId={...} />` at the bottom of the overview tab, conditional on `proposalId` being available
- `lib/projects.ts` (or equivalent) — if `proposalId` is not returned in the project query, add it
- Netlify function `get-project.ts` (or similar) — if `proposalId` needs to be joined from the `proposals` table

---

## Fix 3 — Notifications FK Constraint Violation

**File:** `netlify/functions/comments.ts` (lines 228–242)

### Problem

```ts
await client.query(
  `INSERT INTO notifications (user_id, project_id, ...) VALUES ($1, $2, ...)`,
  [recipientUserId, proposalId, ...]  // ← proposalId passed for project_id FK column
);
```

`notifications.project_id` has `REFERENCES projects(id) ON DELETE CASCADE`. `proposalId` is a UUID from the `proposals` table, not `projects`. The INSERT throws a FK violation, caught silently, and no notification is created.

### Fix

Look up the `project_id` from the `proposals` table before inserting the notification. Pass that (or `null`) as `project_id`:

```ts
// Before the notifications INSERT, look up the associated project_id
const proposalRow = await client.query(
  `SELECT project_id FROM proposals WHERE id = $1`,
  [proposalId]
);
const projectId = proposalRow.rows[0]?.project_id ?? null;

// Then use projectId in the notification INSERT
await client.query(
  `INSERT INTO notifications (user_id, project_id, type, title, message, action_url, actor_id, actor_name)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
  [recipientUserId, projectId, 'comment_created', ...]
);
```

> **Note:** Also fix the `action_url` value passed here — it currently uses the same broken `/proposal/:id` path (see Fix 5). Update it to `/portal/admin/proposals/${proposalId}` for admin recipients and skip or use a project URL for client recipients.

### Files to change
- `netlify/functions/comments.ts`
  - Add a `SELECT project_id FROM proposals WHERE id = $1` query before the notification INSERT
  - Replace `proposalId` with `projectId` (nullable) in the notification INSERT params

---

## Fix 4 — Write `COMMENT_ADDED` Activity Row

**File:** `netlify/functions/comments.ts`

### Problem

The `comments.ts` POST handler never writes to the `activities` table. The `ProjectDetail.tsx` activity feed already handles `case 'COMMENT_ADDED'` in its renderer — but there's never any data.

### Fix

After the comment INSERT succeeds, write an activity row directly via SQL (same pattern as other serverless functions — do not make an HTTP call to `/.netlify/functions/activities` which would require auth headers):

```ts
// After the comment INSERT
await client.query(
  `INSERT INTO activities (type, user_id, user_name, proposal_id, project_id, details)
   VALUES ($1, $2, $3, $4, $5, $6)`,
  [
    'COMMENT_ADDED',
    user.id,
    user.fullName,
    proposalId,
    projectId,   // from the lookup done in Fix 3 (reuse the same query)
    JSON.stringify({ commentPreview: trimmedContent.substring(0, 100) })
  ]
);
```

> **Note:** `projectId` from Fix 3's lookup can be reused here — run the `SELECT project_id FROM proposals` query once and use the result for both the notification INSERT and the activity INSERT.

### Files to change
- `netlify/functions/comments.ts`
  - Add activity INSERT after the comment INSERT (reuse `projectId` from Fix 3)

---

## Fix 5 — Correct Email Link URL

**File:** `netlify/functions/send-email.ts` (line ~422)

### Problem

```ts
const proposalUrl = `${process.env.URL || 'http://localhost:3000'}/proposal/${data.proposalId}`;
```

The app uses `basename="/portal"` and has no `/proposal/:id` route. The admin proposal route is `/portal/admin/proposals/:proposalId`. The email link is broken for all recipients.

Also in `comments.ts` line ~226, the same path is used for the in-app notification `action_url` with a different localhost fallback (`localhost:5173`). Fix both.

### Fix

```ts
// send-email.ts
const proposalUrl = `${process.env.URL || 'http://localhost:5173'}/portal/admin/proposals/${data.proposalId}`;
```

```ts
// comments.ts — action_url for notification
const proposalUrl = `${process.env.URL || 'http://localhost:5173'}/portal/admin/proposals/${proposalId}`;
```

Unify the localhost fallback to `http://localhost:5173` (the Vite dev server port) in both files.

### Files to change
- `netlify/functions/send-email.ts` line ~422
- `netlify/functions/comments.ts` line ~226

---

## Implementation Order

The fixes share a dependency: Fix 3 introduces a `SELECT project_id FROM proposals` query that Fix 4 also needs. Implement in this order to avoid duplicate queries:

1. **Fix 1** — `CommentThread.tsx` stale closure (isolated, no deps)
2. **Fix 5** — URL fix in `send-email.ts` + `comments.ts` (isolated, simple string change)
3. **Fix 3 + 4** — Together in `comments.ts`: add `SELECT project_id`, fix notification INSERT, add activity INSERT
4. **Fix 2** — `ProjectDetail.tsx` client embed (depends on confirming `proposalId` is available in project data)

---

## Acceptance Criteria

- [ ] Client submits a comment → comment appears immediately in the thread
- [ ] Client refreshes page → comment is still visible (persisted in DB)
- [ ] Polling interval updates the thread with new comments without page reload
- [ ] Admin receives an in-app notification when client comments (no FK violation)
- [ ] Admin can see the comment in the project activity feed (`COMMENT_ADDED` entry)
- [ ] Admin receives an email with a working link to the proposal
- [ ] Client navigates to project detail page and sees a Comments section
- [ ] No errors in Netlify function logs after a comment is submitted

---

## Files to Change (Summary)

| File | Change |
|------|--------|
| `components/proposals/CommentThread.tsx` | Add `lastPolledAtRef`, sync with state, read ref in poll function |
| `pages/ProjectDetail.tsx` | Import and render `CommentThread` in Overview tab, conditional on `proposalId` |
| `netlify/functions/comments.ts` | Add `SELECT project_id` query; fix notification `project_id`; add activity INSERT; fix `action_url` |
| `netlify/functions/send-email.ts` | Fix `proposalUrl` path to `/portal/admin/proposals/:id` |
| `lib/projects.ts` _(if needed)_ | Include `proposalId` in project data returned to client |

---

## References

- Brainstorm: `docs/brainstorms/2026-03-14-comments-not-visible-brainstorm.md`
- Comment thread component: `components/proposals/CommentThread.tsx:62`
- Comment serverless function: `netlify/functions/comments.ts:228`
- Email function: `netlify/functions/send-email.ts:422`
- Notifications schema: `database/migrations/002_add_comments_and_notifications.sql:38`
- Client project page: `pages/ProjectDetail.tsx:799` (Overview tab)
