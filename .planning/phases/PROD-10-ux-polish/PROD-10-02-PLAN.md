---
phase: PROD-10-ux-polish
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - landing-page-new/src/components/proposal/StatusTimeline.tsx
  - landing-page-new/src/components/proposal/ProposalReview.tsx
  - netlify/functions/activities.ts
autonomous: true

must_haves:
  truths:
    - "Clients see timeline of proposal status changes with who changed it and when"
    - "Timeline shows status progression in chronological order (newest first)"
    - "Clients only see client-relevant activities (not internal notes)"
    - "Timeline is view-only with no interactive elements"
  artifacts:
    - path: "landing-page-new/src/components/proposal/StatusTimeline.tsx"
      provides: "Timeline component showing proposal status history"
      exports: ["StatusTimeline"]
    - path: "landing-page-new/src/components/proposal/ProposalReview.tsx"
      provides: "Updated proposal review with timeline integration"
      contains: "StatusTimeline"
  key_links:
    - from: "landing-page-new/src/components/proposal/StatusTimeline.tsx"
      to: "landing-page-new/src/lib/portal/api/activities.api.ts"
      via: "fetchActivities"
      pattern: "import.*fetchActivities.*from"
    - from: "landing-page-new/src/components/proposal/ProposalReview.tsx"
      to: "landing-page-new/src/components/proposal/StatusTimeline.tsx"
      via: "import StatusTimeline"
      pattern: "import.*StatusTimeline.*from"
---

<objective>
Create status timeline view showing proposal status progression history.

Purpose: Provide clients with a professional audit trail of their proposal's lifecycle, showing who changed the status and when. This gives transparency without exposing internal-only activities.

Output: `StatusTimeline.tsx` component integrated into ProposalReview, displaying filtered activities from the activities API.
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
@landing-page-new/src/lib/portal/api/activities.api.ts
@landing-page-new/src/components/proposal/ProposalReview.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create StatusTimeline component</name>
  <files>landing-page-new/src/components/proposal/StatusTimeline.tsx</files>
  <action>
Create `landing-page-new/src/components/proposal/StatusTimeline.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Clock, CheckCircle2, XCircle, MessageSquare, FileText, History } from 'lucide-react';
import { fetchActivities, type Activity, type ActivityType } from '@/lib/portal/api/activities.api';

interface StatusTimelineProps {
  proposalId: string;
}

// Activity types that are relevant to clients (visible in timeline)
const CLIENT_VISIBLE_ACTIVITIES: ActivityType[] = [
  'PROPOSAL_SENT',
  'PROPOSAL_ACCEPTED',
  'PROPOSAL_REJECTED',
  'PROPOSAL_CHANGES_REQUESTED',
];

// Map activity types to display info
const ACTIVITY_CONFIG: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}> = {
  PROPOSAL_SENT: {
    label: 'Proposal Sent',
    icon: FileText,
    colorClass: 'bg-purple-100 text-purple-600',
  },
  PROPOSAL_ACCEPTED: {
    label: 'Proposal Accepted',
    icon: CheckCircle2,
    colorClass: 'bg-green-100 text-green-600',
  },
  PROPOSAL_REJECTED: {
    label: 'Proposal Declined',
    icon: XCircle,
    colorClass: 'bg-red-100 text-red-600',
  },
  PROPOSAL_CHANGES_REQUESTED: {
    label: 'Revision Requested',
    icon: MessageSquare,
    colorClass: 'bg-orange-100 text-orange-600',
  },
};

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function StatusTimeline({ proposalId }: StatusTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadActivities() {
      setIsLoading(true);
      try {
        const allActivities = await fetchActivities({ proposalId, limit: 50 });
        // Filter to client-visible activities only
        const visibleActivities = allActivities
          .filter(a => CLIENT_VISIBLE_ACTIVITIES.includes(a.type))
          .sort((a, b) => b.timestamp - a.timestamp); // Newest first
        setActivities(visibleActivities);
      } catch (error) {
        console.error('Failed to load timeline:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadActivities();
  }, [proposalId]);

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return null; // Don't show empty timeline
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-gray-500" />
        <h2 className="text-lg font-semibold text-gray-900">Status History</h2>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-4">
          {activities.map((activity, index) => {
            const config = ACTIVITY_CONFIG[activity.type];
            if (!config) return null;

            const Icon = config.icon;
            const isLast = index === activities.length - 1;

            return (
              <div key={activity.id} className="relative flex gap-4">
                {/* Timeline dot */}
                <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${config.colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className={`flex-1 pb-4 ${!isLast ? 'border-b border-gray-100' : ''}`}>
                  <p className="font-medium text-gray-900">{config.label}</p>
                  <p className="text-sm text-gray-600">
                    {activity.userName} - {formatTimestamp(activity.timestamp)}
                  </p>
                  {activity.details?.feedback && (
                    <p className="mt-1 text-sm text-gray-500 italic">
                      "{String(activity.details.feedback).substring(0, 100)}
                      {String(activity.details.feedback).length > 100 ? '...' : ''}"
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default StatusTimeline;
```

