
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    ChevronRight,
    Check,
    Plus,
    X,
    GripVertical,
    Users,
    Briefcase,
    Layers,
} from 'lucide-react';
import {
    Card,
    CardContent,
    Button,
    Input,
    Label,
    Textarea,
    Select,
    Avatar,
    Separator,
    cn
} from '../components/ui/design-system';
import { TEAM_MEMBERS } from '../constants';
import { api } from '../lib/api-config';
import { PageHeader } from '../components/ui/PageHeader';
import { ProjectSectionHeader } from '../components/portal/ProjectSectionHeader';
import { formatCurrency } from '../utils/format';

interface ClientUser {
    id: string;
    full_name: string;
    email: string;
}

interface ProposalCandidate {
    id: string;
    inquiry_id?: string;
    inquiryId?: string;
    inquiry_number?: string;
    inquiryNumber?: string;
    client_user_id?: string;
    clientUserId?: string;
    client_full_name?: string;
    client_name?: string;
    clientName?: string;
    client_email?: string;
    company_name?: string;
    companyName?: string;
    project_notes?: string;
    projectNotes?: string;
    description?: string;
    deliverables?: Array<{ id?: string; name?: string; description?: string; estimatedCompletionWeek?: number }> | string;
    total_price?: number;
    totalPrice?: number;
    currency?: 'INR' | 'USD';
    revisions_included?: number;
    revisionsIncluded?: number;
}

interface NormalizedProposalCandidate {
    id: string;
    inquiryId?: string;
    inquiryNumber: string;
    clientUserId: string;
    clientName: string;
    companyName?: string;
    description: string;
    deliverables: Array<{ id?: string; name?: string; description?: string; estimatedCompletionWeek?: number }>;
    totalPrice?: number;
    currency: 'INR' | 'USD';
    revisionsIncluded?: number;
}

const STEPS = [
    { id: 'details', title: 'Details', icon: Briefcase },
    { id: 'deliverables', title: 'Deliverables', icon: Layers },
    { id: 'team', title: 'Team', icon: Users },
    { id: 'review', title: 'Review', icon: Check },
];

