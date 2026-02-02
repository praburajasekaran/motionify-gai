---
title: "Fix empty activity feeds - add comprehensive backend activity logging"
type: fix
date: 2026-02-01
---

# Fix Empty Activity Feeds - Add Comprehensive Backend Activity Logging

## Overview

Activity feeds show nearly empty despite extensive user activity. The root cause: **the backend Netlify functions never INSERT into the `activities` table** when handling state changes. The frontend display code (`ProjectDetail.tsx:39-82`, `ProjectOverview.tsx:59-415`) already has formatters for every activity type — it's just never receiving data.

Only 3 of ~20 action types are currently logged (team invite, team accept, team remove). Everything else — tasks, files, deliverables, payments, proposals, inquiries, project creation, terms acceptance — is silent.

## Problem Statement — Full Audit

### Currently Logged (3 actions)

| Action | Backend File | How |
|--------|-------------|-----|
| Team member invited | `project-invitations-create.ts:159` | Direct INSERT into `activities` |
| Team member accepted invite | `invitations-accept.ts:97` | Direct INSERT into `activities` |
| Team member removed | `project-team.ts` | Direct INSERT into `activities` |

### NOT Logged (everything else)

| Category | Action | Backend File | Line |
|----------|--------|-------------|------|
| **Inquiry** | Created (admin) | `inquiries.ts` POST | ~213 |
| **Inquiry** | Created (public form) | `inquiries.ts` POST | ~253 |
| **Inquiry** | Status changed | `inquiries.ts` PUT | ~318 |
| **Proposal** | Created/sent | `proposals.ts` POST | ~468 |
| **Proposal** | Status changed (accept/reject/changes) | `proposals.ts` PUT/PATCH | ~266/~333 |
| **Project** | Created (from admin) | `projects.ts` POST | POST handler |
| **Project** | Created (from payment) | `payments.ts` verify | ~236 |
| **Project** | Terms accepted | `projects-accept-terms.ts` POST | ~114 (wrong table!) |
| **Task** | Created | `tasks.ts` POST | ~477 |
| **Task** | Updated | `tasks.ts` PATCH | ~548 |
| **Task** | Status changed | `tasks.ts` PATCH | ~600 |
| **Task** | Deleted | `tasks.ts` DELETE | ~846 |
| **Task** | Comment added | `tasks.ts` POST comments | ~219 |
| **File** | Uploaded | `project-files.ts` POST | ~131 |
| **File** | Deleted | `project-files.ts` DELETE | ~191 |
| **Deliverable** | Created | `deliverables.ts` POST | ~255 |
| **Deliverable** | Status changed (beta/awaiting/approved/final) | `deliverables.ts` PATCH | ~332 |
| **Deliverable** | Deleted | `deliverables.ts` DELETE | ~436 |
| **Payment** | Completed (Razorpay verified) | `payments.ts` verify | ~164 |
| **Payment** | Manually completed | `payments.ts` manual-complete | ~307 |
| **Payment** | Reminder sent | `payments.ts` send-reminder | ~439 |

### Wrong Table Bug