This component:
- Fetches activities for the proposal
- Filters to only client-visible activity types
- Sorts newest-first
- Displays timeline with icons, status labels, who changed it, and timestamp
- Shows feedback preview if available (for revision requests)
- Is view-only with no interactive elements
  </action>
  <verify>
Run `cd landing-page-new && npm run typecheck` - no TypeScript errors.
Component file exists at landing-page-new/src/components/proposal/StatusTimeline.tsx.
  </verify>
  <done>
StatusTimeline.tsx exists with proper activity filtering.
Component imports fetchActivities from activities.api.ts.
Timeline displays activity type, user name, and formatted timestamp.
  </done>
</task>

<task type="auto">
  <name>Task 2: Integrate StatusTimeline into ProposalReview</name>
  <files>landing-page-new/src/components/proposal/ProposalReview.tsx</files>
  <action>
Update `landing-page-new/src/components/proposal/ProposalReview.tsx`:

1. Add import at top:
```tsx
import { StatusTimeline } from './StatusTimeline';
```

2. Add timeline section between the Pricing Breakdown section and the Response Information section (before line ~192 "Response Information").

Insert this JSX after the closing `</div>` of the Pricing Breakdown section (after line ~189):

```tsx
{/* Status Timeline */}
<div className="mt-8">
  <StatusTimeline proposalId={proposal.id} />
</div>
```

The timeline placement follows the recommended layout from RESEARCH.md:
- Below main proposal content (pricing breakdown)
- Above the "You responded to this proposal" section
- Provides context before showing response status

Timeline is read-only and provides audit trail transparency to clients.
  </action>
  <verify>
Run `cd landing-page-new && npm run typecheck` - no TypeScript errors.
Visit http://localhost:3000/proposal/[id] as a client user.
Verify Status History section appears below Pricing Breakdown.
Verify timeline shows proposal status changes with names and timestamps.
  </verify>
  <done>
ProposalReview.tsx imports and renders StatusTimeline.
Timeline appears below Pricing Breakdown section.
Timeline shows chronological status history (newest first).
  </done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors
2. StatusTimeline component renders in ProposalReview
3. Timeline fetches activities from activities API
4. Only client-relevant activities shown (PROPOSAL_SENT, ACCEPTED, REJECTED, CHANGES_REQUESTED)
5. Timeline displays: status label, who changed it, timestamp
6. Timeline is view-only (no buttons, no hover states beyond basic)
</verification>

<success_criteria>
- StatusTimeline.tsx exists and exports StatusTimeline component
- Timeline integrated into ProposalReview.tsx
- Clients see status history with professional formatting
- Internal activities (like INTERNAL_NOTE) are filtered out
- Timeline shows feedback preview for revision requests
- Loading state displays skeleton placeholder
- Empty state (no activities) hides the timeline section
</success_criteria>

<output>
After completion, create `.planning/phases/PROD-10-ux-polish/PROD-10-02-SUMMARY.md`
</output>
