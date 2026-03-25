---
title: "feat: Add Contextual Timestamp Display to All Entities"
type: feat
date: 2026-02-03
---

# feat: Add Contextual Timestamp Display to All Entities

## Overview

Display created_at, updated_at, and status-change timestamps across all UI components using a contextual format: relative time ("2 hours ago") for items < 7 days old, absolute date ("Jan 15, 2026") for older items. All timestamps already exist in the database and API responses — this is purely a UI display change.

## Feature Summary

Add a single `formatTimestamp()` utility function that outputs contextual time (relative for recent, absolute for older), then wire it into every entity component that currently omits timestamps: deliverables, tasks, files, team invitations, and enhance partial displays in proposals/payments.

## Files to Be Modified (Exact Paths)

### New Utility (1 file)

None — we extend the existing utility:

1. `landing-page-new/src/lib/portal/utils/dateUtils.ts` — add `formatTimestamp()` function

### Admin App Components (8 files)

2. `components/deliverables/DeliverableListItem.tsx` — add created_at timestamp
3. `components/deliverables/DeliverableCard.tsx` — add created_at below due date
4. `components/deliverables/DeliverableMetadataSidebar.tsx` — add created_at, updated_at, approved_at, delivered_at
5. `components/files/FileList.tsx` — replace raw `toLocaleDateString()` with contextual format
6. `components/team/TeamTab.tsx` — add created_at to pending invitations, show accepted_at for team members
7. `components/payments/PaymentHistory.tsx` — enhance with contextual format + paid_at
8. `components/deliverables/DeliverablesTab.tsx` — add created_at column/indicator if list mode exists
9. `components/admin/AdminRevisionRequestsPanel.tsx` — enhance with contextual format

### Portal App Components (3 files)

10. `landing-page-new/src/lib/portal/components/TaskItem.tsx` — add updated_at display, enhance created_at
11. `landing-page-new/src/lib/portal/components/FileItem.tsx` — add contextual uploaded_at
12. `landing-page-new/src/lib/portal/components/TeamManagement.tsx` — add invitation timestamps

### Type Definitions (2 files — read-only verification, modify only if needed)

13. `types/deliverable.types.ts` — add `createdAt?: string` and `updatedAt?: string` to `Deliverable` interface (currently missing)
14. `types.ts` — add `updatedAt?: string` to `Task` interface (currently missing)

**Total: 14 files**

## Step-by-Step Implementation Plan

### Step 1: Add `formatTimestamp()` to dateUtils.ts

Add a single new exported function to `landing-page-new/src/lib/portal/utils/dateUtils.ts`:

```typescript
/**
 * Contextual timestamp: relative for recent (<7 days), absolute for older.
 * Returns null for falsy input (handles optional timestamps).
 */
export function formatTimestamp(date: string | number | Date | null | undefined): string | null {
  if (!date) return null;
  const dateObj = typeof date === 'string' ? new Date(date)
    : typeof date === 'number' ? new Date(date)
    : date;
  if (isNaN(dateObj.getTime())) return null;

  const now = Date.now();
  const diffMs = now - dateObj.getTime();
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

  if (diffMs < SEVEN_DAYS && diffMs >= 0) {
    return timeAgo(dateObj.getTime());
  }
  return formatDate(dateObj);
}
```

This reuses the existing `timeAgo()` and `formatDate()` already in the file. No new dependencies.

### Step 2: Update Type Definitions

**`types/deliverable.types.ts`** — Add to the `Deliverable` interface:
```typescript
createdAt?: string;   // ISO date string
updatedAt?: string;   // ISO date string
```

**`types.ts`** — Add to the `Task` interface:
```typescript
updatedAt?: string;   // ISO date string
```

### Step 3: Deliverable Components

**`DeliverableListItem.tsx`** — Below the due date section, add a small "Created" timestamp:
```
<Clock /> Created {formatTimestamp(deliverable.createdAt)}
```
Only render if `createdAt` is present. Use same text-xs + text-muted-foreground styling.

**`DeliverableCard.tsx`** — In the metadata section (line ~521), add created_at:
```
<Clock /> Created {formatTimestamp(deliverable.createdAt)}
```

**`DeliverableMetadataSidebar.tsx`** — Add a "Timestamps" section showing all available:
- Created: {formatTimestamp(createdAt)}
- Updated: {formatTimestamp(updatedAt)} (only if different from created)
- Approved: {formatTimestamp(approvedAt)} (only if present)
- Delivered: {formatTimestamp(finalDeliveredAt)} (only if present)

