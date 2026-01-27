import React, { useState, useEffect, useMemo } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
// TODO: Implement real activity fetching from API
// import { fetchActivities } from '../../lib/activities';
import { ActivityType, Activity, Project } from '../../landing-page-new/src/lib/portal/types';

interface AggregatedActivity extends Activity {
    projectId: string;
    projectName: string;
}

// Helper to get readable label for activity type
function getActivityTypeLabel(type: ActivityType): string {
    const labels: Record<ActivityType, string> = {
        [ActivityType.TASK_STATUS_CHANGED]: 'Task Status Changed',
        [ActivityType.COMMENT_ADDED]: 'Comment Added',
        [ActivityType.FILE_UPLOADED]: 'File Uploaded',
        [ActivityType.FILE_RENAMED]: 'File Renamed',
        [ActivityType.TEAM_MEMBER_INVITED]: 'Team Member Invited',
        [ActivityType.TEAM_MEMBER_REMOVED]: 'Team Member Removed',
        [ActivityType.TASK_CREATED]: 'Task Created',
        [ActivityType.TASK_UPDATED]: 'Task Updated',
        [ActivityType.REVISION_REQUESTED]: 'Revision Requested',
        [ActivityType.TEAM_UPDATED]: 'Team Updated',
    };
    return labels[type] || type;
}

