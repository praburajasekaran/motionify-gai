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
  const colors = {
    blue: { bg: 'bg-blue-500/10', icon: 'text-blue-500', ring: 'ring-blue-500/20' },
    purple: { bg: 'bg-purple-500/10', icon: 'text-purple-500', ring: 'ring-purple-500/20' },
    green: { bg: 'bg-green-500/10', icon: 'text-green-500', ring: 'ring-green-500/20' },
    amber: { bg: 'bg-amber-500/10', icon: 'text-amber-500', ring: 'ring-amber-500/20' },
  };

  const colorClasses = colors[color];

  return (
    <button
      onClick={onToggle}
      className="bg-card rounded-xl p-4 ring-1 ring-border shadow-sm hover:shadow-md transition-all text-left w-full"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-12 h-12 rounded-lg ${colorClasses.bg} flex items-center justify-center ring-1 ${colorClasses.ring}`}>
          <Icon className={`w-6 h-6 ${colorClasses.icon}`} />
        </div>
        {breakdown && (
          <div className="text-muted-foreground">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className="text-3xl font-bold text-foreground">{value.toLocaleString()}</p>

      {breakdown && isExpanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-2">
          {breakdown.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.label}:</span>
              <span className="font-semibold text-foreground">{item.value.toLocaleString()}</span>
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
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-1 animate-fade-in">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-muted-foreground">
          {user?.name ? `Welcome back, ${user.name}` : 'Overview of platform metrics and activity'}
          {user?.role && ` · ${user.role === 'superadmin' ? 'Super Admin' : user.role}`}
        </p>
      </div>

      {/* Metric Cards */}
      {errorMetrics ? (
        <div className="bg-card rounded-xl ring-1 ring-border shadow-sm">
          <ErrorState error={errorMetrics} onRetry={fetchMetrics} />
        </div>
      ) : loadingMetrics ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-xl p-4 ring-1 ring-border shadow-sm animate-pulse">
              <div className="w-12 h-12 bg-muted rounded-lg mb-3" />
              <div className="h-4 bg-muted rounded w-24 mb-2" />
              <div className="h-8 bg-muted rounded w-16" />
            </div>
          ))}
        </div>
      ) : metrics ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Projects"
            value={metrics.projects.total}
            icon={FolderOpen}
            color="blue"
            breakdown={[
              { label: 'Active', value: metrics.projects.active },
              { label: 'Completed', value: metrics.projects.completed },
              { label: 'Total', value: metrics.projects.total },
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
              { label: 'Total', value: metrics.proposals.total },
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
              { label: 'Completed', value: metrics.revenue.completed },
              { label: 'Pending', value: metrics.revenue.pending },
              { label: 'Total', value: metrics.revenue.total },
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
              { label: 'Total', value: metrics.inquiries.total },
            ]}
            isExpanded={expandedCard === 'inquiries'}
            onToggle={() => setExpandedCard(expandedCard === 'inquiries' ? null : 'inquiries')}
          />
        </div>
      ) : null}

      {/* Recent Activity Table */}
      <div className="bg-card rounded-xl ring-1 ring-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
          <p className="text-sm text-muted-foreground mt-1">Latest platform actions and updates</p>
        </div>

        {errorActivities ? (
          <ErrorState error={errorActivities} onRetry={fetchActivities} />
        ) : loadingActivities ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No recent activity"
            description="Platform activity will appear here as users interact with projects, proposals, and inquiries"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Context
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activities.map((activity) => {
                  const ActivityIcon = ACTIVITY_ICONS[activity.type] || FileText;
                  const activityLabel = ACTIVITY_LABELS[activity.type] || activity.type.replace(/_/g, ' ').toLowerCase();
                  const contextLink = getActivityContextLink(activity);

                  return (
                    <tr key={activity.id} className="hover:bg-muted transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        <div className="flex items-center gap-2" title={formatDateTime(activity.timestamp) || undefined}>
                          <Clock className="w-4 h-4" />
                          {formatTimestamp(activity.timestamp)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">{activity.userName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <ActivityIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-foreground">{activityLabel}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {contextLink ? (
                          <Link
                            to={contextLink.to}
                            className="text-purple-600 hover:text-purple-700 font-medium hover:underline"
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
