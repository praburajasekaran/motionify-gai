/**
 * AdditionalRevisionRequestModal Component
 * 
 * Modal for clients to request additional revisions when their quota is exhausted.
 * Features:
 * - Reason textarea (min 100 characters)
 * - Quantity selector (1-5 additional revisions)
 * - Current quota display
 * - Confirmation before submission
 * 
 * TC-DA-005: Request Additional Revisions (Paid)
 */

import React, { useState } from 'react';
import { Plus, AlertTriangle, Send, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button, Textarea } from '../ui/design-system';

export interface AdditionalRevisionRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { reason: string; requestedCount: number }) => void;
    projectId: string;
    projectName: string;
    quota: { total: number; used: number };
    currentUserName: string;
    hasPendingRequest?: boolean; // Whether there's already a pending request
}

export const AdditionalRevisionRequestModal: React.FC<AdditionalRevisionRequestModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    projectId,
    projectName,
    quota,
    currentUserName,
    hasPendingRequest = false,
}) => {
    const [reason, setReason] = useState('');
    const [requestedCount, setRequestedCount] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const MIN_REASON_LENGTH = 100;
    const MAX_REVISIONS = 5;
    const isReasonValid = reason.trim().length >= MIN_REASON_LENGTH;

    const handleSubmit = () => {
        if (!isReasonValid || hasPendingRequest) return;

        setIsSubmitting(true);

        // Simulate API delay
        setTimeout(() => {
            onSubmit({ reason: reason.trim(), requestedCount });
            setIsSubmitting(false);
            setShowConfirmation(false);
            setShowSuccess(true);
        }, 800);
    };

    const handleClose = () => {
        if (showSuccess) {
            // Reset form on successful submission
            setReason('');
            setRequestedCount(1);
            setShowSuccess(false);
        }
        setShowConfirmation(false);
        onClose();
    };

    // Success view
    if (showSuccess) {
        return (
            <Modal
                isOpen={isOpen}
                onClose={handleClose}
                size="sm"
                showCloseButton={true}
            >
                <div className="p-6 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Request Submitted</h3>
                    <p className="text-sm text-muted-foreground">
                        Your request for {requestedCount} additional revision{requestedCount !== 1 ? 's' : ''} has been
                        submitted and is pending admin review.
                    </p>
                    <p className="text-xs text-muted-foreground">
                        You'll receive an email notification once your request is reviewed.
                    </p>
                    <Button variant="default" onClick={handleClose} className="w-full">
                        Done
                    </Button>
                </div>
            </Modal>
        );
    }

    // Confirmation dialog
    if (showConfirmation) {
        return (
            <Modal
                isOpen={isOpen}
                onClose={() => setShowConfirmation(false)}
                size="sm"
                showCloseButton={false}
            >
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-full">
                            <Plus className="h-6 w-6 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">
                            Confirm Request
                        </h3>
                    </div>

                    <div className="bg-muted border border-border rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-600">Additional Revisions:</span>
                            <span className="font-semibold text-foreground">{requestedCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-600">Project:</span>
                            <span className="font-semibold text-foreground">{projectName}</span>
                        </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        This request will be sent to the Motionify team for approval.
                        Additional revisions may incur extra charges based on your agreement.
                    </p>

                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowConfirmation(false)}
                            className="flex-1"
                            disabled={isSubmitting}
                        >
                            Go Back
                        </Button>
                        <Button
                            variant="default"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Request'}
                        </Button>
                    </div>
                </div>
            </Modal>
        );
    }

    // Main form
    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            size="custom"
            showCloseButton={true}
            className="max-w-lg"
        >
            <div className="px-6 py-4 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">
                    Request Additional Revisions
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Your revision quota is exhausted. Submit a request for additional revisions.
                </p>
            </div>

            <div className="p-6 space-y-6">
                {/* Pending Request Warning */}
                {hasPendingRequest && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-amber-800 text-sm">Request Pending</p>
                                <p className="text-xs text-amber-700 mt-1">
                                    You already have a pending request for additional revisions.
                                    Please wait for admin review before submitting another request.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Current Quota Display */}
                <div className="bg-muted border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Current Revision Quota</span>
                        <span className="font-mono font-bold text-foreground">
                            {quota.used} / {quota.total} used
                        </span>
                    </div>
                    <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-red-500 rounded-full"
                            style={{ width: '100%' }}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        All included revisions have been used
                    </p>
                </div>

                {/* Quantity Selector */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">
                        How many additional revisions do you need?
                    </label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((num) => (
                            <button
                                key={num}
                                type="button"
                                onClick={() => setRequestedCount(num)}
                                disabled={hasPendingRequest}
                                className={`
                  flex-1 py-3 rounded-lg border-2 font-bold text-lg transition-all
                  ${requestedCount === num
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-border bg-card text-muted-foreground hover:border-border'
                                    }
                  ${hasPendingRequest ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Reason Textarea */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">
                        Why do you need additional revisions? <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Please explain why additional revisions are needed. Include specific details about the changes required that weren't covered in the original scope..."
                        className="min-h-[120px]"
                        disabled={hasPendingRequest}
                    />
                    <div className="flex items-center justify-between text-xs">
                        <span className={isReasonValid ? 'text-emerald-600' : 'text-zinc-500'}>
                            {isReasonValid
                                ? '✓ Meets minimum length'
                                : `Minimum ${MIN_REASON_LENGTH} characters required`
                            }
                        </span>
                        <span className={`font-mono ${reason.length >= MIN_REASON_LENGTH ? 'text-emerald-600' : 'text-zinc-500'}`}>
                            {reason.length} / {MIN_REASON_LENGTH}
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border px-6 py-4 bg-muted flex items-center justify-end gap-3">
                <Button variant="outline" onClick={handleClose}>
                    Cancel
                </Button>
                <Button
                    variant="default"
                    onClick={() => setShowConfirmation(true)}
                    disabled={!isReasonValid || hasPendingRequest}
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <Send className="h-4 w-4" />
                    Submit Request
                </Button>
            </div>
        </Modal>
    );
};
