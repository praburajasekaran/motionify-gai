
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ChevronLeft, 
    ChevronRight, 
    Check, 
    Plus, 
    X, 
    GripVertical,
    Calendar,
    Users,
    Briefcase,
    Layers,
    ShieldAlert
} from 'lucide-react';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    Button, 
    Input, 
    Label, 
    Textarea, 
    Select, 
    Avatar,
    Switch,
    Slider,
    Badge,
    Separator,
    cn
} from '../components/ui/design-system';
import { TEAM_MEMBERS } from '../constants';

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

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        client: '',
        website: '',
        description: '',
        startDate: '',
        dueDate: '',
        budget: '',
        maxRevisions: 3,
        priority: 'Medium',
        deliverables: [
            { id: '1', title: '', type: 'Video', format: '16:9' }
        ],
        team: [TEAM_MEMBERS[0].id] // Current user selected by default
    });

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Deliverable Actions
    const addDeliverable = () => {
        setFormData(prev => ({
            ...prev,
            deliverables: [...prev.deliverables, { id: Math.random().toString(), title: '', type: 'Video', format: '16:9' }]
        }));
    };

    const removeDeliverable = (id: string) => {
        setFormData(prev => ({
            ...prev,
            deliverables: prev.deliverables.filter(d => d.id !== id)
        }));
    };

    const updateDeliverable = (id: string, field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            deliverables: prev.deliverables.map(d => d.id === id ? { ...d, [field]: value } : d)
        }));
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

    const handleSubmit = async () => {
        setIsSubmitting(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        navigate('/projects');
    };

    // Step Content Renderers
    const renderDetails = () => (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="title">Project Title</Label>
                    <Input 
                        id="title" 
                        placeholder="e.g. Summer Brand Campaign" 
                        value={formData.title}
                        onChange={e => updateField('title', e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="client">Client Name</Label>
                    <Input 
                        id="client" 
                        placeholder="e.g. Acme Corp" 
                        value={formData.client}
                        onChange={e => updateField('client', e.target.value)}
                    />
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
                    <Label htmlFor="budget">Budget ($)</Label>
                    <Input 
                        id="budget" 
                        type="number"
                        placeholder="10000" 
                        value={formData.budget}
                        onChange={e => updateField('budget', e.target.value)}
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
                 <Slider 
                    value={[formData.maxRevisions]} 
                    max={10} 
                    step={1} 
                    onValueChange={(v) => updateField('maxRevisions', v[0])}
                 />
            </div>
        </div>
    );

    const renderDeliverables = () => (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
             <div className="flex justify-between items-center">
                 <h3 className="text-lg font-medium">Project Deliverables</h3>
                 <Button onClick={addDeliverable} size="sm" variant="outline" className="gap-2">
                     <Plus className="h-4 w-4" /> Add Item
                 </Button>
             </div>
             
             <div className="space-y-3">
                 {formData.deliverables.map((item, index) => (
                     <div key={item.id} className="flex gap-3 items-start p-4 border border-border rounded-lg bg-card hover:border-primary/50 transition-colors group">
                         <div className="mt-3 text-muted-foreground cursor-grab active:cursor-grabbing">
                             <GripVertical className="h-4 w-4" />
                         </div>
                         <div className="flex-1 grid gap-4 md:grid-cols-3">
                             <div className="space-y-1">
                                 <Label className="text-xs">Title</Label>
                                 <Input 
                                    value={item.title} 
                                    onChange={e => updateDeliverable(item.id, 'title', e.target.value)}
                                    placeholder={`Deliverable ${index + 1}`} 
                                />
                             </div>
                             <div className="space-y-1">
                                 <Label className="text-xs">Type</Label>
                                 <Select 
                                    value={item.type}
                                    onValueChange={v => updateDeliverable(item.id, 'type', v)}
                                    options={[
                                        { label: 'Video', value: 'Video' },
                                        { label: 'Image', value: 'Image' },
                                        { label: 'Document', value: 'Document' }
                                    ]}
                                 />
                             </div>
                             <div className="space-y-1">
                                 <Label className="text-xs">Format</Label>
                                 <Select 
                                    value={item.format}
                                    onValueChange={v => updateDeliverable(item.id, 'format', v)}
                                    options={[
                                        { label: '16:9 (Landscape)', value: '16:9' },
                                        { label: '9:16 (Vertical)', value: '9:16' },
                                        { label: '1:1 (Square)', value: '1:1' },
                                        { label: '4:5 (Portrait)', value: '4:5' }
                                    ]}
                                 />
                             </div>
                         </div>
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeDeliverable(item.id)}
                            className="text-muted-foreground hover:text-destructive mt-4"
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

    const renderReview = () => (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-6 border-b border-border bg-muted/20">
                    <h2 className="text-2xl font-bold text-foreground">{formData.title || 'Untitled Project'}</h2>
                    <p className="text-muted-foreground">{formData.client}</p>
                </div>
                <div className="p-6 grid gap-6 md:grid-cols-3">
                    <div>
                        <Label className="text-muted-foreground mb-1 block">Timeline</Label>
                        <p className="font-medium">{formData.startDate} - {formData.dueDate}</p>
                    </div>
                    <div>
                        <Label className="text-muted-foreground mb-1 block">Budget</Label>
                        <p className="font-medium">${formData.budget}</p>
                    </div>
                    <div>
                        <Label className="text-muted-foreground mb-1 block">Revisions</Label>
                        <p className="font-medium">{formData.maxRevisions} Included</p>
                    </div>
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
                        {formData.deliverables.map((d, i) => (
                            <div key={i} className="flex justify-between p-3 rounded-lg border border-border bg-background">
                                <span className="font-medium">{d.title || 'Untitled'}</span>
                                <Badge variant="secondary">{d.type}</Badge>
                            </div>
                        ))}
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
        <div className="max-w-3xl mx-auto py-8">
            <div className="mb-8">
                <Button variant="ghost" className="pl-0 gap-2 mb-4 hover:bg-transparent hover:text-primary" onClick={() => navigate('/projects')}>
                    <ChevronLeft className="h-4 w-4" /> Back to Projects
                </Button>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Create New Project</h1>
                <p className="text-muted-foreground mt-2">Configure project details, deliverables, and team assignments.</p>
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
                
                <div className="p-6 border-t border-border flex justify-between bg-muted/20">
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
            </Card>
        </div>
    );
};
