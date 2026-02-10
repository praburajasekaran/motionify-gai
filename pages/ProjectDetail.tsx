import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Calendar, Users, FileVideo, MessageSquare, CheckSquare, Sparkles,
    Edit2, Clock, CheckCircle2, AlertTriangle, FileBox,
    ArrowRight, Activity, Zap, ClipboardList, FolderOpen, LayoutDashboard, Package, Folder, ChevronDown,
    Bell, BellOff, Settings, CreditCard, Trash2
} from 'lucide-react';
import {
    Button, Card, CardContent, CardHeader, CardTitle, Badge, Separator,
    Avatar, Input, ClientLogo, Progress, Tabs, TabsList, TabsTrigger,
    TabsContent, CircularProgress, DropdownMenu, DropdownMenuItem, EmptyState, ErrorState, cn, useToast, Switch
} from '../components/ui/design-system';
import { TEAM_MEMBERS, TAB_INDEX_MAP, INDEX_TAB_MAP, TabIndex, TabName } from '../constants';
import { analyzeProjectRisk } from '../services/geminiService';
import { dbStatusToDisplay } from '../utils/projectStatusMapping';
import { ProjectStatus, Task, Project } from '../types';
import { DeliverablesTab } from '../components/deliverables/DeliverablesTab';
import { TaskCreateForm, TaskEditForm } from '../components/tasks/TaskCreateForm';
import { canEditTask, canDeleteTask, canCreateTask, canUploadProjectFile, canDeleteProjectFile, isClient, isClientPrimaryContact } from '../utils/deliverablePermissions';
import { InviteModal } from '../components/team/InviteModal';
import { TeamTab } from '../components/team/TeamTab';
import { useAuthContext } from '../contexts/AuthContext';
import { FileUpload } from '../components/files/FileUpload';
import { FileList } from '../components/files/FileList';
import { createTask, updateTask as updateTaskAPI, deleteTask, followTask, unfollowTask, addComment } from '../services/taskApi';
import { Activity as ApiActivity } from '../services/activityApi';
import { useTasks, useActivities, useInvalidateActivities, taskKeys, useProjectFiles, useDeleteProjectFile } from '../shared/hooks';
import { createProjectFile } from '../services/projectFileApi';
import { useQueryClient } from '@tanstack/react-query';
import { parseTaskInput, formatTimeAgo } from '../utils/taskParser';
import { formatTimestamp } from '../utils/dateFormatting';
import { MentionInput } from '../components/tasks/MentionInput';
import { CommentItem } from '../components/tasks/CommentItem';
import { PaymentHistory } from '../components/payments/PaymentHistory';
import { TermsBanner } from '../components/project/TermsBanner';

// --- Activity formatting helpers ---
// isCurrentUser: true when the activity's userId matches the logged-in user
// This enables first-person ("you sent") vs third-person ("Alice sent") phrasing
function formatActivityAction(type: string, details: Record<string, string | number>, isCurrentUser?: boolean, isClientUser?: boolean): string {
    const me = !!isCurrentUser;
    switch (type) {
        // Proposal lifecycle
        case 'PROPOSAL_SENT': return me ? 'sent a proposal' : 'sent a proposal';
        case 'PROPOSAL_ACCEPTED': return me ? 'accepted the proposal' : 'accepted the proposal';
        case 'PROPOSAL_REJECTED': return isClientUser ? 'declined the proposal' : 'rejected the proposal';
        case 'PROPOSAL_CHANGES_REQUESTED': return me ? 'requested changes on' : 'requested changes on';
        // Tasks
        case 'TASK_CREATED': return me ? 'created task' : 'created task';
        case 'TASK_UPDATED': return me ? 'updated task' : 'updated task';
        case 'TASK_STATUS_CHANGED': return `changed status to ${details.newStatus || 'updated'}`;
        case 'COMMENT_ADDED': return me ? 'commented on' : 'commented on';
        case 'TASK_DELETED': return 'deleted task';
        case 'REVISION_REQUESTED': return me ? 'requested a revision on' : 'requested a revision on';
        // Files
        case 'FILE_UPLOADED': return me ? 'uploaded' : 'uploaded';
        case 'FILE_DELETED': return 'deleted file';
        case 'FILE_RENAMED': return me ? 'renamed' : 'renamed';
        // Team
        case 'TEAM_MEMBER_INVITED': return me ? 'invited' : 'invited';
        case 'TEAM_MEMBER_REMOVED': return me ? 'removed' : 'removed';
        // Deliverables
        case 'DELIVERABLE_CREATED': return 'created deliverable';
        case 'DELIVERABLE_UPLOADED': return me ? 'uploaded deliverable' : 'uploaded deliverable';
        case 'DELIVERABLE_APPROVED': return me ? 'approved deliverable' : 'approved deliverable';
        case 'DELIVERABLE_DELETED': return 'deleted deliverable';
        case 'DELIVERABLE_STATUS_CHANGED': return `changed deliverable status to ${details.newStatus || 'updated'}`;
        // Payments — the userId is the client who paid
        case 'PAYMENT_RECEIVED': {
            const label = details.paymentLabel || 'payment';
            return me ? `made ${label} of` : `received ${label} of`;
        }
        // Inquiry
        case 'INQUIRY_CREATED': return 'submitted an inquiry';
        case 'INQUIRY_STATUS_CHANGED': return `changed inquiry status to ${details.newStatus || 'updated'}`;
        // Project
        case 'PROJECT_CREATED': return 'created the project';
        case 'TERMS_ACCEPTED': return me ? 'accepted the terms' : 'accepted the terms';
        default: return type.toLowerCase().replace(/_/g, ' ');
    }
}

function formatActivityTarget(type: string, details: Record<string, string | number>, targetUserName?: string): string {
    if (type === 'PAYMENT_RECEIVED' && details.amount) return String(details.amount);
    if (details.taskTitle) return String(details.taskTitle);
    if (details.proposalName) return String(details.proposalName);
    if (details.fileName) return String(details.fileName);
    if (details.deliverableName) return String(details.deliverableName);
    if (targetUserName) return targetUserName;
    return '';
}