// Helper to get activity type badge color
function getActivityTypeBadgeColor(type: ActivityType): string {
    switch (type) {
        case ActivityType.TASK_STATUS_CHANGED:
            return 'bg-blue-100 text-blue-800';
        case ActivityType.COMMENT_ADDED:
            return 'bg-green-100 text-green-800';
        case ActivityType.FILE_UPLOADED:
        case ActivityType.FILE_RENAMED:
            return 'bg-purple-100 text-purple-800';
        case ActivityType.TEAM_MEMBER_INVITED:
        case ActivityType.TEAM_MEMBER_REMOVED:
        case ActivityType.TEAM_UPDATED:
            return 'bg-orange-100 text-orange-800';
        case ActivityType.TASK_CREATED:
        case ActivityType.TASK_UPDATED:
            return 'bg-cyan-100 text-cyan-800';
        case ActivityType.REVISION_REQUESTED:
            return 'bg-amber-100 text-amber-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

// Helper to format activity details
function formatDetails(details: Record<string, string | number>): string {
    return Object.entries(details)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')
        .substring(0, 80) + (Object.keys(details).length > 2 ? '...' : '');
}

/**
 * Activity Logs page - Super Admin only
 * 
 * Allows Super Admins to:
 * - View all project activities
 * - Filter by date range, project, user, action type
 * - Search activities
 * - Export to CSV
 */
export function ActivityLogs() {
    const { user: currentUser } = useAuthContext();
    const [loading, setLoading] = useState(true);

    // Filter states
    const [projectFilter, setProjectFilter] = useState('all');
    const [actionTypeFilter, setActionTypeFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Check user roles
    const isSuperAdmin = currentUser?.role === 'super_admin';
    const isProjectManager = currentUser?.role === 'project_manager';

    // Aggregate activities based on role
    // TODO: Fetch real activities from API instead of mock data
    const allActivities = useMemo((): AggregatedActivity[] => {
        // Return empty array - activities will be fetched from API when implemented
        // The API endpoint /activities requires projectId, so we need to:
        // 1. First fetch all projects the user has access to
        // 2. Then fetch activities for each project
        // 3. Aggregate and sort them
        return [];

    }, [currentUser, isSuperAdmin, isProjectManager]);

    // Get unique users from activities
    const uniqueUsers = useMemo(() => {
        const users = new Map<string, string>();
        allActivities.forEach((a) => {
            users.set(a.userId, a.userName);
        });
        return Array.from(users.entries());
    }, [allActivities]);

    // ... existing filtering logic (filteredActivities useMemo) ...

    // Filter filteredActivities from allActivities as before
    const filteredActivities = useMemo(() => {
        return allActivities.filter((activity) => {
            // Project filter
            if (projectFilter !== 'all' && activity.projectId !== projectFilter) {
                return false;
            }

            // Action type filter
            if (actionTypeFilter !== 'all' && activity.type !== actionTypeFilter) {
                return false;
            }

            // Date range filter
            if (startDate) {
                const startTimestamp = new Date(startDate).getTime();
                if (activity.timestamp < startTimestamp) {
                    return false;
                }
            }
            if (endDate) {
                const endTimestamp = new Date(endDate).getTime() + 86400000; // Include full day
                if (activity.timestamp > endTimestamp) {
                    return false;
                }
            }

            // Search filter (by user name or details)
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchesUser = activity.userName.toLowerCase().includes(query);
                const matchesDetails = Object.values(activity.details).some(
                    (val) => String(val).toLowerCase().includes(query)
                );
                if (!matchesUser && !matchesDetails) {
                    return false;
                }
            }

            return true;
        });
    }, [allActivities, projectFilter, actionTypeFilter, startDate, endDate, searchQuery]);

    useEffect(() => {
        // Simulate loading
        const timer = setTimeout(() => setLoading(false), 300);
        return () => clearTimeout(timer);
    }, []);

    // Export to CSV
    const handleExportCSV = () => {
        const headers = ['Timestamp', 'Project', 'User', 'Action', 'Details'];
        const rows = filteredActivities.map((a) => [
            new Date(a.timestamp).toISOString(),
            a.projectName,
            a.userName,
            getActivityTypeLabel(a.type),
            Object.entries(a.details).map(([k, v]) => `${k}: ${v}`).join('; '),
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    // Clear all filters
    const handleClearFilters = () => {
        setProjectFilter('all');
        setActionTypeFilter('all');
        setSearchQuery('');
        setStartDate('');
        setEndDate('');
    };

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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold text-gray-900">Activity Logs</h1>
                    <p className="mt-2 text-sm text-gray-600">View and filter activity across all projects</p>
                </div>
                <button
                    onClick={handleExportCSV}
                    disabled={filteredActivities.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg border p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Search */}
                    <input
                        type="text"
                        placeholder="Search by user or action..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    {/* Project Filter */}
                    <select
                        value={projectFilter}
                        onChange={(e) => setProjectFilter(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg"
                    >
                        <option value="all">All Projects</option>
                        {MOCK_PROJECTS.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>

                    {/* Action Type Filter */}
                    <select
                        value={actionTypeFilter}
                        onChange={(e) => setActionTypeFilter(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg"
                    >
                        <option value="all">All Actions</option>
                        {Object.values(ActivityType).map((type) => (
                            <option key={type} value={type}>{getActivityTypeLabel(type)}</option>
                        ))}
                    </select>

                    {/* Start Date */}
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="Start Date"
                    />

                    {/* End Date */}
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="End Date"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        Showing {filteredActivities.length} of {allActivities.length} activities
                    </div>
                    <button
                        onClick={handleClearFilters}
                        className="text-sm text-blue-600 hover:text-blue-800"
                    >
                        Clear all filters
                    </button>
                </div>
            </div>

            {/* Activity Table */}
            <div className="bg-white rounded-lg border overflow-hidden">
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading activities...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredActivities.map((activity) => (
                                    <tr key={activity.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div>{new Date(activity.timestamp).toLocaleDateString()}</div>
                                            <div className="text-xs text-gray-400">
                                                {new Date(activity.timestamp).toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-medium text-gray-900">
                                                {activity.projectName}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                                    <span className="text-gray-600 font-medium text-sm">
                                                        {activity.userName.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="ml-3">
                                                    <div className="text-sm font-medium text-gray-900">{activity.userName}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getActivityTypeBadgeColor(activity.type)}`}>
                                                {getActivityTypeLabel(activity.type)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                            {formatDetails(activity.details)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {!loading && filteredActivities.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No activities found matching your filters.
                    </div>
                )}
            </div>
        </div>
    );
}

export default ActivityLogs;
