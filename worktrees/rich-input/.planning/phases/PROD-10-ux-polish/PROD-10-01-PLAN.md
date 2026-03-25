---
phase: PROD-10-ux-polish
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/status-config.ts
  - pages/admin/ProposalDetail.tsx
  - landing-page-new/src/components/proposal/ProposalReview.tsx
  - landing-page-new/src/lib/status-config.ts
autonomous: true

must_haves:
  truths:
    - "Clients see professional labels ('Awaiting Your Approval') instead of internal labels ('sent')"
    - "Admins see internal labels ('Sent', 'Changes Requested') unchanged"
    - "Status badges show appropriate traffic light colors (green/yellow/red/gray)"
    - "Status badges include Lucide icons matching each status"
  artifacts:
    - path: "lib/status-config.ts"
      provides: "Centralized STATUS_CONFIG with clientLabel, adminLabel, icon, colorClass"
      exports: ["STATUS_CONFIG", "getStatusLabel", "getStatusConfig"]
    - path: "landing-page-new/src/lib/status-config.ts"
      provides: "Client portal copy of status config"
      exports: ["STATUS_CONFIG", "getStatusLabel"]
  key_links:
    - from: "pages/admin/ProposalDetail.tsx"
      to: "lib/status-config.ts"
      via: "import STATUS_CONFIG"
      pattern: "import.*STATUS_CONFIG.*from"
    - from: "landing-page-new/src/components/proposal/ProposalReview.tsx"
      to: "landing-page-new/src/lib/status-config.ts"
      via: "import STATUS_CONFIG"
      pattern: "import.*STATUS_CONFIG.*from"
---

<objective>
Create centralized status configuration with professional client-facing labels and traffic light colors.

Purpose: Replace hardcoded status labels scattered across admin and client portals with a unified config that provides role-aware labels, consistent colors, and Lucide icons.

Output: `lib/status-config.ts` (admin) and `landing-page-new/src/lib/status-config.ts` (client) containing STATUS_CONFIG object, updated components using the new config.
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
@pages/admin/ProposalDetail.tsx
@landing-page-new/src/components/proposal/ProposalReview.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create centralized STATUS_CONFIG in admin portal</name>
  <files>lib/status-config.ts, pages/admin/ProposalDetail.tsx</files>
  <action>
Create `lib/status-config.ts` with:

```typescript
import { Clock, CheckCircle2, XCircle, MessageSquare, type LucideIcon } from 'lucide-react';

export type ProposalStatus = 'sent' | 'accepted' | 'rejected' | 'changes_requested';

export interface StatusConfig {
  adminLabel: string;      // Internal label for admins
  clientLabel: string;     // Professional label for clients
  icon: LucideIcon;
  colorClass: string;      // Tailwind classes for badge background, text, ring
  iconColorClass: string;  // Icon-specific color
  showToClient: boolean;   // Whether clients should see this status
  allowsEdit: boolean;     // Whether admin can edit proposal in this status
}

export const STATUS_CONFIG: Record<ProposalStatus, StatusConfig> = {
  sent: {
    adminLabel: 'Sent',
    clientLabel: 'Awaiting Your Review',
    icon: Clock,
    colorClass: 'bg-amber-100 text-amber-800 ring-amber-300',
    iconColorClass: 'text-amber-600',
    showToClient: true,
    allowsEdit: false,  // Waiting for client response
  },
  accepted: {
    adminLabel: 'Accepted',
    clientLabel: 'Accepted',
    icon: CheckCircle2,
    colorClass: 'bg-green-100 text-green-800 ring-green-300',
    iconColorClass: 'text-green-600',
    showToClient: true,
    allowsEdit: false,  // Client has responded
  },
  rejected: {
    adminLabel: 'Rejected',
    clientLabel: 'Declined',
    icon: XCircle,
    colorClass: 'bg-red-100 text-red-800 ring-red-300',
    iconColorClass: 'text-red-600',
    showToClient: true,
    allowsEdit: false,  // Client has responded
  },
  changes_requested: {
    adminLabel: 'Revision Requested',
    clientLabel: 'Revision Requested',
    icon: MessageSquare,
    colorClass: 'bg-orange-100 text-orange-800 ring-orange-300',
    iconColorClass: 'text-orange-600',
    showToClient: true,
    allowsEdit: true,   // Admin can edit to address feedback
  },
};

export function getStatusLabel(status: ProposalStatus, role: 'admin' | 'client'): string {
  const config = STATUS_CONFIG[status];
  return role === 'client' ? config.clientLabel : config.adminLabel;
}

export function getStatusConfig(status: ProposalStatus): StatusConfig {
  return STATUS_CONFIG[status];
}
```