export const CreateProject = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Client users fetched from the API
    const [clients, setClients] = useState<ClientUser[]>([]);
    const [clientsLoading, setClientsLoading] = useState(true);
    const [proposalCandidates, setProposalCandidates] = useState<ProposalCandidate[]>([]);
    const [proposalsLoading, setProposalsLoading] = useState(true);
    const [selectedProposalId, setSelectedProposalId] = useState('');

    useEffect(() => {
        api.get('/users-list?role=client&status=active')
            .then(res => {
                if (res.success && Array.isArray(res.data)) {
                    setClients(res.data);
                }
            })
            .finally(() => setClientsLoading(false));
    }, []);

    useEffect(() => {
        api.get('/proposals?projectCreationCandidates=true')
            .then(res => {
                if (res.success && Array.isArray(res.data)) {
                    setProposalCandidates(res.data);
                }
            })
            .finally(() => setProposalsLoading(false));
    }, []);

    // Form State — aligned with createProjectDirectSchema
    const [formData, setFormData] = useState({
        title: '',
        clientUserId: '',
        website: '',
        description: '',
        startDate: '',
        dueDate: '',
        maxRevisions: 2,
        deliverables: [
            { id: '1', title: '' }
        ],
        team: [TEAM_MEMBERS[0].id]
    });

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (validationErrors[field]) {
            setValidationErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const parseDeliverables = (deliverables: ProposalCandidate['deliverables']) => {
        if (!deliverables) return [];
        if (typeof deliverables === 'string') {
            try {
                return JSON.parse(deliverables);
            } catch {
                return [];
            }
        }
        return deliverables;
    };

    const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    const normalizeProposalCandidate = (candidate: ProposalCandidate): NormalizedProposalCandidate => ({
        id: candidate.id,
        inquiryId: candidate.inquiry_id ?? candidate.inquiryId,
        inquiryNumber: candidate.inquiry_number ?? candidate.inquiryNumber ?? candidate.id,
        clientUserId: candidate.client_user_id ?? candidate.clientUserId ?? '',
        clientName: candidate.client_full_name ?? candidate.client_name ?? candidate.clientName ?? 'Client',
        companyName: candidate.company_name ?? candidate.companyName,
        description: stripHtml(candidate.project_notes ?? candidate.projectNotes ?? candidate.description ?? ''),
        deliverables: parseDeliverables(candidate.deliverables),
        totalPrice: candidate.total_price ?? candidate.totalPrice,
        currency: candidate.currency || 'INR',
        revisionsIncluded: candidate.revisions_included ?? candidate.revisionsIncluded,
    });

    const proposalOptions = useMemo(() => [
        { label: proposalsLoading ? 'Loading accepted paid proposals...' : 'No proposal selected', value: '' },
        ...proposalCandidates.map(candidate => {
            const proposal = normalizeProposalCandidate(candidate);
            const amount = typeof proposal.totalPrice === 'number'
                ? formatCurrency(proposal.totalPrice, proposal.currency, { maximumFractionDigits: 0 })
                : '';
            return {
                label: [proposal.inquiryNumber, proposal.clientName, proposal.companyName, amount].filter(Boolean).join(' | '),
                value: proposal.id,
            };
        }),
    ], [proposalCandidates, proposalsLoading]);

    const selectedProposal = selectedProposalId
        ? proposalCandidates.find(p => p.id === selectedProposalId)
        : undefined;
    const selectedProposalData = selectedProposal ? normalizeProposalCandidate(selectedProposal) : undefined;

    const handleProposalSelect = (proposalId: string) => {
        setSelectedProposalId(proposalId);
        if (!proposalId) return;

        const candidate = proposalCandidates.find(p => p.id === proposalId);
        if (!candidate) return;

        const proposal = normalizeProposalCandidate(candidate);

        setFormData(prev => ({
            ...prev,
            title: `${proposal.inquiryNumber} Project`,
            clientUserId: proposal.clientUserId,
            description: proposal.description,
            maxRevisions: proposal.revisionsIncluded ?? prev.maxRevisions,
            deliverables: proposal.deliverables.length > 0
                ? proposal.deliverables.map((deliverable, index) => ({
                    id: deliverable.id || String(index + 1),
                    title: deliverable.name || deliverable.description || `Deliverable ${index + 1}`,
                }))
                : prev.deliverables,
        }));

        setValidationErrors({});
    };

    // Deliverable Actions
    const addDeliverable = () => {
        setFormData(prev => ({
            ...prev,
            deliverables: [...prev.deliverables, { id: Math.random().toString(), title: '' }]
        }));
    };

    const removeDeliverable = (id: string) => {
        setFormData(prev => ({
            ...prev,
            deliverables: prev.deliverables.filter(d => d.id !== id)
        }));
    };

    const updateDeliverable = (id: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            deliverables: prev.deliverables.map(d => d.id === id ? { ...d, title: value } : d)
        }));
        if (validationErrors.deliverables) {
            setValidationErrors(prev => ({ ...prev, deliverables: '' }));
        }
    };

    // Team Actions
    const toggleTeamMember = (userId: string) => {
        setFormData(prev => {
            const isSelected = prev.team.includes(userId);
            return {
                ...prev,
                team: isSelected
                    ? prev.team.filter(id => id !== userId)
                    : [...prev.team, userId]
            };
        });
    };

    // Navigation
    const nextStep = () => {
        if (currentStep < STEPS.length - 1) setCurrentStep(c => c + 1);
    };

    const prevStep = () => {
        if (currentStep > 0) setCurrentStep(c => c - 1);
    };

    // Validation
    const validate = (): boolean => {
        const errors: Record<string, string> = {};
        if (!formData.title.trim()) errors.title = 'Project name is required';
        if (!formData.clientUserId && !selectedProposalId) errors.clientUserId = 'Please select a client';
        const validDeliverables = formData.deliverables.filter(d => d.title.trim());
        if (validDeliverables.length === 0) errors.deliverables = 'At least one deliverable is required';
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setIsSubmitting(true);
        setSubmitError(null);

        const result = selectedProposalData
            ? await api.post('/projects', {
                inquiryId: selectedProposalData.inquiryId,
                proposalId: selectedProposalData.id,
            })
            : await api.post('/projects', {
                name: formData.title.trim(),
                clientUserId: formData.clientUserId,
                deliverables: formData.deliverables.map(d => d.title.trim()).filter(Boolean),
                totalRevisions: formData.maxRevisions,
            });

        if (result.success) {
            const projectId = result.data?.id;
            navigate(projectId ? `/projects/${projectId}` : '/projects');
        } else {
            setSubmitError(result.error?.message || 'Failed to create project. Please try again.');
            setIsSubmitting(false);
        }
    };

    // Step Content Renderers
    const renderDetails = () => (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
                <Label>Link to Proposal</Label>
                <Select
                    value={selectedProposalId}
                    onValueChange={handleProposalSelect}
                    placeholder={proposalsLoading ? 'Loading accepted paid proposals...' : 'Create directly or choose a proposal'}
                    options={proposalOptions}
                    triggerClassName="min-h-10 text-left"
                />
                {selectedProposalId && (
                    <p className="text-xs text-muted-foreground">
                        Proposal fields will drive project creation and preserve the inquiry, payment, and proposal binding.
                    </p>
                )}
                {!proposalsLoading && proposalCandidates.length === 0 && (
                    <p className="text-xs text-muted-foreground">No accepted paid proposals are ready for project creation.</p>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="title">Project Title <span className="text-destructive">*</span></Label>
                    <Input
                        id="title"
                        placeholder="e.g. Summer Brand Campaign"
                        value={formData.title}
                        onChange={e => updateField('title', e.target.value)}
                        className={validationErrors.title ? 'border-destructive' : ''}
                    />
                    {validationErrors.title && (
                        <p className="text-xs text-destructive">{validationErrors.title}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="clientUserId">Client <span className="text-destructive">*</span></Label>
                    <Select
                        value={formData.clientUserId}
                        onValueChange={v => updateField('clientUserId', v)}
                        triggerClassName={selectedProposalId ? 'opacity-70' : undefined}
                        options={[
                            { label: clientsLoading ? 'Loading clients...' : 'Select a client', value: '' },
                            ...clients.map(c => ({
                                label: `${c.full_name} (${c.email})`,
                                value: c.id,
                            }))
                        ]}
                    />
                    {validationErrors.clientUserId && (
                        <p className="text-xs text-destructive">{validationErrors.clientUserId}</p>
                    )}
                    {!clientsLoading && clients.length === 0 && (
                        <p className="text-xs text-muted-foreground">No client accounts found. Create a client user first.</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="website">Client Website (for logo)</Label>
                    <Input
                        id="website"
                        placeholder="e.g. acme.com"
                        value={formData.website}
                        onChange={e => updateField('website', e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="start">Start Date</Label>
                    <Input
                        id="start"
                        type="date"
                        value={formData.startDate}
                        onChange={e => updateField('startDate', e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="due">Due Date</Label>
                    <Input
                        id="due"
                        type="date"
                        value={formData.dueDate}
                        onChange={e => updateField('dueDate', e.target.value)}
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    placeholder="Describe the project goals and requirements..."
                    className="min-h-[120px]"
                    value={formData.description}
                    onChange={e => updateField('description', e.target.value)}
                />
            </div>

            <Separator />

            <div className="space-y-4">
                 <div className="flex items-center justify-between">
                     <div className="space-y-0.5">
                         <Label>Max Revisions Included</Label>
                         <p className="text-sm text-muted-foreground">Limit before extra charges apply.</p>
                     </div>
                     <span className="font-bold text-lg">{formData.maxRevisions}</span>
                 </div>
                 <div className="flex flex-wrap gap-2">
                     {Array.from({ length: 11 }, (_, i) => i).map(n => (
                         <button
                             key={n}
                             type="button"
                             onClick={() => updateField('maxRevisions', n)}
                             className={cn(
                                 "w-9 h-9 rounded-md text-sm font-medium border transition-colors",
                                 formData.maxRevisions === n
                                     ? "bg-primary text-primary-foreground border-primary"
                                     : "bg-background text-foreground border-border hover:border-primary hover:text-primary"
                             )}
                         >
                             {n}
                         </button>
                     ))}
                 </div>
            </div>
        </div>
    );

    const renderDeliverables = () => (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
             <div className="flex justify-between items-center">
                 <div>
                     <h3 className="text-lg font-medium">Project Deliverables</h3>
                     {validationErrors.deliverables && (
                         <p className="text-xs text-destructive mt-1">{validationErrors.deliverables}</p>
                     )}
                 </div>
                 <Button onClick={addDeliverable} size="sm" variant="outline" className="gap-2">
                     <Plus className="h-4 w-4" /> Add Item
                 </Button>
             </div>

             <div className="space-y-3">
                 {formData.deliverables.map((item, index) => (
                     <div key={item.id} className="flex gap-3 items-center p-4 border border-border rounded-lg bg-card hover:border-primary/50 transition-colors group">
                         <div className="text-muted-foreground cursor-grab active:cursor-grabbing">
                             <GripVertical className="h-4 w-4" />
                         </div>
                         <div className="flex-1">
                             <Input
                                value={item.title}
                                onChange={e => updateDeliverable(item.id, e.target.value)}
                                placeholder={`Deliverable ${index + 1} — e.g. Hero Video 16:9`}
                            />
                         </div>
                         <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDeliverable(item.id)}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                        >
                             <X className="h-4 w-4" />
                         </Button>
                     </div>
                 ))}

                 {formData.deliverables.length === 0 && (
                     <div className="text-center p-8 border-2 border-dashed border-border rounded-lg text-muted-foreground">
                         No deliverables added yet.
                     </div>
                 )}
             </div>
        </div>
    );

    const renderTeam = () => (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="grid gap-4 md:grid-cols-2">
                {TEAM_MEMBERS.map(user => {
                    const isSelected = formData.team.includes(user.id);
                    return (
                        <div
                            key={user.id}
                            onClick={() => toggleTeamMember(user.id)}
                            className={cn(
                                "flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all",
                                isSelected
                                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                                    : "border-border bg-card hover:border-primary/50"
                            )}
                        >
                            <div className="relative">
                                <Avatar src={user.avatar} fallback={user.name[0]} className="h-12 w-12" />
                                {isSelected && (
                                    <div className="absolute -top-1 -right-1 h-5 w-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                                        <Check className="h-3 w-3 text-primary-foreground" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h4 className="font-semibold text-foreground">{user.name}</h4>
                                <p className="text-xs text-muted-foreground">{user.role}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const selectedClient = clients.find(c => c.id === formData.clientUserId);

    const renderReview = () => (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-6 border-b border-border bg-muted/20">
                    <h2 className="text-2xl font-bold text-foreground">{formData.title || 'Untitled Project'}</h2>
                    <p className="text-muted-foreground">
                        {selectedClient ? `${selectedClient.full_name} — ${selectedClient.email}` : 'No client selected'}
                    </p>
                </div>
                <div className="p-6 grid gap-6 md:grid-cols-3">
                    <div>
                        <Label className="text-muted-foreground mb-1 block">Timeline</Label>
                        <p className="font-medium">
                            {formData.startDate && formData.dueDate
                                ? `${formData.startDate} → ${formData.dueDate}`
                                : formData.startDate || formData.dueDate || 'Not set'}
                        </p>
                    </div>
                    <div>
                        <Label className="text-muted-foreground mb-1 block">Revisions</Label>
                        <p className="font-medium">{formData.maxRevisions} Included</p>
                    </div>
                    <div>
                        <Label className="text-muted-foreground mb-1 block">Deliverables</Label>
                        <p className="font-medium">{formData.deliverables.filter(d => d.title.trim()).length} items</p>
                    </div>
                    {selectedProposalId && (
                        <div className="md:col-span-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                            <Label className="text-muted-foreground mb-1 block">Proposal Binding</Label>
                            <p className="font-medium">
                                {selectedProposalData
                                    ? `${selectedProposalData.inquiryNumber} -> Proposal -> Project`
                                    : 'Proposal -> Project'}
                            </p>
                        </div>
                    )}
                    <div className="md:col-span-3">
                        <Label className="text-muted-foreground mb-1 block">Description</Label>
                        <p className="text-sm leading-relaxed">{formData.description || 'No description provided.'}</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Deliverables</h4>
                    <div className="space-y-2">
                        {formData.deliverables.filter(d => d.title.trim()).map((d, i) => (
                            <div key={i} className="flex items-center p-3 rounded-lg border border-border bg-background">
                                <span className="font-medium">{d.title}</span>
                            </div>
                        ))}
                        {formData.deliverables.filter(d => d.title.trim()).length === 0 && (
                            <p className="text-sm text-muted-foreground">No deliverables added.</p>
                        )}
                    </div>
                </div>
                <div className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Team</h4>
                    <div className="flex -space-x-2">
                        {TEAM_MEMBERS.filter(u => formData.team.includes(u.id)).map(u => (
                            <Avatar key={u.id} src={u.avatar} fallback={u.name[0]} className="border-2 border-background w-10 h-10" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 pb-20">
            <ProjectSectionHeader />

            <div className="mb-8">
                <Button variant="ghost" className="pl-0 gap-2 mb-4 hover:bg-transparent hover:text-primary" onClick={() => navigate('/projects')}>
                    <ChevronLeft className="h-4 w-4" /> Back to Projects
                </Button>
                <PageHeader
                    title="Create New Project"
                    description="Configure project details, deliverables, and team assignments."
                />
            </div>

            {/* Stepper */}
            <div className="mb-10">
                <div className="relative flex justify-between">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-secondary -z-10 -translate-y-1/2" />
                    <div className="absolute top-1/2 left-0 h-0.5 bg-primary -z-10 -translate-y-1/2 transition-all duration-500"
                         style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
                    />

                    {STEPS.map((step, index) => {
                        const Icon = step.icon;
                        const isActive = index <= currentStep;
                        const isCurrent = index === currentStep;

                        return (
                            <div key={step.id} className="flex flex-col items-center gap-2 bg-background px-2">
                                <div className={cn(
                                    "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                                    isActive ? "bg-primary border-primary text-primary-foreground" : "bg-background border-muted-foreground text-muted-foreground",
                                    isCurrent && "ring-4 ring-primary/20"
                                )}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <span className={cn(
                                    "text-xs font-medium transition-colors",
                                    isActive ? "text-primary" : "text-muted-foreground"
                                )}>
                                    {step.title}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Form Content */}
            <Card className="min-h-[500px] flex flex-col">
                <CardContent className="flex-1 p-8">
                    {currentStep === 0 && renderDetails()}
                    {currentStep === 1 && renderDeliverables()}
                    {currentStep === 2 && renderTeam()}
                    {currentStep === 3 && renderReview()}
                </CardContent>

                <div className="p-6 border-t border-border bg-muted/20 space-y-3">
                    {submitError && (
                        <p className="text-sm text-destructive text-center">{submitError}</p>
                    )}
                    <div className="flex justify-between">
                        <Button
                            variant="outline"
                            onClick={prevStep}
                            disabled={currentStep === 0 || isSubmitting}
                            className="w-32"
                        >
                            Back
                        </Button>

                        {currentStep < STEPS.length - 1 ? (
                            <Button onClick={nextStep} className="w-32 gap-2">
                                Next <ChevronRight className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-40 gap-2 shadow-lg shadow-primary/25"
                            >
                                {isSubmitting ? 'Creating...' : 'Create Project'}
                                {!isSubmitting && <Check className="h-4 w-4" />}
                            </Button>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};
