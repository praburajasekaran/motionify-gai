import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    MoreVertical,
    MoreHorizontal,
    LayoutGrid,
    List,
    Search,
    Plus,
    FileBox,
    AlertCircle,
    Clock,
    FolderOpen,
    FilterX
} from 'lucide-react';
import {
    Card,
    CardContent,
    Button,
    Badge,
    Input,
    Avatar,
    Progress,
    Select,
    DropdownMenu,
    DropdownMenuItem,
    Separator,
    ClientLogo,
    EmptyState,
    cn
} from '../components/ui/design-system';
import { MOCK_PROJECTS } from '../constants';
import { ProjectStatus, Project } from '../types';
import { useKeyboardShortcuts, KeyboardShortcut } from '../hooks/useKeyboardShortcuts';

export const ProjectList = () => {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [filter, setFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedIndex, setSelectedIndex] = useState<number>(-1);
    const navigate = useNavigate();
    const selectedRef = useRef<HTMLDivElement>(null);

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

    const filteredProjects = MOCK_PROJECTS.filter(p => {
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
        <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
            {/* Header Section */}
            <div className="flex flex-col gap-6 animate-fade-in-up relative z-50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-bold tracking-tight text-foreground">Productions in Motion</h2>
                            <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-full">
                                <kbd className="text-[10px] font-semibold">J</kbd>
                                <kbd className="text-[10px] font-semibold">K</kbd>
                                to navigate • Press <kbd className="text-[10px] font-semibold">?</kbd> for all shortcuts
                            </span>
                        </div>
                        <p className="text-muted-foreground mt-1">Your crew's creating amazing work. Let's keep it moving.</p>
                    </div>
                    <Link to="/projects/new">
                        <Button variant="gradient" className="gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 rounded-full px-6 transition-transform hover:scale-105 active:scale-95" aria-label="Start New Production">
                            <Plus className="h-4 w-4" />
                            Start a Production
                        </Button>
                    </Link>
                </div>

                {/* Toolbar - Sticky */}
                <div className="sticky top-2 z-40 flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-2 rounded-2xl border border-zinc-200 shadow-md transition-all">
                    <div className="flex items-center gap-2 w-full md:w-auto px-1 flex-col md:flex-row">
                        <div className="relative w-full md:w-72 group">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Search projects..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="pl-9 bg-white/50 border-zinc-200 focus:bg-white focus:border-primary rounded-full transition-all shadow-sm"
                            />
                        </div>
                        <div className="h-6 w-px bg-zinc-200 mx-2 hidden md:block" />
                        <Select
                            placeholder="Status"
                            options={[
                                { label: 'All Statuses', value: 'all' },
                                { label: 'Active', value: 'Active' },
                                { label: 'In Review', value: 'In Review' },
                                { label: 'Completed', value: 'Completed' },
                                { label: 'On Hold', value: 'On Hold' },
                                { label: '📦 View Archived', value: 'Archived' },
                            ]}
                            value={statusFilter}
                            onValueChange={setStatusFilter}
                            className="w-full md:w-48"
                            triggerClassName="rounded-full bg-white/50 border-zinc-200"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto px-2 justify-end">
                        <div className="flex items-center bg-zinc-100/80 rounded-full p-1 border border-zinc-200">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn("p-2 rounded-full transition-all duration-300", viewMode === 'grid' ? "bg-white shadow-sm text-foreground scale-105" : "text-zinc-400 hover:text-foreground")}
                                aria-label="Grid View"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn("p-2 rounded-full transition-all duration-300", viewMode === 'list' ? "bg-white shadow-sm text-foreground scale-105" : "text-zinc-400 hover:text-foreground")}
                                aria-label="List View"
                            >
                                <List className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            {MOCK_PROJECTS.length === 0 ? (
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
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {filteredProjects.map((project, idx) => (
                                <div
                                    key={project.id}
                                    ref={selectedIndex === idx ? selectedRef : null}
                                    className={cn(
                                        "animate-fade-in-up transition-all duration-200",
                                        selectedIndex === idx && "ring-2 ring-primary ring-offset-4 rounded-2xl"
                                    )}
                                    style={{ animationDelay: `${idx * 100}ms` }}
                                >
                                    <ProjectGridCard project={project} getStatusVariant={getStatusVariant} navigate={navigate} />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* List View */}
                    {viewMode === 'list' && (
                        <div className="rounded-2xl border border-zinc-200/60 bg-white overflow-hidden shadow-sm animate-fade-in-up">
                            <div className="w-full overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-zinc-50 border-b border-zinc-100 text-zinc-500 font-medium">
                                        <tr>
                                            <th scope="col" className="h-12 px-6 align-middle font-semibold uppercase text-[11px] tracking-wider">Project Name</th>
                                            <th scope="col" className="h-12 px-6 align-middle font-semibold uppercase text-[11px] tracking-wider">Status</th>
                                            <th scope="col" className="h-12 px-6 align-middle font-semibold uppercase text-[11px] tracking-wider">Team</th>
                                            <th scope="col" className="h-12 px-6 align-middle font-semibold uppercase text-[11px] tracking-wider">Deliverables</th>
                                            <th scope="col" className="h-12 px-6 align-middle font-semibold uppercase text-[11px] tracking-wider">Due Date</th>
                                            <th scope="col" className="h-12 px-6 align-middle font-medium text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100">
                                        {filteredProjects.map((project, idx) => (
                                            <tr
                                                key={project.id}
                                                ref={selectedIndex === idx ? selectedRef : null}
                                                className={cn(
                                                    "hover:bg-zinc-50/80 transition-all group",
                                                    selectedIndex === idx && "bg-primary/5 ring-2 ring-inset ring-primary/20"
                                                )}
                                            >
                                                <td className="p-6 align-middle">
                                                    <div className="flex items-center gap-4">
                                                        <ClientLogo
                                                            clientName={project.client}
                                                            website={project.website}
                                                            className="h-10 w-10 rounded-xl shadow-sm border border-zinc-100"
                                                        />
                                                        <div>
                                                            <Link to={`/projects/${project.id}`} className="font-semibold text-zinc-900 hover:text-primary transition-colors block">
                                                                {project.title}
                                                            </Link>
                                                            <span className="text-xs text-zinc-500">{project.client}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6 align-middle">
                                                    <Badge variant={getStatusVariant(project.status)}>{project.status}</Badge>
                                                </td>
                                                <td className="p-6 align-middle">
                                                    <div className="flex -space-x-2">
                                                        {project.team.slice(0, 3).map((user) => (
                                                            <Avatar key={user.id} src={user.avatar} fallback={user.name[0]} className="h-8 w-8 border-2 border-white ring-1 ring-zinc-200 transition-transform hover:scale-110 hover:z-10" />
                                                        ))}
                                                        {project.team.length > 3 && (
                                                            <div className="h-8 w-8 rounded-full bg-zinc-100 border-2 border-white flex items-center justify-center text-xs font-medium text-zinc-500">
                                                                +{project.team.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-6 align-middle">
                                                    <div className="flex flex-col gap-1 w-24">
                                                        <div className="flex justify-between text-xs text-zinc-500 mb-0.5">
                                                            <span>{project.progress}%</span>
                                                        </div>
                                                        <Progress value={project.progress} className="h-1.5" />
                                                    </div>
                                                </td>
                                                <td className="p-6 align-middle text-zinc-500">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4" />
                                                        {new Date(project.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </div>
                                                </td>
                                                <td className="p-6 align-middle text-right">
                                                    <DropdownMenu
                                                        trigger={
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Project Actions">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        }
                                                    >
                                                        <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}`)}>View Details</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}/settings`)}>Edit Project</DropdownMenuItem>
                                                        <Separator className="my-1" />
                                                        <DropdownMenuItem className="text-red-600 hover:text-red-700">Archive</DropdownMenuItem>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// Extracted component helper for Calendar icon since it was missing in imports in previous step
const Calendar = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
)

const ProjectGridCard: React.FC<{ project: Project, getStatusVariant: any, navigate: any }> = ({ project, getStatusVariant, navigate }) => (
    <Card hoverable className="group relative overflow-hidden bg-white border-zinc-200 transform-gpu">
        {/* Top Decoration */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

        <CardContent className="p-0">
            <div className="p-7 pb-5">
                <div className="flex justify-between items-start mb-5">
                    <div className="relative">
                        <ClientLogo
                            clientName={project.client}
                            website={project.website}
                            className="h-16 w-16 rounded-2xl ring-1 ring-black/5 shadow-sm group-hover:scale-105 group-hover:shadow-md transition-all duration-300 bg-white"
                        />
                        {project.status === 'Active' && (
                            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 z-10">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
                            </span>
                        )}
                    </div>
                    <DropdownMenu
                        trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-zinc-400 hover:text-zinc-900" aria-label="Project Options">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        }
                    >
                        <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}/settings`)}>Edit Project</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}/settings`)}>Manage Team</DropdownMenuItem>
                    </DropdownMenu>
                </div>

                <div className="space-y-1.5 mb-5">
                    <Link to={`/projects/${project.id}`}>
                        <h3 className="font-bold text-lg text-zinc-900 group-hover:text-primary transition-colors line-clamp-1">
                            {project.title}
                        </h3>
                    </Link>
                    <p className="text-sm text-zinc-500 font-medium">{project.client}</p>
                </div>

                <div className="flex items-center gap-2 mb-6">
                    <Badge variant={getStatusVariant(project.status)} className="px-2.5 py-0.5">{project.status}</Badge>
                    {project.revisionCount > 0 && (
                        <Badge variant="warning" className="gap-1 px-2 border-amber-200 bg-amber-50 text-amber-700">
                            <AlertCircle className="h-3 w-3" />
                            {project.revisionCount} Revisions
                        </Badge>
                    )}
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between text-xs font-semibold text-zinc-500">
                        <span>Progress</span>
                        <span className="text-zinc-900">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} indicatorClassName="bg-gradient-to-r from-primary to-blue-400" />
                </div>
            </div>

            <Separator className="bg-zinc-100" />

            <div className="px-7 py-4 bg-zinc-50/50 flex items-center justify-between group-hover:bg-zinc-50/80 transition-colors">
                <div className="flex items-center gap-5 text-xs text-zinc-500 font-medium">
                    <div className="flex items-center gap-1.5" title="Deliverables">
                        <FileBox className="h-3.5 w-3.5" />
                        {project.deliverablesCount}
                    </div>
                    <div className="flex items-center gap-1.5" title="Due Date">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(project.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                </div>

                <div className="flex -space-x-2">
                    {project.team.slice(0, 3).map((user) => (
                        <Avatar key={user.id} src={user.avatar} fallback={user.name[0]} className="h-6 w-6 border-2 border-white ring-1 ring-zinc-200 transition-transform hover:scale-110 hover:z-10" />
                    ))}
                    {project.team.length > 3 && (
                        <div className="h-6 w-6 rounded-full bg-zinc-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-zinc-500">
                            +{project.team.length - 3}
                        </div>
                    )}
                </div>
            </div>
        </CardContent>
    </Card>
);