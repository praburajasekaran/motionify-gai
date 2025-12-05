import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Calendar, Users, FileVideo, MessageSquare, CheckSquare, Sparkles, PlusCircle,
    Edit2, Clock, CheckCircle2, AlertTriangle, MoreVertical, FileBox, Mail, Crown,
    ArrowRight, Activity, Zap, ClipboardList, FolderOpen, LayoutDashboard, Package, Folder, ChevronDown
} from 'lucide-react';
import {
    Button, Card, CardContent, CardHeader, CardTitle, Badge, Separator,
    Avatar, Input, ClientLogo, Progress, Tabs, TabsList, TabsTrigger,
    TabsContent, CircularProgress, DropdownMenu, DropdownMenuItem, EmptyState, ErrorState, cn, useToast, Switch
} from '../components/ui/design-system';
import { MOCK_PROJECTS, TEAM_MEMBERS, TAB_INDEX_MAP, INDEX_TAB_MAP, TabIndex, TabName } from '../constants';
import { generateProjectTasks, analyzeProjectRisk } from '../services/geminiService';
import { ProjectStatus, Task } from '../types';
import { DeliverablesTab } from '../components/deliverables/DeliverablesTab';

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
    const [aiTasks, setAiTasks] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [riskAssessment, setRiskAssessment] = useState<string>('');
    const [newTaskInput, setNewTaskInput] = useState('');
    const [tasks, setTasks] = useState<Task[]>(project ? project.tasks : []);
    const { addToast } = useToast();

    // Sync tasks when project changes
    useEffect(() => {
        if (project) {
            setTasks(project.tasks);
        }
    }, [project?.id]);

    // Auto-analysis on load
    useEffect(() => {
        if (project && !riskAssessment) {
            analyzeProjectRisk({ title: project.title, status: project.status, progress: project.progress, dueDate: project.dueDate })
                .then(setRiskAssessment);
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

    const handleGenerateTasks = async () => {
        setIsGenerating(true);
        const tasks = await generateProjectTasks(project.description, project.title);
        setAiTasks(tasks);
        setIsGenerating(false);
    };

    const handleAddTask = () => {
        if (!newTaskInput.trim()) return;

        const newTask: Task = {
            id: `task-${Date.now()}`,
            title: newTaskInput,
            status: 'Todo',
            assignee: TEAM_MEMBERS[0] // Default assign to current user
        };

        setTasks([...tasks, newTask]);
        setNewTaskInput('');
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
    ];

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-20">

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
                                {project.team.slice(0, 4).map((member) => (
                                    <Avatar key={member.id} src={member.avatar} fallback={member.name[0]} className="h-8 w-8 ring-2 ring-white" />
                                ))}
                                <button className="h-8 w-8 rounded-full bg-zinc-50 border border-dashed border-zinc-300 flex items-center justify-center text-zinc-400 hover:text-primary hover:border-primary transition-colors ml-2 ring-2 ring-white z-10">
                                    <Users className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Right Side: Toggle & Actions */}
                        <div className="flex items-center gap-4 shrink-0">
                            <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-100">
                                <span className="text-xs font-medium text-zinc-600">Auto-Milestones</span>
                                <Switch />
                            </div>

                            <div className="h-4 w-px bg-zinc-200 hidden sm:block" />

                            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-900">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
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
                        <Button className="gap-2 shadow-sm" aria-label="Add Member">
                            <Users className="h-4 w-4" /> Add Member
                        </Button>
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
                </TabsContent>

                {/* --- TASKS TAB --- */}
                <TabsContent value="tasks" className="mt-6">
                    <div className="space-y-6 max-w-4xl mx-auto">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold tracking-tight text-zinc-900">Tasks</h3>
                                <p className="text-sm text-zinc-500">Manage your project tasks and track progress.</p>
                            </div>
                            <Button onClick={handleGenerateTasks} disabled={isGenerating} variant="outline" className="gap-2 bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200 shadow-sm">
                                <Sparkles className="h-4 w-4 text-purple-500" />
                                {isGenerating ? 'Analyzing...' : 'AI Suggestions'}
                            </Button>
                        </div>

                        {/* AI Generated Tasks */}
                        {aiTasks.length > 0 && (
                            <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="h-4 w-4 text-purple-600" />
                                    <h4 className="font-semibold text-purple-900 text-sm">Suggested Tasks</h4>
                                </div>
                                <div className="grid gap-2">
                                    {aiTasks.map((task, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-md border border-purple-100 shadow-sm group hover:border-purple-200 transition-colors">
                                            <span className="text-sm text-zinc-700">{task}</span>
                                            <Button size="sm" variant="ghost" className="h-7 text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-2">
                                                <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            {tasks.map(task => (
                                <div key={task.id} className="group flex items-center justify-between p-4 rounded-lg border border-zinc-200 bg-white shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-200">
                                    <div className="flex items-center gap-4">
                                        <button
                                            className={cn(
                                                "h-5 w-5 rounded border flex items-center justify-center transition-all focus:ring-2 focus:ring-primary/20 outline-none",
                                                task.status === 'Done'
                                                    ? "bg-primary border-primary text-white"
                                                    : "border-zinc-300 hover:border-primary bg-white"
                                            )}
                                        >
                                            {task.status === 'Done' && <CheckSquare className="h-3.5 w-3.5" />}
                                        </button>
                                        <span className={cn(
                                            "text-sm font-medium transition-colors",
                                            task.status === 'Done' ? "text-zinc-400 line-through decoration-zinc-300" : "text-zinc-900"
                                        )}>
                                            {task.title}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {task.assignee && (
                                            <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-50 px-2 py-1 rounded-md border border-zinc-100">
                                                <Avatar src={task.assignee.avatar} fallback={task.assignee.name[0]} className="h-4 w-4" />
                                                <span className="hidden sm:inline">{task.assignee.name}</span>
                                            </div>
                                        )}
                                        <Badge variant="secondary" className="bg-zinc-100 text-zinc-500 font-normal border border-zinc-200">{task.status}</Badge>
                                    </div>
                                </div>
                            ))}

                            {tasks.length === 0 && !aiTasks.length && (
                                <EmptyState
                                    title="No tasks yet"
                                    description="Get started by adding a task or using AI suggestions."
                                    icon={ClipboardList}
                                    className="py-16 bg-zinc-50/50 border-dashed"
                                />
                            )}
                        </div>

                        {/* Add Task Input */}
                        <div className="flex gap-3 items-center pt-2">
                            <div className="relative flex-1">
                                <Input
                                    placeholder="Add a new task..."
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
                    </div>
                </TabsContent>

                {/* --- DELIVERABLES TAB --- */}
                <TabsContent value="deliverables">
                    <DeliverablesTab onConvertToTask={handleConvertToTask} />
                </TabsContent>

                {/* --- FILES TAB --- */}
                <TabsContent value="files">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5].map(i => (
                            <Card key={i} hoverable className="group cursor-pointer overflow-hidden border-zinc-200/60">
                                <div className="aspect-video bg-zinc-100 relative group-hover:bg-zinc-200/50 transition-colors flex items-center justify-center">
                                    <div className="bg-white p-4 rounded-full shadow-lg shadow-black/5 group-hover:scale-110 transition-transform duration-300">
                                        <FileVideo className="h-6 w-6 text-zinc-400 group-hover:text-primary transition-colors" />
                                    </div>
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="p-1 bg-white rounded-lg shadow-md border border-zinc-200/80">
                                            <MoreVertical className="h-4 w-4 text-zinc-500" />
                                        </div>
                                    </div>
                                </div>
                                <CardContent className="p-4 bg-white">
                                    <p className="font-semibold text-sm truncate text-zinc-900">Project_Asset_v{i}.mp4</p>
                                    <div className="flex justify-between items-center mt-2">
                                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-zinc-100 text-zinc-500">Video</Badge>
                                        <p className="text-[10px] text-zinc-400 font-medium">2d ago</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        <Card hoverable className="flex flex-col items-center justify-center border-dashed border-2 aspect-video bg-zinc-50/50 hover:bg-zinc-50 cursor-pointer transition-colors border-zinc-300 group">
                            <div className="h-14 w-14 rounded-full bg-white shadow-sm border border-zinc-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 group-hover:border-primary/50">
                                <PlusCircle className="h-7 w-7 text-zinc-400 group-hover:text-primary transition-colors" />
                            </div>
                            <p className="text-sm font-bold text-zinc-500 group-hover:text-primary transition-colors">Upload New Asset</p>
                        </Card>
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
            </Tabs>
        </div>
    );
};