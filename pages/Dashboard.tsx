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
  Calendar,
  Mail,
  ArrowRight,
} from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';
import { isClient } from '../lib/permissions';
import { getInquiriesByClientUserId, type Inquiry, type InquiryStatus } from '../lib/inquiries';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';

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

// Relative time formatting helper
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

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
      className="bg-white rounded-xl p-4 ring-1 ring-gray-200 shadow-sm hover:shadow-md transition-all text-left w-full"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-12 h-12 rounded-lg ${colorClasses.bg} flex items-center justify-center ring-1 ${colorClasses.ring}`}>
          <Icon className={`w-6 h-6 ${colorClasses.icon}`} />
        </div>
        {breakdown && (
          <div className="text-gray-400">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        )}
      </div>
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>

      {breakdown && isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
          {breakdown.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{item.label}:</span>
              <span className="font-semibold text-gray-900">{item.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

// Status display config for client-facing inquiry statuses
const CLIENT_STATUS_CONFIG: Record<InquiryStatus, { label: string; color: string; icon: typeof Send; description: string }> = {
  new: { label: 'Submitted', color: 'blue', icon: Send, description: 'Your inquiry has been received. Our team will review it shortly.' },
  reviewing: { label: 'Under Review', color: 'amber', icon: Clock, description: 'Our team is reviewing your requirements and preparing a proposal.' },
  proposal_sent: { label: 'Proposal Ready', color: 'purple', icon: FileText, description: 'We\'ve prepared a proposal for you. Click to view it.' },
  negotiating: { label: 'In Discussion', color: 'amber', icon: MessageSquare, description: 'We\'re discussing the details of your project.' },
  accepted: { label: 'Accepted', color: 'green', icon: CheckCircle, description: 'Your proposal has been accepted. We\'re preparing your project.' },
  project_setup: { label: 'Setting Up', color: 'blue', icon: FolderPlus, description: 'Your project is being set up. You\'ll have access soon.' },
  payment_pending: { label: 'Payment Pending', color: 'amber', icon: CreditCard, description: 'Awaiting payment to begin production.' },
  paid: { label: 'Paid', color: 'green', icon: CreditCard, description: 'Payment received. Your project is now in active production.' },
  converted: { label: 'Project Started', color: 'green', icon: FolderOpen, description: 'Your inquiry has been converted to a live project.' },
  rejected: { label: 'Declined', color: 'red', icon: FileText, description: 'This inquiry was declined.' },
  archived: { label: 'Archived', color: 'gray', icon: FileText, description: 'This inquiry has been archived.' },
};

const STATUS_DOT_COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  purple: 'bg-purple-500',
  green: 'bg-emerald-500',
  red: 'bg-red-500',
  gray: 'bg-gray-400',
};

const STATUS_BG_COLORS: Record<string, string> = {
  blue: 'bg-blue-50 ring-blue-200',
  amber: 'bg-amber-50 ring-amber-200',
  purple: 'bg-purple-50 ring-purple-200',
  green: 'bg-emerald-50 ring-emerald-200',
  red: 'bg-red-50 ring-red-200',
  gray: 'bg-gray-50 ring-gray-200',
};

const STATUS_TEXT_COLORS: Record<string, string> = {
  blue: 'text-blue-700',
  amber: 'text-amber-700',
  purple: 'text-purple-700',
  green: 'text-emerald-700',
  red: 'text-red-700',
  gray: 'text-gray-600',
};

function ClientDashboard({ userName, userId }: { userName: string; userId?: string }) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientInquiries = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        const data = await getInquiriesByClientUserId(userId);
        setInquiries(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load inquiries');
      } finally {
        setLoading(false);
      }
    };
    fetchClientInquiries();
  }, [userId]);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-1 animate-fade-in">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h2>
        <p className="text-gray-600">Welcome back, {userName}</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 ring-1 ring-gray-200 shadow-sm animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-48" />
                  <div className="h-4 bg-gray-200 rounded w-72" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm">
          <ErrorState error={error} onRetry={() => window.location.reload()} />
        </div>
      ) : inquiries.length === 0 ? (
        <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm">
          <EmptyState
            icon={Mail}
            title="No inquiries yet"
            description="Your project inquiries will appear here once submitted"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Your Inquiries</h3>
          {inquiries.map((inquiry) => {
            const config = CLIENT_STATUS_CONFIG[inquiry.status] || CLIENT_STATUS_CONFIG.new;
            const StatusIcon = config.icon;
            const isProposalReady = inquiry.status === 'proposal_sent' && inquiry.proposalId;
            const isProjectStarted = inquiry.status === 'converted' && inquiry.convertedToProjectId;
            const cardContent = (
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ring-1 ${STATUS_BG_COLORS[config.color]}`}>
                  <StatusIcon className={`w-6 h-6 ${STATUS_TEXT_COLORS[config.color]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-gray-900">{inquiry.inquiryNumber}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ${STATUS_BG_COLORS[config.color]} ${STATUS_TEXT_COLORS[config.color]}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[config.color]}`} />
                      {config.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{config.description}</p>
                  {inquiry.recommendedVideoType && (
                    <p className="text-xs text-gray-400">
                      Video type: {inquiry.recommendedVideoType}
                    </p>
                  )}
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" />
              </div>
            );
            // Proposal links go to the Next.js app (outside HashRouter), so use <a> instead of <Link>
            if (isProposalReady) {
              return (
                <a
                  key={inquiry.id}
                  href={`/proposal/${inquiry.proposalId}`}
                  className="block bg-white rounded-xl p-6 ring-1 ring-gray-200 shadow-sm hover:shadow-md transition-all"
                >
                  {cardContent}
                </a>
              );
            }
            // Project detail is within the React Router SPA, so use <Link>
            if (isProjectStarted) {
              return (
                <Link
                  key={inquiry.id}
                  to={`/projects/${inquiry.convertedToProjectId}/1`}
                  className="block bg-white rounded-xl p-6 ring-1 ring-gray-200 shadow-sm hover:shadow-md transition-all"
                >
                  {cardContent}
                </Link>
              );
            }
            return (
              <Link
                key={inquiry.id}
                to={`/inquiry-status/${inquiry.inquiryNumber}`}
                className="block bg-white rounded-xl p-6 ring-1 ring-gray-200 shadow-sm hover:shadow-md transition-all"
              >
                {cardContent}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const Dashboard = () => {
  const { user } = useAuthContext();
  const isClientUser = isClient(user);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [errorMetrics, setErrorMetrics] = useState<string | null>(null);
  const [errorActivities, setErrorActivities] = useState<string | null>(null);

  // Fetch dashboard metrics (admin only)
  const fetchMetrics = async () => {
    if (isClientUser) {
      setLoadingMetrics(false);
      return;
    }
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

  // Fetch recent activities (admin only)
  const fetchActivities = async () => {
    if (isClientUser) {
      setLoadingActivities(false);
      return;
    }
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
  }, [isClientUser]);

  // Get context link for activity
  function getActivityContextLink(activity: Activity): { to: string; label: string } | null {
    if (activity.projectId && activity.projectName) {
      return { to: `/project/${activity.projectId}`, label: activity.projectName };
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

  // Client Dashboard - show their inquiries with status
  if (isClientUser) {
    return <ClientDashboard userName={user?.name || 'there'} userId={user?.id} />;
  }

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-1 animate-fade-in">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h2>
        <p className="text-gray-600">
          {user?.name ? `Welcome back, ${user.name}` : 'Overview of platform metrics and activity'}
          {user?.role && ` · ${user.role === 'superadmin' ? 'Super Admin' : user.role}`}
        </p>
      </div>

      {/* Metric Cards */}
      {errorMetrics ? (
        <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm">
          <ErrorState error={errorMetrics} onRetry={fetchMetrics} />
        </div>
      ) : loadingMetrics ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 ring-1 ring-gray-200 shadow-sm animate-pulse">
              <div className="w-12 h-12 bg-gray-200 rounded-lg mb-3" />
              <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-16" />
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
      <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <p className="text-sm text-gray-500 mt-1">Latest platform actions and updates</p>
        </div>

        {errorActivities ? (
          <ErrorState error={errorActivities} onRetry={fetchActivities} />
        ) : loadingActivities ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
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
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Context
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activities.map((activity) => {
                  const ActivityIcon = ACTIVITY_ICONS[activity.type] || FileText;
                  const activityLabel = ACTIVITY_LABELS[activity.type] || activity.type.replace(/_/g, ' ').toLowerCase();
                  const contextLink = getActivityContextLink(activity);

                  return (
                    <tr key={activity.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {formatRelativeTime(activity.timestamp)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{activity.userName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <ActivityIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{activityLabel}</span>
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
                          <span className="text-gray-400">—</span>
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
