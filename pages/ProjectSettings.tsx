import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { validateProjectStatusTransition } from '../utils/projectStateTransitions';
import {
    ChevronLeft, Trash2, Archive, Plus, X,
    Layout, Users, Clock, ShieldAlert, Layers, Check,
    Search, ArrowUpDown, Crown, History, PlusCircle, MinusCircle, FileBox, CheckCircle2,
    AlertCircle
} from 'lucide-react';
import {
    Button, Input, Label, Textarea, Select,
    Card, CardContent, CardHeader, CardTitle, CardDescription,
    Separator, Avatar, Slider, cn, Badge,
    Dialog, DialogHeader, DialogFooter, useToast,
    EmptyState, ErrorState
} from '../components/ui/design-system';
import { TEAM_MEMBERS } from '../constants';
import { Project, ProjectStatus, User } from '../types';

interface SettingsNavProps {
    active: boolean;
    onClick: () => void;
    icon: React.ElementType;
    children: React.ReactNode;
    description?: string;
    variant?: 'default' | 'destructive';
}

const SettingsNav = ({ active, onClick, icon: Icon, children, description, variant = 'default' }: SettingsNavProps) => (
    <button
        onClick={onClick}
        role="tab"
        aria-selected={active}
        className={cn(
            "group w-full flex items-start gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 text-left border border-transparent",
            active
                ? variant === 'destructive'
                    ? "bg-red-50 text-red-700 border-red-100 shadow-sm"
                    : "bg-white text-primary border-zinc-200 shadow-sm"
                : variant === 'destructive'
                    ? "text-muted-foreground hover:bg-red-50/50 hover:text-red-600"
                    : "text-muted-foreground hover:bg-zinc-100/50 hover:text-foreground"
        )}
    >
        <div className={cn("mt-0.5 p-1.5 rounded-lg transition-colors",
            active
                ? variant === 'destructive' ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"
                : "bg-transparent text-muted-foreground group-hover:text-foreground group-hover:bg-zinc-200/50"
        )}>
            <Icon className="h-4 w-4" />
        </div>
        <div>
            <span className="block font-semibold">{children}</span>
            {description && <span className="text-xs font-normal text-muted-foreground mt-0.5 block opacity-80">{description}</span>}
        </div>
    </button>
);

