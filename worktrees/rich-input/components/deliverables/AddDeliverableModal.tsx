import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Dialog, Button, Input, Label, Textarea } from '../ui/design-system';

interface AddDeliverableModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    onSuccess: () => void;
}

export const AddDeliverableModal: React.FC<AddDeliverableModalProps> = ({
    isOpen,
    onClose,
    projectId,
    onSuccess,
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [estimatedWeeks, setEstimatedWeeks] = useState('1');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError('Deliverable name is required');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const response = await fetch('/api/deliverables', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    project_id: projectId,
                    name: name.trim(),
                    description: description.trim(),
                    estimated_completion_week: parseInt(estimatedWeeks) || 1,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || errorData.message || 'Failed to create deliverable');
            }

            // Success - reset form and close modal
            setName('');
            setDescription('');
            setEstimatedWeeks('1');
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to create deliverable:', err);
            setError(err instanceof Error ? err.message : 'Failed to create deliverable');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setName('');
            setDescription('');
            setEstimatedWeeks('1');
            setError('');
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            {/* Header */}
            <h2 className="text-lg font-semibold text-foreground mb-6">Add New Deliverable</h2>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="deliverable-name">
                        Deliverable Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="deliverable-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Logo Animation"
                        disabled={isSubmitting}
                        autoFocus
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="deliverable-description">Description</Label>
                    <Textarea
                        id="deliverable-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Brief description of the deliverable (optional)"
                        rows={3}
                        disabled={isSubmitting}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="estimated-weeks">Estimated Completion (weeks)</Label>
                    <Input
                        id="estimated-weeks"
                        type="number"
                        min="1"
                        max="52"
                        value={estimatedWeeks}
                        onChange={(e) => setEstimatedWeeks(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-4">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="default"
                        disabled={isSubmitting || !name.trim()}
                        className="gap-2"
                    >
                        {isSubmitting ? (
                            <>Creating...</>
                        ) : (
                            <>
                                <Plus className="h-4 w-4" />
                                Create Deliverable
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
};
