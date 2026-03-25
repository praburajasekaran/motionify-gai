---
title: Replace native browser dialogs with themed custom dialogs
type: feat
date: 2026-03-14
branch: feat/replace-native-browser-dialogs
---

# ✨ Replace Native Browser Dialogs with Themed Custom Dialogs

## Overview

Replace all 7 native browser dialog calls (`prompt()`, `confirm()`, `alert()`) with on-brand custom components that match the app's amber/warm design system. Browser-native dialogs display the site URL, cannot be styled, and break immersion on the studio platform.

## Problem Statement

Seven places in the codebase fall back to native browser dialogs:

| File | Type | Count | Purpose |
|---|---|---|---|
| `pages/admin/ProposalDetail.tsx:1046` | `prompt()` | 1 | Reject proposal — enter reason |
| `pages/admin/ProposalDetail.tsx:1057` | `prompt()` | 1 | Request changes — enter description |
| `pages/ProjectDetail.tsx:441` | `confirm()` | 1 | Delete task |
| `components/deliverables/DeliverablesTab.tsx:44` | `confirm()` | 1 | Approve deliverable |
| `components/deliverables/DeliverableCard.tsx:326` | `confirm()` | 1 | Simulate payment |
| `components/deliverables/DeliverableCard.tsx:315` | `alert()` | 1 | No file available |
| `components/deliverables/DeliverableCard.tsx:319` | `alert()` | 1 | Failed to get download URL |

## Proposed Solution

1. **New `PromptDialog` component** — text input variant of `ConfirmDialog` for the 2 `prompt()` replacements
2. **Wire `ConfirmDialog`** — already exists; add controlled state at the 3 `confirm()` sites
3. **Replace `alert()` with `sonner` toasts** — project already has `sonner` installed

## Technical Considerations

- `PromptDialog` should mirror `ConfirmDialog`'s visual style (`rounded-lg bg-card border border-border`, Lucide icon, amber confirm button) for consistency
- All `confirm()` replacements need a state variable (`isOpen: boolean`) at the component level — the native calls are synchronous but React dialogs are async (callback-based)
- Confirm button in `PromptDialog` should be disabled while input is empty to prevent empty submissions
- `alert()` calls are simple informational messages — `sonner` toast is the correct replacement (already used elsewhere for notifications)
- Branch from `main`, not the current `feat/gate-proposal-resend-behind-edits` branch

## Implementation Plan

### Step 1 — Create `PromptDialog` component

**File:** `components/ui/PromptDialog.tsx`

```tsx
interface PromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  description?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
}
```

- Renders a `fixed inset-0 z-50` overlay (matches `ConfirmDialog` pattern)
- Contains a controlled `<input>` or `<textarea>` with `border border-border rounded-md` styling
- Confirm button uses `bg-primary text-white` (amber), disabled when `value.trim() === ''`
- Icon: `MessageSquare` from Lucide
- Clears input value on close/cancel
- Supports `isLoading` state on confirm button (spinner, matches `ConfirmDialog`)
- Closes on Escape key and backdrop click

### Step 2 — Wire `PromptDialog` in `ProposalDetail.tsx`

**File:** `pages/admin/ProposalDetail.tsx`

Replace lines 1046 and 1057.

Add state:
```tsx
const [promptDialog, setPromptDialog] = useState<{
  open: boolean;
  type: 'reject' | 'revise' | null;
}>({ open: false, type: null });
const [promptLoading, setPromptLoading] = useState(false);
```

Replace button handlers:
- "Reject" → `setPromptDialog({ open: true, type: 'reject' })`
- "Request Changes" → `setPromptDialog({ open: true, type: 'revise' })`

`onConfirm` callback:
```tsx
const handlePromptConfirm = async (feedback: string) => {
  setPromptLoading(true);
  if (promptDialog.type === 'reject') await handleRejectProposal(feedback);
  if (promptDialog.type === 'revise') await handleRequestChanges(feedback);
  setPromptLoading(false);
  setPromptDialog({ open: false, type: null });
};
```

Render `<PromptDialog>` at bottom of JSX with appropriate `title`, `description`, `placeholder`, and `confirmLabel` per type.

