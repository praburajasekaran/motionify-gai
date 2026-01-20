import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Calendar, Users, FileVideo, MessageSquare, CheckSquare, Sparkles, PlusCircle,
    Edit2, Clock, CheckCircle2, AlertTriangle, MoreVertical, FileBox, Mail, Crown,
    ArrowRight, Activity, Zap, ClipboardList, FolderOpen, LayoutDashboard, Package, Folder, ChevronDown,
    Bell, BellOff, Settings, Share2, CreditCard
} from 'lucide-react';
import {
    Button, Card, CardContent, CardHeader, CardTitle, Badge, Separator,
    Avatar, Input, ClientLogo, Progress, Tabs, TabsList, TabsTrigger,
    TabsContent, CircularProgress, DropdownMenu, DropdownMenuItem, EmptyState, ErrorState, cn, useToast, Switch
} from '../components/ui/design-system';
import { MOCK_PROJECTS, TEAM_MEMBERS, TAB_INDEX_MAP, INDEX_TAB_MAP, TabIndex, TabName } from '../constants';
import { analyzeProjectRisk } from '../services/geminiService';
import { ProjectStatus, Task } from '../types';
import { DeliverablesTab } from '../components/deliverables/DeliverablesTab';
import { TaskEditModal } from '../components/tasks/TaskEditModal';
import { canEditTask, canUploadProjectFile, canDeleteProjectFile, isClient, isClientPrimaryContact } from '../utils/deliverablePermissions';
import { InviteModal } from '../components/team/InviteModal';
import { useAuthContext } from '../contexts/AuthContext';
import { FileUpload } from '../components/files/FileUpload';
import { FileList } from '../components/files/FileList';
import { ProjectFile } from '../types';
import { fetchTasksForProject, createTask, updateTask as updateTaskAPI, followTask, unfollowTask, addComment } from '../services/taskApi';
import { parseTaskInput, formatTimeAgo } from '../utils/taskParser';
import { MentionInput } from '../components/tasks/MentionInput';
import { CommentItem } from '../components/tasks/CommentItem';
import { PaymentHistory } from '../components/payments/PaymentHistory';
import { TermsBanner } from '../components/project/TermsBanner';

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
        <div className="flex items-center gap-3 bg-white border border-zinc-200/80 px-4 py-2 rounded-full shadow-sm" role="progressbar" aria-valuenow={remaining} aria-valuemax={max} aria-label={`${remaining} of ${max} revisions remaining`}>
            {/* Label */}
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
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
                    <div className="h-5 w-9 rounded-[3px] border-2 border-zinc-300 p-0.5 relative flex items-center bg-white">
                        <div
                            className={cn("h-full rounded-[1px] transition-all duration-500", colorClass)}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    {/* Battery Nub */}
                    <div className="h-2 w-0.5 bg-zinc-300 rounded-r-[1px] absolute -right-1" />

                    {/* Charging Bolt */}
                    {percentage > 0 && (
                        <Zap className={cn("absolute -top-1 -right-1.5 h-3 w-3 fill-current stroke-white", colorClass.replace('bg-', 'text-'))} />
                    )}
                </div>

                {/* Mini Progress Bar */}
                <div className="w-16 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
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
    const project = MOCK_PROJECTS.find(p => p.id === id);

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
    const [newTaskInput, setNewTaskInput] = useState('');
    const [tasks, setTasks] = useState<Task[]>(project ? project.tasks : []);
    const [projectFiles, setProjectFiles] = useState<ProjectFile[]>(project?.files || []);
    const [termsAccepted, setTermsAccepted] = useState(!!project?.termsAcceptedAt);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    // Expandable comments state
    const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
    const [newCommentInput, setNewCommentInput] = useState<Record<string, string>>({});
    const { addToast } = useToast();

    // Check if current user is Primary Contact for this project
    const isPrimaryContact = user && isClientPrimaryContact(user, project?.id || '');

    // Load tasks from backend when project loads
    useEffect(() => {
        if (!project?.id) return;

        const loadTasks = async () => {
            try {
                const backendTasks = await fetchTasksForProject(project.id, true);
                setTasks(backendTasks);
            } catch (error) {
                console.error('Failed to load tasks:', error);
                // Fallback to mock data if API fails
                setTasks(project.tasks || []);
            }
        };

        loadTasks();
        setProjectFiles(project.files || []);
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

        try {
            // Parse natural language input
            const parsed = parseTaskInput(newTaskInput, project.team);

            const newTask = await createTask({
                project_id: project.id,
                title: parsed.title,
                description: parsed.title, // Use title as description for now
                visible_to_client: true,
                status: 'pending',
                assignee_id: parsed.assigneeId,
                deadline: parsed.deadline
            });

            setTasks([...tasks, newTask]);
            setNewTaskInput('');

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
        setIsEditModalOpen(true);
    };

    const handleSaveTask = async (taskId: string, updates: Partial<Task>) => {
        try {
            // Only send fields that exist in the backend API
            const updatedTask = await updateTaskAPI(taskId, {
                title: updates.title,
                status: updates.status,
                assigneeId: updates.assignee?.id,
                visibleToClient: updates.visibleToClient
            });

            setTasks(prevTasks =>
                prevTasks.map(t => t.id === taskId ? { ...t, ...updatedTask } : t)
            );
            setEditingTask(null);
            setIsEditModalOpen(false);

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

    const handleFollowTask = async (task: Task) => {
        if (!user) return;

        const isFollowing = task.followers?.includes(user.id);
        const originalTasks = [...tasks];

        // Optimistic update
        setTasks(prev => prev.map(t => {
            if (t.id !== task.id) return t;

            const newFollowers = isFollowing
                ? (t.followers || []).filter(id => id !== user.id)
                : [...(t.followers || []), user.id];

            return { ...t, followers: newFollowers };
        }));

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
        } catch (error) {
            console.error('Failed to toggle follow state:', error);
            // Revert on error
            setTasks(originalTasks);
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

            // Optimistic update
            const newComment = {
                id: `comment-${Date.now()}`,
                userId: user.id,
                userName: user.name,
                content: commentText,
                timestamp: Date.now()
            };

            setTasks(prevTasks =>
                prevTasks.map(t =>
                    t.id === taskId
                        ? { ...t, comments: [...(t.comments || []), newComment] }
                        : t
                )
            );

            // Clear input
            setNewCommentInput(prev => ({ ...prev, [taskId]: '' }));

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
        setTasks(prevTasks =>
            prevTasks.map(t =>
                t.id === taskId
                    ? { ...t, comments: (t.comments || []).filter(c => c.id !== commentId) }
                    : t
            )
        );

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

        setTasks(prev => [...prev, newTask]);

        addToast({
            title: "Task Created",
            description: `Created task "${taskTitle}" assigned to ${assignee.name}`,
            variant: "success"
        });

        // Switch to tasks tab to show the new task (optional, maybe just toast is enough)
        // navigate to tasks tab? No, let's just show toast.
    };

    // File Upload Handler
    const handleFileUploadComplete = (key: string, file: File) => {
        const newFile: ProjectFile = {
            id: `file-${Date.now()}`,
            projectId: project.id,
            name: file.name,
            type: file.type,
            size: file.size,
            key: key,
            uploadedBy: user || TEAM_MEMBERS[0],
            uploadedAt: new Date().toISOString()
        };

        setProjectFiles(prev => [newFile, ...prev]);

        addToast({
            title: "File Uploaded",
            description: `${file.name} has been uploaded successfully.`,
            variant: "success"
        });
    };

    // File Delete Handler (confirmation handled in FileList)
    const handleFileDelete = (fileId: string) => {
        // In a real app, calls storageService.deleteFile(key)
        setProjectFiles(prev => prev.filter(f => f.id !== fileId));
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
        <div className="space-y-8 max-w-7xl mx-auto pb-20">

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
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-sm shrink-0">
                                <LayoutDashboard className="h-5 w-5" />
                            </div>

                            {/* Title & Status */}
                            <div className="flex items-center gap-3 min-w-0">
                                <h1 className="text-xl font-bold tracking-tight text-zinc-900 truncate">
                                    {project.title}
                                </h1>
                                <DropdownMenu trigger={
                                    <button className="text-zinc-400 hover:text-zinc-600 transition-colors">
                                        <ChevronDown className="h-4 w-4" />
                                    </button>
                                }>
                                    <DropdownMenuItem>Active</DropdownMenuItem>
                                    <DropdownMenuItem>Awaiting Payment</DropdownMenuItem>
                                    <DropdownMenuItem>Completed</DropdownMenuItem>
                                    <DropdownMenuItem>On Hold</DropdownMenuItem>
                                </DropdownMenu>

                                <Badge variant={getStatusVariant(project.status)} className="h-6 px-2 text-xs font-medium">
                                    <Zap className="h-3 w-3 mr-1 fill-current" />
                                    {project.status}
                                </Badge>
                            </div>

                            {/* Vertical Divider */}
                            <div className="h-6 w-px bg-zinc-200 hidden md:block mx-2" />

                            {/* Team Avatars */}
                            <div className="flex items-center -space-x-2 hidden md:flex">
                                {project.team.slice(0, 4).map((member, index) => (
                                    <Avatar key={`${member.id}-${index}`} src={member.avatar} fallback={member.name[0]} className="h-8 w-8 ring-2 ring-white" />
                                ))}
                                <button className="h-8 w-8 rounded-full bg-zinc-50 border border-dashed border-zinc-300 flex items-center justify-center text-zinc-400 hover:text-primary hover:border-primary transition-colors ml-2 ring-2 ring-white z-10">
                                    <Users className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Right Side: Actions */}
                        <div className="flex items-center gap-4 shrink-0">
                            <DropdownMenu trigger={
                                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-900">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            }>
                                <DropdownMenuItem onClick={() => navigate(`/projects/${id}/settings`)}>
                                    <Settings className="h-4 w-4 mr-2" />
                                    Settings
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    addToast({
                                        title: 'Link Copied',
                                        description: 'Project link copied to clipboard',
                                        variant: 'success'
                                    });
                                }}>
                                    <Share2 className="h-4 w-4 mr-2" />
                                    Share Project
                                </DropdownMenuItem>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Bottom Row: Minimal Tabs */}
                    <div className="border-b border-zinc-200 pb-1">
                        <TabsList className="bg-zinc-100/80 p-1 rounded-lg border border-zinc-200/60 inline-flex h-auto gap-1 justify-start overflow-x-auto no-scrollbar max-w-full">
                            {tabConfig.map(({ name, index }) => (
                                <TabsTrigger
                                    key={name}
                                    value={Object.keys(TAB_INDEX_MAP).find(key => TAB_INDEX_MAP[key as TabName] === index) || 'overview'}
                                    className="rounded-md px-3 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm hover:bg-zinc-200/50 hover:text-zinc-900 text-zinc-500"
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
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column (Main) */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Progress Section */}
                            <Card className="overflow-hidden bg-white shadow-sm border-zinc-200/60">
                                <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-zinc-100 bg-zinc-50/30">
                                    <CardTitle className="text-lg">Project Health</CardTitle>
                                    <Badge variant={project.progress === 100 ? 'success' : 'outline'}>{project.progress}% Complete</Badge>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="flex flex-col md:flex-row gap-8 items-center">
                                        <div className="shrink-0 drop-shadow-lg">
                                            <CircularProgress value={project.progress} size={150} strokeWidth={12} color={project.progress > 80 ? 'text-emerald-500' : 'text-primary'} />
                                        </div>
                                        <div className="flex-1 space-y-5 w-full">
                                            <p className="text-zinc-600 text-sm leading-relaxed">{project.description}</p>
                                            <div className="bg-gradient-to-r from-purple-50 to-white p-4 rounded-xl border border-purple-100 shadow-sm">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Sparkles className="h-4 w-4 text-purple-600" />
                                                    <h4 className="text-sm font-bold text-purple-900">AI Risk Analysis</h4>
                                                </div>
                                                <p className="text-sm text-zinc-600 italic">
                                                    "{riskAssessment || 'Analyzing...'}"
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Recent Deliverables Table */}
                            <Card className="border-zinc-200/60 shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-zinc-100 bg-zinc-50/30">
                                    <CardTitle className="text-lg">Active Deliverables</CardTitle>
                                    <Button variant="link" size="sm" className="h-auto p-0 text-zinc-500 hover:text-primary">View All</Button>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-zinc-100">
                                        {project.deliverables.slice(0, 3).map(del => (
                                            <div key={del.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500 shadow-inner">
                                                        {del.type === 'Video' ? <FileVideo className="h-5 w-5" /> : <FileBox className="h-5 w-5" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm text-zinc-900">{del.title}</p>
                                                        <p className="text-xs text-zinc-500">Due {new Date(del.dueDate).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="w-24 hidden sm:block">
                                                        <div className="flex justify-between text-[10px] text-zinc-400 font-medium mb-1">
                                                            <span>Progress</span>
                                                            <span>{del.progress}%</span>
                                                        </div>
                                                        <Progress value={del.progress} className="h-1.5" />
                                                    </div>
                                                    <Badge variant={del.status === 'approved' ? 'success' : del.status === 'awaiting_approval' ? 'warning' : 'secondary'}>
                                                        {del.status.replace('_', ' ')}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                        {project.deliverables.length === 0 && (
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
                            <Card className="border-zinc-200/60 shadow-sm">
                                <CardHeader className="border-b border-zinc-100 pb-3">
                                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">Recent Activity</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="space-y-0">
                                        {project.activityLog.map((log, i) => {
                                            const user = TEAM_MEMBERS.find(u => u.id === log.userId) || TEAM_MEMBERS[0];
                                            return (
                                                <div key={log.id} className="flex gap-3 pb-6 relative last:pb-0 group">
                                                    {i !== project.activityLog.length - 1 && (
                                                        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-zinc-200" />
                                                    )}
                                                    <Avatar src={user.avatar} fallback={user.name[0]} className="h-8 w-8 z-10 ring-2 ring-white shadow-sm" />
                                                    <div>
                                                        <p className="text-xs text-zinc-500 mb-0.5 group-hover:text-zinc-700 transition-colors">
                                                            <span className="font-bold text-zinc-900">{user.name}</span> {log.action} <span className="font-semibold text-zinc-900">{log.target}</span>
                                                        </p>
                                                        <p className="text-[10px] text-zinc-400 flex items-center gap-1 font-medium">
                                                            <Clock className="h-3 w-3" />
                                                            {new Date(log.timestamp).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Deadlines */}
                            <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 text-white shadow-lg shadow-black/10 border-zinc-700">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-2 mb-5">
                                        <Calendar className="h-5 w-5 text-zinc-400" />
                                        <h3 className="font-bold tracking-tight">Upcoming Deadlines</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {project.deliverables.slice(0, 2).map(d => (
                                            <div key={d.id} className="flex justify-between items-center text-sm border-l-2 border-primary pl-4 py-1">
                                                <span className="text-zinc-200 truncate w-32 font-medium">{d.title}</span>
                                                <span className="font-mono text-zinc-400 text-xs bg-zinc-800 px-2 py-0.5 rounded">{new Date(d.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                            </div>
                                        ))}
                                        {project.deliverables.length === 0 && (
                                            <p className="text-sm text-zinc-500 italic">No upcoming deadlines.</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* --- TEAM TAB --- */}
                <TabsContent value="team">
                    <div className="flex justify-between items-center mb-6">
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-zinc-900">Project Team</h3>
                            <p className="text-sm text-zinc-500">Manage members and permissions for this project.</p>
                        </div>
                        {(isPrimaryContact || user?.role === 'project_manager' || user?.role === 'super_admin') && (
                            <Button
                                className="gap-2 shadow-sm"
                                aria-label="Add Member"
                                onClick={() => setIsInviteModalOpen(true)}
                            >
                                <Users className="h-4 w-4" /> Add Member
                            </Button>
                        )}
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {project.team.map((member) => (
                            <Card key={member.id} hoverable className="group relative border-zinc-200/60">
                                {member.role === 'project_manager' && (
                                    <div className="absolute top-3 right-3 text-amber-600 bg-amber-50 border border-amber-100 p-1.5 rounded-full shadow-sm" title="Primary Contact">
                                        <Crown className="h-3.5 w-3.5" />
                                    </div>
                                )}
                                <CardContent className="p-8 flex flex-col items-center text-center">
                                    <div className="relative mb-5">
                                        <Avatar src={member.avatar} fallback={member.name[0]} className="h-20 w-20 ring-4 ring-zinc-50 shadow-md group-hover:ring-primary/10 transition-all" />
                                        <div className="absolute bottom-0 right-0 h-5 w-5 bg-green-500 border-4 border-white rounded-full"></div>
                                    </div>
                                    <h4 className="font-bold text-lg text-zinc-900">{member.name}</h4>
                                    <p className="text-sm text-zinc-500 font-medium mb-1">{member.role}</p>
                                    <p className="text-xs text-zinc-400 mb-6 font-mono">{member.email}</p>

                                    <div className="flex gap-2 w-full">
                                        <Button variant="outline" size="sm" className="flex-1 text-xs h-9 bg-zinc-50/50">Profile</Button>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100">
                                            <Mail className="h-4 w-4" />
                                        </Button>
                                        <DropdownMenu trigger={
                                            <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        }>
                                            <DropdownMenuItem>Change Role</DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600">Remove</DropdownMenuItem>
                                        </DropdownMenu>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Invite Modal */}
                    <InviteModal
                        isOpen={isInviteModalOpen}
                        onClose={() => setIsInviteModalOpen(false)}
                        projectId={project.id}
                        currentUserRole={user?.role}
                        onInviteSent={() => {
                            addToast({
                                title: 'Invitation Sent',
                                description: 'Team member has been invited to the project.',
                                variant: 'success'
                            });
                        }}
                    />
                </TabsContent>

                {/* --- TASKS TAB --- */}
                <TabsContent value="tasks" className="mt-6">
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold tracking-tight text-zinc-900">Tasks</h3>
                                <p className="text-sm text-zinc-500">Manage your project tasks and track progress.</p>
                            </div>
                        </div>



                        <div className="space-y-3">
                            {tasks
                                // Filter out internal-only tasks for client users
                                .filter(task => user && isClient(user) ? task.visibleToClient !== false : true)
                                .map(task => {
                                    const creator = task.createdBy ? project.team.find(m => m.id === task.createdBy) : null;
                                    const assignee = task.assignee || (task.assigneeId ? project.team.find(u => u.id === task.assigneeId) : null);

                                    return (
                                        <div key={task.id} className="group flex flex-col p-4 rounded-lg border border-zinc-200 bg-white shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-200">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4 flex-1">
                                                    <button
                                                        onClick={() => {
                                                            const newStatus = task.status === 'Done' || task.status === 'completed' ? 'pending' : 'completed';
                                                            handleSaveTask(task.id, { status: newStatus as any });
                                                        }}
                                                        className={cn(
                                                            "h-5 w-5 rounded border flex items-center justify-center transition-all focus:ring-2 focus:ring-primary/20 outline-none",
                                                            task.status === 'Done' || task.status === 'completed'
                                                                ? "bg-primary border-primary text-white"
                                                                : "border-zinc-300 hover:border-primary bg-white"
                                                        )}
                                                    >
                                                        {(task.status === 'Done' || task.status === 'completed') && <CheckSquare className="h-3.5 w-3.5" />}
                                                    </button>
                                                    <span className={cn(
                                                        "text-sm font-medium transition-colors",
                                                        (task.status === 'Done' || task.status === 'completed') ? "text-zinc-400 line-through decoration-zinc-300" : "text-zinc-900"
                                                    )}>
                                                        {task.title}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {assignee && (
                                                        <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-50 px-2 py-1 rounded-md border border-zinc-100">
                                                            <Avatar src={assignee.avatar} fallback={assignee.name[0]} className="h-4 w-4" />
                                                            <span className="hidden sm:inline">{assignee.name}</span>
                                                        </div>
                                                    )}
                                                    <Badge variant="secondary" className="bg-zinc-100 text-zinc-500 font-normal border border-zinc-200">{task.status}</Badge>

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => toggleTaskComments(task.id)}
                                                        className={cn(
                                                            "h-7 px-2 rounded-md transition-all gap-1.5",
                                                            expandedComments.has(task.id)
                                                                ? "text-blue-600 bg-blue-50"
                                                                : "text-zinc-400 hover:text-blue-600 hover:bg-blue-50"
                                                        )}
                                                        title="Comments"
                                                    >
                                                        <MessageSquare className="h-3.5 w-3.5" />
                                                        {(task.comments?.length || 0) > 0 && (
                                                            <span className="text-xs font-medium">{task.comments?.length}</span>
                                                        )}
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleFollowTask(task)}
                                                        className={cn(
                                                            "h-7 w-7 p-0 rounded-full transition-all",
                                                            task.followers?.includes(user?.id || '')
                                                                ? "text-emerald-500 hover:text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                                                                : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
                                                        )}
                                                        title={task.followers?.includes(user?.id || '') ? "Unfollow updates" : "Follow updates"}
                                                    >
                                                        {task.followers?.includes(user?.id || '') ? <Bell className="h-3.5 w-3.5 fill-current" /> : <BellOff className="h-3.5 w-3.5" />}
                                                    </Button>

                                                    {user && canEditTask(user, task) && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleEditTask(task)}
                                                            className="opacity-100 transition-opacity gap-1.5 h-7 px-3 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200"
                                                        >
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                            <span className="hidden sm:inline text-xs font-medium">Edit</span>
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Task Metadata Row */}
                                            <div className="flex items-center gap-4 mt-2 pl-9 text-xs text-zinc-400">
                                                {task.createdAt && (
                                                    <span className="flex items-center gap-1" title={new Date(task.createdAt).toLocaleString()}>
                                                        <Clock className="h-3 w-3" />
                                                        {formatTimeAgo(task.createdAt)}
                                                    </span>
                                                )}
                                                {creator && (
                                                    <span className="flex items-center gap-1" title={`Created by ${creator.name}`}>
                                                        <Users className="h-3 w-3" />
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
                                                <div className="mt-4 pt-4 border-t border-zinc-100 pl-9">
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
                                                                <p className="text-sm text-zinc-400 italic py-2">No comments yet.</p>
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
                                    className="py-16 bg-zinc-50/50 border-dashed"
                                />
                            )}
                        </div>

                        {/* Add Task Input */}
                        <div className="space-y-2 pt-2">
                            <div className="flex gap-3 items-center">
                                <div className="relative flex-1">
                                    <Input
                                        placeholder="Add a task... (e.g., 'Review design @john tomorrow')"
                                        value={newTaskInput}
                                        onChange={(e) => setNewTaskInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                                        className="pl-4 pr-10 h-11 bg-white shadow-sm border-zinc-200 focus-visible:ring-primary/20"
                                    />
                                </div>
                                <Button onClick={handleAddTask} size="default" className="h-11 px-6 shadow-sm">
                                    <PlusCircle className="h-4 w-4 mr-2" /> Add Task
                                </Button>
                            </div>
                            <p className="text-xs text-zinc-400 pl-1">
                                Tip: Use <span className="font-medium">@name</span> to assign and words like <span className="font-medium">tomorrow</span> for deadlines.
                            </p>
                        </div>

                        <TaskEditModal
                            isOpen={isEditModalOpen}
                            onClose={() => {
                                setIsEditModalOpen(false);
                                setEditingTask(null);
                            }}
                            task={editingTask}
                            onSave={handleSaveTask}
                            teamMembers={TEAM_MEMBERS}
                        />
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
                                <h3 className="text-xl font-bold tracking-tight text-zinc-900">Project Files</h3>
                                <p className="text-sm text-zinc-500">Shared assets and documents for this project.</p>
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
                                <p className="text-sm text-zinc-500">Complete timeline of all project events</p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="gap-2">
                                    <FolderOpen className="h-4 w-4" />
                                    Export
                                </Button>
                            </div>
                        </div>

                        {/* Activity Stream */}
                        <Card className="border-zinc-200/60 shadow-sm">
                            <CardContent className="p-6">
                                {project.activityLog.length > 0 ? (
                                    <>
                                        {/* Group by date */}
                                        <div className="space-y-8">
                                            {/* Today Section */}
                                            <div>
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                                                    <div className="h-px flex-1 bg-zinc-200" />
                                                    <span>Today</span>
                                                    <div className="h-px flex-1 bg-zinc-200" />
                                                </h4>
                                                <div className="space-y-0">
                                                    {project.activityLog.slice(0, 3).map((log, i) => {
                                                        const user = TEAM_MEMBERS.find(u => u.id === log.userId) || TEAM_MEMBERS[0];
                                                        return (
                                                            <div key={log.id} className="flex gap-4 pb-6 relative last:pb-0 group hover:bg-zinc-50 -mx-2 px-2 py-2 rounded-lg transition-colors">
                                                                {i !== 2 && (
                                                                    <div className="absolute left-[23px] top-12 bottom-0 w-px bg-zinc-200" />
                                                                )}
                                                                <Avatar src={user.avatar} fallback={user.name[0]} className="h-10 w-10 z-10 ring-2 ring-white shadow-sm shrink-0" />
                                                                <div className="flex-1 pt-1">
                                                                    <p className="text-sm text-zinc-600 mb-1">
                                                                        <span className="font-bold text-zinc-900">{user.name}</span> {log.action} <span className="font-semibold text-zinc-900">{log.target}</span>
                                                                    </p>
                                                                    <p className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
                                                                        <Clock className="h-3 w-3" />
                                                                        {new Date(log.timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Earlier Section */}
                                            {project.activityLog.length > 3 && (
                                                <div>
                                                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                                                        <div className="h-px flex-1 bg-zinc-200" />
                                                        <span>Earlier</span>
                                                        <div className="h-px flex-1 bg-zinc-200" />
                                                    </h4>
                                                    <div className="space-y-0">
                                                        {project.activityLog.slice(3).map((log, i, arr) => {
                                                            const user = TEAM_MEMBERS.find(u => u.id === log.userId) || TEAM_MEMBERS[0];
                                                            return (
                                                                <div key={log.id} className="flex gap-4 pb-6 relative last:pb-0 group hover:bg-zinc-50 -mx-2 px-2 py-2 rounded-lg transition-colors">
                                                                    {i !== arr.length - 1 && (
                                                                        <div className="absolute left-[23px] top-12 bottom-0 w-px bg-zinc-200" />
                                                                    )}
                                                                    <Avatar src={user.avatar} fallback={user.name[0]} className="h-10 w-10 z-10 ring-2 ring-white shadow-sm shrink-0" />
                                                                    <div className="flex-1 pt-1">
                                                                        <p className="text-sm text-zinc-600 mb-1">
                                                                            <span className="font-bold text-zinc-900">{user.name}</span> {log.action} <span className="font-semibold text-zinc-900">{log.target}</span>
                                                                        </p>
                                                                        <p className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
                                                                            <Clock className="h-3 w-3" />
                                                                            {new Date(log.timestamp).toLocaleDateString()}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Load More */}
                                        <div className="pt-6 border-t border-zinc-100 mt-6">
                                            <Button variant="outline" className="w-full">
                                                Load More Activity
                                            </Button>
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