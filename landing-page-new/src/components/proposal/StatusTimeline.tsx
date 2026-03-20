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