### Step 3 — Wire `ConfirmDialog` in `ProjectDetail.tsx`

**File:** `pages/ProjectDetail.tsx:441`

Add state:
```tsx
const [deleteTaskConfirm, setDeleteTaskConfirm] = useState<{
  open: boolean;
  taskId: string | null;
}>({ open: false, taskId: null });
```

Replace handler:
- Before confirm call: `setDeleteTaskConfirm({ open: true, taskId: task.id })`
- `onConfirm`: actually perform deletion, then close

Render:
```tsx
<ConfirmDialog
  isOpen={deleteTaskConfirm.open}
  onClose={() => setDeleteTaskConfirm({ open: false, taskId: null })}
  onConfirm={handleDeleteTaskConfirmed}
  title="Delete Task"
  message="Are you sure you want to delete this task? This action cannot be undone."
  confirmLabel="Delete"
  variant="danger"
/>
```

### Step 4 — Wire `ConfirmDialog` in `DeliverablesTab.tsx`

**File:** `components/deliverables/DeliverablesTab.tsx:44`

Add state:
```tsx
const [approveConfirm, setApproveConfirm] = useState(false);
```

Replace `window.confirm()` block: set `approveConfirm = true`, move the approval logic into `onConfirm`.

Render `<ConfirmDialog>` with `variant="warning"`, title "Approve Deliverable", message with payment link info.

### Step 5 — Wire `ConfirmDialog` + replace `alert()` in `DeliverableCard.tsx`

**File:** `components/deliverables/DeliverableCard.tsx`

Add state:
```tsx
const [paymentConfirm, setPaymentConfirm] = useState(false);
```

Replace `window.confirm()` at line 326: set `paymentConfirm = true`.

Replace `alert()` calls at lines 315 and 319 with `sonner` toast:
```tsx
import { toast } from 'sonner';
// line 315
toast.error('No file available');
// line 319
toast.error('Failed to get download URL');
```

Render `<ConfirmDialog>` for payment simulation with `variant="warning"`.

## Acceptance Criteria

- [ ] No `window.prompt()`, `window.confirm()`, or `window.alert()` / `alert()` calls remain in the codebase
- [ ] New `PromptDialog` component created at `components/ui/PromptDialog.tsx`
- [ ] `PromptDialog` visually matches `ConfirmDialog` — same overlay, card style, and button treatment
- [ ] `PromptDialog` confirm button is disabled when input is empty
- [ ] `PromptDialog` input clears on close/cancel
- [ ] Reject and Request Changes flows in `ProposalDetail` use `PromptDialog` with correct titles and placeholders
- [ ] Delete task in `ProjectDetail` uses `ConfirmDialog` with `variant="danger"`
- [ ] Approve deliverable in `DeliverablesTab` uses `ConfirmDialog` with `variant="warning"`
- [ ] Simulate payment in `DeliverableCard` uses `ConfirmDialog` with `variant="warning"`
- [ ] `alert()` calls in `DeliverableCard` replaced with `sonner` `toast.error()`
- [ ] All dialogs keyboard-accessible (Escape to close, Enter to confirm)
- [ ] All dialogs use theme tokens — amber primary, IBM Plex Sans, warm card/border colors

## Dependencies & Risks

- `sonner` already installed — no new dependencies needed
- `ConfirmDialog` already used in `ProposalDetail.tsx` (line 1106) — established import pattern
- No risk: purely additive for `PromptDialog`; existing sites are mechanical replacements
- The async → callback pattern shift for `confirm()` requires care to preserve the original action logic exactly

## References

- `ConfirmDialog` pattern: `components/ui/ConfirmDialog.tsx`
- `Modal` pattern: `components/ui/Modal.tsx`
- Existing `ConfirmDialog` usage: `pages/DeliverableReview.tsx:395,408`, `pages/admin/ProposalDetail.tsx:1106`, `pages/admin/Payments.tsx:744`
- Toast usage: `sonner` via `components/ui/sonner.tsx`
- Theme tokens: `index.css` (amber `#c2870a`, IBM Plex Sans, `--card`, `--border`)