**`DeliverablesTab.tsx`** — If it renders a list, add created_at alongside due date.

### Step 4: Task Components

**`TaskItem.tsx` (portal)** — Already imports `timeAgo`. Add an "Updated" indicator next to or below the task title when `updatedAt` differs from `createdAt`:
```
Updated {formatTimestamp(task.updatedAt)}
```

### Step 5: File Components

**`FileList.tsx` (admin)** — Line 167 currently uses `new Date(file.uploadedAt).toLocaleDateString()`. Replace with:
```typescript
import { formatTimestamp } from '@/landing-page-new/src/lib/portal/utils/dateUtils';
// ...
<span>{formatTimestamp(file.uploadedAt)}</span>
```

**`FileItem.tsx` (portal)** — Same treatment for uploaded_at display.

### Step 6: Team & Invitation Components

**`TeamTab.tsx`** — In the pending invitations section, show:
- "Invited {formatTimestamp(invitation.createdAt)}"
- "Expires {formatDate(invitation.expiresAt)}" (already partially shown)

**`TeamManagement.tsx` (portal)** — Same pattern for portal-side team view.

### Step 7: Payment & Revision Components

**`PaymentHistory.tsx`** — Replace existing date formatting with `formatTimestamp(payment.created_at)`. Add `paid_at` display: "Paid {formatTimestamp(payment.paid_at)}".

**`AdminRevisionRequestsPanel.tsx`** — Replace existing `formatDate()` calls with `formatTimestamp()` for contextual display.

### Step 8: Tooltip Enhancement (Optional, Low Priority)

For all timestamps, wrap in a `<span title={formatDateTime(date)}>` so hovering shows full date+time regardless of which format is displayed. This uses the existing `formatDateTime()` function.

## Assumptions and Edge Cases

### Assumptions

1. **API already returns timestamps** — Verified: all endpoints return created_at/updated_at in their responses.
2. **No new API calls needed** — The data is already fetched; we just display it.
3. **`dateUtils.ts` is importable from admin app** — The admin app (`components/`) can import from `landing-page-new/src/lib/portal/utils/dateUtils.ts`. If not, we copy `formatTimestamp` to a shared utils location.
4. **All timestamps are ISO 8601 strings** — The PostgreSQL database returns ISO format through the API.

### Edge Cases

1. **Null timestamps** — `formatTimestamp()` returns `null` for falsy input; components should conditionally render.
2. **Future dates** — If a timestamp is in the future (clock skew), `timeAgo` will show negative. The `diffMs >= 0` guard in `formatTimestamp` falls through to absolute format.
3. **Timezone handling** — `dateUtils.ts` already handles timezone-safe parsing (documented fix for Bug #3). We inherit this.
4. **createdAt/updatedAt not yet on Deliverable type** — Must add to `types/deliverable.types.ts` before components can use them.
5. **Team members without joinedAt** — Some team members may lack `addedAt`/`joinedAt`; conditionally render.
6. **Role visibility** — All timestamps are visible to all roles. Status-change timestamps (approved_at, rejected_at) are already returned by the API to all authenticated users.

## What Will NOT Be Changed

- **Database schema** — No migrations, no new columns
- **API endpoints** — No changes to netlify/functions/
- **Backend logic** — No server-side changes
- **Build/config files** — No changes to package.json, tsconfig, netlify.toml, etc.
- **Styling system** — No changes to design-system components, CSS variables, or theme
- **Existing date formatting functions** — `formatDate`, `formatDateTime`, `timeAgo` remain unchanged; we only add `formatTimestamp`
- **Unrelated components** — Login, landing page, inquiry forms, proposal builder, etc.
- **Test files** — Unless tests already exist for modified components
- **worktrees/** — Only modify files in the main working tree

## Import Path Consideration

The admin app (`components/`) and portal app (`landing-page-new/`) have different import styles. If the admin app cannot import from `landing-page-new/src/lib/portal/utils/dateUtils.ts`, we should:

1. Check if a shared utils path exists (e.g., `utils/` at project root)
2. If not, duplicate the `formatTimestamp` function in a small utility the admin components can import (e.g., `utils/formatTimestamp.ts`)

This keeps the feature isolated without restructuring imports.
