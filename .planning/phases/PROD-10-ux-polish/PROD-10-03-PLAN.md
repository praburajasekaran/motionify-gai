---
phase: PROD-10-ux-polish
plan: 03
type: execute
wave: 2
depends_on:
  - PROD-10-01
files_modified:
  - lib/status-config.ts
  - pages/admin/ProposalDetail.tsx
  - components/ui/ConfirmDialog.tsx
autonomous: true

must_haves:
  truths:
    - "Admin cannot edit proposal after client responds (accepts/rejects)"
    - "Admin CAN edit proposal after client requests changes"
    - "Super admin can force edit with confirmation dialog"
    - "Locked editing shows banner explaining why editing is disabled"
    - "Save and Resend are separate actions"
  artifacts:
    - path: "pages/admin/ProposalDetail.tsx"
      provides: "Edit restriction logic and force edit functionality"
      contains: "canEdit|canForceEdit|EditRestrictionBanner"
    - path: "components/ui/ConfirmDialog.tsx"
      provides: "Reusable confirmation dialog for force edit"
      exports: ["ConfirmDialog"]
  key_links:
    - from: "pages/admin/ProposalDetail.tsx"
      to: "lib/status-config.ts"
      via: "allowsEdit from STATUS_CONFIG"
      pattern: "allowsEdit"
---

<objective>
Implement proposal edit restrictions based on client response state.

Purpose: Prevent admins from editing proposals after clients have responded (accepted/rejected), while allowing edits during the revision cycle. Super admins get a force edit override with audit logging.

Output: Updated ProposalDetail.tsx with edit restriction logic, ConfirmDialog component for force edit confirmation, separate Save and Resend buttons.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/PROD-10-ux-polish/PROD-10-CONTEXT.md
@.planning/phases/PROD-10-ux-polish/PROD-10-RESEARCH.md
@.planning/phases/PROD-10-ux-polish/PROD-10-01-SUMMARY.md
@pages/admin/ProposalDetail.tsx
@lib/status-config.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create ConfirmDialog component</name>
  <files>components/ui/ConfirmDialog.tsx</files>
  <action>
Create `components/ui/ConfirmDialog.tsx`:

```tsx
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'warning' | 'danger';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    warning: {
      icon: 'bg-amber-100 text-amber-600',
      button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
    },
    danger: {
      icon: 'bg-red-100 text-red-600',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="bg-white px-6 py-6">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`flex-shrink-0 w-12 h-12 rounded-full ${styles.icon} flex items-center justify-center`}>
                <AlertTriangle className="w-6 h-6" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 pr-8">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  {message}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3">
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`inline-flex justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${styles.button}`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                confirmLabel
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="inline-flex justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

This is a reusable confirmation dialog component with:
- Warning and danger variants
- Loading state support
- Proper accessibility (click backdrop to close)
- Consistent styling with existing admin portal
  </action>
  <verify>
Run `npm run typecheck` - no TypeScript errors.
Component file exists at components/ui/ConfirmDialog.tsx.
  </verify>
  <done>
ConfirmDialog.tsx exists with warning/danger variants.
Component accepts isOpen, onClose, onConfirm, title, message props.
Loading state disables buttons and shows spinner.
  </done>
</task>

<task type="auto">
  <name>Task 2: Implement edit restriction logic in ProposalDetail</name>
  <files>pages/admin/ProposalDetail.tsx, lib/status-config.ts</files>
  <action>
First, update `lib/status-config.ts` to ensure allowsEdit is properly exported (from Plan 01).

Then update `pages/admin/ProposalDetail.tsx`:

1. Add imports:
```tsx
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Lock, RefreshCw, Send } from 'lucide-react';
```

2. Add edit permission helper function after the component state declarations:
```tsx
// Edit permission logic
const getEditPermission = () => {
  if (!proposal) return { canEdit: false, canForceEdit: false, reason: '' };

  const statusConfig = STATUS_CONFIG[proposal.status];

  // changes_requested allows normal editing (revision cycle)
  if (proposal.status === 'changes_requested') {
    return { canEdit: true, canForceEdit: true, reason: '' };
  }

  // accepted/rejected = client responded, editing locked
  if (proposal.status === 'accepted' || proposal.status === 'rejected') {
    return {
      canEdit: false,
      canForceEdit: user?.role === 'super_admin',
      reason: 'Editing locked - client has responded to this proposal',
    };
  }

  // sent = waiting for client, editing locked
  if (proposal.status === 'sent') {
    return {
      canEdit: false,
      canForceEdit: user?.role === 'super_admin',
      reason: 'Editing locked - proposal sent to client, awaiting response',
    };
  }

  return { canEdit: true, canForceEdit: true, reason: '' };
};

