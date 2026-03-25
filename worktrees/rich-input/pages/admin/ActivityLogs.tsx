import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Activity, Users, Loader2 } from 'lucide-react';

interface ActivityEntry {
  id: string;
  type: string;
  userId: string;
  userName: string;
  targetUserId: string | null;
  targetUserName: string | null;
  inquiryId: string | null;
  proposalId: string | null;
  projectId: string | null;
  projectName: string | null;
  inquiryNumber: string | null;
  details: Record<string, string | number>;
  timestamp: number;
}

// Helper to get activity type badge color by category
function getActivityTypeBadgeColor(type: string): string {
  const lower = type.toLowerCase();

  // Proposals
  if (lower.includes('proposal')) {
    return 'bg-purple-100 text-purple-800';
  }

  // Payments
  if (lower.includes('payment')) {
    return 'bg-green-100 text-green-800';
  }

  // Deliverables
  if (lower.includes('deliverable')) {
    return 'bg-blue-100 text-blue-800';
  }

  // Tasks
  if (lower.includes('task')) {
    return 'bg-cyan-100 text-cyan-800';
  }

  // Files
  if (lower.includes('file')) {
    return 'bg-indigo-100 text-indigo-800';
  }

  // Team
  if (lower.includes('team') || lower.includes('member') || lower.includes('invited')) {
    return 'bg-orange-100 text-orange-800';
  }

  // Comments
  if (lower.includes('comment')) {
    return 'bg-emerald-100 text-emerald-800';
  }

  // Default
  return 'bg-muted text-foreground';
}

// Helper to get human-readable action description
function getActionDescription(type: string): string {
  const typeMap: Record<string, string> = {
    PROPOSAL_SENT: 'sent a proposal',
    PROPOSAL_ACCEPTED: 'accepted a proposal',
    PROPOSAL_REJECTED: 'rejected a proposal',
    PROPOSAL_CHANGES_REQUESTED: 'requested changes on a proposal',
    DELIVERABLE_APPROVED: 'approved a deliverable',
    DELIVERABLE_REJECTED: 'rejected a deliverable',
    PAYMENT_RECEIVED: 'received a payment',
    COMMENT_ADDED: 'added a comment',
    PROJECT_CREATED: 'created a project',
    TASK_CREATED: 'created a task',
    TASK_STATUS_CHANGED: 'updated task status',
    FILE_UPLOADED: 'uploaded a file',
    TEAM_MEMBER_INVITED: 'invited a team member',
  };

  if (typeMap[type]) {
    return typeMap[type];
  }

  // Humanize by replacing underscores and lowercasing
  return type.replace(/_/g, ' ').toLowerCase();
}

// Helper to format relative time
function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;

  return new Date(timestamp).toLocaleDateString();
}

/**
 * Activity Logs page - Super Admin and Project Manager only
 *
 * Shows a clean stream of platform activities with:
 * - Toggle between "All Activity" and "My Activity"
 * - Real-time data from activities API
 * - Load More pagination
 * - Navigation links to projects/proposals
 */
export function ActivityLogs() {
  const { user: currentUser } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [viewMode, setViewMode] = useState<'all' | 'my'>('all');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const limit = 50;

  // Check user roles
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isProjectManager = currentUser?.role === 'project_manager';

  // Fetch activities
  const fetchActivities = async (append = false) => {
    if (!currentUser) return;

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      // Build query params
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: append ? offset.toString() : '0',
      });

      // Add userId filter for "my" mode
      if (viewMode === 'my') {
        params.append('userId', currentUser.id);
      }

      const response = await fetch(`/.netlify/functions/activities?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.status}`);
      }

      const data: ActivityEntry[] = await response.json();

      if (append) {
        setActivities(prev => [...prev, ...data]);
        setOffset(prev => prev + limit);
      } else {
        setActivities(data);
        setOffset(limit);
      }

      // Check if there are more activities
      setHasMore(data.length === limit);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch activities'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Fetch on mount and when view mode changes
  useEffect(() => {
    fetchActivities(false);
  }, [viewMode, currentUser]);

  // Handle Load More
  const handleLoadMore = () => {
    fetchActivities(true);
  };

  // Handle toggle switch
  const handleToggle = (mode: 'all' | 'my') => {
    if (mode !== viewMode) {
      setViewMode(mode);
      setOffset(0);
      setActivities([]);
    }
  };

  // Access control
  if (!isSuperAdmin && !isProjectManager) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">
            You don't have permission to access Activity Logs.
            Only Super Admins and Project Managers can view activity logs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Activity Logs</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Platform activity stream with navigation to projects and proposals
        </p>
      </div>

      {/* Toggle Bar */}
      <div className="flex items-center gap-2 bg-card rounded-lg p-1 border w-fit">
        <button
          onClick={() => handleToggle('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'all'
              ? 'bg-purple-600 text-white'
              : 'text-foreground hover:bg-muted'
          }`}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            All Activity
          </div>
        </button>
        <button
          onClick={() => handleToggle('my')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'my'
              ? 'bg-purple-600 text-white'
              : 'text-foreground hover:bg-muted'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            My Activity
          </div>
        </button>
      </div>

      {/* Activity Stream */}
      <div className="space-y-3">
        {/* Loading State */}
        {loading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card rounded-lg p-4 border animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-card rounded-lg border p-6">
            <ErrorState error={error} onRetry={() => fetchActivities(false)} />
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && activities.length === 0 && (
          <div className="bg-card rounded-lg border p-6">
            <EmptyState
              icon={Activity}
              title={viewMode === 'all' ? 'No activities yet' : 'No activities from you yet'}
              description={
                viewMode === 'all'
                  ? 'Platform activities will appear here as they happen.'
                  : 'Your activities will appear here as you interact with the platform.'
              }
            />
          </div>
        )}

        {/* Activity List */}
        {!loading && !error && activities.length > 0 && (
          <>
            {activities.map((activity) => {
              // Determine context link
              let contextLink: { href: string; label: string } | null = null;

              if (activity.projectId && activity.projectName) {
                contextLink = {
                  href: `/projects/${activity.projectId}`,
                  label: activity.projectName,
                };
              } else if (activity.proposalId) {
                contextLink = {
                  href: `/admin/proposals/${activity.proposalId}`,
                  label: `Proposal #${activity.proposalId.slice(0, 8)}`,
                };
              } else if (activity.inquiryId && activity.inquiryNumber) {
                contextLink = {
                  href: `/admin/inquiries/${activity.inquiryId}`,
                  label: activity.inquiryNumber,
                };
              }

              return (
                <div
                  key={activity.id}
                  className="bg-card rounded-lg p-4 hover:bg-muted transition-colors border"
                >
                  <div className="flex items-start gap-3">
                    {/* User Avatar */}
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-600 font-medium text-sm">
                        {activity.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Activity Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <span className="font-medium text-foreground">
                          {activity.userName}
                        </span>
                        <span className="text-muted-foreground">
                          {getActionDescription(activity.type)}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getActivityTypeBadgeColor(activity.type)}`}
                        >
                          {activity.type.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <span>{getRelativeTime(activity.timestamp)}</span>
                        {contextLink && (
                          <>
                            <span>·</span>
                            <a
                              href={contextLink.href}
                              className="text-purple-600 hover:text-purple-700 hover:underline"
                            >
                              {contextLink.label}
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-6 py-3 bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}

            {/* No More Activities */}
            {!hasMore && activities.length > 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                You've seen all activities
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ActivityLogs;
