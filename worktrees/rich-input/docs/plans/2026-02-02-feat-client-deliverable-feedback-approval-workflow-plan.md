---
title: "feat: Add client approval/reject workflow for beta-ready deliverables"
type: feat
date: 2026-02-02
---

# feat: Add client approval/reject workflow for beta-ready deliverables

## Overview

When a client views a deliverable in `beta_ready` status, they see no Approve/Reject buttons. The approval buttons only appear when the status is `awaiting_approval`, but there is no mechanism for the Motionify team (or auto-transition) to move a deliverable from `beta_ready` → `awaiting_approval`. Additionally, the `sendForReview` function is referenced in `DeliverableReview.tsx` but never implemented in `DeliverableContext.tsx`, causing a runtime error.

**Root cause:** The `DeliverableContextType` interface and `DeliverableProvider` are missing the `sendForReview` function. The sidebar also doesn't accept or render a "Send for Review" button for team members.

## Problem Analysis

From the screenshot: the client ("Ekalaivan") sees a deliverable with "BETA READY" badge but no approve/reject buttons. The permission system correctly gates approval to `awaiting_approval` status only (`deliverablePermissions.ts:148`). The gap is:

1. **`sendForReview` not implemented** in `DeliverableContext.tsx` — it's destructured at `DeliverableReview.tsx:42` but doesn't exist on the context, causing a runtime error.
2. **`DeliverableMetadataSidebar` doesn't accept `onSendForReview`** — the prop interface at line 28-33 is missing it, and the component has no UI for team members to trigger the transition.
3. **No permission function** `canSendForReview` exists in `deliverablePermissions.ts` to gate who can transition `beta_ready` → `awaiting_approval`.

## Proposed Solution

Add the complete `sendForReview` flow so that Motionify team members (admin/PM) can transition a deliverable from `beta_ready` → `awaiting_approval`, which then unlocks the Approve/Reject buttons for clients.

## Files to Modify

1. `utils/deliverablePermissions.ts` — add `canSendForReview` permission function
2. `hooks/useDeliverablePermissions.ts` — expose `canSendForReview` in the hook
3. `components/deliverables/DeliverableContext.tsx` — implement `sendForReview` on context type and provider
4. `components/deliverables/DeliverableMetadataSidebar.tsx` — accept `onSendForReview` + `isSendingForReview` props, render "Send for Client Review" button for team members when status is `beta_ready`

## Step-by-Step Implementation Plan

### Step 1: Add `canSendForReview` permission function

**File:** `utils/deliverablePermissions.ts`

- Add a new exported function `canSendForReview(user, deliverable, project)`:
  - Returns `true` only if:
    - User is Motionify team (`super_admin` or `project_manager`)
    - Deliverable status is `beta_ready`
    - Project is not `On Hold` or `Archived`
  - Returns `false` for clients and team_members (team members shouldn't send for review without PM approval)
- Add `'send_for_review'` to the `getPermissionDeniedReason` action union type and switch case

### Step 2: Expose in permissions hook

**File:** `hooks/useDeliverablePermissions.ts`

- Import `canSendForReview` from `deliverablePermissions`
- Add `canSendForReview: deliverable ? canSendForReview(user, deliverable, project) : false` to the returned permissions object
- Add `'send_for_review'` to the `getDeniedReason` action type union

### Step 3: Implement `sendForReview` in context

**File:** `components/deliverables/DeliverableContext.tsx`

- Add `sendForReview: (deliverableId: string) => Promise<void>` to `DeliverableContextType` interface
- Implement `sendForReview` function in the provider:
  - Validate user is logged in
  - Find deliverable in state
  - Check `canSendForReview` permission (import from `deliverablePermissions`)
  - Call `PATCH /api/deliverables/{id}` with `{ status: 'awaiting_approval' }`
  - On success, refresh deliverables (the backend already handles activity logging and email notification for `awaiting_approval` transitions — see `deliverables.ts:400-439`)
- Add `sendForReview` to the context provider value object

### Step 4: Add "Send for Review" button to sidebar

**File:** `components/deliverables/DeliverableMetadataSidebar.tsx`

- Add `onSendForReview` and `isSendingForReview` to `DeliverableMetadataSidebarProps` interface
- Add a new condition in the action buttons section: when `deliverable.status === 'beta_ready'` and user `isTeamMember` (Motionify team), show a "Send for Client Review" button
- The button should:
  - Use `Send` icon from lucide-react
  - Have a distinct style (e.g., `bg-indigo-600 hover:bg-indigo-700 text-white`)
  - Show loading state when `isSendingForReview` is true
  - Call `onSendForReview` on click
- For **clients** viewing `beta_ready` status, show an informational message: "This deliverable is being prepared for your review. You'll be notified when it's ready for approval."

## Acceptance Criteria

- [ ] Motionify admin/PM sees a "Send for Client Review" button on `beta_ready` deliverables
- [ ] Clicking the button shows the existing confirmation dialog and transitions status to `awaiting_approval`
- [ ] Client is notified via email (existing backend logic at `deliverables.ts:420-439`)
- [ ] After transition, client sees Approve/Reject buttons on the deliverable
- [ ] Clients viewing `beta_ready` deliverables see an informational message instead of empty space
- [ ] `team_member` role cannot send for review (only admin/PM)
- [ ] No runtime error from missing `sendForReview` on context

## Assumptions & Edge Cases

- The backend PATCH endpoint already supports transitioning to `awaiting_approval` and sends email notifications — no backend changes needed
- The `ConfirmDialog` for "Send for Review" already exists in `DeliverableReview.tsx:331-341` and is wired to `handleSendForReview` — it just needs `sendForReview` to exist on the context
- MVP: all clients default to primary contact (existing behavior in `deliverablePermissions.ts:36`)
- Edge case: if a deliverable has no beta files uploaded, the "Send for Review" button should still work (the team may have uploaded files through another mechanism)

## What Will NOT Be Changed

- `netlify/functions/deliverables.ts` — backend already handles the PATCH and email notifications
- `pages/DeliverableReview.tsx` — already has `handleSendForReview`, dialog, and destructures `sendForReview` from context
- `types/deliverable.types.ts` — no type changes needed
- `components/deliverables/InlineFeedbackForm.tsx` — unrelated
- `components/deliverables/ApprovalTimeline.tsx` — unrelated
- `components/deliverables/DeliverableFilesList.tsx` — unrelated
- No config, env, build, or infrastructure files
- No new dependencies or libraries
