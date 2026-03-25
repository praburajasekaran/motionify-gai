# Phase PROD-10: UX Polish - Research

**Researched:** 2026-01-28
**Domain:** Frontend UX, Status Management, Notifications
**Confidence:** HIGH

## Summary

This phase focuses on improving client-facing status labels with professional translations, implementing a status timeline view, adding proposal edit restrictions based on client response state, and implementing comprehensive status change notifications. The codebase already has established patterns for all key areas: NotificationContext for in-app notifications (both admin and client portals), Resend for email delivery, Sonner/custom toast for immediate feedback, activities API for audit logging, and Lucide React icons throughout.

The primary challenge is coordinating multiple systems (toast + bell badge + email) on status changes while maintaining consistent styling and role-based access control. The proposal editing restriction requires careful state management to handle the revision cycle workflow.

**Primary recommendation:** Leverage existing patterns (NotificationContext, activities API, Resend email templates) and add new status-specific configurations for labels, colors, and icons using centralized mapping objects.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| lucide-react | ^0.555.0 | Icon library | Already used across entire codebase, CLAUDE.md mandates Lucide icons |
| sonner | ^2.0.7 | Toast notifications (Next.js) | Already integrated in client portal |
| Custom ToastProvider | N/A | Toast notifications (Vite admin) | Exists in design-system.tsx |
| Resend | ^6.7.0 | Email delivery | Already used for all email templates |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | 3.x | Styling | All visual treatments including status badges |
| Zod | 4.x | Schema validation | Validate notification payloads |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom toast | react-hot-toast | Sonner already integrated, no benefit to switching |
| Ably real-time | Polling | Decision already made - polling for v1 |

**Installation:**
No new packages required. All dependencies already present.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   └── status/
│       ├── status-labels.ts        # Client-facing label translations
│       ├── status-colors.ts        # Traffic light color mappings
│       └── status-icons.ts         # Lucide icon mappings
├── components/
│   └── proposal/
│       ├── StatusBadge.tsx         # Unified status badge component
│       ├── StatusTimeline.tsx      # Timeline view component
│       └── EditRestrictionBanner.tsx # Locked editing banner
└── services/
    └── status-notification.ts      # Unified notification dispatch
```

### Pattern 1: Centralized Status Configuration

**What:** Single source of truth for all status-related data (labels, colors, icons, permissions)
**When to use:** When displaying or processing any proposal status
**Example:**
```typescript
// Source: Existing ProposalDetail.tsx STATUS_CONFIG pattern extended
export interface StatusConfig {
  label: string;
  clientLabel: string;  // Client-facing translation
  icon: LucideIcon;
  colorClass: string;   // Tailwind classes for badge
  showToClient: boolean; // Whether clients see this status
  allowsEdit: boolean;   // Whether admin can edit in this status
}

export const STATUS_CONFIG: Record<ProposalStatus, StatusConfig> = {
  sent: {
    label: 'Sent',
    clientLabel: 'Awaiting Your Review',
    icon: Clock,
    colorClass: 'bg-amber-100 text-amber-800 ring-amber-300',
    showToClient: true,
    allowsEdit: false, // Sent to client, pending their response
  },
  accepted: {
    label: 'Accepted',
    clientLabel: 'Accepted',
    icon: CheckCircle2,
    colorClass: 'bg-green-100 text-green-800 ring-green-300',
    showToClient: true,
    allowsEdit: false, // Client responded
  },
  rejected: {
    label: 'Rejected',
    clientLabel: 'Declined',
    icon: XCircle,
    colorClass: 'bg-red-100 text-red-800 ring-red-300',
    showToClient: true,
    allowsEdit: false, // Client responded
  },
  changes_requested: {
    label: 'Revision Requested',
    clientLabel: 'Revision Requested',
    icon: MessageSquare,
    colorClass: 'bg-orange-100 text-orange-800 ring-orange-300',
    showToClient: true,
    allowsEdit: true, // Admin can edit to address feedback
  },
};
```

### Pattern 2: Timeline Data Structure

**What:** Activity-based timeline using existing activities table
**When to use:** Displaying proposal status history
**Example:**
```typescript
// Source: Existing activities.api.ts pattern
export interface TimelineEntry {
  id: string;
  status: ProposalStatus;
  changedBy: string;
  timestamp: Date;
  isVisibleToClient: boolean;
  details?: {
    feedback?: string;
    version?: number;
  };
}

