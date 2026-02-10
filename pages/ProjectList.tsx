import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dbStatusToDisplay } from '../utils/projectStatusMapping';
import {
    MoreVertical,
    MoreHorizontal,
    LayoutGrid,
    List,
    Search,
    Plus,
    Clock,
    FolderOpen,
    FilterX,
    Clapperboard,
    RotateCcw,
} from 'lucide-react';
import {
    Button,
    Badge,
    Input,
    Select,
    DropdownMenu,
    DropdownMenuItem,
    Separator,
    ClientLogo,
    EmptyState,
    cn
} from '../components/ui/design-system';
import { ErrorState } from '../components/ui/ErrorState';
import { ProjectStatus, Project } from '../types';
import { useKeyboardShortcuts, KeyboardShortcut } from '../hooks/useKeyboardShortcuts';
import { useAuthContext } from '../contexts/AuthContext';

export const ProjectList = () => {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [filter, setFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedIndex, setSelectedIndex] = useState<number>(-1);
    const [apiProjects, setApiProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const navigate = useNavigate();
    const selectedRef = useRef<HTMLDivElement>(null);
    const { user } = useAuthContext();

    // Fetch real projects from API
    const fetchProjects = async () => {
        if (!user?.id) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setFetchError(null);

        try {
            const response = await fetch(`/api/projects?userId=${user.id}`, {
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                // Transform API response to match Project type
                const transformed = data.map((p: any) => ({
                    id: p.id,
                    title: p.name || p.project_number || `Project ${p.id.slice(0, 8)}`,
                    client: p.client_name || p.client_company || 'Client',
                    thumbnail: '',
                    status: dbStatusToDisplay(p.status),
                    dueDate: p.due_date || p.created_at || new Date().toISOString(),
                    startDate: p.start_date || p.created_at || new Date().toISOString(),
                    progress: 0,
                    description: '',
                    tasks: [],
                    team: [],
                    budget: 0,
                    deliverables: [],
                    files: [],
                    deliverablesCount: p.deliverables_count || 0,
                    revisionCount: p.revisions_used || 0,
                    maxRevisions: p.total_revisions_allowed || 2,
                    activityLog: [],
                }));
                setApiProjects(transformed);
            } else {
                setFetchError('Failed to load projects. Please try again.');
            }
        } catch (error) {
            console.error('Failed to fetch projects:', error);
            setFetchError(error instanceof Error ? error.message : 'Failed to load projects');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, [user?.id]);

    // Use API projects only (no more mock data)
    const allProjects = apiProjects;

    const getStatusVariant = (status: ProjectStatus) => {
        switch (status) {
            case 'Active': return 'default';
            case 'Completed': return 'success';
            case 'In Review': return 'warning';
            case 'On Hold': return 'destructive';
            case 'Archived': return 'outline';
            default: return 'outline';
        }
    };

    const filteredProjects = allProjects.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(filter.toLowerCase()) ||
            p.client.toLowerCase().includes(filter.toLowerCase());
        // Hide archived from "all" filter, only show when explicitly selected
        const matchesStatus = statusFilter === 'all'
            ? p.status !== 'Archived'
            : p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Reset selection when filter changes
    useEffect(() => {
        setSelectedIndex(-1);
    }, [filter, statusFilter]);

    // Scroll selected item into view
    useEffect(() => {
        if (selectedIndex >= 0 && selectedRef.current) {
            selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [selectedIndex]);

    // J/K Navigation shortcuts
    const listShortcuts: KeyboardShortcut[] = [
        {
            key: 'j',
            description: 'Select next project',
            action: () => {
                setSelectedIndex(prev =>
                    prev < filteredProjects.length - 1 ? prev + 1 : prev
                );
            },
            category: 'selection',
            enabled: filteredProjects.length > 0,
        },
        {
            key: 'k',
            description: 'Select previous project',
            action: () => {
                setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
            },
            category: 'selection',
            enabled: filteredProjects.length > 0,
        },
        {
            key: 'Enter',
            description: 'Open selected project',
            action: () => {
                if (selectedIndex >= 0 && selectedIndex < filteredProjects.length) {
                    navigate(`/projects/${filteredProjects[selectedIndex].id}`);
                }
            },
            category: 'actions',
            enabled: selectedIndex >= 0,
        },
        {
            key: 'x',
            description: 'Clear selection',
            action: () => setSelectedIndex(-1),
            category: 'selection',
            enabled: selectedIndex >= 0,
        },
    ];

    useKeyboardShortcuts({ shortcuts: listShortcuts });

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-5 relative z-50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Projects</h2>
                        <p className="text-sm text-muted-foreground mt-1">{filteredProjects.length} production{filteredProjects.length !== 1 ? 's' : ''}</p>
                    </div>
                    <Link to="/projects/new">
                        <Button className="gap-2 h-9 px-4" aria-label="Start New Production">
                            <Plus className="h-4 w-4" />
                            New Project
                        </Button>
                    </Link>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col md:flex-row gap-2 items-center justify-between">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search projects..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="pl-9 h-9 bg-background border-border rounded-lg"
                            />
                        </div>
                        <Select
                            placeholder="Status"
                            options={[
                                { label: 'All Statuses', value: 'all' },
                                { label: 'Active', value: 'Active' },
                                { label: 'In Review', value: 'In Review' },
                                { label: 'Completed', value: 'Completed' },
                                { label: 'On Hold', value: 'On Hold' },
                                { label: 'Archived', value: 'Archived' },
                            ]}
                            value={statusFilter}
                            onValueChange={setStatusFilter}
                            className="w-full md:w-44"
                            triggerClassName="h-9 rounded-lg"
                        />
                    </div>

                    <div className="flex items-center gap-1 w-full md:w-auto justify-end">
                        <div className="flex items-center border border-border rounded-lg p-0.5">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn("p-1.5 rounded-md transition-colors", viewMode === 'grid' ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}
                                aria-label="Grid View"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn("p-1.5 rounded-md transition-colors", viewMode === 'list' ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}
                                aria-label="List View"
                            >
                                <List className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                </div>
            ) : fetchError ? (
                <ErrorState error={fetchError} onRetry={fetchProjects} />
            ) : allProjects.length === 0 ? (
                <EmptyState
                    title="Your canvas is blank"
                    description="Ready to create something amazing? Start your first production."
                    icon={FolderOpen}
                    action={
                        <Link to="/projects/new">
                            <Button variant="outline" className="mt-4">Start a Production</Button>
                        </Link>
                    }
                />
            ) : filteredProjects.length === 0 ? (
                <EmptyState
                    title="We couldn't find a match"
                    description="Try different keywords or clear your filters to see all productions."
                    icon={FilterX}
                    action={
                        <Button variant="link" onClick={() => { setFilter(''); setStatusFilter('all'); }}>
                            Clear Filters
                        </Button>
                    }
                />
            ) : (
                <>
                    {/* Grid View */}
                    {viewMode === 'grid' && (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {filteredProjects.map((project, idx) => (
                                <div
                                    key={project.id}
                                    ref={selectedIndex === idx ? selectedRef : null}
                                    className={cn(
                                        "transition-all duration-150",
                                        selectedIndex === idx && "ring-2 ring-primary ring-offset-2 rounded-lg"
                                    )}
                                >
                                    <ProjectGridCard project={project} getStatusVariant={getStatusVariant} navigate={navigate} />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* List View */}
                    {viewMode === 'list' && (
                        <div className="space-y-2">
                            {filteredProjects.map((project, idx) => (
                                <div
                                    key={project.id}
                                    ref={selectedIndex === idx ? selectedRef : null}
                                    className={cn(
                                        "transition-all duration-150",
                                        selectedIndex === idx && "ring-2 ring-primary ring-offset-2 rounded-lg"
                                    )}
                                >
                                    <Link
                                        to={`/projects/${project.id}`}
                                        className="group flex bg-card rounded-lg border border-border hover:border-foreground/15 transition-colors overflow-hidden"
                                    >
                                        {/* Status stripe */}
                                        <div className={cn("w-1 shrink-0 rounded-l-lg", getStatusColor(project.status))} title={`Status: ${project.status}`} />

                                        <div className="flex-1 flex items-center gap-4 px-4 py-3 min-w-0">
                                            {/* Identity */}
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <ClientLogo
                                                    clientName={project.client}
                                                    website={project.website}
                                                    className="h-8 w-8 rounded-lg border border-border shrink-0"
                                                />
                                                <div className="min-w-0">
                                                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate leading-snug">
                                                        {project.title}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground truncate">{project.client}</p>
                                                </div>
                                            </div>

                                            {/* Metadata — inline, right-aligned */}
                                            <div className="hidden sm:flex items-center gap-5 shrink-0 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1.5 tabular-nums" title={`${project.deliverablesCount} deliverable${project.deliverablesCount !== 1 ? 's' : ''}`}>
                                                    <Clapperboard className="h-3.5 w-3.5 text-muted-foreground/50" />
                                                    <span>{project.deliverablesCount}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 tabular-nums" title={`${project.revisionCount} of ${project.maxRevisions} revisions used`}>
                                                    <RotateCcw className="h-3.5 w-3.5 text-muted-foreground/50" />
                                                    <span>{project.revisionCount}/{project.maxRevisions}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 w-[5.5rem]" title={`Due: ${new Date(project.dueDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`}>
                                                    <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />
                                                    <span>{new Date(project.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                </div>
                                                <Badge variant={getStatusVariant(project.status)} className="w-[5.5rem] justify-center">{project.status}</Badge>
                                            </div>

                                            {/* Actions */}
                                            <DropdownMenu
                                                trigger={
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                                        aria-label="Project Actions"
                                                        onClick={(e) => e.preventDefault()}
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                }
                                            >
                                                <DropdownMenuItem onClick={(e) => { e.preventDefault(); navigate(`/projects/${project.id}`); }}>View Details</DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e) => { e.preventDefault(); navigate(`/projects/${project.id}/settings`); }}>Edit Project</DropdownMenuItem>
                                                <Separator className="my-1" />
                                                <DropdownMenuItem onClick={(e) => e.preventDefault()} className="text-destructive">Archive</DropdownMenuItem>
                                            </DropdownMenu>
                                        </div>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
        case 'Active': return 'bg-primary';
        case 'Completed': return 'bg-teal-500';
        case 'In Review': return 'bg-amber-500';
        case 'On Hold': return 'bg-red-400';
        case 'Archived': return 'bg-stone-300';
        default: return 'bg-stone-300';
    }
};

const ProjectGridCard: React.FC<{ project: Project, getStatusVariant: any, navigate: any }> = ({ project, getStatusVariant, navigate }) => (
    <Link
        to={`/projects/${project.id}`}
        className="group block bg-card rounded-lg border border-border hover:border-foreground/15 transition-colors overflow-hidden"
    >
        <div className="flex">
            {/* Status stripe — the colored tab on a production folder */}
            <div className={cn("w-1 shrink-0 rounded-l-lg", getStatusColor(project.status))} title={`Status: ${project.status}`} />

            <div className="flex-1 p-4 min-w-0">
                {/* Identity row */}
                <div className="flex items-start gap-3">
                    <ClientLogo
                        clientName={project.client}
                        website={project.website}
                        className="h-9 w-9 rounded-lg border border-border shrink-0 mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                        <h3 className="text-[15px] font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 leading-snug">
                            {project.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{project.client}</p>
                    </div>
                    <DropdownMenu
                        trigger={
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 -mr-1 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Project Options"
                                onClick={(e) => e.preventDefault()}
                            >
                                <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                        }
                    >
                        <DropdownMenuItem onClick={(e) => { e.preventDefault(); navigate(`/projects/${project.id}/settings`); }}>Edit Project</DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.preventDefault(); navigate(`/projects/${project.id}/settings`); }}>Manage Team</DropdownMenuItem>
                    </DropdownMenu>
                </div>

                {/* Metadata — labeled, scannable */}
                <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-border">
                    <div title={`${project.deliverablesCount} deliverable${project.deliverablesCount !== 1 ? 's' : ''}`}>
                        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Deliverables</div>
                        <div className="text-sm font-semibold text-foreground tabular-nums mt-0.5 flex items-center gap-1.5">
                            <Clapperboard className="h-3.5 w-3.5 text-muted-foreground/60" />
                            {project.deliverablesCount}
                        </div>
                    </div>
                    <div title={`${project.revisionCount} of ${project.maxRevisions} revisions used`}>
                        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Revisions</div>
                        <div className="text-sm font-semibold text-foreground tabular-nums mt-0.5 flex items-center gap-1.5">
                            <RotateCcw className="h-3.5 w-3.5 text-muted-foreground/60" />
                            {project.revisionCount}/{project.maxRevisions}
                        </div>
                    </div>
                    <div title={`Due: ${new Date(project.dueDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`}>
                        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Due</div>
                        <div className="text-sm font-semibold text-foreground mt-0.5 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
                            {new Date(project.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Link>
);