// Date grouping helpers for activity feed
function getDateGroup(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const activityDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (activityDate.getTime() === today.getTime()) return 'Today';
    if (activityDate.getTime() === yesterday.getTime()) return 'Yesterday';

    // Check if within the last 7 days
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (activityDate > weekAgo) {
        return date.toLocaleDateString(undefined, { weekday: 'long' });
    }

    // Older than a week - show month/day
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface GroupedActivities {
    label: string;
    activities: Array<{
        id: string;
        type: string;
        userId: string;
        userName: string;
        action: string;
        target: string;
        timestamp: number;
        details: Record<string, string | number>;
    }>;
}

function groupActivitiesByDate(activities: Array<{
    id: string;
    type: string;
    userId: string;
    userName: string;
    action: string;
    target: string;
    timestamp: number;
    details: Record<string, string | number>;
}>): GroupedActivities[] {
    const groups: Map<string, GroupedActivities> = new Map();

    for (const activity of activities) {
        const label = getDateGroup(activity.timestamp);
        if (!groups.has(label)) {
            groups.set(label, { label, activities: [] });
        }
        groups.get(label)!.activities.push(activity);
    }

    return Array.from(groups.values());
}

function getActivityLink(projectId: string, type: string, details?: Record<string, string | number>): string | null {
    if (type.startsWith('DELIVERABLE_') && details?.deliverableId && type !== 'DELIVERABLE_DELETED') {
        return `/projects/${projectId}/deliverables/${details.deliverableId}`;
    }
    if (type.startsWith('TASK_') || type === 'COMMENT_ADDED' || type === 'REVISION_REQUESTED') return `/projects/${projectId}/${TAB_INDEX_MAP.tasks}`;
    if (type.startsWith('FILE_')) return `/projects/${projectId}/${TAB_INDEX_MAP.files}`;
    if (type.startsWith('DELIVERABLE_')) return `/projects/${projectId}/${TAB_INDEX_MAP.deliverables}`;
    if (type.startsWith('TEAM_')) return `/projects/${projectId}/${TAB_INDEX_MAP.team}`;
    if (type.startsWith('PAYMENT_')) return `/projects/${projectId}/${TAB_INDEX_MAP.payments}`;
    return null;
}

// --- Battery Component ---
const RevisionBattery: React.FC<{ used: number; max: number }> = ({ used, max }) => {
    const remaining = Math.max(0, max - used);
    const percentage = Math.round((remaining / max) * 100);

    // Determine color based on remaining percentage
    let colorClass = "bg-emerald-500";
    let textColor = "text-emerald-700";
    if (percentage <= 20) {
        colorClass = "bg-red-500";
        textColor = "text-red-700";
    } else if (percentage <= 50) {
        colorClass = "bg-amber-500";
        textColor = "text-amber-700";
    }

    return (
        <div className="flex items-center gap-3 bg-card border border-border px-4 py-2 rounded-full shadow-sm" role="progressbar" aria-valuenow={remaining} aria-valuemax={max} aria-label={`${remaining} of ${max} revisions remaining`}>
            {/* Label */}
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Revisions
            </span>

            {/* Count */}
            <div className="flex items-center gap-1.5">
                <span className={cn("text-xs font-bold leading-none", textColor)}>
                    {remaining} of {max} Left
                </span>
            </div>

            {/* Visual Indicator - Battery + Progress Bar */}
            <div className="flex items-center gap-2">
                {/* Battery Icon */}
                <div className="relative flex items-center">
                    <div className="h-5 w-9 rounded-[3px] border-2 border-border p-0.5 relative flex items-center bg-card">
                        <div
                            className={cn("h-full rounded-[1px] transition-all duration-500", colorClass)}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    {/* Battery Nub */}
                    <div className="h-2 w-0.5 bg-border rounded-r-[1px] absolute -right-1" />

                    {/* Charging Bolt */}
                    {percentage > 0 && (
                        <Zap className={cn("absolute -top-1 -right-1.5 h-3 w-3 fill-current stroke-white", colorClass.replace('bg-', 'text-'))} />
                    )}
                </div>

                {/* Mini Progress Bar */}
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                        className={cn("h-full transition-all duration-500", colorClass)}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export const ProjectDetail = () => {
    const { id, tab } = useParams<{ id: string; tab?: string }>();
    const navigate = useNavigate();
    const { user } = useAuthContext();
    const [project, setProject] = useState<Project | null>(null);
    const [projectLoading, setProjectLoading] = useState(true);

    // Convert tab parameter: could be number (1,2,3) or name (overview, tasks)
    // Support both for backward compatibility during transition
    const getActiveTab = (): TabName => {
        if (!tab) return 'overview'; // Default when no tab specified

        // Check if it's a numeric index
        const numericTab = parseInt(tab);
        if (!isNaN(numericTab) && INDEX_TAB_MAP[numericTab as TabIndex]) {
            return INDEX_TAB_MAP[numericTab as TabIndex];
        }

        // Check if it's a tab name (backward compatibility)
        if (Object.keys(TAB_INDEX_MAP).includes(tab)) {
            return tab as TabName;
        }

        // Invalid tab, default to overview
        return 'overview';
    };

    const activeTab = getActiveTab();
    const activeTabIndex = TAB_INDEX_MAP[activeTab];
    const [riskAssessment, setRiskAssessment] = useState<string>('');
    const [termsAccepted, setTermsAccepted] = useState(!!project?.termsAcceptedAt);
    // Real deliverables from API (not mock data)
    const [deliverables, setDeliverables] = useState<Array<{
        id: string;
        title: string;
        type: string;
        status: string;
        progress: number;
        dueDate: string;
    }>>([]);
    const [deliverablesLoading, setDeliverablesLoading] = useState(true);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    // Expandable comments state
    const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
    const [newCommentInput, setNewCommentInput] = useState<Record<string, string>>({});
    const { addToast } = useToast();

    // Polling hooks for cross-user sync
    const queryClient = useQueryClient();
    const { data: tasks = [] } = useTasks(project?.id);
    const { data: activities = [] } = useActivities(project?.id);
    const { data: projectFiles = [] } = useProjectFiles(project?.id);
    const deleteProjectFileMutation = useDeleteProjectFile(project?.id);
    const invalidateActivities = useInvalidateActivities();
    const invalidateTasks = () => {
        if (project?.id) queryClient.invalidateQueries({ queryKey: taskKeys.list(project.id) });
    };

    // Check if current user is Primary Contact for this project
    const isPrimaryContact = user && isClientPrimaryContact(user, project?.id || '');

    // Fetch project from API
    useEffect(() => {
        if (!id) return;

        const fetchProject = async () => {
            try {
                const response = await fetch(`/api/projects/${id}`, {
                    credentials: 'include',
                });

                if (response.ok) {
                    const data = await response.json();
                    // Transform API response to match Project type
                    const apiProject: Project = {
                        id: data.id,
                        title: data.name || data.project_number || `Project ${data.id.slice(0, 8)}`,
                        client: data.client_name || data.client_company || 'Client',
                        thumbnail: '',
                        status: dbStatusToDisplay(data.status),
                        startDate: data.start_date || data.created_at || new Date().toISOString(),
                        dueDate: data.due_date || data.created_at || new Date().toISOString(),
                        progress: 0,
                        description: data.description || '',
                        budget: 0,
                        team: (data.team || []).map((m: any) => ({
                            id: m.id,
                            name: m.name || 'Unknown',
                            email: m.email || '',
                            avatar: m.avatar || '',
                            role: m.role || 'team_member',
                        })),
                        tasks: [],
                        deliverables: [],
                        files: [],
                        deliverablesCount: 0,
                        revisionCount: data.revisions_used ?? 0,
                        maxRevisions: data.total_revisions_allowed ?? 2,
                        activityLog: [],
                        termsAcceptedAt: data.terms_accepted_at,
                        termsAcceptedBy: data.terms_accepted_by,
                    };
                    setProject(apiProject);
                } else {
                    console.error(`API returned ${response.status} for project ${id}`);
                }
            } catch (error) {
                console.error('Failed to fetch project:', error);
            } finally {
                setProjectLoading(false);
            }
        };

        fetchProject();
    }, [id]);


    // Derive activityLog directly from the query data (avoids flash on refetch)
    const activityLog = useMemo(() => {
        return activities.map((a: ApiActivity) => {
            const isCurrentUser = !!(user && a.userId === user.id);
            return {
                id: a.id,
                type: a.type,
                userId: a.userId,
                userName: a.userName,
                action: formatActivityAction(a.type, a.details, isCurrentUser, !!(user && isClient(user))),
                target: formatActivityTarget(a.type, a.details, a.targetUserName),
                timestamp: new Date(a.timestamp).toISOString(),
                details: a.details,
            };
        });
    }, [activities, user?.id]);

    // Load deliverables from API (for Overview tab consistency with Deliverables tab)
    useEffect(() => {
        if (!project?.id) return;

        const loadDeliverables = async () => {
            setDeliverablesLoading(true);
            try {
                const response = await fetch(`/api/deliverables?projectId=${project.id}`, {
                    credentials: 'include',
                });

                if (!response.ok) {
                    throw new Error('Failed to load deliverables');
                }

                const data = await response.json();

                // Transform API response to match the display format
                const transformed = (data || []).map((d: any) => ({
                    id: d.id,
                    title: d.name || d.title || 'Untitled',
                    type: d.type || 'Video',
                    status: d.status || 'pending',
                    progress: d.progress || 0,
                    dueDate: d.estimated_completion_week
                        ? new Date(Date.now() + d.estimated_completion_week * 7 * 24 * 60 * 60 * 1000).toISOString()
                        : new Date().toISOString(),
                }));

                setDeliverables(transformed);
            } catch (error) {
                console.error('Failed to load deliverables:', error);
                // Fallback to empty array - don't show mock data
                setDeliverables([]);
            } finally {
                setDeliverablesLoading(false);
            }
        };

        loadDeliverables();
    }, [project?.id]);

    // Auto-analysis on load
    useEffect(() => {
        if (project && !riskAssessment) {
            analyzeProjectRisk({ title: project.title, status: project.status, progress: project.progress, dueDate: project.dueDate })
                .then(setRiskAssessment)
                .catch(err => console.warn('Gemini risk analysis failed:', err));
        }
    }, [project, riskAssessment]);

    // Handle invalid tab URLs and redirect to tab 1 if no tab specified
    useEffect(() => {
        if (!tab) {
            // No tab specified, redirect to overview (index 1)
            navigate(`/projects/${id}/1`, { replace: true });
        } else {
            const numericTab = parseInt(tab);
            const isValidNumeric = !isNaN(numericTab) && INDEX_TAB_MAP[numericTab as TabIndex];
            const isValidName = Object.keys(TAB_INDEX_MAP).includes(tab);

            if (!isValidNumeric && !isValidName) {
                // Invalid tab, redirect to overview (index 1)
                navigate(`/projects/${id}/1`, { replace: true });
            }
        }
    }, [tab, id, navigate]);

    if (projectLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!project) {
        return (
            <ErrorState
                title="Project Not Found"
                description="The project you are looking for might have been deleted or doesn't exist."
                onRetry={() => navigate('/projects')}
                retryLabel="Back to Projects"
                fullPage
            />
        );
    }



    const handleAddTask = async () => {
        if (!newTaskInput.trim() || !project) return;

        const userIsClient = user && isClient(user);

        try {
            // Parse natural language input (clients don't get assignee parsing)
            const parsed = parseTaskInput(newTaskInput, userIsClient ? [] : project.team);

            const newTask = await createTask({
                project_id: project.id,
                title: parsed.title,
                description: parsed.title, // Use title as description for now
                visible_to_client: userIsClient ? true : false,
                status: 'pending',
                assignee_id: userIsClient ? undefined : parsed.assigneeId,
                deadline: parsed.deadline
            });

            invalidateTasks();
            setNewTaskInput('');

            // Refresh activity feed (backend logs the activity)
            invalidateActivities(project.id);

            addToast({
                title: 'Task Created',
                description: 'Task has been created successfully',
                variant: 'success'
            });
        } catch (error) {
            console.error('Failed to create task:', error);
            addToast({
                title: 'Error',
                description: 'Failed to create task. Please try again.',
                variant: 'destructive'
            });
        }
    };

    const handleEditTask = (task: Task) => {
        if (!user) {
            addToast({
                title: 'Error',
                description: 'You must be logged in to edit tasks',
                variant: 'destructive'
            });
            return;
        }

        if (!canEditTask(user, task)) {
            addToast({
                title: 'Permission Denied',
                description: 'You can only edit tasks assigned to you',
                variant: 'destructive'
            });
            return;
        }

        setEditingTask(task);
    };

    const handleSaveTask = async (taskId: string, updates: Partial<Task>) => {
        try {
            // Only send fields that exist in the backend API
            const updatedTask = await updateTaskAPI(taskId, {
                title: updates.title,
                description: updates.description,
                status: updates.status,
                assigneeId: updates.assigneeId ?? updates.assignee?.id,
                deadline: updates.deadline,
                visibleToClient: updates.visibleToClient
            });

            invalidateTasks();
            setEditingTask(null);

            // Refresh activity feed (backend logs the activity)
            if (project) invalidateActivities(project.id);

            addToast({
                title: 'Task Updated',
                description: 'Task has been updated successfully',
                variant: 'success'
            });
        } catch (error) {
            console.error('Failed to update task:', error);
            addToast({
                title: 'Error',
                description: 'Failed to update task. Please try again.',
                variant: 'destructive'
            });
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
            return;
        }

        try {
            await deleteTask(taskId);
            invalidateTasks();
            if (project) invalidateActivities(project.id);
            addToast({
                title: 'Task Deleted',
                description: 'Task has been deleted successfully',
                variant: 'success'
            });
        } catch (err) {
            console.error('Failed to delete task:', err);
            addToast({
                title: 'Error',
                description: 'Failed to delete task. Please try again.',
                variant: 'destructive'
            });
        }
    };

    const handleFollowTask = async (task: Task) => {
        if (!user) return;

        const isFollowing = task.followers?.includes(user.id);

        try {
            if (isFollowing) {
                await unfollowTask(task.id, user.id);
                addToast({
                    title: "Unfollowed Task",
                    description: "You will no longer receive notifications for this task.",
                    variant: "default"
                });
            } else {
                await followTask(task.id, user.id);
                addToast({
                    title: "Following Task",
                    description: "You will now receive notifications for updates to this task.",
                    variant: "success",
                    icon: <Bell className="h-4 w-4 text-emerald-500" />
                });
            }
            invalidateTasks();
        } catch (error) {
            console.error('Failed to toggle follow state:', error);
            addToast({
                title: "Error",
                description: "Failed to update follow status",
                variant: "destructive"
            });
        }
    };

    // Toggle comments expansion for a task
    const toggleTaskComments = (taskId: string) => {
        setExpandedComments(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) {
                next.delete(taskId);
            } else {
                next.add(taskId);
            }
            return next;
        });
    };

    // Add a comment to a task
    const handleAddComment = async (taskId: string) => {
        const commentText = newCommentInput[taskId]?.trim();
        if (!commentText || !user) return;

        try {
            // Call API
            await addComment(taskId, {
                user_id: user.id,
                user_name: user.name,
                content: commentText
            });

            invalidateTasks();

            // Clear input
            setNewCommentInput(prev => ({ ...prev, [taskId]: '' }));

            // Refresh activity feed (backend logs the activity)
            if (project) invalidateActivities(project.id);

            addToast({
                title: 'Comment Added',
                description: 'Your comment has been added.',
                variant: 'success'
            });
        } catch (error) {
            console.error('Failed to add comment:', error);
            addToast({
                title: 'Error',
                description: 'Failed to add comment. Please try again.',
                variant: 'destructive'
            });
        }
    };

    // Delete a comment
    const handleDeleteComment = async (taskId: string, commentId: string) => {
        invalidateTasks();
        addToast({
            title: 'Comment Deleted',
            description: 'The comment has been removed.',
            variant: 'default'
        });
    };

    const handleConvertToTask = (commentId: string, taskTitle: string, assigneeId: string) => {
        const assignee = TEAM_MEMBERS.find(m => m.id === assigneeId) || TEAM_MEMBERS[0];

        const newTask: Task = {
            id: `task-conv-${Date.now()}`,
            title: taskTitle,
            status: 'Todo',
            assignee: assignee
        };

        invalidateTasks();

        addToast({
            title: "Task Created",
            description: `Created task "${taskTitle}" assigned to ${assignee.name}`,
            variant: "success"
        });

        // Switch to tasks tab to show the new task (optional, maybe just toast is enough)
        // navigate to tasks tab? No, let's just show toast.
    };

    // File Upload Handler — persist metadata to DB, then invalidate cache
    const handleFileUploadComplete = async (key: string, file: File) => {
        try {
            await createProjectFile({
                projectId: project.id,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                r2Key: key,
            });

            // Invalidate to trigger refetch
            queryClient.invalidateQueries({ queryKey: ['projectFiles', 'list', project.id] });
            invalidateActivities(project.id);

            addToast({
                title: "File Uploaded",
                description: `${file.name} has been uploaded successfully.`,
                variant: "success"
            });
        } catch (error) {
            console.error('Failed to save file record:', error);
            addToast({
                title: "Error",
                description: "File uploaded to storage but failed to save record.",
                variant: "destructive"
            });
        }
    };

    // File Delete Handler
    const handleFileDelete = async (fileId: string) => {
        try {
            await deleteProjectFileMutation.mutateAsync(fileId);
            if (project) invalidateActivities(project.id);
        } catch (error) {
            console.error('Failed to delete file:', error);
            addToast({
                title: "Error",
                description: "Failed to delete file.",
                variant: "destructive"
            });
        }
    };


    // Status Badge Helper
    const getStatusVariant = (status: ProjectStatus) => {
        switch (status) {
            case 'Active': return 'default';
            case 'Completed': return 'success';
            case 'Awaiting Payment': return 'warning';
            case 'On Hold': return 'destructive';
            default: return 'outline';
        }
    };

    // Task Status Helpers
    const getTaskStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            'pending': 'To Do',
            'in_progress': 'In Progress',
            'awaiting_approval': 'Awaiting Approval',
            'completed': 'Completed',
            'revision_requested': 'Revision Requested',
            // Legacy values
            'Todo': 'To Do',
            'In Progress': 'In Progress',
            'Done': 'Completed',
        };
        return labels[status] || status;
    };

    const getTaskStatusStyle = (status: string) => {
        switch (status) {
            case 'pending':
            case 'Todo':
                return 'bg-slate-100 text-slate-600 border-slate-200';
            case 'in_progress':
            case 'In Progress':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'awaiting_approval':
                return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'completed':
            case 'Done':
                return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'revision_requested':
                return 'bg-rose-100 text-rose-700 border-rose-200';
            default:
                return 'bg-muted text-muted-foreground border-border';
        }
    };

    // Tab configuration for project pages
    const tabConfig = [
        { name: 'Overview', icon: LayoutDashboard, index: 1 },
        { name: 'Tasks', icon: CheckSquare, index: 2 },
        { name: 'Deliverables', icon: Package, index: 3 },
        { name: 'Files', icon: Folder, index: 4 },
        { name: 'Team', icon: Users, index: 5 },
        { name: 'Activity', icon: Activity, index: 6 },
        { name: 'Payments', icon: CreditCard, index: 7 },
    ];

    // Handle terms acceptance - update local state to hide banner
    const handleTermsAccepted = () => {
        // In a real app using SWR/React Query, we'd invalidate the query.
        // For mock setup, we use local state to immediately hide the banner
        setTermsAccepted(true);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16">

            {/* Terms Acceptance Banner - Shows if not accepted */}
            {!termsAccepted && <TermsBanner project={project} onTermsAccepted={handleTermsAccepted} />}

            <Tabs
                value={activeTab}
                onValueChange={(tabName) => {
                    const tabIndex = TAB_INDEX_MAP[tabName as TabName];
                    navigate(`/projects/${id}/${tabIndex}`);
                }}
                className="w-full"
            >
                {/* --- COMPACT HEADER SECTION --- */}
                <div className="flex flex-col gap-4 pt-2">
                    {/* Top Row: Title, Team, Actions */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 overflow-hidden">
                            {/* Project Icon */}
                            <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                                <LayoutDashboard className="h-5 w-5" />
                            </div>

                            {/* Title & Status */}
                            <div className="flex items-center gap-3 min-w-0">
                                <h1 className="text-xl font-bold tracking-tight text-foreground truncate">
                                    {project.title}
                                </h1>
                                <DropdownMenu trigger={
                                    <button className="text-muted-foreground hover:text-muted-foreground transition-colors">
                                        <ChevronDown className="h-4 w-4" />
                                    </button>
                                }>
                                    <DropdownMenuItem>Active</DropdownMenuItem>
                                    <DropdownMenuItem>Awaiting Payment</DropdownMenuItem>
                                    <DropdownMenuItem>Completed</DropdownMenuItem>
                                    <DropdownMenuItem>On Hold</DropdownMenuItem>
                                </DropdownMenu>

                                <Badge variant={getStatusVariant(project.status)} className="text-[12px] font-medium">
                                    {project.status}
                                </Badge>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                                    onClick={() => navigate(`/projects/${id}/settings`)}
                                    title="Project Settings"
                                >
                                    <Settings className="h-3.5 w-3.5" />
                                </Button>
                            </div>

                            {/* Vertical Divider */}
                            <div className="h-6 w-px bg-muted hidden md:block mx-2" />

                            {/* Team Avatars */}
                            <div className="flex items-center -space-x-2 hidden md:flex">
                                {project.team.slice(0, 4).map((member, index) => (
                                    <div key={`${member.id}-${index}`} title={`${member.name}${member.email ? ` (${member.email})` : ''}`}>
                                        <Avatar src={member.avatar} fallback={member.name[0]} className="h-8 w-8 ring-2 ring-card" />
                                    </div>
                                ))}
                                {project.team.length > 4 && (
                                    <button
                                        onClick={() => navigate(`/projects/${id}/5`)}
                                        className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold text-muted-foreground hover:text-primary hover:border-primary transition-colors ring-2 ring-card z-10"
                                    >
                                        +{project.team.length - 4}
                                    </button>
                                )}
                                <button
                                    onClick={() => navigate(`/projects/${id}/5`)}
                                    className="h-8 w-8 rounded-full bg-muted border border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors ml-2 ring-2 ring-card z-10"
                                >
                                    <Users className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* Bottom Row: Minimal Tabs */}
                    <div className="border-b border-border pb-1">
                        <TabsList className="bg-muted/80 p-1 rounded-lg border border-border inline-flex h-auto gap-1 justify-start overflow-x-auto no-scrollbar max-w-full">
                            {tabConfig.map(({ name, index }) => (
                                <TabsTrigger
                                    key={name}
                                    value={Object.keys(TAB_INDEX_MAP).find(key => TAB_INDEX_MAP[key as TabName] === index) || 'overview'}
                                    className="rounded-md px-3 py-1.5 text-[14px] font-medium transition-colors data-[state=active]:bg-card data-[state=active]:text-foreground hover:bg-muted/50 hover:text-foreground text-muted-foreground"
                                >
                                    {name}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                </div>

                {/* --- TAB CONTENT --- */}
                {/* --- OVERVIEW TAB --- */}
                <TabsContent value="overview">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column (Main) */}
                        <div className="lg:col-span-2 space-y-5">
                            {/* Progress Section */}
                            <Card className="overflow-hidden">
                                <CardHeader className="flex flex-row items-center justify-between border-b border-border">
                                    <CardTitle>Project Health</CardTitle>
                                    <Badge variant={project.progress === 100 ? 'success' : 'outline'}>{project.progress}% Complete</Badge>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="flex flex-col md:flex-row gap-6 items-center">
                                        <div className="shrink-0">
                                            <CircularProgress value={project.progress} size={120} strokeWidth={10} color={project.progress > 80 ? 'text-teal-600' : 'text-primary'} />
                                        </div>
                                        <div className="flex-1 space-y-4 w-full">
                                            <p className="text-muted-foreground text-[14px] leading-relaxed">{project.description}</p>
                                            <div className="bg-muted/50 p-3 rounded-lg border border-border">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <h4 className="text-[14px] font-semibold text-foreground">AI Risk Analysis</h4>
                                                </div>
                                                <p className="text-[14px] text-muted-foreground">
                                                    {riskAssessment || 'Analyzing...'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Recent Deliverables Table - Now uses real API data */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between border-b border-border">
                                    <CardTitle>Active Deliverables</CardTitle>
                                    <Button variant="link" size="sm" className="h-auto p-0 text-muted-foreground hover:text-primary" onClick={() => navigate(`/projects/${id}/3`)}>View All</Button>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-border">
                                        {deliverablesLoading ? (
                                            <div className="p-8 text-center text-muted-foreground text-sm">Loading deliverables...</div>
                                        ) : deliverables.slice(0, 3).map(del => (
                                            <div
                                                key={del.id}
                                                className="p-4 flex items-center justify-between hover:bg-muted transition-colors cursor-pointer"
                                                onClick={() => navigate(`/projects/${id}/deliverables/${del.id}`)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border border-border">
                                                        {del.type === 'Video' ? <FileVideo className="h-5 w-5" /> : <FileBox className="h-5 w-5" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm text-foreground">{del.title}</p>
                                                        <p className="text-xs text-muted-foreground">Due {new Date(del.dueDate).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="w-24 hidden sm:block">
                                                        <div className="flex justify-between text-[10px] text-muted-foreground font-medium mb-1">
                                                            <span>Progress</span>
                                                            <span>{del.progress}%</span>
                                                        </div>
                                                        <Progress value={del.progress} className="h-1.5" />
                                                    </div>
                                                    <Badge variant={
                                                        del.status === 'approved' || del.status === 'final_delivered' ? 'success' :
                                                            del.status === 'awaiting_approval' || del.status === 'payment_pending' ? 'warning' :
                                                                del.status === 'in_progress' || del.status === 'beta_ready' ? 'info' :
                                                                    del.status === 'revision_requested' ? 'destructive' :
                                                                        'secondary'
                                                    }>
                                                        {(user && isClient(user) && del.status === 'beta_ready' ? 'in_progress' : del.status).replace(/_/g, ' ')}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                        {!deliverablesLoading && deliverables.length === 0 && (
                                            <EmptyState
                                                title="No deliverables"
                                                description="This project doesn't have any active deliverables yet."
                                                icon={FileBox}
                                                className="py-12"
                                            />
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column (Side) */}
                        <div className="space-y-6">
                            {/* Recent Activity */}
                            <Card>
                                <CardHeader className="border-b border-border">
                                    <CardTitle className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="space-y-0">
                                        {activityLog.length > 0 ? activityLog.map((log, i) => {
                                            const teamUser = TEAM_MEMBERS.find(u => u.id === log.userId);
                                            const isCurrentUser = user && log.userId === user.id;
                                            const displayName = isCurrentUser ? 'You' : (teamUser?.name || log.userName || 'Unknown');
                                            const activityLink = getActivityLink(project.id, log.type, log.details);
                                            return (
                                                <div
                                                    key={log.id}
                                                    className={cn("flex gap-3 pb-6 relative last:pb-0 group", activityLink && "cursor-pointer")}
                                                    onClick={() => activityLink && navigate(activityLink)}
                                                >
                                                    {i !== activityLog.length - 1 && (
                                                        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-muted" />
                                                    )}
                                                    <Avatar src={teamUser?.avatar} fallback={displayName[0]} className="h-7 w-7 z-10 ring-2 ring-card" />
                                                    <div>
                                                        <p className="text-xs text-muted-foreground mb-0.5 group-hover:text-foreground transition-colors">
                                                            <span className="font-bold text-foreground">{displayName}</span> {log.action} <span className="font-semibold text-foreground">{log.target}</span>
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                                                            <Clock className="h-3 w-3" />
                                                            {formatTimeAgo(log.timestamp)}
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        }) : (
                                            <p className="text-sm text-muted-foreground italic">No activity yet.</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Deadlines - Now uses real API data */}
                            <Card>
                                <CardHeader className="border-b border-border">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <CardTitle>Upcoming Deadlines</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-3">
                                    <div className="space-y-3">
                                        {deliverablesLoading ? (
                                            <p className="text-[14px] text-muted-foreground">Loading...</p>
                                        ) : deliverables.slice(0, 3).map(d => (
                                            <div key={d.id} className="flex justify-between items-center text-[14px] border-l-2 border-primary pl-3 py-1">
                                                <span className="text-foreground truncate w-32 font-medium">{d.title}</span>
                                                <span className="tabular-nums text-muted-foreground text-[13px]">{new Date(d.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                            </div>
                                        ))}
                                        {!deliverablesLoading && deliverables.length === 0 && (
                                            <p className="text-[14px] text-muted-foreground">No upcoming deadlines.</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* --- TEAM TAB --- */}
                <TabsContent value="team">
                    <TeamTab
                        project={project}
                        user={user}
                        isPrimaryContact={isPrimaryContact}
                        isInviteModalOpen={isInviteModalOpen}
                        setIsInviteModalOpen={setIsInviteModalOpen}
                        onTeamUpdated={(updatedTeam) => setProject(prev => prev ? { ...prev, team: updatedTeam } : prev)}
                        addToast={addToast}
                    />
                </TabsContent>

                {/* --- TASKS TAB --- */}
                <TabsContent value="tasks" className="mt-6">
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold tracking-tight text-foreground">Tasks</h3>
                                <p className="text-sm text-muted-foreground">Manage your project tasks and track progress.</p>
                            </div>
                        </div>



                        <div className="space-y-3">
                            {tasks
                                // Filter out internal-only tasks for client users
                                .filter(task => user && isClient(user) ? task.visibleToClient !== false : true)
                                .map(task => {
                                    const creator = task.createdBy ? project.team.find(m => m.id === task.createdBy) : null;
                                    const assignee = task.assignee || (task.assigneeId ? project.team.find(u => u.id === task.assigneeId) : null);

                                    if (editingTask?.id === task.id && user) {
                                        return (
                                            <TaskEditForm
                                                key={task.id}
                                                task={task}
                                                teamMembers={project.team || []}
                                                onSave={handleSaveTask}
                                                onCancel={() => setEditingTask(null)}
                                                userId={user.id}
                                                userName={user.name}
                                                userRole={user.role}
                                            />
                                        );
                                    }

                                    return (
                                        <div key={task.id} className="group flex flex-col gap-2 px-4 py-3 rounded-lg border border-border bg-card hover:border-border transition-colors">
                                            {/* Top row: checkbox + title + actions */}
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => {
                                                        const newStatus = task.status === 'Done' || task.status === 'completed' ? 'pending' : 'completed';
                                                        handleSaveTask(task.id, { status: newStatus as any });
                                                    }}
                                                    className={cn(
                                                        "h-5 w-5 shrink-0 rounded border flex items-center justify-center transition-all focus:ring-2 focus:ring-primary/20 outline-none",
                                                        task.status === 'Done' || task.status === 'completed'
                                                            ? "bg-primary border-primary text-white"
                                                            : "border-border hover:border-primary bg-card"
                                                    )}
                                                >
                                                    {(task.status === 'Done' || task.status === 'completed') && <CheckSquare className="h-3.5 w-3.5" />}
                                                </button>
                                                <span className={cn(
                                                    "text-sm font-medium flex-1 min-w-0 truncate",
                                                    (task.status === 'Done' || task.status === 'completed') ? "text-muted-foreground line-through decoration-zinc-300" : "text-foreground"
                                                )}>
                                                    {task.title}
                                                </span>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <Badge variant="secondary" className={cn("text-[12px] font-medium border", getTaskStatusStyle(task.status))}>{getTaskStatusLabel(task.status)}</Badge>

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => toggleTaskComments(task.id)}
                                                        className={cn(
                                                            "h-7 w-7 p-0 rounded-md transition-all",
                                                            expandedComments.has(task.id)
                                                                ? "text-blue-600 bg-blue-50"
                                                                : "text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                                                        )}
                                                        title="Comments"
                                                    >
                                                        <div className="relative">
                                                            <MessageSquare className="h-3.5 w-3.5" />
                                                            {(task.comments?.length || 0) > 0 && (
                                                                <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[9px] font-bold rounded-full h-3.5 min-w-[14px] flex items-center justify-center">
                                                                    {task.comments?.length}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleFollowTask(task)}
                                                        className={cn(
                                                            "h-7 w-7 p-0 rounded-md transition-all",
                                                            task.followers?.includes(user?.id || '')
                                                                ? "text-emerald-500 hover:text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                                                                : "text-muted-foreground hover:text-muted-foreground hover:bg-muted"
                                                        )}
                                                        title={task.followers?.includes(user?.id || '') ? "Unfollow updates" : "Follow updates"}
                                                    >
                                                        {task.followers?.includes(user?.id || '') ? <Bell className="h-3.5 w-3.5 fill-current" /> : <BellOff className="h-3.5 w-3.5" />}
                                                    </Button>

                                                    {user && canEditTask(user, task) && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleEditTask(task)}
                                                            className="h-7 w-7 p-0 rounded-md text-muted-foreground hover:text-muted-foreground hover:bg-muted transition-all"
                                                            title="Edit task"
                                                        >
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}

                                                    {user && canDeleteTask(user, task) && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDeleteTask(task.id)}
                                                            className="h-7 w-7 p-0 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-all"
                                                            title="Delete task"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Meta row: assignee, time, creator, deadline */}
                                            <div className="flex items-center gap-3 pl-8 text-xs text-muted-foreground">
                                                {assignee && (
                                                    <span className="flex items-center gap-1.5 text-muted-foreground font-medium" title={`Assigned to ${assignee.name}`}>
                                                        <Avatar src={assignee.avatar} fallback={assignee.name[0]} className="h-4 w-4" />
                                                        {assignee.name}
                                                    </span>
                                                )}
                                                {assignee && (task.createdAt || creator || task.deadline) && (
                                                    <span className="text-zinc-200">·</span>
                                                )}
                                                {task.createdAt && (
                                                    <span className="flex items-center gap-1" title={new Date(task.createdAt).toLocaleString()}>
                                                        <Clock className="h-3 w-3" />
                                                        {formatTimeAgo(task.createdAt)}
                                                    </span>
                                                )}
                                                {creator && (
                                                    <span className="flex items-center gap-1" title={`Created by ${creator.name}`}>
                                                        By {creator.name.split(' ')[0]}
                                                    </span>
                                                )}
                                                {task.deadline && (
                                                    <span className="flex items-center gap-1 text-amber-600" title={`Due: ${new Date(task.deadline).toLocaleDateString()}`}>
                                                        <Calendar className="h-3 w-3" />
                                                        Due {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Expanded Comments Section */}
                                            {expandedComments.has(task.id) && (
                                                <div className="mt-4 pt-4 border-t border-border pl-9">
                                                    <div className="space-y-3">
                                                        {/* Existing Comments */}
                                                        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                                            {(task.comments?.length || 0) > 0 ? (
                                                                task.comments?.map((comment, index) => (
                                                                    <CommentItem
                                                                        key={comment.id}
                                                                        content={comment.content}
                                                                        details={{
                                                                            id: comment.id,
                                                                            userName: comment.userName,
                                                                            timestamp: comment.timestamp,
                                                                            userId: comment.userId
                                                                        }}
                                                                        currentUser={user}
                                                                        onDelete={(id) => handleDeleteComment(task.id, id)}
                                                                        formatTimeAgo={formatTimeAgo}
                                                                        showDelete={index === (task.comments?.length || 0) - 1}
                                                                        teamMembers={project.team}
                                                                    />
                                                                ))
                                                            ) : (
                                                                <p className="text-sm text-muted-foreground italic py-2">No comments yet.</p>
                                                            )}
                                                        </div>

                                                        {/* Add Comment Input */}
                                                        <div className="pt-2">
                                                            <MentionInput
                                                                value={newCommentInput[task.id] || ''}
                                                                onChange={(value) => setNewCommentInput(prev => ({ ...prev, [task.id]: value }))}
                                                                onSubmit={() => handleAddComment(task.id)}
                                                                users={project.team}
                                                                placeholder="Write a comment... (Type @ to mention)"
                                                                disabled={!user}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}

                            {tasks.length === 0 && (
                                <EmptyState
                                    title="No tasks yet"
                                    description="Get started by adding a task."
                                    icon={ClipboardList}
                                    className="py-16 bg-muted/50 border-dashed"
                                />
                            )}
                        </div>

                        {/* Add Task Form - Visible to users with create permission */}
                        {user && canCreateTask(user) && project && (
                            <TaskCreateForm
                                projectId={project.id}
                                teamMembers={project.team || []}
                                onTaskCreated={() => {
                                    invalidateTasks();
                                    addToast({
                                        title: 'Task Created',
                                        description: 'Task has been created successfully',
                                        variant: 'success'
                                    });
                                }}
                                userId={user.id}
                                userName={user.name}
                                userRole={user.role}
                            />
                        )}

                    </div>
                </TabsContent>

                {/* --- DELIVERABLES TAB --- */}
                <TabsContent value="deliverables">
                    <DeliverablesTab project={project} onConvertToTask={handleConvertToTask} />
                </TabsContent>

                {/* --- FILES TAB --- */}
                <TabsContent value="files">
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold tracking-tight text-foreground">Project Files</h3>
                                <p className="text-sm text-muted-foreground">Shared assets and documents for this project.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {/* Upload Button Card - Permission Checked */}
                            {user && canUploadProjectFile(user, project) && (
                                <FileUpload
                                    projectId={project.id}
                                    onUploadComplete={handleFileUploadComplete}
                                    onError={(error) => addToast({
                                        title: 'Upload Failed',
                                        description: error.message,
                                        variant: 'destructive'
                                    })}
                                />
                            )}

                            {/* File List - Delete Permission Checked via Prop */}
                            <FileList
                                files={projectFiles}
                                onDelete={user && canDeleteProjectFile(user, project) ? handleFileDelete : undefined}
                            />
                        </div>
                    </div>
                </TabsContent>

                {/* --- ACTIVITY TAB --- */}
                <TabsContent value="activity">
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold">Project Activity</h3>
                                <p className="text-sm text-muted-foreground">Complete timeline of all project events</p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="gap-2">
                                    <FolderOpen className="h-4 w-4" />
                                    Export
                                </Button>
                            </div>
                        </div>

                        {/* Activity Stream */}
                        <Card className="border-border shadow-sm">
                            <CardContent className="p-6">
                                {activityLog.length > 0 ? (
                                    <>
                                        {/* Group by date */}
                                        <div className="space-y-8">
                                            {groupActivitiesByDate(activityLog).map((group) => (
                                                <div key={group.label}>
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                                                        <div className="h-px flex-1 bg-muted" />
                                                        <span>{group.label}</span>
                                                        <div className="h-px flex-1 bg-muted" />
                                                    </h4>
                                                    <div className="space-y-0">
                                                        {group.activities.map((log, i, arr) => {
                                                            const teamUser = TEAM_MEMBERS.find(u => u.id === log.userId);
                                                            const isCurrentUser = user && log.userId === user.id;
                                                            const displayName = isCurrentUser ? 'You' : (teamUser?.name || log.userName || 'Unknown');
                                                            const activityLink = getActivityLink(project.id, log.type, log.details);
                                                            return (
                                                                <div
                                                                    key={log.id}
                                                                    className={cn("flex gap-4 pb-6 relative last:pb-0 group hover:bg-muted -mx-2 px-2 py-2 rounded-lg transition-colors", activityLink && "cursor-pointer")}
                                                                    onClick={() => activityLink && navigate(activityLink)}
                                                                >
                                                                    {i !== arr.length - 1 && (
                                                                        <div className="absolute left-[23px] top-12 bottom-0 w-px bg-muted" />
                                                                    )}
                                                                    <Avatar src={teamUser?.avatar} fallback={displayName[0]} className="h-10 w-10 z-10 ring-2 ring-card shadow-sm shrink-0" />
                                                                    <div className="flex-1 pt-1">
                                                                        <p className="text-sm text-muted-foreground mb-1">
                                                                            <span className="font-bold text-foreground">{displayName}</span> {log.action} <span className="font-semibold text-foreground">{log.target}</span>
                                                                        </p>
                                                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                                                                            <Clock className="h-3 w-3" />
                                                                            {formatTimestamp(log.timestamp)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    /* Empty State */
                                    <EmptyState
                                        title="No activity yet"
                                        description="Project activity will appear here as team members work."
                                        icon={Activity}
                                        className="py-12"
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* --- PAYMENTS TAB --- */}
                <TabsContent value="payments">
                    <PaymentHistory project={project} />
                </TabsContent>
            </Tabs>
        </div>
    );
};