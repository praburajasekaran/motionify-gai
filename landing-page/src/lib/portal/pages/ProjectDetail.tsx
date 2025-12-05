import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
    Calendar, Users, FileVideo, MessageSquare, CheckSquare, Sparkles, PlusCircle, 
    Edit2, Clock, CheckCircle2, AlertTriangle, MoreVertical, FileBox, Mail, Crown,
    ArrowRight, Activity, Zap, ClipboardList, FolderOpen
} from 'lucide-react';
import { 
    Button, Card, CardContent, CardHeader, CardTitle, Badge, Separator, 
    Avatar, Input, ClientLogo, Progress, Tabs, TabsList, TabsTrigger, 
    TabsContent, CircularProgress, DropdownMenu, DropdownMenuItem, EmptyState, ErrorState, cn
} from '../components/ui/design-system';
import { MOCK_PROJECTS, TEAM_MEMBERS } from '../constants';
import { generateProjectTasks, analyzeProjectRisk } from '../services/geminiService';
import { ProjectStatus } from '../types';
import DeliverablesList from '../components/DeliverablesList';

// --- Battery Component ---
const RevisionBattery: React.FC<{ used: number; max: number }> = ({ used, max }) => {
    const remaining = Math.max(0, max - used);
    const percentage = Math.round((remaining / max) * 100);
    
    // Determine color based on remaining percentage
    let colorClass = "bg-emerald-500";
    if (percentage <= 20) colorClass = "bg-red-500";
    else if (percentage <= 50) colorClass = "bg-amber-500";

    return (
        <div className="flex items-center gap-3 bg-white/50 backdrop-blur border border-zinc-200 px-3 py-1.5 rounded-full shadow-sm" role="progressbar" aria-valuenow={remaining} aria-valuemax={max}>
            <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-zinc-900 leading-none">
                    {remaining} <span className="text-[10px] font-medium text-zinc-500 uppercase">Left</span>
                </span>
            </div>
            
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
                
                {/* Charging Bolt (Optional decoration for 'Active') */}
                {percentage > 0 && (
                    <Zap className={cn("absolute -top-1 -right-1.5 h-3 w-3 fill-current stroke-white", 
                        percentage <= 20 ? "text-red-500" : percentage <= 50 ? "text-amber-500" : "text-emerald-500"
                    )} />
                )}
            </div>
        </div>
    );
};

