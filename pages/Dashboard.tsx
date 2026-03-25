import React, { useState, useEffect } from 'react';
import { PrefetchLink } from '../shared/components/PrefetchLink';
import {
  FolderOpen,
  FileText,
  DollarSign,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
  Send,
  CheckCircle,
  CreditCard,
  Package,
  FolderPlus,
  Clock,
  Mail,
} from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { StatGridSkeleton, ActivityFeedSkeleton } from '../components/ui/SkeletonLoaders';
import { useDashboardMetrics } from '../shared/hooks/useDashboardMetrics';
import { useDashboardActivities, type Activity } from '../shared/hooks/useDashboardActivities';
import { formatTimestamp, formatDateTime } from '../utils/dateFormatting';
import { API_BASE } from '../lib/api-config';

// Map activity types to human-readable labels
const ACTIVITY_LABELS: Record<string, string> = {
  PROPOSAL_SENT: 'Sent proposal',
  PROPOSAL_ACCEPTED: 'Proposal accepted',
  PROPOSAL_REJECTED: 'Proposal rejected',
  PROPOSAL_CHANGES_REQUESTED: 'Requested changes',
  PAYMENT_RECEIVED: 'Payment received',
  DELIVERABLE_APPROVED: 'Deliverable approved',
  DELIVERABLE_REJECTED: 'Deliverable rejected',
  DELIVERABLE_UPLOADED: 'Deliverable uploaded',
  COMMENT_ADDED: 'Comment added',
  PROJECT_CREATED: 'Project created',
  TASK_CREATED: 'Task created',
  TASK_STATUS_CHANGED: 'Task status changed',
  FILE_UPLOADED: 'File uploaded',
  TERMS_ACCEPTED: 'Terms accepted',
  INQUIRY_SUBMITTED: 'Inquiry submitted',
};

// Metric card component
interface MetricCardProps {
  title: string;
  value: number;
  icon: typeof FolderOpen;
  color: 'blue' | 'purple' | 'green' | 'amber';
  breakdown?: { label: string; value: number }[];
  isExpanded: boolean;
  onToggle: () => void;
}