// Filter activities for timeline
const getTimelineEntries = (activities: Activity[], isClient: boolean): TimelineEntry[] => {
  const proposalActivities = activities.filter(a =>
    ['PROPOSAL_SENT', 'PROPOSAL_ACCEPTED', 'PROPOSAL_REJECTED', 'PROPOSAL_CHANGES_REQUESTED']
      .includes(a.type)
  );

  if (isClient) {
    // Clients see only client-relevant transitions
    return proposalActivities.filter(a =>
      !['INTERNAL_NOTE', 'ADMIN_EDIT'].includes(a.type)
    );
  }

  return proposalActivities;
};
```

### Pattern 3: Notification Dispatch Pattern

**What:** Unified function that triggers both in-app and email notifications
**When to use:** On any status change
**Example:**
```typescript
// Source: Existing patterns from NotificationContext + send-email.ts
export async function notifyStatusChange(params: {
  proposalId: string;
  newStatus: ProposalStatus;
  changedBy: User;
  targetUsers: Array<{ id: string; email: string; name: string; role: string }>;
}) {
  const { proposalId, newStatus, changedBy, targetUsers } = params;

  for (const user of targetUsers) {
    // 1. Create in-app notification (triggers bell badge via NotificationContext polling)
    await createNotification({
      userId: user.id,
      type: 'proposal_status_changed',
      title: `Proposal ${getStatusLabel(newStatus, user.role)}`,
      message: `${changedBy.name} ${getStatusAction(newStatus)}`,
      actionUrl: `/proposal/${proposalId}`,
    });

    // 2. Send email notification
    await sendStatusChangeEmail({
      to: user.email,
      clientName: user.name,
      proposalTitle: `Proposal #${proposalId}`,
      newStatus: getStatusLabel(newStatus, user.role),
      viewUrl: `${process.env.URL}/proposal/${proposalId}`,
    });
  }
}
```

### Pattern 4: Edit Restriction State Machine

**What:** Clear rules for when editing is allowed based on proposal status
**When to use:** Before showing edit button or allowing save
**Example:**
```typescript
// Source: Existing ProposalDetail.tsx patterns
type EditPermission = {
  canEdit: boolean;
  reason?: string;
  canForceEdit: boolean; // Super admin override
};

function getEditPermission(
  proposal: Proposal,
  user: User
): EditPermission {
  // After client responds (accepted/rejected/changes_requested)
  const clientResponded = ['accepted', 'rejected'].includes(proposal.status);

  // changes_requested allows editing for revision
  if (proposal.status === 'changes_requested') {
    return { canEdit: true, canForceEdit: true };
  }

  if (clientResponded) {
    return {
      canEdit: false,
      reason: 'Editing locked - client has responded',
      canForceEdit: user.role === 'super_admin',
    };
  }

  // Draft state - free editing
  if (proposal.status === 'sent') {
    // Sent means waiting for client, no edit allowed
    return {
      canEdit: false,
      reason: 'Editing locked - proposal sent to client',
      canForceEdit: user.role === 'super_admin',
    };
  }

  return { canEdit: true, canForceEdit: true };
}
```

### Anti-Patterns to Avoid
- **Hardcoded status strings:** Always use STATUS_CONFIG, never hardcode labels
- **Direct database status checks:** Always go through permission functions
- **Separate notification calls:** Always use unified notifyStatusChange
- **Role checks without permission functions:** Use Permissions.* helpers

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast component | Sonner (client portal) / useToast (admin) | Already integrated, handles animation and dismiss |
| Email templates | Inline HTML strings | Existing template patterns in send-email.ts | Consistent branding, DRY |
| Activity logging | Custom logging | activities API + createActivity() | Schema validated, indexed, auditable |
| In-app notifications | Custom state | NotificationContext + notifications table | Polling, persistence, bell badge already working |
| Icon selection | Random icon picking | Lucide icon library | CLAUDE.md mandates, type-safe imports |

**Key insight:** The codebase has mature patterns for notifications (dual channel), activity logging, and status display. The work is primarily configuration and coordination, not building new infrastructure.

## Common Pitfalls

### Pitfall 1: Notification Spam
**What goes wrong:** Multiple notifications for single status change (duplicate emails, multiple toasts)
**Why it happens:** Status change triggers from multiple code paths
**How to avoid:** Single entry point (notifyStatusChange) for all status changes
**Warning signs:** Users reporting duplicate emails; multiple toast stack-up

### Pitfall 2: Timeline Data Inconsistency
**What goes wrong:** Timeline shows events that don't match actual status history
**Why it happens:** Activities not being logged for all status changes
**How to avoid:** Use existing activities API consistently; add activity logging to all status mutation endpoints
**Warning signs:** Gaps in timeline; timestamps don't match actual events

### Pitfall 3: Edit Lock Race Conditions
**What goes wrong:** Admin saves edit after client responds, creating data conflict
**Why it happens:** Status check happens on page load, not on save
**How to avoid:** Re-check status in save handler before committing
**Warning signs:** Optimistic UI shows success but server rejects

### Pitfall 4: Role-Based Label Confusion
**What goes wrong:** Client sees admin-only labels or vice versa
**Why it happens:** Single label used without role context
**How to avoid:** Always pass user role to label functions; hide internal statuses from clients
**Warning signs:** Client seeing "Revision Requested" instead of professional language

### Pitfall 5: Force Edit Audit Gap
**What goes wrong:** Super admin force-edits but no record of override
**Why it happens:** Force edit bypasses normal logging
**How to avoid:** Always log force edit actions to activities with explicit type
**Warning signs:** Timeline missing admin changes; compliance issues

## Code Examples

Verified patterns from existing codebase:

### Status Badge Component (Based on ProposalDetail.tsx)
```typescript
// Source: pages/admin/ProposalDetail.tsx STATUS_CONFIG pattern
interface StatusBadgeProps {
  status: ProposalStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  userRole: 'admin' | 'client';
}

