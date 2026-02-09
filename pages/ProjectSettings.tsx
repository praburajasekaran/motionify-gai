import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { validateProjectStatusTransition } from '../utils/projectStateTransitions';
import {
    ChevronLeft, Trash2, Archive,
    Layout, ShieldAlert
} from 'lucide-react';
import {
    Button, Input, Label, Textarea, Select,
    Card, CardContent, CardHeader, CardTitle, CardDescription,
    cn, Dialog, DialogHeader, DialogFooter, useToast,
    ErrorState
} from '../components/ui/design-system';
import { Project, ProjectStatus } from '../types';

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
                    : "bg-card text-primary border-border shadow-sm"
                : variant === 'destructive'
                    ? "text-muted-foreground hover:bg-red-50/50 hover:text-red-600"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
    >
        <div className={cn("mt-0.5 p-1.5 rounded-lg transition-colors",
            active
                ? variant === 'destructive' ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"
                : "bg-transparent text-muted-foreground group-hover:text-foreground group-hover:bg-muted/50"
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

    const [showDeleteProjectDialog, setShowDeleteProjectDialog] = useState(false);

    // Archive Confirmation State
    const [showArchiveDialog, setShowArchiveDialog] = useState(false);
    const [archiveConfirmInput, setArchiveConfirmInput] = useState('');

    // Delete Confirmation State
    const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

    // Get current user for permission checks
    const { user } = useAuthContext();
    const isSuperAdmin = user?.role === 'super_admin';

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
                        isDirty ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground"
                    )}>
                        <div className={cn("h-1.5 w-1.5 rounded-full", isDirty ? "bg-amber-500 animate-pulse" : "bg-border")} />
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