export const ProjectSettings = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('general');
    const [isLoading, setIsLoading] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Deletion Confirmation State
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'deliverable' | 'team', id: string } | null>(null);
    const [showDeleteProjectDialog, setShowDeleteProjectDialog] = useState(false);

    // Archive Confirmation State
    const [showArchiveDialog, setShowArchiveDialog] = useState(false);
    const [archiveConfirmInput, setArchiveConfirmInput] = useState('');

    // Delete Confirmation State
    const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

    // Get current user for permission checks
    const { user } = useAuthContext();
    const isSuperAdmin = user?.role === 'super_admin';

    // Team Sorting & Filtering
    const [teamFilter, setTeamFilter] = useState('');
    const [teamSort, setTeamSort] = useState<{ key: keyof User | 'role', direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

    const [project, setProject] = useState<Project | null>(null);

    // Check if project is archived (read-only mode)
    const isArchived = project?.status === 'Archived';

    useEffect(() => {
        const fetchProject = async () => {
            if (!id) return;

            try {
                const response = await fetch(`/api/projects/${id}`, {
                    credentials: 'include',
                });

                if (response.ok) {
                    const data = await response.json();
                    const apiProject: Project = {
                        id: data.id,
                        title: data.project_number || `Project ${data.id.slice(0, 8)}`,
                        client: data.client_name || data.client_company || 'Client',
                        thumbnail: '',
                        status: data.status === 'active' ? 'Active' : (data.status || 'Active'),
                        startDate: data.created_at || new Date().toISOString(),
                        dueDate: data.created_at || new Date().toISOString(),
                        progress: 0,
                        description: data.description || '',
                        budget: 0,
                        team: [],
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
                    setIsDirty(false);
                }
            } catch (error) {
                console.error('Failed to fetch project:', error);
            }
        };

        fetchProject();
    }, [id]);

    if (!project) return (
        <ErrorState
            title="Project not found"
            description="Unable to load project settings."
            fullPage
            onRetry={() => navigate('/projects')}
            retryLabel="Return to Projects"
        />
    );

    const markDirty = () => setIsDirty(true);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            // TODO: Implement API call to save project settings
            // For now, just simulate success
            await new Promise(resolve => setTimeout(resolve, 600));
            setIsDirty(false);
            addToast({
                title: "Settings Saved",
                description: "Your project changes have been successfully updated.",
                variant: "success"
            });
        } catch (error) {
            addToast({
                title: "Error",
                description: "Failed to save project settings.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const confirmDeleteProject = async () => {
        // Validate confirmation input
        if (deleteConfirmInput !== project.title) return;

        try {
            // TODO: Implement API call to delete project
            // For now, just navigate away
            setShowDeleteProjectDialog(false);
            setDeleteConfirmInput('');
            navigate('/projects');

            addToast({
                title: "Project Deleted",
                description: "The project and all associated data have been permanently removed.",
                variant: "destructive"
            });
        } catch (error) {
            addToast({
                title: "Error",
                description: "Failed to delete project.",
                variant: "destructive"
            });
        }
    };

    const handleArchiveProject = async () => {
        // Validate transition
        const validation = validateProjectStatusTransition(project.status, 'Archived');
        if (!validation.isValid) {
            addToast({
                title: "Invalid Transition",
                description: validation.error || "Cannot archive project from current status.",
                variant: "destructive"
            });
            setShowArchiveDialog(false);
            setArchiveConfirmInput('');
            return;
        }

        try {
            // TODO: Implement API call to archive project
            // For now, just update local state
            setProject({ ...project, status: 'Archived' });
            setShowArchiveDialog(false);
            setArchiveConfirmInput('');
            addToast({
                title: "Project Archived",
                description: "Project has been archived.",
                variant: "success"
            });
        } catch (error) {
            addToast({
                title: "Error",
                description: "Failed to archive project.",
                variant: "destructive"
            });
        }
    };

    const updateDeliverable = (id: string, field: string, value: string) => {
        markDirty();
        setProject(prev => {
            if (!prev) return null;
            const newDeliverables = prev.deliverables.map(d =>
                d.id === id ? { ...d, [field]: value } : d
            );
            return { ...prev, deliverables: newDeliverables };
        });
    };

    const updateTeamRole = (userId: string, newRole: any) => {
        markDirty();
        setProject(prev => {
            if (!prev) return null;
            const newTeam = prev.team.map(u =>
                u.id === userId ? { ...u, role: newRole } : u
            );
            return { ...prev, team: newTeam };
        });
    };

    const confirmRemoveTeamMember = (userId: string) => {
        markDirty();
        setProject(prev => {
            if (!prev) return null;
            return { ...prev, team: prev.team.filter(u => u.id !== userId) };
        });
        setDeleteConfirm(null);
    };

    const addTeamMember = () => {
        // Mock adding a random member not already in team
        const available = TEAM_MEMBERS.filter(m => !project.team.find(t => t.id === m.id));
        if (available.length > 0) {
            markDirty();
            setProject(prev => {
                if (!prev) return null;
                return { ...prev, team: [...prev.team, available[0]] };
            });
        } else {
            addToast({ title: "No Members Available", description: "All mock users are already in the team.", variant: "destructive" });
        }
    };

    const confirmRemoveDeliverable = (delId: string) => {
        markDirty();
        setProject(prev => {
            if (!prev) return null;
            return {
                ...prev,
                deliverables: prev.deliverables.filter(d => d.id !== delId)
            };
        });
        setDeleteConfirm(null);
    }

    const addDeliverable = () => {
        markDirty();
        const newDel: any = {
            id: 'd-' + Math.random().toString(36).substr(2, 9),
            title: 'New Deliverable',
            type: 'Video',
            status: 'Draft',
            progress: 0,
            dueDate: new Date().toISOString()
        };
        setProject(prev => {
            if (!prev) return null;
            return { ...prev, deliverables: [...prev.deliverables, newDel] };
        });
    }

    const handleStatusChange = (newStatus: ProjectStatus) => {
        const validation = validateProjectStatusTransition(project.status, newStatus);

        if (!validation.isValid) {
            addToast({
                title: "Invalid Transition",
                description: validation.error,
                variant: "destructive"
            });
            return;
        }

        updateGeneral('status', newStatus);

        // Mock Notifications
        addToast({
            title: "Status Updated",
            description: `Project status changed to ${newStatus}. Team notified.`,
            variant: "default"
        });
    };

    const updateGeneral = (field: keyof Project, value: any) => {
        markDirty();
        setProject(prev => prev ? { ...prev, [field]: value } : null);
    };

    // Filter and Sort Team
    const filteredTeam = project.team.filter(user =>
        user.name.toLowerCase().includes(teamFilter.toLowerCase()) ||
        user.email?.toLowerCase().includes(teamFilter.toLowerCase())
    );

    const sortedTeam = [...filteredTeam].sort((a, b) => {
        const aValue = a[teamSort.key as keyof User] || '';
        const bValue = b[teamSort.key as keyof User] || '';

        if (aValue < bValue) return teamSort.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return teamSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (key: keyof User | 'role') => {
        setTeamSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    return (
        <div className="max-w-[1400px] mx-auto pb-20 space-y-8 animate-in fade-in duration-500">
            {/* Delete Project Dialog */}
            <Dialog open={showDeleteProjectDialog} onOpenChange={(open) => { setShowDeleteProjectDialog(open); if (!open) setDeleteConfirmInput(''); }}>
                <DialogHeader>
                    <CardTitle className="text-destructive">Delete Project Permanently?</CardTitle>
                    <CardDescription>
                        This action <b>cannot be undone</b>. This will permanently delete <b>{project.title}</b> and remove all associated data including tasks, files, and comments.
                    </CardDescription>
                </DialogHeader>
                <div className="py-4 space-y-3">
                    <p className="text-sm text-muted-foreground">
                        To confirm, type the project name: <b className="text-foreground">{project.title}</b>
                    </p>
                    <Input
                        placeholder="Type project name to confirm..."
                        value={deleteConfirmInput}
                        onChange={(e) => setDeleteConfirmInput(e.target.value)}
                        className="font-medium"
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => { setShowDeleteProjectDialog(false); setDeleteConfirmInput(''); }}>Cancel</Button>
                    <Button
                        variant="destructive"
                        onClick={confirmDeleteProject}
                        disabled={deleteConfirmInput !== project.title}
                    >
                        <Trash2 className="h-4 w-4 mr-2" /> Yes, Delete Permanently
                    </Button>
                </DialogFooter>
            </Dialog>

            {/* Archive Project Dialog */}
            <Dialog open={showArchiveDialog} onOpenChange={(open) => { setShowArchiveDialog(open); if (!open) setArchiveConfirmInput(''); }}>
                <DialogHeader>
                    <CardTitle className="text-amber-700">Archive Project?</CardTitle>
                    <CardDescription>
                        This will hide <b>{project.title}</b> from the active project list. The project will be preserved in read-only mode and can be viewed via the "Archived" filter.
                    </CardDescription>
                </DialogHeader>
                <div className="py-4 space-y-3">
                    <p className="text-sm text-muted-foreground">
                        To confirm, type the project name: <b className="text-foreground">{project.title}</b>
                    </p>
                    <Input
                        placeholder="Type project name to confirm..."
                        value={archiveConfirmInput}
                        onChange={(e) => setArchiveConfirmInput(e.target.value)}
                        className="font-medium"
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => { setShowArchiveDialog(false); setArchiveConfirmInput(''); }}>Cancel</Button>
                    <Button
                        variant="default"
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={handleArchiveProject}
                        disabled={archiveConfirmInput !== project.title}
                    >
                        <Archive className="h-4 w-4 mr-2" /> Archive Project
                    </Button>
                </DialogFooter>
            </Dialog>

            {/* Improved Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/60 pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Button variant="ghost" size="sm" className="h-6 px-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => navigate(`/projects/${id}`)}>
                            <ChevronLeft className="h-3 w-3 mr-1" /> Back to Project
                        </Button>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
                        <div className="h-6 w-px bg-border mx-2 hidden sm:block"></div>
                        <span className="text-lg text-muted-foreground font-medium hidden sm:block">{project.title}</span>
                    </div>
                </div>

                {/* Actions Area */}
                <div className="flex items-center gap-4 bg-card p-2 pr-2.5 rounded-2xl border border-border shadow-sm">
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                        isDirty ? "bg-amber-50 text-amber-700" : "bg-zinc-50 text-zinc-500"
                    )}>
                        <div className={cn("h-1.5 w-1.5 rounded-full", isDirty ? "bg-amber-500 animate-pulse" : "bg-zinc-300")} />
                        {isDirty ? 'Unsaved Changes' : 'Up to date'}
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={isLoading || !isDirty || isArchived}
                        className={cn("shadow-sm transition-all h-9 rounded-xl px-5 font-semibold", isDirty ? "shadow-primary/20" : "")}
                    >
                        {isArchived ? 'Archived (Read-Only)' : isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                {/* Visual Sidebar */}
                <aside className="lg:col-span-3 lg:sticky lg:top-6 flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-2 lg:gap-0 pb-2 lg:pb-0" role="tablist" aria-orientation="vertical">
                    <div className="space-y-6 w-full min-w-[200px]">
                        <div>
                            <div className="px-1 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                Configuration
                            </div>
                            <nav className="space-y-1">
                                <SettingsNav
                                    active={activeTab === 'general'}
                                    onClick={() => setActiveTab('general')}
                                    icon={Layout}
                                    description="Basics & Identity"
                                >
                                    General
                                </SettingsNav>
                                <SettingsNav
                                    active={activeTab === 'deliverables'}
                                    onClick={() => setActiveTab('deliverables')}
                                    icon={Layers}
                                    description="Outputs & Assets"
                                >
                                    Deliverables
                                </SettingsNav>
                                <SettingsNav
                                    active={activeTab === 'team'}
                                    onClick={() => setActiveTab('team')}
                                    icon={Users}
                                    description="Members & Roles"
                                >
                                    Team
                                </SettingsNav>
                                <SettingsNav
                                    active={activeTab === 'revisions'}
                                    onClick={() => setActiveTab('revisions')}
                                    icon={Clock}
                                    description="Limits & History"
                                >
                                    Revisions
                                </SettingsNav>
                            </nav>
                        </div>

                        <div className="hidden lg:block">
                            <div className="px-1 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                Advanced
                            </div>
                            <nav className="space-y-1">
                                <SettingsNav
                                    active={activeTab === 'danger'}
                                    onClick={() => setActiveTab('danger')}
                                    icon={ShieldAlert}
                                    variant="destructive"
                                    description="Archive or Delete"
                                >
                                    Danger Zone
                                </SettingsNav>
                            </nav>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="lg:col-span-9 space-y-8 min-h-[500px]">
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            {/* Identity Card */}
                            <Card className="border-border/60 shadow-sm">
                                <CardHeader>
                                    <CardTitle>Project Identity</CardTitle>
                                    <CardDescription>Core information used to identify this project across the workspace.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-foreground/80" htmlFor="project-title">Project Title</Label>
                                            <Input
                                                id="project-title"
                                                value={project.title}
                                                onChange={e => updateGeneral('title', e.target.value)}
                                                className="font-medium text-lg h-11"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-foreground/80" htmlFor="client-name">Client Name</Label>
                                                <Input id="client-name" value={project.client} onChange={e => updateGeneral('client', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-foreground/80" htmlFor="website">Website</Label>
                                                <Input id="website" value={project.website || ''} placeholder="e.g. acme.com" onChange={e => updateGeneral('website', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-foreground/80" htmlFor="description">Description</Label>
                                            <Textarea
                                                id="description"
                                                value={project.description}
                                                onChange={e => updateGeneral('description', e.target.value)}
                                                rows={4}
                                                className="resize-none"
                                            />
                                            <p className="text-xs text-muted-foreground text-right">Visible to all team members.</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Logistics Card */}
                            <Card className="border-border/60 shadow-sm">
                                <CardHeader>
                                    <CardTitle>Logistics & Status</CardTitle>
                                    <CardDescription>Timeline and current operational state.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-foreground/80">Current Status</Label>
                                            <Select
                                                value={project.status}
                                                options={[
                                                    { label: 'Active', value: 'Active' },
                                                    { label: 'In Review', value: 'In Review' },
                                                    { label: 'Completed', value: 'Completed' },
                                                    { label: 'On Hold', value: 'On Hold' },
                                                ]}
                                                onValueChange={(v) => handleStatusChange(v as ProjectStatus)}
                                                className="w-full"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-foreground/80" htmlFor="start-date">Start Date</Label>
                                            <Input id="start-date" type="date" value={project.startDate.split('T')[0]} onChange={e => updateGeneral('startDate', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-foreground/80" htmlFor="due-date">Due Date</Label>
                                            <Input id="due-date" type="date" value={project.dueDate.split('T')[0]} onChange={e => updateGeneral('dueDate', e.target.value)} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'deliverables' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            {/* Stats Bar */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col">
                                    <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">Total Items</span>
                                    <span className="text-2xl font-bold">{project.deliverables.length}</span>
                                </div>
                                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col">
                                    <span className="text-emerald-600/80 text-xs font-medium uppercase tracking-wider mb-1">Approved</span>
                                    <span className="text-2xl font-bold text-emerald-700">{project.deliverables.filter(d => d.status === 'Approved').length}</span>
                                </div>
                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col">
                                    <span className="text-blue-600/80 text-xs font-medium uppercase tracking-wider mb-1">Pending</span>
                                    <span className="text-2xl font-bold text-blue-700">{project.deliverables.filter(d => d.status !== 'Approved').length}</span>
                                </div>
                            </div>

                            <Card className="border-border/60 shadow-sm overflow-hidden">
                                <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 bg-muted/20 pb-4">
                                    <div>
                                        <CardTitle>Deliverables List</CardTitle>
                                        <CardDescription>Manage the expected outputs for this project.</CardDescription>
                                    </div>
                                    <Button size="sm" onClick={addDeliverable} className="gap-2 shadow-sm" aria-label="Add Deliverable">
                                        <Plus className="h-4 w-4" /> Add Deliverable
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-zinc-50 font-medium text-muted-foreground border-b border-border">
                                                <tr>
                                                    <th className="px-6 py-4 w-[40%] text-left align-middle text-xs uppercase tracking-wider">Title</th>
                                                    <th className="px-6 py-4 w-[25%] text-left align-middle text-xs uppercase tracking-wider">Type</th>
                                                    <th className="px-6 py-4 w-[25%] text-left align-middle text-xs uppercase tracking-wider">Status</th>
                                                    <th className="px-6 py-4 w-[10%] text-right align-middle text-xs uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/60 bg-white">
                                                {project.deliverables.map((del) => (
                                                    <tr key={del.id} className="group hover:bg-zinc-50 transition-colors">
                                                        <td className="px-6 py-3 align-middle">
                                                            <Input
                                                                aria-label="Deliverable Title"
                                                                value={del.title}
                                                                onChange={(e) => updateDeliverable(del.id, 'title', e.target.value)}
                                                                className="border-transparent shadow-none focus-visible:ring-0 focus-visible:border-primary focus-visible:bg-white bg-transparent hover:bg-white/50 transition-all h-9 px-2 -ml-2 font-medium text-foreground rounded-md"
                                                                placeholder="Deliverable Title"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-3 align-middle">
                                                            <Select
                                                                value={del.type}
                                                                onValueChange={(v) => updateDeliverable(del.id, 'type', v)}
                                                                options={[
                                                                    { label: 'Video', value: 'Video' },
                                                                    { label: 'Image', value: 'Image' },
                                                                    { label: 'Document', value: 'Document' }
                                                                ]}
                                                                triggerClassName="border-transparent shadow-none bg-transparent hover:bg-white/80 focus:ring-1 h-9 font-normal px-2 -ml-2"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-3 align-middle relative z-10">
                                                            <Select
                                                                value={del.status}
                                                                onValueChange={(v) => updateDeliverable(del.id, 'status', v)}
                                                                options={[
                                                                    { label: 'Draft', value: 'Draft' },
                                                                    { label: 'In Review', value: 'In Review' },
                                                                    { label: 'Approved', value: 'Approved' }
                                                                ]}
                                                                triggerClassName={cn(
                                                                    "h-7 border-none shadow-none text-xs w-auto px-3 rounded-full font-medium transition-colors inline-flex",
                                                                    del.status === 'Approved' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 ring-1 ring-emerald-500/20" :
                                                                        del.status === 'In Review' ? "bg-amber-100 text-amber-700 hover:bg-amber-200 ring-1 ring-amber-500/20" :
                                                                            "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 ring-1 ring-zinc-500/20"
                                                                )}
                                                            />
                                                        </td>
                                                        <td className="px-6 py-3 text-right align-middle relative z-20">
                                                            {deleteConfirm?.type === 'deliverable' && deleteConfirm.id === del.id ? (
                                                                <div className="flex items-center justify-end gap-1 animate-in slide-in-from-right-2 fade-in">
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="icon"
                                                                        className="h-8 w-8 shadow-sm"
                                                                        onClick={() => confirmRemoveDeliverable(del.id)}
                                                                    >
                                                                        <Check className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-8 w-8 bg-white"
                                                                        onClick={() => setDeleteConfirm(null)}
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setDeleteConfirm({ type: 'deliverable', id: del.id });
                                                                    }}
                                                                    className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                                                    title="Delete Deliverable"
                                                                    aria-label="Delete Deliverable"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {project.deliverables.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4}>
                                                            <EmptyState
                                                                title="No deliverables"
                                                                description="Manage the expected outputs for this project here."
                                                                icon={Layers}
                                                                action={<Button variant="link" onClick={addDeliverable}>Create one now</Button>}
                                                                className="py-8"
                                                            />
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'team' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            <Card className="border-border/60 shadow-sm overflow-hidden">
                                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 bg-muted/20 pb-4">
                                    <div>
                                        <CardTitle>Team Management</CardTitle>
                                        <CardDescription>Control who has access to this project.</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <div className="relative flex-1 sm:w-64">
                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search team..."
                                                value={teamFilter}
                                                onChange={(e) => setTeamFilter(e.target.value)}
                                                className="pl-9 h-9 bg-white"
                                            />
                                        </div>
                                        <Button size="sm" className="gap-2 shrink-0 h-9 shadow-sm" onClick={addTeamMember} aria-label="Add Member">
                                            <Plus className="h-4 w-4" /> Add Member
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-zinc-50 font-medium text-muted-foreground border-b border-border">
                                                <tr>
                                                    <th scope="col" className="px-6 py-4 cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => handleSort('name')}>
                                                        <div className="flex items-center gap-1 text-xs uppercase tracking-wider">
                                                            Member {teamSort.key === 'name' && <ArrowUpDown className="h-3 w-3" />}
                                                        </div>
                                                    </th>
                                                    <th scope="col" className="px-6 py-4 cursor-pointer hover:bg-zinc-100 transition-colors" onClick={() => handleSort('role')}>
                                                        <div className="flex items-center gap-1 text-xs uppercase tracking-wider">
                                                            Role {teamSort.key === 'role' && <ArrowUpDown className="h-3 w-3" />}
                                                        </div>
                                                    </th>
                                                    <th scope="col" className="px-6 py-4 hidden sm:table-cell text-xs uppercase tracking-wider">Email</th>
                                                    <th scope="col" className="px-6 py-4 text-right text-xs uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/60 bg-white">
                                                {sortedTeam.map((user) => (
                                                    <tr key={user.id} className="group hover:bg-zinc-50 transition-colors">
                                                        <td className="px-6 py-3 align-middle">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar src={user.avatar} fallback={user.name[0]} className="h-9 w-9 ring-2 ring-white shadow-sm" />
                                                                <div>
                                                                    <div className="font-medium flex items-center gap-2 text-foreground">
                                                                        {user.name}
                                                                        {user.role === 'project_manager' && (
                                                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 gap-1 bg-amber-50 text-amber-700 border border-amber-200/60 shadow-none hover:bg-amber-100">
                                                                                <Crown className="h-3 w-3" /> Primary
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground sm:hidden">{user.email}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3 align-middle">
                                                            <Select
                                                                value={user.role}
                                                                onValueChange={(v) => updateTeamRole(user.id, v)}
                                                                options={[
                                                                    { label: 'Super Admin', value: 'super_admin' },
                                                                    { label: 'Motionify Support', value: 'project_manager' },
                                                                    { label: 'Team Member', value: 'team_member' },
                                                                    { label: 'Client', value: 'client' },
                                                                ]}
                                                                className="w-40"
                                                                triggerClassName="h-8 text-xs w-40 bg-white border-zinc-200"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-3 align-middle text-muted-foreground hidden sm:table-cell font-mono text-xs">
                                                            {user.email}
                                                        </td>
                                                        <td className="px-6 py-3 align-middle text-right">
                                                            {deleteConfirm?.type === 'team' && deleteConfirm.id === user.id ? (
                                                                <div className="flex items-center justify-end gap-1 animate-in slide-in-from-right-2 fade-in">
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="icon"
                                                                        className="h-8 w-8 shadow-sm"
                                                                        onClick={() => confirmRemoveTeamMember(user.id)}
                                                                    >
                                                                        <Check className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        className="h-8 w-8 bg-white"
                                                                        onClick={() => setDeleteConfirm(null)}
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setDeleteConfirm({ type: 'team', id: user.id });
                                                                    }}
                                                                    className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                                                    aria-label="Remove Team Member"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {sortedTeam.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4}>
                                                            <EmptyState
                                                                title="No team members"
                                                                description="Add team members to collaborate on this project."
                                                                icon={Users}
                                                                action={<Button variant="outline" size="sm" onClick={addTeamMember}>Add Member</Button>}
                                                                className="py-8"
                                                            />
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'revisions' && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                            {/* Usage Stats - Visual */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="bg-gradient-to-br from-white to-zinc-50 border-border/60 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-3 opacity-10">
                                        <FileBox className="w-16 h-16" />
                                    </div>
                                    <CardContent className="p-6 flex flex-col items-center justify-center text-center relative z-10">
                                        <span className="text-4xl font-bold text-foreground">{project.revisionCount}</span>
                                        <span className="text-sm text-muted-foreground font-medium mt-1 uppercase tracking-wider text-xs">Revisions Used</span>
                                    </CardContent>
                                </Card>
                                <Card className="bg-gradient-to-br from-white to-zinc-50 border-border/60 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-3 opacity-10">
                                        <Layers className="w-16 h-16" />
                                    </div>
                                    <CardContent className="p-6 flex flex-col items-center justify-center text-center relative z-10">
                                        <span className="text-4xl font-bold text-foreground">{project.maxRevisions}</span>
                                        <span className="text-sm text-muted-foreground font-medium mt-1 uppercase tracking-wider text-xs">Total Included</span>
                                    </CardContent>
                                </Card>
                                <Card className={cn("border-l-4 shadow-sm", project.maxRevisions - project.revisionCount < 0 ? "bg-red-50 border-red-500" : "bg-emerald-50 border-emerald-500")}>
                                    <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                                        <span className={cn("text-4xl font-bold", project.maxRevisions - project.revisionCount < 0 ? "text-red-600" : "text-emerald-600")}>
                                            {project.maxRevisions - project.revisionCount}
                                        </span>
                                        <span className={cn("text-sm font-medium mt-1 uppercase tracking-wider text-xs", project.maxRevisions - project.revisionCount < 0 ? "text-red-600/80" : "text-emerald-600/80")}>
                                            Remaining
                                        </span>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card className="border-border/60 shadow-sm">
                                <CardHeader className="border-b border-border/40 pb-4">
                                    <CardTitle>Revision Controls</CardTitle>
                                    <CardDescription>Adjust limits or manually log usage events.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-8 pt-6">
                                    <div className="grid md:grid-cols-2 gap-10">
                                        {/* Max Revisions */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <Label className="text-base font-semibold">Total Limit</Label>
                                                    <p className="text-xs text-muted-foreground">Revisions included in budget.</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => updateGeneral('maxRevisions', Math.max(0, project.maxRevisions - 1))} aria-label="Decrease Max Revisions">
                                                        <MinusCircle className="h-4 w-4" />
                                                    </Button>
                                                    <span className="w-8 text-center font-mono font-bold text-lg">{project.maxRevisions}</span>
                                                    <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => updateGeneral('maxRevisions', project.maxRevisions + 1)} aria-label="Increase Max Revisions">
                                                        <PlusCircle className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <Slider value={[project.maxRevisions]} max={20} step={1} onValueChange={(v) => updateGeneral('maxRevisions', v[0])} />
                                        </div>

                                        {/* Usage Count */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <Label className="text-base font-semibold">Manual Adjustment</Label>
                                                    <p className="text-xs text-muted-foreground">Override tracked usage count.</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => updateGeneral('revisionCount', Math.max(0, project.revisionCount - 1))} aria-label="Decrease Usage">
                                                        <MinusCircle className="h-4 w-4" />
                                                    </Button>
                                                    <span className="w-8 text-center font-mono font-bold text-lg">{project.revisionCount}</span>
                                                    <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => updateGeneral('revisionCount', project.revisionCount + 1)} aria-label="Increase Usage">
                                                        <PlusCircle className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* History Mock */}
                            <Card className="border-border/60 shadow-sm">
                                <CardHeader className="border-b border-border/40 pb-4">
                                    <div className="flex items-center gap-2">
                                        <History className="h-5 w-5 text-muted-foreground" />
                                        <CardTitle>History Log</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-border/60">
                                        {[
                                            { action: 'Limit Increased (+1)', user: 'Alex Rivera', date: '2 hours ago', icon: PlusCircle, color: 'text-emerald-600 bg-emerald-50' },
                                            { action: 'Revision Used (Deliverable #2)', user: 'Mike Ross', date: '1 day ago', icon: CheckCircle2, color: 'text-blue-600 bg-blue-50' },
                                            { action: 'Revision Used (Deliverable #1)', user: 'Sarah Chen', date: '3 days ago', icon: CheckCircle2, color: 'text-blue-600 bg-blue-50' },
                                            { action: 'Initial Limit Set (3)', user: 'System', date: '1 week ago', icon: Layout, color: 'text-zinc-600 bg-zinc-50' },
                                        ].map((log, i) => (
                                            <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", log.color)}>
                                                        <log.icon className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">{log.action}</p>
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                            by {log.user}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-mono text-muted-foreground bg-zinc-100 px-2 py-1 rounded">{log.date}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'danger' && (
                        <Card className="border-red-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                            <CardHeader className="bg-red-50/30 border-b border-red-100 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                                        <ShieldAlert className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-red-900">Danger Zone</CardTitle>
                                        <CardDescription className="text-red-700/80">Irreversible actions. Proceed with caution.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="divide-y divide-red-100/50 p-0">
                                <div className="flex items-center justify-between p-6 hover:bg-red-50/10 transition-colors">
                                    <div className="space-y-1">
                                        <h4 className="font-medium text-foreground">Archive Project</h4>
                                        <p className="text-sm text-muted-foreground max-w-md">
                                            {isArchived
                                                ? "This project is already archived."
                                                : "Hide this project from the active list. It can be restored later from the archive."}
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowArchiveDialog(true)}
                                        disabled={isArchived}
                                        className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 hover:border-red-300 disabled:opacity-50"
                                    >
                                        <Archive className="h-4 w-4 mr-2" /> {isArchived ? 'Already Archived' : 'Archive Project'}
                                    </Button>
                                </div>
                                {isSuperAdmin && (
                                    <div className="flex items-center justify-between p-6 bg-red-50/20">
                                        <div className="space-y-1">
                                            <h4 className="font-medium text-red-900">Delete Project</h4>
                                            <p className="text-sm text-red-700/70 max-w-md">
                                                {isArchived
                                                    ? "Permanently remove this archived project and all its data. This action cannot be undone."
                                                    : "Only archived projects can be deleted. Archive this project first."}
                                            </p>
                                        </div>
                                        <Button
                                            variant="destructive"
                                            className="bg-red-600 hover:bg-red-700 shadow-sm shadow-red-200"
                                            onClick={() => setShowDeleteProjectDialog(true)}
                                            disabled={!isArchived}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" /> Delete Project
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </main>
            </div>
        </div>
    );
};