export function StatusBadge({ status, size = 'md', showIcon = true, userRole }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  if (!config.showToClient && userRole === 'client') return null;

  const label = userRole === 'client' ? config.clientLabel : config.label;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-medium ring-1',
      config.colorClass,
      sizeClasses[size]
    )}>
      {showIcon && <Icon className="w-4 h-4" />}
      {label}
    </span>
  );
}
```

### Toast + Notification Combo (Based on NotificationContext + Sonner)
```typescript
// Source: contexts/NotificationContext.tsx + landing-page-new sonner usage
import { toast } from 'sonner';
import { useNotifications } from '@/contexts/NotificationContext';

function useStatusChangeNotification() {
  const { addNotification, refreshNotifications } = useNotifications();

  const notify = async (status: ProposalStatus, proposalTitle: string) => {
    // Immediate toast feedback
    toast.success(`Proposal ${getStatusAction(status)}`, {
      description: proposalTitle,
      duration: 5000,
    });

    // Refresh bell badge (will fetch from server including new notification)
    await refreshNotifications();
  };

  return { notify };
}
```

### Activity-Based Timeline (Based on activities.api.ts)
```typescript
// Source: landing-page-new/src/lib/portal/api/activities.api.ts
import { fetchActivities, type Activity } from '@/lib/portal/api/activities.api';

interface TimelineProps {
  proposalId: string;
  isClient: boolean;
}