`projects-accept-terms.ts:114-118` tries to INSERT into `activity_logs` (doesn't exist) instead of `activities`. The try/catch silently swallows the error.

### Frontend Duplicate Logging

Some frontend files call `createActivity()` via the HTTP API. Once backend handles logging, these become duplicates:

| File | What it logs |
|------|-------------|
| `pages/admin/ProposalBuilder.tsx:252` | `PROPOSAL_SENT` |
| `landing-page-new/src/components/proposal/ProposalActions.tsx:65,119,176` | `PROPOSAL_ACCEPTED`, `PROPOSAL_CHANGES_REQUESTED`, `PROPOSAL_REJECTED` |
| `landing-page-new/src/app/portal/inquiries/page.tsx:152-165` | Same proposal actions |
| `landing-page-new/src/lib/portal/AppContext.tsx:285,380,427,524,745` | `TASK_STATUS_CHANGED`, `TEAM_MEMBER_REMOVED`, `TASK_CREATED`, `TASK_UPDATED`, `FILE_RENAMED` |

## Proposed Solution

Add activity logging **directly in the backend Netlify functions** via SQL INSERT (same pattern already used by `project-invitations-create.ts`). Then remove the duplicate frontend `createActivity()` calls.

### Why backend INSERT?

1. **Single source of truth** — both admin and portal apps hit the same backend
2. **No missed activities** — frontend-only logging is fragile (different code paths, browser errors)
3. **Already proven** — team invite/accept/remove use this exact pattern and work correctly
4. **No HTTP overhead** — direct INSERT on the open `pg.Client` connection

### Auth context

The `withAuth` middleware (`_shared/middleware.ts:35-45`) provides `{ userId, email, role, fullName }`. The `fullName` field is available — no extra user query needed.

For `inquiries.ts` POST (unauthenticated public form): use `contact_name` from the submission as `userName`, and the returned `inquiry.id` as a system-context marker.

## Exact List of Files to Modify

### Backend (add activity INSERTs)

1. `netlify/functions/tasks.ts` — Task create, update, status change, delete, comment
2. `netlify/functions/project-files.ts` — File upload, delete
3. `netlify/functions/deliverables.ts` — Deliverable create, status change, delete
4. `netlify/functions/payments.ts` — Payment verified, manual complete, reminder sent, project created (from payment)
5. `netlify/functions/inquiries.ts` — Inquiry create (admin + public), status change
6. `netlify/functions/proposals.ts` — Proposal create, status change
7. `netlify/functions/projects.ts` — Project create
8. `netlify/functions/projects-accept-terms.ts` — Fix wrong-table INSERT

### Frontend (remove duplicate logging, add new types)

9. `pages/admin/ProposalBuilder.tsx` — Remove `logProposalSent()` call
10. `landing-page-new/src/components/proposal/ProposalActions.tsx` — Remove `logProposalAccepted/Rejected/ChangesRequested()` calls
11. `landing-page-new/src/app/portal/inquiries/page.tsx` — Remove `logProposalAccepted/Rejected/ChangesRequested()` calls
12. `landing-page-new/src/lib/portal/AppContext.tsx` — Remove `createActivity()` calls (5 call sites)
13. `services/activityApi.ts` — Add new types: `TASK_DELETED`, `FILE_DELETED`, `DELIVERABLE_CREATED`, `DELIVERABLE_DELETED`, `DELIVERABLE_STATUS_CHANGED`
14. `landing-page-new/src/lib/portal/types.ts` — Add same new types to `ActivityType` enum
15. `pages/ProjectDetail.tsx` — Add `formatActivityAction` cases for new types

### Role/Visibility — Display filtering

16. `landing-page-new/src/lib/portal/components/ProjectOverview.tsx` — Add `getActivityDetails` cases for new types

## Step-by-Step Implementation Plan

### Step 1: Create shared `logActivity` helper pattern

Each backend file gets a local `logActivity` function (not a shared module — keeps files self-contained, matching existing team-invite pattern):

```typescript
async function logActivity(dbClient: pg.Client, params: {
  type: string;
  userId: string;
  userName: string;
  inquiryId?: string;
  proposalId?: string;
  projectId?: string;
  targetUserId?: string;
  targetUserName?: string;
  details?: Record<string, string | number>;
}) {
  try {
    await dbClient.query(
      `INSERT INTO activities (type, user_id, user_name, target_user_id, target_user_name, inquiry_id, proposal_id, project_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [params.type, params.userId, params.userName,
       params.targetUserId || null, params.targetUserName || null,
       params.inquiryId || null, params.proposalId || null, params.projectId || null,
       JSON.stringify(params.details || {})]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}
```

### Step 2: `netlify/functions/tasks.ts` — 5 activity points

**2a. Task created** (after line ~497, RETURNING):
```
type: TASK_CREATED, projectId, details: { taskId, taskTitle }
```

**2b. Task status changed** (inside PATCH, after detecting `oldStatus !== updates.status`, ~line 617):
```
type: TASK_STATUS_CHANGED, projectId, details: { taskId, taskTitle, oldStatus, newStatus }
```

**2c. Task updated** (inside PATCH, when non-status fields change):
```
type: TASK_UPDATED, projectId, details: { taskId, taskTitle }
```

**2d. Task deleted** (after DELETE RETURNING, ~line 846):
```
type: TASK_DELETED, projectId, details: { taskId, taskTitle }
```
Note: Need to SELECT task title + project_id BEFORE the DELETE since RETURNING only gives `id`. The existing code already queries task info for permission checks.

**2e. Comment added** (after comment INSERT RETURNING, ~line 227):
```
type: COMMENT_ADDED, projectId, details: { taskId, taskTitle, commentPreview }
```
Note: Need to get `project_id` from a task lookup. Add a JOIN or separate query.

### Step 3: `netlify/functions/project-files.ts` — 2 activity points

**3a. File uploaded** (after INSERT RETURNING, ~line 143):
```
type: FILE_UPLOADED, projectId, details: { fileName, fileType, fileSize }
```
`auth.user` provides userId/fullName. `projectId` from `data.projectId`.

**3b. File deleted** (after DELETE, ~line 191):
```
type: FILE_DELETED, projectId, details: { fileName }
```
Note: Need to SELECT `file_name` and `project_id` before DELETE. The existing code already queries the file for permission check — extend that query.

### Step 4: `netlify/functions/deliverables.ts` — 3 activity points

**4a. Deliverable created** (after INSERT RETURNING, ~line 260):
```
type: DELIVERABLE_CREATED, projectId, details: { deliverableName }
```

**4b. Deliverable status changed** (after PATCH RETURNING, ~line 332):
Map status to specific type:
- `awaiting_approval` → `DELIVERABLE_UPLOADED` (beta delivered for review)
- `approved` → `DELIVERABLE_APPROVED`
- `final_delivered` → `DELIVERABLE_UPLOADED` with `{ stage: 'final' }`
- Other status changes → `DELIVERABLE_STATUS_CHANGED`

```
type: <mapped>, projectId, details: { deliverableName, oldStatus, newStatus }
```
Note: Need to fetch old status before update. Add a SELECT before the PATCH.

**4c. Deliverable deleted** (after DELETE, ~line 436):
```
type: DELIVERABLE_DELETED, projectId, details: { deliverableName }
```
Note: Need to SELECT name + project_id before DELETE.

### Step 5: `netlify/functions/payments.ts` — 3 activity points

**5a. Payment verified** (after UPDATE RETURNING, ~line 164):
```
type: PAYMENT_RECEIVED, projectId (from payment row or newly created project),
details: { amount, currency, paymentType, paymentLabel }
```

**5b. Project created from payment** (after project INSERT, ~line 242):
```
type: PROJECT_CREATED, projectId, inquiryId,
details: { projectNumber }
```

**5c. Manual payment complete** (after UPDATE RETURNING, ~line 307):
```
type: PAYMENT_RECEIVED, projectId, details: { amount, paymentType: 'manual' }
```

**5d. Payment reminder sent** (after send-reminder, ~line 439):
```
type: PAYMENT_REMINDER_SENT, proposalId, details: { clientEmail }
```

### Step 6: `netlify/functions/inquiries.ts` — 2 activity points

**6a. Inquiry created** (after INSERT RETURNING, ~line 213 admin / ~line 253 public):
- Admin: `auth` not available on POST. Use `requireAuthFromCookie` conditionally for admin payloads (it's already imported). If auth succeeds, use `auth.user`. If not (public form), use `contact_name`.
```
type: INQUIRY_CREATED, inquiryId, details: { inquiryNumber, source: 'admin'|'public' }
```

**6b. Inquiry status changed** (after UPDATE RETURNING, ~line 318):
```
type: INQUIRY_STATUS_CHANGED, inquiryId,
details: { oldStatus, newStatus, inquiryNumber }
```
Note: Need to SELECT `status` before UPDATE to capture `oldStatus`.

### Step 7: `netlify/functions/proposals.ts` — 2 activity points

**7a. Proposal created** (after INSERT RETURNING, ~line 468):
```
type: PROPOSAL_SENT, inquiryId, proposalId,
targetUserId: clientUserId, targetUserName: contact_name,
details: { inquiryNumber }
```

**7b. Proposal status changed** (in PUT handler ~line 266 and PATCH handler ~line 333, when `status` is in updates):
Map status to type: `accepted` → `PROPOSAL_ACCEPTED`, `rejected` → `PROPOSAL_REJECTED`, `changes_requested` → `PROPOSAL_CHANGES_REQUESTED`
```
type: <mapped>, inquiryId (from proposal row), proposalId,
details: { feedback (if present) }
```
Note: Need to get `inquiry_id` from the proposal row. The RETURNING already includes it.

### Step 8: `netlify/functions/projects.ts` — 1 activity point

**8a. Project created** (after INSERT RETURNING in POST handler):
```
type: PROJECT_CREATED, projectId, inquiryId,
details: { projectNumber }
```

### Step 9: `netlify/functions/projects-accept-terms.ts` — Fix wrong table

Replace lines 112-122 — change `activity_logs` to `activities` with proper schema:
```
type: TERMS_ACCEPTED, projectId, userId, userName: auth.user.fullName,
details: { ip: clientIp }
```
Note: The current handler uses `requireAuthFromCookie` which returns `{ userId }`. Need to query user's `full_name`.

### Step 10: Remove duplicate frontend activity logging

**10a. `pages/admin/ProposalBuilder.tsx`**: Remove `logProposalSent()` import and call (~line 8, 252)

**10b. `landing-page-new/src/components/proposal/ProposalActions.tsx`**: Remove `logProposalAccepted/Rejected/ChangesRequested` imports and calls (~line 10, 65, 119, 176)

**10c. `landing-page-new/src/app/portal/inquiries/page.tsx`**: Remove `logProposalAccepted/Rejected/ChangesRequested` imports and calls (~line 13, 152-165)

**10d. `landing-page-new/src/lib/portal/AppContext.tsx`**: Remove 5 `createActivity()` call sites (lines 285, 380, 427, 524, 745) and the import on line 34

### Step 11: Add new activity types to frontend type definitions

**11a. `services/activityApi.ts`**: Add to `ActivityType` union:
```typescript
| 'TASK_DELETED'
| 'FILE_DELETED'
| 'DELIVERABLE_CREATED'
| 'DELIVERABLE_DELETED'
| 'DELIVERABLE_STATUS_CHANGED'
| 'INQUIRY_CREATED'
| 'INQUIRY_STATUS_CHANGED'
```

**11b. `landing-page-new/src/lib/portal/types.ts`**: Add to `ActivityType` enum:
```typescript
TASK_DELETED = 'TASK_DELETED',
FILE_DELETED = 'FILE_DELETED',
DELIVERABLE_CREATED = 'DELIVERABLE_CREATED',
DELIVERABLE_DELETED = 'DELIVERABLE_DELETED',
DELIVERABLE_STATUS_CHANGED = 'DELIVERABLE_STATUS_CHANGED',
INQUIRY_CREATED = 'INQUIRY_CREATED',
INQUIRY_STATUS_CHANGED = 'INQUIRY_STATUS_CHANGED',
```

### Step 12: Add display formatters for new activity types

**12a. `pages/ProjectDetail.tsx`** — Add cases to `formatActivityAction` (~line 39):
```typescript
case 'TASK_DELETED':                return 'deleted task';
case 'FILE_DELETED':                return 'deleted file';
case 'DELIVERABLE_CREATED':         return 'created deliverable';
case 'DELIVERABLE_DELETED':         return 'deleted deliverable';
case 'DELIVERABLE_STATUS_CHANGED':  return `changed deliverable status to ${details.newStatus || 'updated'}`;
case 'INQUIRY_CREATED':             return 'submitted an inquiry';
case 'INQUIRY_STATUS_CHANGED':      return `changed inquiry status to ${details.newStatus || 'updated'}`;
```

**12b. `landing-page-new/src/lib/portal/components/ProjectOverview.tsx`** — Add cases to `getActivityDetails` (~line 59) for new types with appropriate icons and messages.

## Role-Based Visibility Considerations

The current `GET /activities` endpoint (`activities.ts:36-91`) has no per-activity visibility filtering — all activities for a given context are visible. This is acceptable because:

1. **Access is already scoped** — clients can only query activities for projects/proposals/inquiries they have access to
2. **Task visibility** — tasks have `is_client_visible`. Activities for hidden tasks should still log but the activity `details.taskTitle` is visible. If needed later, add a `visible_to_client` column to `activities` and filter on fetch.
3. **Internal admin actions** — inquiry status changes and admin-only task operations will show in the feed. Since clients see the project Activity tab, ensure activity messages are client-appropriate (no internal jargon).

**Decision**: No visibility filtering in this iteration. All activities scoped to a project are visible to anyone with project access. This matches how team invite/accept/remove already work.

## Assumptions and Edge Cases

1. **Auth middleware provides `fullName`** — Confirmed: `middleware.ts:41` has `fullName: string` in `AuthResult.user`
2. **`activities.type` is VARCHAR** — Confirmed: no DB enum constraint, accepts any string
3. **Public inquiry POST is unauthenticated** — Will conditionally try `requireAuthFromCookie` for admin payloads; fall back to contact info for public
4. **Task DELETE needs pre-fetch** — Must SELECT `title, project_id` before DELETE to populate activity details
5. **Deliverable DELETE needs pre-fetch** — Same pattern
6. **File DELETE already pre-fetches** — Existing permission check queries the file; extend to include `file_name, project_id`
7. **Payment verify creates projects** — The verify handler in `payments.ts` creates projects as a side effect; log both `PAYMENT_RECEIVED` and `PROJECT_CREATED`
8. **Fire-and-forget** — All activity INSERTs wrapped in try/catch, never fail the parent request

## What Will NOT Be Changed

- **Database schema** — No migrations, no new columns or tables
- **`netlify/functions/activities.ts`** — The GET/POST API endpoint is working correctly
- **`shared/hooks/useActivities.ts`** — Polling hook works correctly
- **`pages/admin/ActivityLogs.tsx`** — Admin activity logs page works correctly
- **`pages/Dashboard.tsx`** — Dashboard activity widget works correctly
- **`netlify/functions/project-invitations-create.ts`** — Already logs correctly
- **`netlify/functions/invitations-accept.ts`** — Already logs correctly
- **`netlify/functions/project-team.ts`** — Already logs correctly
- **Config, env, build, or infrastructure files** — None touched
- **No new dependencies or libraries**
- **No refactoring of unrelated code**

## Complete Activity Types Matrix

| Activity Type | Backend File | Trigger | Context IDs | Status |
|--------------|-------------|---------|-------------|--------|
| `INQUIRY_CREATED` | `inquiries.ts` | POST | inquiryId | **NEW** |
| `INQUIRY_STATUS_CHANGED` | `inquiries.ts` | PUT | inquiryId | **NEW** |
| `PROPOSAL_SENT` | `proposals.ts` | POST | inquiryId, proposalId | **ADD** |
| `PROPOSAL_ACCEPTED` | `proposals.ts` | PUT/PATCH | inquiryId, proposalId | **ADD** |
| `PROPOSAL_REJECTED` | `proposals.ts` | PUT/PATCH | inquiryId, proposalId | **ADD** |
| `PROPOSAL_CHANGES_REQUESTED` | `proposals.ts` | PUT/PATCH | inquiryId, proposalId | **ADD** |
| `PROJECT_CREATED` | `projects.ts` / `payments.ts` | POST / verify | projectId, inquiryId | **ADD** |
| `TERMS_ACCEPTED` | `projects-accept-terms.ts` | POST | projectId | **FIX** |
| `TASK_CREATED` | `tasks.ts` | POST | projectId | **ADD** |
| `TASK_UPDATED` | `tasks.ts` | PATCH | projectId | **ADD** |
| `TASK_STATUS_CHANGED` | `tasks.ts` | PATCH (stage) | projectId | **ADD** |
| `TASK_DELETED` | `tasks.ts` | DELETE | projectId | **NEW** |
| `COMMENT_ADDED` | `tasks.ts` | POST comments | projectId | **ADD** |
| `REVISION_REQUESTED` | `tasks.ts` | PATCH (stage=revision_requested) | projectId | **ADD** |
| `FILE_UPLOADED` | `project-files.ts` | POST | projectId | **ADD** |
| `FILE_DELETED` | `project-files.ts` | DELETE | projectId | **NEW** |
| `DELIVERABLE_CREATED` | `deliverables.ts` | POST | projectId | **NEW** |
| `DELIVERABLE_UPLOADED` | `deliverables.ts` | PATCH (awaiting/final) | projectId | **ADD** |
| `DELIVERABLE_APPROVED` | `deliverables.ts` | PATCH (approved) | projectId | **ADD** |
| `DELIVERABLE_DELETED` | `deliverables.ts` | DELETE | projectId | **NEW** |
| `PAYMENT_RECEIVED` | `payments.ts` | verify / manual-complete | projectId | **ADD** |
| `PAYMENT_REMINDER_SENT` | `payments.ts` | send-reminder | proposalId | **ADD** |
| `TEAM_MEMBER_INVITED` | `project-invitations-create.ts` | POST | projectId | EXISTS |
| `TEAM_MEMBER_ADDED` | `invitations-accept.ts` | POST | projectId | EXISTS |
| `TEAM_MEMBER_REMOVED` | `project-team.ts` | DELETE | projectId | EXISTS |

**Legend**: NEW = new type, ADD = type exists but never logged, FIX = logged to wrong table, EXISTS = already working

## Verification

1. Create an inquiry from admin → check DB for `INQUIRY_CREATED` activity
2. Create an inquiry from public form → check DB for `INQUIRY_CREATED` activity
3. Change inquiry status → `INQUIRY_STATUS_CHANGED` appears
4. Create a proposal → `PROPOSAL_SENT` appears
5. Client accepts/rejects proposal → `PROPOSAL_ACCEPTED/REJECTED` appears (no duplicate from frontend)
6. Project gets created → `PROJECT_CREATED` appears
7. Accept terms → `TERMS_ACCEPTED` appears (no more wrong-table error)
8. Create a task → `TASK_CREATED` appears in Activity tab
9. Change task status → `TASK_STATUS_CHANGED` appears
10. Delete a task → `TASK_DELETED` appears
11. Add comment → `COMMENT_ADDED` appears
12. Upload file → `FILE_UPLOADED` appears
13. Delete file → `FILE_DELETED` appears
14. Create deliverable → `DELIVERABLE_CREATED` appears
15. Change deliverable status → appropriate type appears
16. Complete payment → `PAYMENT_RECEIVED` + `PROJECT_CREATED` appear
17. Verify no duplicate activities from frontend calls
18. Client portal Activity tab shows all relevant activities
19. Admin Activity Logs page shows all activities