Then update `pages/admin/ProposalDetail.tsx`:
1. Remove the inline STATUS_CONFIG object (lines ~373-398)
2. Add import: `import { STATUS_CONFIG, getStatusConfig } from '../../lib/status-config';`
3. Update usage to use `getStatusConfig(proposal.status)` where STATUS_CONFIG[proposal.status] was used
4. Update the status badge to use `statusInfo.adminLabel` instead of `statusInfo.label`
5. Keep existing color scheme for admin (purple theme) - the new colorClass is for shared/client use; admin can continue using its custom colors if preferred, OR switch to traffic light

Note: Admin portal currently uses purple-themed status colors. You may either:
- Keep admin's existing purple theme (just rename label to adminLabel)
- Switch to traffic light scheme for consistency

Decision: Keep admin purple theme for now (minimal change), apply traffic light to client portal.
  </action>
  <verify>
Run `npm run typecheck` in root directory - no TypeScript errors.
Verify admin portal loads at http://localhost:5173/#/admin/proposals/[id] and status badge displays correctly.
  </verify>
  <done>
lib/status-config.ts exists with STATUS_CONFIG, getStatusLabel, getStatusConfig exports.
ProposalDetail.tsx imports from lib/status-config.ts.
Admin portal status badges display same as before (no regression).
  </done>
</task>

<task type="auto">
  <name>Task 2: Update client portal with professional status labels</name>
  <files>landing-page-new/src/lib/status-config.ts, landing-page-new/src/components/proposal/ProposalReview.tsx</files>
  <action>
Create `landing-page-new/src/lib/status-config.ts` (client portal version):

```typescript
import { Clock, CheckCircle2, XCircle, MessageSquare, type LucideIcon } from 'lucide-react';

export type ProposalStatus = 'sent' | 'accepted' | 'rejected' | 'changes_requested';

export interface StatusConfig {
  label: string;           // Client-facing professional label
  icon: LucideIcon;
  colorClass: string;      // Traffic light Tailwind classes
  iconColorClass: string;
}

export const STATUS_CONFIG: Record<ProposalStatus, StatusConfig> = {
  sent: {
    label: 'Awaiting Your Review',
    icon: Clock,
    colorClass: 'bg-amber-100 text-amber-800 ring-amber-300',
    iconColorClass: 'text-amber-600',
  },
  accepted: {
    label: 'Accepted',
    icon: CheckCircle2,
    colorClass: 'bg-green-100 text-green-800 ring-green-300',
    iconColorClass: 'text-green-600',
  },
  rejected: {
    label: 'Declined',
    icon: XCircle,
    colorClass: 'bg-red-100 text-red-800 ring-red-300',
    iconColorClass: 'text-red-600',
  },
  changes_requested: {
    label: 'Revision Requested',
    icon: MessageSquare,
    colorClass: 'bg-orange-100 text-orange-800 ring-orange-300',
    iconColorClass: 'text-orange-600',
  },
};

export function getStatusConfig(status: ProposalStatus): StatusConfig {
  return STATUS_CONFIG[status];
}
```

Update `landing-page-new/src/components/proposal/ProposalReview.tsx`:
1. Remove inline STATUS_COLORS and STATUS_LABELS objects (lines ~13-25)
2. Add import: `import { STATUS_CONFIG, getStatusConfig } from '@/lib/status-config';`
3. Update the status badge (line ~52-54) to use new config:

```tsx
const statusConfig = getStatusConfig(proposal.status);
const StatusIcon = statusConfig.icon;

// In JSX:
<span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ring-1 ${statusConfig.colorClass}`}>
  <StatusIcon className={`w-4 h-4 ${statusConfig.iconColorClass}`} />
  {statusConfig.label}
</span>
```

This gives clients professional labels ("Awaiting Your Review" instead of "Awaiting Response") with traffic light colors (amber for pending, green for positive, red for negative).
  </action>
  <verify>
Run `cd landing-page-new && npm run typecheck` - no TypeScript errors.
Visit http://localhost:3000/proposal/[id] as a client user.
Verify status badge shows "Awaiting Your Review" (amber) for sent proposals, with Clock icon.
  </verify>
  <done>
landing-page-new/src/lib/status-config.ts exists with client-facing labels.
ProposalReview.tsx imports from lib/status-config.ts.
Client sees "Awaiting Your Review" with amber badge and Clock icon for sent proposals.
Client sees "Declined" with red badge and XCircle icon for rejected proposals.
  </done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors in both portals
2. Admin portal: Status badge shows "Sent" (purple theme) for sent proposals
3. Client portal: Status badge shows "Awaiting Your Review" (amber theme) for sent proposals
4. Both portals: Status badges include Lucide icons
5. Traffic light colors applied: amber (pending), green (positive), red (negative), orange (action needed)
</verification>

<success_criteria>
- Centralized STATUS_CONFIG exists in both portals
- Client portal displays professional labels ("Awaiting Your Review", "Declined")
- Admin portal continues to display internal labels ("Sent", "Rejected")
- All status badges include appropriate Lucide icons
- Traffic light color scheme applied to client portal badges
- No regressions in existing functionality
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-10-ux-polish/PROD-10-01-SUMMARY.md`
</output>