export const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const project = MOCK_PROJECTS.find(p => p.id === id);
  const [aiTasks, setAiTasks] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [riskAssessment, setRiskAssessment] = useState<string>('');
  const [newTaskInput, setNewTaskInput] = useState('');

  // Auto-analysis on load
  useEffect(() => {
    if (project && !riskAssessment) {
        analyzeProjectRisk({ title: project.title, status: project.status, progress: project.progress, dueDate: project.dueDate })
            .then(setRiskAssessment);
    }
  }, [project, riskAssessment]);

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
    setAiTasks([...aiTasks, newTaskInput]);
    setNewTaskInput('');
  };

  // Status Badge Helper
  const getStatusVariant = (status: ProjectStatus) => {
    switch (status) {
        case 'Active': return 'default';
        case 'Completed': return 'success';
        case 'In Review': return 'warning';
        case 'On Hold': return 'destructive';
        default: return 'outline';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      
      {/* --- HERO SECTION --- */}
      <div className="relative">
          {/* Background Gradient Blob */}
          <div className="absolute -top-20 -left-20 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-3xl -z-10 pointer-events-none mix-blend-multiply" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-100/40 rounded-full blur-3xl -z-10 pointer-events-none mix-blend-multiply" />

          <div className="flex flex-col gap-8">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex gap-6">
                    <ClientLogo 
                        clientName={project.client} 
                        website={project.website} 
                        className="h-24 w-24 rounded-2xl shadow-xl shadow-blue-900/5 border border-white ring-1 ring-zinc-200/50 hidden sm:flex shrink-0 bg-white" 
                    />
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 flex items-center gap-3 group">
                                {project.title}
                                <Link to={`/projects/${project.id}/settings`}>
                                    <button className="opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:bg-white rounded-full shadow-sm ring-1 ring-zinc-200" aria-label="Edit Project">
                                        <Edit2 className="h-4 w-4 text-zinc-400 hover:text-primary" />
                                    </button>
                                </Link>
                            </h1>
                            <DropdownMenu trigger={
                                <Badge variant={getStatusVariant(project.status)} className="cursor-pointer hover:opacity-80 transition-opacity px-3 py-1 text-sm shadow-sm">
                                    {project.status} <Edit2 className="ml-2 h-3 w-3 opacity-50" />
                                </Badge>
                            }>
                                <DropdownMenuItem>Active</DropdownMenuItem>
                                <DropdownMenuItem>In Review</DropdownMenuItem>
                                <DropdownMenuItem>Completed</DropdownMenuItem>
                                <DropdownMenuItem>On Hold</DropdownMenuItem>
                            </DropdownMenu>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-zinc-500 font-medium">
                            <span className="flex items-center gap-2 bg-white/60 backdrop-blur px-3 py-1.5 rounded-lg border border-white/50 shadow-sm">
                                <Users className="h-4 w-4 text-zinc-400" /> {project.client}
                            </span>
                            <span className="flex items-center gap-2 bg-white/60 backdrop-blur px-3 py-1.5 rounded-lg border border-white/50 shadow-sm">
                                <Calendar className="h-4 w-4 text-zinc-400" /> {new Date(project.startDate).toLocaleDateString()} - {new Date(project.dueDate).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 shrink-0">
                    <Link to={`/projects/${project.id}/settings`}>
                        <Button variant="outline" className="hidden sm:flex bg-white/80 hover:bg-white shadow-sm" aria-label="Edit Project Details">Edit Details</Button>
                    </Link>
                    <Button className="gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40" variant="gradient" aria-label="Upload Asset">
                        <PlusCircle className="h-4 w-4" />
                        Upload Asset
                    </Button>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                   <Card className="bg-gradient-to-br from-blue-50/80 to-white border-blue-100/60 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(59,130,246,0.15)]">
                       <CardContent className="p-5 flex items-center justify-between">
                           <div>
                               <p className="text-xs font-bold text-blue-600/90 uppercase tracking-wider mb-1">Tasks</p>
                               <p className="text-3xl font-extrabold text-zinc-900">{project.tasks.filter(t => t.status === 'Done').length} <span className="text-zinc-400 text-xl font-medium">/ {project.tasks.length}</span></p>
                           </div>
                           <div className="h-12 w-12 bg-blue-100/50 rounded-2xl flex items-center justify-center text-blue-600 ring-1 ring-blue-200/50">
                               <CheckSquare className="h-6 w-6" />
                           </div>
                       </CardContent>
                   </Card>
                   <Card className="bg-gradient-to-br from-purple-50/80 to-white border-purple-100/60 shadow-[0_4px_20px_-4px_rgba(168,85,247,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(168,85,247,0.15)]">
                       <CardContent className="p-5 flex items-center justify-between">
                           <div>
                               <p className="text-xs font-bold text-purple-600/90 uppercase tracking-wider mb-1">Deliverables</p>
                               <p className="text-3xl font-extrabold text-zinc-900">{project.deliverables.filter(d => d.status === 'Approved').length} <span className="text-zinc-400 text-xl font-medium">/ {project.deliverablesCount}</span></p>
                           </div>
                           <div className="h-12 w-12 bg-purple-100/50 rounded-2xl flex items-center justify-center text-purple-600 ring-1 ring-purple-200/50">
                               <FileBox className="h-6 w-6" />
                           </div>
                       </CardContent>
                   </Card>
                   <Card className="bg-gradient-to-br from-emerald-50/80 to-white border-emerald-100/60 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(16,185,129,0.15)]">
                       <CardContent className="p-5 flex items-center justify-between">
                           <div>
                               <p className="text-xs font-bold text-emerald-600/90 uppercase tracking-wider mb-1">Team</p>
                               <p className="text-3xl font-extrabold text-zinc-900">{project.team.length}</p>
                           </div>
                           <div className="h-12 w-12 bg-emerald-100/50 rounded-2xl flex items-center justify-center text-emerald-600 ring-1 ring-emerald-200/50">
                               <Users className="h-6 w-6" />
                           </div>
                       </CardContent>
                   </Card>
              </div>
          </div>
      </div>

      {/* --- TABS NAVIGATION --- */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="mb-8 sticky top-[104px] z-10 bg-white/80 backdrop-blur-md py-2 -mx-4 px-4 md:mx-0 md:px-0 md:rounded-xl md:border md:border-zinc-200/60 shadow-sm md:bg-white/60">
            <TabsList className="w-full justify-start bg-transparent p-0 h-auto rounded-none flex items-center shadow-none">
                <div className="flex gap-1 md:gap-2 flex-1 overflow-x-auto no-scrollbar px-1">
                    {['Overview', 'Tasks', 'Deliverables', 'Files', 'Team', 'Activity'].map(tab => (
                        <TabsTrigger 
                            key={tab} 
                            value={tab.toLowerCase()}
                            className="
                                relative rounded-lg px-4 py-2 
                                text-sm font-medium text-zinc-500 transition-all duration-300
                                hover:text-zinc-900 hover:bg-white/60
                                data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-black/5
                            "
                        >
                            {tab}
                        </TabsTrigger>
                    ))}
                </div>
                
                {/* Revisions Battery Indicator */}
                <div className="ml-auto pl-4 hidden md:block">
                    <RevisionBattery used={project.revisionCount} max={project.maxRevisions} />
                </div>
            </TabsList>
        </div>

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
                                            <Badge variant={del.status === 'Approved' ? 'success' : del.status === 'In Review' ? 'warning' : 'secondary'}>
                                                {del.status}
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
                                        <span className="font-mono text-zinc-400 text-xs bg-zinc-800 px-2 py-0.5 rounded">{new Date(d.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
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

        {/* --- DELIVERABLES TAB (Updated) --- */}
        <TabsContent value="deliverables">
            <DeliverablesList projectId={project.id} />
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
        <TabsContent value="tasks">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold">Tasks & Kanban</h3>
                        <p className="text-sm text-zinc-500">Track progress and assign items.</p>
                    </div>
                    <Button onClick={handleGenerateTasks} disabled={isGenerating} variant="gradient" className="gap-2 shadow-lg shadow-purple-500/20">
                        <Sparkles className="h-4 w-4" />
                        {isGenerating ? 'Analyzing...' : 'Generate Plan with AI'}
                    </Button>
                </div>

                <div className="grid gap-4">
                    {project.tasks.map(task => (
                        <Card key={task.id} hoverable className="group border-l-4 border-l-transparent hover:border-l-primary transition-all">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button className={`h-6 w-6 rounded-full border flex items-center justify-center transition-all ${task.status === 'Done' ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' : 'border-zinc-300 hover:border-primary text-transparent hover:text-primary/20 bg-white'}`}>
                                        <CheckSquare className="h-3.5 w-3.5" />
                                    </button>
                                    <span className={task.status === 'Done' ? 'text-zinc-400 line-through decoration-zinc-300' : 'text-zinc-900 font-medium'}>{task.title}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    {task.assignee && (
                                        <div className="flex items-center gap-2 text-xs font-medium text-zinc-600 bg-zinc-100 px-2.5 py-1 rounded-full border border-zinc-200">
                                            <Avatar src={task.assignee.avatar} fallback={task.assignee.name[0]} className="h-4 w-4" />
                                            {task.assignee.name}
                                        </div>
                                    )}
                                    <Badge variant="secondary" className="bg-zinc-100 text-zinc-600">{task.status}</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {project.tasks.length === 0 && !aiTasks.length && (
                        <EmptyState 
                            title="No tasks yet" 
                            description="Create tasks to track your team's work."
                            icon={ClipboardList}
                        />
                    )}

                    {/* AI Generated Tasks */}
                    {aiTasks.length > 0 && (
                        <div className="rounded-xl border border-purple-100 bg-purple-50/50 overflow-hidden shadow-sm">
                            <div className="px-4 py-3 bg-purple-50 border-b border-purple-100 flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-purple-600" />
                                <h4 className="font-bold text-purple-900 text-sm">AI Suggestions</h4>
                            </div>
                            <div className="p-4 space-y-2">
                                {aiTasks.map((task, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg border border-purple-100 shadow-sm hover:shadow-md transition-all">
                                        <span className="text-sm text-zinc-800 font-medium">{task}</span>
                                        <Button size="sm" variant="ghost" className="h-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                                            <PlusCircle className="h-4 w-4 mr-1" /> Add
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="flex gap-2 mt-4 bg-white p-1 rounded-xl shadow-sm border border-zinc-200">
                        <Input 
                            placeholder="Add a new task..." 
                            value={newTaskInput}
                            onChange={(e) => setNewTaskInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                            className="bg-transparent border-none shadow-none focus-visible:ring-0 px-4 h-10"
                        />
                        <Button onClick={handleAddTask} size="icon" className="h-10 w-10 rounded-lg" aria-label="Add Task"><PlusCircle className="h-5 w-5" /></Button>
                    </div>
                </div>
            </div>
        </TabsContent>

        {/* --- FILES TAB --- */}
        <TabsContent value="files">
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                 {[1,2,3,4,5].map(i => (
                     <Card key={i} hoverable className="group cursor-pointer overflow-hidden border-zinc-200/60">
                         <div className="aspect-video bg-zinc-100 relative group-hover:bg-zinc-200/50 transition-colors flex items-center justify-center">
                             <div className="bg-white p-4 rounded-full shadow-lg shadow-black/5 group-hover:scale-110 transition-transform duration-300">
                                 <FileVideo className="h-6 w-6 text-zinc-400 group-hover:text-primary transition-colors" />
                             </div>
                             <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <div className="p-1 bg-white/90 backdrop-blur rounded-lg shadow-sm border border-zinc-200">
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
      </Tabs>
    </div>
  );
};