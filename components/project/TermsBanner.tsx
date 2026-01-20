import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, FileText, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, Button, Separator } from '../ui/design-system';
import { Project } from '../../types';
import { useAuthContext } from '../../contexts/AuthContext';
import { isClientPrimaryContact } from '../../utils/deliverablePermissions';
import { MOCK_PROJECTS } from '../../constants';
import { useToast } from '../ui/design-system';

interface TermsBannerProps {
    project: Project;
    onTermsAccepted: () => void;
}

export const TermsBanner: React.FC<TermsBannerProps> = ({ project, onTermsAccepted }) => {
    const { user } = useAuthContext();
    const { addToast } = useToast();
    const [isAccepting, setIsAccepting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // If already accepted, return null (or could show a small "Terms Accepted" badge if desired, but spec says banner disappears)
    if (project.termsAcceptedAt) {
        return null;
    }

    // Check if user is the primary contact
    // Use the utility function for consistent logic
    const isPrimaryContact = user && isClientPrimaryContact(user, project.id);
    const isClient = user?.role?.startsWith('client');

    const handleAcceptTerms = async () => {
        setIsAccepting(true);

        try {
            // Call API to persist terms acceptance to database
            const response = await fetch('/.netlify/functions/projects-accept-terms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    projectId: project.id,
                    userId: user?.id,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to accept terms');
            }

            // Also update MOCK object for local state consistency
            const mockProject = MOCK_PROJECTS.find(p => p.id === project.id);
            if (mockProject) {
                mockProject.termsAcceptedAt = new Date().toISOString();
                mockProject.termsAcceptedBy = user?.id;

                // Add activity log
                mockProject.activityLog.unshift({
                    id: `act-${Date.now()}`,
                    userId: user?.id || 'unknown',
                    action: 'accepted',
                    target: 'Project Terms',
                    timestamp: new Date().toISOString()
                });
            }

            // Trigger callback to update parent state
            onTermsAccepted();

            addToast({
                title: "Terms Accepted",
                description: "Work can now begin on this project.",
                variant: 'success'
            });

        } catch (error) {
            console.error("Failed to accept terms:", error);
            addToast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to accept terms. Please try again.",
                variant: 'destructive'
            });
        } finally {
            setIsAccepting(false);
        }
    };

    return (
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm mb-6 overflow-hidden">
            <CardContent className="p-0">
                <div className="p-4 md:p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                    <div className="flex gap-4">
                        <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200">
                            <FileText className="h-6 w-6 text-amber-600" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-amber-900">Project Terms Review Required</h3>
                            <p className="text-amber-700 text-sm max-w-2xl">
                                Before we can begin work on <strong>{project.title}</strong>, please review and accept the engagement terms.
                                This outlines the deliverables, revision policy, and pricing.
                            </p>

                            {!isExpanded && (
                                <button
                                    onClick={() => setIsExpanded(true)}
                                    className="text-amber-700 text-sm font-semibold hover:text-amber-900 hover:underline flex items-center gap-1 mt-2"
                                >
                                    View Summary <ChevronRight className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-2 w-full md:w-auto">
                        {isPrimaryContact ? (
                            <Button
                                onClick={handleAcceptTerms}
                                disabled={isAccepting}
                                className="bg-amber-600 hover:bg-amber-700 text-white border-none w-full md:w-auto shadow-md"
                            >
                                {isAccepting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Accepting...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Accept Terms & Start Project
                                    </>
                                )}
                            </Button>
                        ) : isClient ? (
                            <div className="flex items-center gap-2 text-amber-700 text-sm bg-amber-100/50 px-3 py-2 rounded-lg border border-amber-200">
                                <ShieldCheck className="h-4 w-4" />
                                <span>Waiting for Primary Contact to accept</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-amber-700 text-sm bg-amber-100/50 px-3 py-2 rounded-lg border border-amber-200">
                                <AlertTriangle className="h-4 w-4" />
                                <span>Waiting for Client Acceptance</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                    <div className="border-t border-amber-200 bg-white/50 p-6 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="font-bold text-amber-900 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    Scope of Work
                                </h4>
                                <ul className="space-y-2 text-sm text-zinc-600 pl-6 list-disc marker:text-amber-400">
                                    <li>Production of {project.deliverables.length} deliverables</li>
                                    <li>Includes {project.description}</li>
                                    <li>Timeline: {new Date(project.startDate).toLocaleDateString()} - {new Date(project.dueDate).toLocaleDateString()}</li>
                                </ul>
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-bold text-amber-900 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    Terms & Conditions
                                </h4>
                                <ul className="space-y-2 text-sm text-zinc-600 pl-6 list-disc marker:text-amber-400">
                                    <li>{project.maxRevisions} rounds of revisions included</li>
                                    <li>Additional revisions charged separately</li>
                                    <li>Final files released upon full payment</li>
                                </ul>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="text-zinc-500 text-sm hover:text-zinc-900 underline"
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