function MetricCard({ title, value, icon: Icon, color, breakdown, isExpanded, onToggle }: MetricCardProps) {
  return (
    <button
      onClick={onToggle}
      className="bg-card rounded-lg border border-border p-4 hover:border-foreground/15 transition-colors text-left w-full"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
        {breakdown && (
          <div className="text-muted-foreground" aria-hidden="true">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        )}
      </div>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-semibold text-foreground tracking-tight tabular-nums">{value.toLocaleString()}</p>
      </div>

      {breakdown && isExpanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-1.5">
          {breakdown.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-[14px]">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium text-foreground tabular-nums">{item.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

export const Dashboard = () => {
  const { user } = useAuthContext();
  const metricsQuery = useDashboardMetrics();
  const activitiesQuery = useDashboardActivities();

  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [additionalActivities, setAdditionalActivities] = useState<Activity[]>([]);
  const [activityOffset, setActivityOffset] = useState(0);
  const [hasMoreActivities, setHasMoreActivities] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Derive hasMoreActivities from initial query data
  useEffect(() => {
    if (activitiesQuery.data) {
      setHasMoreActivities(activitiesQuery.data.length === 10);
      // Reset appended pages when base data refreshes
      setAdditionalActivities([]);
      setActivityOffset(0);
    }
  }, [activitiesQuery.data]);

  const allActivities = [...(activitiesQuery.data ?? []), ...additionalActivities];

  // Load more activities (append next page)
  const handleLoadMoreActivities = async () => {
    setIsLoadingMore(true);
    try {
      const newOffset = activityOffset + 10;
      const response = await fetch(
        `${API_BASE}/activities?limit=10&offset=${newOffset}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error(`Failed to load more activities: ${response.status}`);
      const data: Activity[] = await response.json();
      setAdditionalActivities(prev => [...prev, ...data]);
      setActivityOffset(newOffset);
      setHasMoreActivities(data.length === 10);
    } catch (error: any) {
      console.error('Failed to load more activities:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Get context link for activity
  function getActivityContextLink(activity: Activity): { to: string; label: string } | null {
    if (activity.projectId && activity.projectName) {
      return { to: `/projects/${activity.projectId}`, label: activity.projectName };
    }
    if (activity.proposalId && activity.proposalName) {
      return { to: `/admin/inquiries/${activity.inquiryId}`, label: activity.proposalName };
    }
    if (activity.inquiryId && activity.inquiryNumber) {
      return { to: `/admin/inquiries/${activity.inquiryId}`, label: activity.inquiryNumber };
    }
    return null;
  }

  const metrics = metricsQuery.data;

  return (
    <div className="space-y-6">
      {/* Header — tight, purposeful */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-[14px] text-muted-foreground mt-0.5">
          {user?.name ? `Welcome back, ${user.name}` : 'Production overview'}
          {user?.role && <span className="text-muted-foreground/60"> · {user.role === 'superadmin' ? 'Super Admin' : user.role}</span>}
        </p>
      </div>

      {/* Metric Cards — clean grid, no icons, data-forward */}
      {metricsQuery.error ? (
        <div className="bg-card rounded-lg border border-border">
          <ErrorState
            error={metricsQuery.error instanceof Error ? metricsQuery.error.message : 'Failed to load metrics'}
            onRetry={() => metricsQuery.refetch()}
          />
        </div>
      ) : metricsQuery.isLoading ? (
        <StatGridSkeleton />
      ) : metrics ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Projects"
            value={metrics.projects.total}
            icon={FolderOpen}
            color="blue"
            breakdown={[
              { label: 'Active', value: metrics.projects.active },
              { label: 'Completed', value: metrics.projects.completed },
            ]}
            isExpanded={expandedCard === 'projects'}
            onToggle={() => setExpandedCard(expandedCard === 'projects' ? null : 'projects')}
          />
          <MetricCard
            title="Proposals"
            value={metrics.proposals.total}
            icon={FileText}
            color="purple"
            breakdown={[
              { label: 'Pending', value: metrics.proposals.pending },
              { label: 'Accepted', value: metrics.proposals.accepted },
            ]}
            isExpanded={expandedCard === 'proposals'}
            onToggle={() => setExpandedCard(expandedCard === 'proposals' ? null : 'proposals')}
          />
          <MetricCard
            title="Revenue"
            value={metrics.revenue.total}
            icon={DollarSign}
            color="green"
            breakdown={[
              { label: 'Received', value: metrics.revenue.completed },
              { label: 'Pending', value: metrics.revenue.pending },
            ]}
            isExpanded={expandedCard === 'revenue'}
            onToggle={() => setExpandedCard(expandedCard === 'revenue' ? null : 'revenue')}
          />
          <MetricCard
            title="Inquiries"
            value={metrics.inquiries.total}
            icon={MessageSquare}
            color="amber"
            breakdown={[
              { label: 'New', value: metrics.inquiries.new },
            ]}
            isExpanded={expandedCard === 'inquiries'}
            onToggle={() => setExpandedCard(expandedCard === 'inquiries' ? null : 'inquiries')}
          />
        </div>
      ) : null}

      {/* Recent Activity — clean table, tighter rows */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-[15px] font-semibold text-foreground">Recent Activity</h3>
        </div>

        {activitiesQuery.error ? (
          <ErrorState
            error={activitiesQuery.error instanceof Error ? activitiesQuery.error.message : 'Failed to load recent activity'}
            onRetry={() => activitiesQuery.refetch()}
          />
        ) : activitiesQuery.isLoading ? (
          <div className="p-4">
            <ActivityFeedSkeleton count={5} />
          </div>
        ) : activitiesQuery.isSuccess && allActivities.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No recent activity"
            description="Activity will appear here as work progresses"
          />
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-secondary-foreground uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-secondary-foreground uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-secondary-foreground uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-secondary-foreground uppercase tracking-wider">
                    Context
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allActivities.map((activity) => {
                  const activityLabel = ACTIVITY_LABELS[activity.type] || activity.type.replace(/_/g, ' ').toLowerCase();
                  const contextLink = getActivityContextLink(activity);

                  return (
                    <tr key={activity.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-2.5 whitespace-nowrap text-[14px] text-muted-foreground tabular-nums" title={formatDateTime(activity.timestamp) || undefined}>
                        {formatTimestamp(activity.timestamp)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[14px]">
                        <span className="font-medium text-foreground">{activity.userName}</span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[14px] text-foreground">
                        {activityLabel}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[14px]">
                        {contextLink ? (
                          <PrefetchLink
                            to={contextLink.to}
                            className="text-primary hover:text-primary/80 font-medium hover:underline underline-offset-2"
                          >
                            {contextLink.label}
                          </PrefetchLink>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {hasMoreActivities && (
            <div className="flex justify-center border-t border-border py-3">
              <button
                onClick={handleLoadMoreActivities}
                disabled={isLoadingMore}
                aria-busy={isLoadingMore}
                aria-label={isLoadingMore ? "Loading more activities" : "Load more activities"}
                className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {isLoadingMore
                  ? <Loader2 size={13} className="animate-spin" />
                  : <ChevronDown size={13} />}
                {isLoadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
};