const editPermission = proposal ? getEditPermission() : { canEdit: false, canForceEdit: false, reason: '' };
```

3. Add state for force edit dialog:
```tsx
const [showForceEditDialog, setShowForceEditDialog] = useState(false);
const [isResending, setIsResending] = useState(false);
```

4. Add force edit handler:
```tsx
const handleForceEdit = async () => {
  setShowForceEditDialog(false);
  setIsEditMode(true);

  // Log force edit action to activities
  try {
    const response = await fetch('/.netlify/functions/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        type: 'PROPOSAL_FORCE_EDITED',
        userId: user?.id,
        userName: user?.name,
        proposalId: proposal?.id,
        inquiryId: proposal?.inquiryId,
        details: {
          previousStatus: proposal?.status,
          reason: 'Super admin force edit override',
        },
      }),
    });
    if (!response.ok) console.error('Failed to log force edit activity');
  } catch (error) {
    console.error('Error logging force edit:', error);
  }
};
```

5. Add Resend handler (for revision cycle):
```tsx
const handleResend = async () => {
  if (!proposal || proposal.status !== 'changes_requested') return;

  setIsResending(true);
  try {
    // Log resend activity
    await fetch('/.netlify/functions/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        type: 'PROPOSAL_SENT',
        userId: user?.id,
        userName: user?.name,
        proposalId: proposal.id,
        inquiryId: proposal.inquiryId,
        details: {
          version: (proposal.version || 1) + 1,
          action: 'resent_after_revision',
        },
      }),
    });

    // Update proposal status back to sent and increment version
    const updatedProposal = await updateProposal(proposal.id, {
      status: 'sent',
      version: (proposal.version || 1) + 1,
    });

    setProposal(updatedProposal);
    alert('Proposal resent to client!');
  } catch (error) {
    console.error('Error resending proposal:', error);
    alert('Failed to resend proposal. Please try again.');
  } finally {
    setIsResending(false);
  }
};
```

6. Update the Edit button section (~line 441) to use edit permission:
```tsx
{isAdmin && !isEditMode && (
  <>
    {editPermission.canEdit ? (
      <button
        onClick={() => setIsEditMode(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors font-medium"
      >
        <Edit2 className="w-4 h-4" />
        Edit Proposal
      </button>
    ) : editPermission.canForceEdit ? (
      <button
        onClick={() => setShowForceEditDialog(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors font-medium"
      >
        <Lock className="w-4 h-4" />
        Force Edit
      </button>
    ) : null}

    {/* Resend button for revision cycle */}
    {proposal.status === 'changes_requested' && (
      <button
        onClick={handleResend}
        disabled={isResending}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors font-medium disabled:opacity-50"
      >
        {isResending ? (
          <>
            <div className="w-4 h-4 border-2 border-green-700/30 border-t-green-700 rounded-full animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Resend to Client
          </>
        )}
      </button>
    )}
  </>
)}
```

7. Add edit restriction banner after the header section (before "Project Description"):
```tsx
{/* Edit Restriction Banner */}
{isAdmin && !isEditMode && !editPermission.canEdit && editPermission.reason && (
  <div className="mb-6 flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
    <Lock className="w-5 h-5 text-amber-600 flex-shrink-0" />
    <div>
      <p className="text-sm font-medium text-amber-800">{editPermission.reason}</p>
      {editPermission.canForceEdit && (
        <p className="text-xs text-amber-600 mt-1">
          As a super admin, you can use "Force Edit" to override this restriction.
        </p>
      )}
    </div>
  </div>
)}
```

8. Add ConfirmDialog at the end of the component (before closing div):
```tsx
{/* Force Edit Confirmation Dialog */}
<ConfirmDialog
  isOpen={showForceEditDialog}
  onClose={() => setShowForceEditDialog(false)}
  onConfirm={handleForceEdit}
  title="Force Edit Proposal?"
  message="This proposal has already received a client response. Editing it may cause confusion or inconsistency. Your action will be logged. Are you sure you want to proceed?"
  confirmLabel="Yes, Force Edit"
  cancelLabel="Cancel"
  variant="warning"
/>
```
  </action>
  <verify>
Run `npm run typecheck` - no TypeScript errors.
Visit http://localhost:5173/#/admin/proposals/[id] with a sent proposal.
Verify Edit button is hidden and "Editing locked" banner appears.
Login as super_admin, verify "Force Edit" button appears.
Click Force Edit, verify confirmation dialog appears.
Test with changes_requested status - verify normal Edit and Resend buttons appear.
  </verify>
  <done>
Edit button hidden for sent/accepted/rejected proposals (non-super-admin).
Force Edit button shown for super_admin with confirmation dialog.
Edit allowed for changes_requested status.
Resend button appears for changes_requested status.
Restriction banner explains why editing is locked.
Force edit actions logged to activities.
  </done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors
2. sent status: Edit locked, super_admin sees Force Edit
3. accepted status: Edit locked, super_admin sees Force Edit
4. rejected status: Edit locked, super_admin sees Force Edit
5. changes_requested status: Edit allowed, Resend button visible
6. Force Edit shows confirmation dialog with warning message
7. Force edit action logged to activities API
8. Resend increments version and updates status to sent
</verification>

<success_criteria>
- ConfirmDialog.tsx exists as reusable component
- Edit restriction logic based on proposal.status works correctly
- Super admin force edit with confirmation and audit logging
- Edit restriction banner with clear explanation
- Separate Save and Resend buttons (Save exists, Resend added)
- Resend logs activity and increments version
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-10-ux-polish/PROD-10-03-SUMMARY.md`
</output>
