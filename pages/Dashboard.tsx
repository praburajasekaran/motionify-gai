import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderOpen,
  FileText,
  DollarSign,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle,
  CreditCard,
  Package,
  FolderPlus,
  Clock,
  User,
  Mail,
} from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { formatTimestamp, formatDateTime } from '../utils/dateFormatting';

// Dashboard metrics type
interface DashboardMetrics {
  projects: {
    total: number;
    active: number;
    completed: number;
  };
  proposals: {
    total: number;
    pending: number;
    accepted: number;
  };
  revenue: {
    total: number;
    completed: number;
    pending: number;
  };
  inquiries: {
    total: number;
    new: number;
  };
}

// Activity type from activities API
interface Activity {
  id: string;
  type: string;
  userId: string;
  userName: string;
  targetUserId?: string;
  targetUserName?: string;
  inquiryId?: string;
  proposalId?: string;
  projectId?: string;
  details: Record<string, string | number>;
  timestamp: number;
  // Enhanced fields from 09-01 (JOINs)
  inquiryNumber?: string;
  proposalName?: string;
  projectName?: string;
}

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

// Map activity types to icons
const ACTIVITY_ICONS: Record<string, typeof Send> = {
  PROPOSAL_SENT: Send,
  PROPOSAL_ACCEPTED: CheckCircle,
  PROPOSAL_REJECTED: CheckCircle,
  PROPOSAL_CHANGES_REQUESTED: FileText,
  PAYMENT_RECEIVED: CreditCard,
  DELIVERABLE_APPROVED: Package,
  DELIVERABLE_REJECTED: Package,
  DELIVERABLE_UPLOADED: Package,
  COMMENT_ADDED: MessageSquare,
  PROJECT_CREATED: FolderPlus,
  TASK_CREATED: CheckCircle,
  TASK_STATUS_CHANGED: CheckCircle,
  FILE_UPLOADED: FileText,
  TERMS_ACCEPTED: CheckCircle,
  INQUIRY_SUBMITTED: Mail,
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
          <div className="text-muted-foreground">
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
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [errorMetrics, setErrorMetrics] = useState<string | null>(null);
  const [errorActivities, setErrorActivities] = useState<string | null>(null);

  // Fetch dashboard metrics
  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    setErrorMetrics(null);

    try {
      const response = await fetch('/.netlify/functions/dashboard-metrics', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.status}`);
      }

      const data = await response.json();
      // Transform flat API response to nested structure
      setMetrics({
        projects: {
          total: data.totalProjects ?? 0,
          active: data.activeProjects ?? 0,
          completed: (data.totalProjects ?? 0) - (data.activeProjects ?? 0),
        },
        proposals: {
          total: data.totalProposals ?? 0,
          pending: data.pendingProposals ?? 0,
          accepted: data.acceptedProposals ?? 0,
        },
        revenue: {
          total: data.totalRevenue ?? 0,
          completed: data.totalRevenue ?? 0,
          pending: data.pendingRevenue ?? 0,
        },
        inquiries: {
          total: data.totalInquiries ?? 0,
          new: data.newInquiries ?? 0,
        },
      });
    } catch (error: any) {
      console.error('Failed to fetch dashboard metrics:', error);
      setErrorMetrics(error.message || 'Failed to load metrics');
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Fetch recent activities
  const fetchActivities = async () => {
    setLoadingActivities(true);
    setErrorActivities(null);

    try {
      const response = await fetch('/.netlify/functions/activities?limit=10', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.status}`);
      }

      const data = await response.json();
      setActivities(data);
    } catch (error: any) {
      console.error('Failed to fetch activities:', error);
      setErrorActivities(error.message || 'Failed to load recent activity');
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchActivities();
  }, []);

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

  const isLoading = loadingMetrics || loadingActivities;
  const hasError = errorMetrics || errorActivities;

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
      {errorMetrics ? (
        <div className="bg-card rounded-lg border border-border">
          <ErrorState error={errorMetrics} onRetry={fetchMetrics} />
        </div>
      ) : loadingMetrics ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-4 animate-pulse">
              <div className="h-3 bg-muted rounded w-20 mb-3" />
              <div className="h-7 bg-muted rounded w-14" />
            </div>
          ))}
        </div>
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

        {errorActivities ? (
          <ErrorState error={errorActivities} onRetry={fetchActivities} />
        ) : loadingActivities ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-3 bg-muted rounded w-24" />
                <div className="h-3 bg-muted rounded w-20" />
                <div className="h-3 bg-muted rounded w-32" />
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No recent activity"
            description="Activity will appear here as work progresses"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Context
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activities.map((activity) => {
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
                          <Link
                            to={contextLink.to}
                            className="text-primary hover:text-primary/80 font-medium hover:underline underline-offset-2"
                          >
                            {contextLink.label}
                          </Link>
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
        )}
      </div>
    </div>
  );
};