export function StatusTimeline({ proposalId, isClient }: TimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    fetchActivities({ proposalId, limit: 50 }).then(setActivities);
  }, [proposalId]);

  const timelineEntries = activities
    .filter(a => a.type.startsWith('PROPOSAL_'))
    .filter(a => isClient ? isClientVisibleActivity(a.type) : true)
    .sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-4">
      {timelineEntries.map(entry => (
        <TimelineEntry
          key={entry.id}
          type={entry.type}
          userName={entry.userName}
          timestamp={new Date(entry.timestamp)}
          details={entry.details}
        />
      ))}
    </div>
  );
}
```

### Email Template Pattern (Based on send-email.ts)
```typescript
// Source: netlify/functions/send-email.ts
export async function sendProposalStatusChangeEmail(data: {
  to: string;
  clientName: string;
  proposalTitle: string;
  newStatus: string;
  viewUrl: string;
}) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #D946EF, #8B5CF6, #3B82F6); padding: 12px 20px; border-radius: 12px;">
          <span style="color: white; font-size: 24px; font-weight: bold;">Motionify</span>
        </div>
      </div>

      <h2 style="color: #7c3aed; text-align: center;">Proposal Update</h2>
      <p>Hi <strong>${data.clientName}</strong>,</p>
      <p>Your proposal <strong>${data.proposalTitle}</strong> has been updated.</p>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0; color: #6b7280; font-size: 14px;">New Status</p>
        <p style="margin: 8px 0 0 0; font-size: 20px; font-weight: bold; color: #111827;">${data.newStatus}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.viewUrl}" style="background: linear-gradient(135deg, #D946EF, #8B5CF6, #3B82F6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View Proposal</a>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        Motionify Studio<br>
        <a href="https://motionify.studio" style="color: #7c3aed;">motionify.studio</a>
      </p>
    </div>
  `;

  return sendEmail({
    to: data.to,
    subject: `Proposal Update: ${data.proposalTitle} - ${data.newStatus}`,
    html,
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| alert() for feedback | Toast notifications | Already in codebase | Better UX, non-blocking |
| localStorage notifications | NotificationContext + DB | Already in codebase | Persistent, cross-session |
| Hardcoded status labels | STATUS_CONFIG object | This phase | Centralized, role-aware |
| Manual notification calls | Unified dispatch | This phase | Consistent, DRY |

**Deprecated/outdated:**
- alert() calls: Replace with toast.success() / toast.error()
- console.log() for "email sent": Already mock, will be replaced with actual sendEmail calls

## Open Questions

Things that couldn't be fully resolved:

1. **Revision Version Number Storage**
   - What we know: User wants "Revision 3" displayed
   - What's unclear: Where to store version number - proposals.version column exists but may need update logic
   - Recommendation: Increment proposals.version on each resend; display in timeline

2. **Force Edit Confirmation Dialog Design**
   - What we know: Super admin needs confirmation warning before force edit
   - What's unclear: Exact warning text content
   - Recommendation: Use existing Dialog component pattern; text like "This proposal has been responded to by the client. Editing may cause confusion. Are you sure?"

3. **Resend Button vs Auto-Resend**
   - What we know: Save and Resend should be separate; Resend logs to activity
   - What's unclear: Does Resend also update proposal.status or just send notification?
   - Recommendation: Resend keeps status as 'changes_requested', sends notification, logs activity

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: pages/admin/ProposalDetail.tsx (STATUS_CONFIG pattern)
- Existing codebase analysis: contexts/NotificationContext.tsx (notification patterns)
- Existing codebase analysis: landing-page-new/src/contexts/NotificationContext.tsx (client portal notifications)
- Existing codebase analysis: netlify/functions/send-email.ts (email template patterns)
- Existing codebase analysis: landing-page-new/src/lib/portal/api/activities.api.ts (activity logging)
- Existing codebase analysis: components/ui/design-system.tsx (ToastProvider, useToast)

### Secondary (MEDIUM confidence)
- CONTEXT.md user decisions (all implementation choices locked)
- STATE.md technical context (polling, Resend, NotificationContext established)

### Tertiary (LOW confidence)
- None - all findings based on existing codebase patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in codebase and actively used
- Architecture: HIGH - patterns derived from existing working code
- Pitfalls: HIGH - based on analysis of existing implementation gaps

**Research date:** 2026-01-28
**Valid until:** 60 days (stable domain, no external dependencies changing)

## Implementation Recommendations

### Lucide Icon Selections (Claude's Discretion)

Based on existing usage patterns and traffic light color scheme:

| Status | Icon | Rationale |
|--------|------|-----------|
| sent | `Clock` | Pending action (already used in codebase) |
| accepted | `CheckCircle2` | Positive outcome (already used in codebase) |
| rejected | `XCircle` | Negative outcome (already used in codebase) |
| changes_requested | `MessageSquare` | Feedback/communication (already used in codebase) |
| edit_locked | `Lock` | Restriction indicator |
| revision | `RefreshCcw` | Iteration indicator |

### Toast Configuration (Claude's Discretion)

Based on existing Sonner and useToast patterns:

- **Duration:** 5000ms (5 seconds) - matches existing pattern
- **Position:** Bottom-right for Vite admin (existing), top-center for Next.js client (Sonner default)
- **Auto-dismiss:** Yes, with manual close option

### Timeline Placement (Claude's Discretion)

Recommended: Below the main proposal content, above the comment thread.

Rationale:
- Timeline is read-only status history (audit trail)
- Comments are interactive discussion
- Status history provides context before entering discussion

### Email Subject Lines (Claude's Discretion)

| Event | Subject Line |
|-------|--------------|
| Status change (general) | `Proposal Update: [Proposal Title] - [New Status]` |
| Admin response to revision | `Your Revised Proposal is Ready - [Inquiry Number]` |
| Client accepts | `Proposal Accepted - [Inquiry Number]` |
| Client rejects | `Proposal Declined - [Inquiry Number]` |
| Client requests changes | `Revision Request Received - [Inquiry Number]` |
