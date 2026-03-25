import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    Calendar,
    FileText,
    Sparkles,
    CheckCircle2,
    Send,
    Clock,
    AlertCircle
} from 'lucide-react';
import {
    Card,
    CardContent,
    Button,
    Input,
    Label,
    Textarea,
    Badge,
    cn
} from '../components/ui/design-system';
import { useAuthContext } from '../contexts/AuthContext';

// API base URL for Netlify functions
const API_BASE = '/.netlify/functions';

interface FormData {
    title: string;
    description: string;
    tentativeDeadline: string;
}

interface FormErrors {
    title?: string;
    description?: string;
    tentativeDeadline?: string;
}

export const StartProductionRequest = () => {
    const navigate = useNavigate();
    const { user } = useAuthContext();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [requestNumber, setRequestNumber] = useState<string | null>(null);
    const [apiError, setApiError] = useState<string | null>(null);

    const [formData, setFormData] = useState<FormData>({
        title: '',
        description: '',
        tentativeDeadline: '',
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const updateField = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const handleBlur = (field: keyof FormData) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        validateField(field);
    };

    const validateField = (field: keyof FormData): boolean => {
        const newErrors: FormErrors = {};

        switch (field) {
            case 'title':
                if (!formData.title.trim()) {
                    newErrors.title = 'Project title is required';
                } else if (formData.title.trim().length < 3) {
                    newErrors.title = 'Title must be at least 3 characters';
                } else if (formData.title.trim().length > 100) {
                    newErrors.title = 'Title must be less than 100 characters';
                }
                break;
            case 'description':
                if (!formData.description.trim()) {
                    newErrors.description = 'Description is required';
                } else if (formData.description.trim().length < 10) {
                    newErrors.description = 'Description must be at least 10 characters';
                } else if (formData.description.trim().length > 1000) {
                    newErrors.description = 'Description must be less than 1000 characters';
                }
                break;
            case 'tentativeDeadline':
                if (!formData.tentativeDeadline) {
                    newErrors.tentativeDeadline = 'Deadline is required';
                } else {
                    const deadline = new Date(formData.tentativeDeadline);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (deadline < today) {
                        newErrors.tentativeDeadline = 'Deadline must be a future date';
                    }
                }
                break;
        }

        setErrors(prev => ({ ...prev, ...newErrors }));
        return !newErrors[field];
    };

    const validateAll = (): boolean => {
        const titleValid = validateField('title');
        const descValid = validateField('description');
        const deadlineValid = validateField('tentativeDeadline');
        setTouched({ title: true, description: true, tentativeDeadline: true });
        return titleValid && descValid && deadlineValid;
    };

    const handleSubmit = async () => {
        if (!validateAll()) return;
        if (!user) {
            setApiError('You must be logged in to submit a request');
            return;
        }

        setIsSubmitting(true);
        setApiError(null);

        try {
            const response = await fetch(`${API_BASE}/client-project-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: formData.title.trim(),
                    description: formData.description.trim(),
                    tentativeDeadline: formData.tentativeDeadline,
                    clientUserId: user.id,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit request');
            }

            setRequestNumber(data.requestNumber);
            setIsSuccess(true);
        } catch (error) {
            console.error('Submit error:', error);
            setApiError(error instanceof Error ? error.message : 'An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get minimum date (today)
    const getMinDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    // Success state
    if (isSuccess) {
        return (
            <div className="max-w-2xl mx-auto py-12 px-4">
                <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Success Icon with Animation */}
                    <div className="relative inline-flex mb-8">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full blur-xl opacity-30 animate-pulse" />
                        <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <CheckCircle2 className="h-12 w-12 text-white" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold text-zinc-900 mb-3">
                        Request Submitted! 🎉
                    </h1>
                    <p className="text-lg text-zinc-600 mb-6">
                        Your project request has been sent to the Motionify team.
                    </p>

                    {/* Request Number Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-full mb-8">
                        <span className="text-sm text-zinc-500">Request Number:</span>
                        <span className="font-bold text-zinc-900">{requestNumber}</span>
                    </div>

                    <Card className="text-left mb-8 border-zinc-200/60 shadow-sm">
                        <CardContent className="p-6">
                            <h3 className="font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                                <Clock className="h-5 w-5 text-primary" />
                                What happens next?
                            </h3>
                            <ol className="space-y-3 text-sm text-zinc-600">
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">1</span>
                                    <span>Our team will review your project request within 24-48 hours.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">2</span>
                                    <span>We'll reach out to discuss your project requirements and goals.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">3</span>
                                    <span>You'll receive a detailed proposal with deliverables and pricing.</span>
                                </li>
                            </ol>
                        </CardContent>
                    </Card>

                    <div className="flex gap-4 justify-center">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/projects')}
                            className="gap-2"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Back to Projects
                        </Button>
                        <Button
                            variant="gradient"
                            onClick={() => {
                                setIsSuccess(false);
                                setFormData({ title: '', description: '', tentativeDeadline: '' });
                                setRequestNumber(null);
                            }}
                            className="gap-2"
                        >
                            Submit Another Request
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="mb-8 animate-in fade-in slide-in-from-left-4 duration-300">
                <Button
                    variant="ghost"
                    className="pl-0 gap-2 mb-4 hover:bg-transparent hover:text-primary"
                    onClick={() => navigate('/projects')}
                >
                    <ChevronLeft className="h-4 w-4" /> Back to Projects
                </Button>

                <div className="flex items-center gap-4 mb-2">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shadow-lg shadow-primary/25">
                        <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                            Start a Production
                        </h1>
                        <p className="text-zinc-500 mt-1">
                            Tell us about your project and we'll create a proposal for you.
                        </p>
                    </div>
                </div>
            </div>

            {/* Form Card */}
            <Card className="border-zinc-200/60 shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                <CardContent className="p-8">
                    {/* API Error */}
                    {apiError && (
                        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 flex-shrink-0" />
                            <span className="text-sm">{apiError}</span>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Project Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title" className="flex items-center gap-2 text-zinc-700">
                                <FileText className="h-4 w-4 text-primary" />
                                Project Title
                                <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="title"
                                placeholder="e.g. Brand Launch Video, Product Demo Animation"
                                value={formData.title}
                                onChange={e => updateField('title', e.target.value)}
                                onBlur={() => handleBlur('title')}
                                className={cn(
                                    "transition-all",
                                    touched.title && errors.title && "border-red-300 focus:border-red-500 focus:ring-red-200"
                                )}
                            />
                            {touched.title && errors.title && (
                                <p className="text-sm text-red-500 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    {errors.title}
                                </p>
                            )}
                            <p className="text-xs text-zinc-400">
                                {formData.title.length}/100 characters
                            </p>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description" className="flex items-center gap-2 text-zinc-700">
                                <FileText className="h-4 w-4 text-primary" />
                                Project Description
                                <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                id="description"
                                placeholder="Describe your project goals, target audience, key messages, and any specific requirements or preferences..."
                                className={cn(
                                    "min-h-[160px] resize-none transition-all",
                                    touched.description && errors.description && "border-red-300 focus:border-red-500 focus:ring-red-200"
                                )}
                                value={formData.description}
                                onChange={e => updateField('description', e.target.value)}
                                onBlur={() => handleBlur('description')}
                            />
                            {touched.description && errors.description && (
                                <p className="text-sm text-red-500 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    {errors.description}
                                </p>
                            )}
                            <p className="text-xs text-zinc-400">
                                {formData.description.length}/1000 characters
                            </p>
                        </div>

                        {/* Tentative Deadline */}
                        <div className="space-y-2">
                            <Label htmlFor="deadline" className="flex items-center gap-2 text-zinc-700">
                                <Calendar className="h-4 w-4 text-primary" />
                                Tentative Deadline
                                <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="deadline"
                                type="date"
                                min={getMinDate()}
                                value={formData.tentativeDeadline}
                                onChange={e => updateField('tentativeDeadline', e.target.value)}
                                onBlur={() => handleBlur('tentativeDeadline')}
                                className={cn(
                                    "transition-all",
                                    touched.tentativeDeadline && errors.tentativeDeadline && "border-red-300 focus:border-red-500 focus:ring-red-200"
                                )}
                            />
                            {touched.tentativeDeadline && errors.tentativeDeadline && (
                                <p className="text-sm text-red-500 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    {errors.tentativeDeadline}
                                </p>
                            )}
                            <p className="text-xs text-zinc-400">
                                This is a tentative date. We'll confirm the actual timeline in your proposal.
                            </p>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0">
                                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <Sparkles className="h-4 w-4 text-blue-600" />
                                </div>
                            </div>
                            <div>
                                <h4 className="font-medium text-blue-900 mb-1">What happens next?</h4>
                                <p className="text-sm text-blue-700">
                                    After you submit, our team will review your request and create a detailed proposal with deliverables, timeline, and pricing tailored to your needs.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-zinc-100 bg-zinc-50/50 flex justify-between items-center rounded-b-2xl">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/projects')}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        variant="gradient"
                        className="gap-2 min-w-[160px] shadow-lg shadow-primary/25"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                Submit Request
                                <Send className="h-4 w-4" />
                            </>
                        )}
                    </Button>
                </div>
            </Card>

            {/* Bottom Decoration */}
            <div className="mt-8 text-center text-sm text-zinc-400">
                <p>Need help? Contact us at <a href="mailto:hello@motionify.studio" className="text-primary hover:underline">hello@motionify.studio</a></p>
            </div>
        </div>
    );
};
