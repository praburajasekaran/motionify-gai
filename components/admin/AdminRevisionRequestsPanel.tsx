/**
 * AdminRevisionRequestsPanel Component
 * 
 * Admin panel for reviewing and approving/declining additional revision requests.
 * Features:
 * - List of pending requests across all projects
 * - Expand to see request details (reason, project, client)
 * - Approve with optional modified count
 * - Decline with required reason
 * - Updates project quota on approval
 * 
 * TC-DA-006: Admin Approves Additional Revisions
 */

import React, { useState } from 'react';
import {
    CheckCircle2,
    XCircle,
    ChevronDown,
    ChevronUp,
    Clock,
    User,
    FolderOpen,
    MessageSquare,
    AlertTriangle
} from 'lucide-react';
import { Button, Badge, Textarea } from '../ui/design-system';
import { AdditionalRevisionRequest, AdditionalRevisionRequestStatus } from '../../types/deliverable.types';

export interface AdminRevisionRequestsPanelProps {
    requests: AdditionalRevisionRequest[];
    onApprove: (requestId: string, approvedCount: number, internalNotes?: string) => void;
    onDecline: (requestId: string, declineReason: string) => void;
}

interface RequestItemProps {
    request: AdditionalRevisionRequest;
    onApprove: (approvedCount: number, internalNotes?: string) => void;
    onDecline: (declineReason: string) => void;
}

const RequestItem: React.FC<RequestItemProps> = ({ request, onApprove, onDecline }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [approvedCount, setApprovedCount] = useState(request.requestedCount);
    const [internalNotes, setInternalNotes] = useState('');
    const [declineReason, setDeclineReason] = useState('');
    const [showDeclineForm, setShowDeclineForm] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleApprove = () => {
        setIsProcessing(true);
        setTimeout(() => {
            onApprove(approvedCount, internalNotes || undefined);
            setIsProcessing(false);
        }, 500);
    };

    const handleDecline = () => {
        if (declineReason.trim().length < 20) return;
        setIsProcessing(true);
        setTimeout(() => {
            onDecline(declineReason.trim());
            setIsProcessing(false);
            setShowDeclineForm(false);
        }, 500);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusBadge = (status: AdditionalRevisionRequestStatus) => {
        switch (status) {
            case 'pending':
                return <Badge variant="warning">Pending</Badge>;
            case 'approved':
                return <Badge variant="success">Approved</Badge>;
            case 'declined':
                return <Badge variant="destructive">Declined</Badge>;
        }
    };

    return (
        <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
            {/* Header Row */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors"
            >
                <div className="flex items-center gap-4">
                    {getStatusBadge(request.status)}
                    <div className="text-left">
                        <p className="font-semibold text-zinc-900 text-sm">
                            {request.requestedCount} Additional Revision{request.requestedCount !== 1 ? 's' : ''} Requested
                        </p>
                        <p className="text-xs text-zinc-500">
                            by {request.requestedByName} • {formatDate(request.createdAt)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">
                        Quota: {request.quotaSnapshotUsed}/{request.quotaSnapshotTotal}
                    </span>
                    {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-zinc-500" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-zinc-500" />
                    )}
                </div>
            </button>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="border-t border-zinc-200 p-4 space-y-4 bg-zinc-50">
                    {/* Request Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-zinc-600">
                            <User className="h-4 w-4" />
                            <span>Client: <strong className="text-zinc-900">{request.requestedByName}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-600">
                            <Clock className="h-4 w-4" />
                            <span>Requested: {formatDate(request.createdAt)}</span>
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                            <MessageSquare className="h-4 w-4" />
                            <span>Reason</span>
                        </div>
                        <div className="bg-white border border-zinc-200 rounded-lg p-3 text-sm text-zinc-700">
                            {request.reason}
                        </div>
                    </div>

                    {/* Only show actions for pending requests */}
                    {request.status === 'pending' && !showDeclineForm && (
                        <div className="space-y-4 pt-2">
                            {/* Approve Section */}
                            <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3">
                                <h4 className="font-semibold text-zinc-900 text-sm">Approve Request</h4>

                                {/* Count Selector */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-600">
                                        Approved revisions (client requested {request.requestedCount})
                                    </label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map((num) => (
                                            <button
                                                key={num}
                                                type="button"
                                                onClick={() => setApprovedCount(num)}
                                                disabled={isProcessing}
                                                className={`
                          w-10 h-10 rounded-lg border-2 font-bold transition-all
                          ${approvedCount === num
                                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                                                    }
                          ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                                            >
                                                {num}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Internal Notes */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-600">
                                        Internal notes (optional)
                                    </label>
                                    <Textarea
                                        value={internalNotes}
                                        onChange={(e) => setInternalNotes(e.target.value)}
                                        placeholder="Add internal notes about this approval..."
                                        className="min-h-[60px] text-sm"
                                        disabled={isProcessing}
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        variant="default"
                                        onClick={handleApprove}
                                        disabled={isProcessing}
                                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                        {isProcessing ? 'Approving...' : `Approve ${approvedCount} Revision${approvedCount !== 1 ? 's' : ''}`}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowDeclineForm(true)}
                                        disabled={isProcessing}
                                        className="gap-2 border-red-200 text-red-600 hover:bg-red-50"
                                    >
                                        <XCircle className="h-4 w-4" />
                                        Decline
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Decline Form */}
                    {request.status === 'pending' && showDeclineForm && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                                <h4 className="font-semibold text-red-900 text-sm">Decline Request</h4>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-red-800">
                                    Reason for declining (visible to client) <span className="text-red-600">*</span>
                                </label>
                                <Textarea
                                    value={declineReason}
                                    onChange={(e) => setDeclineReason(e.target.value)}
                                    placeholder="Explain why this request is being declined..."
                                    className="min-h-[80px] text-sm bg-white"
                                    disabled={isProcessing}
                                />
                                <p className="text-xs text-red-700">
                                    {declineReason.length < 20
                                        ? `Minimum 20 characters required (${declineReason.length}/20)`
                                        : '✓ Meets minimum length'
                                    }
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowDeclineForm(false)}
                                    disabled={isProcessing}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="default"
                                    onClick={handleDecline}
                                    disabled={isProcessing || declineReason.trim().length < 20}
                                    className="gap-2 bg-red-600 hover:bg-red-700 text-white"
                                >
                                    <XCircle className="h-4 w-4" />
                                    {isProcessing ? 'Declining...' : 'Confirm Decline'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Show approval/decline info for processed requests */}
                    {request.status === 'approved' && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
                            <p className="text-emerald-800">
                                <strong>Approved:</strong> {request.approvedCount} revision{request.approvedCount !== 1 ? 's' : ''}
                                {request.reviewedAt && ` on ${formatDate(request.reviewedAt)}`}
                                {request.reviewerName && ` by ${request.reviewerName}`}
                            </p>
                            {request.internalNotes && (
                                <p className="text-emerald-700 mt-1 text-xs">
                                    <em>Notes: {request.internalNotes}</em>
                                </p>
                            )}
                        </div>
                    )}

                    {request.status === 'declined' && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                            <p className="text-red-800">
                                <strong>Declined:</strong>
                                {request.reviewedAt && ` on ${formatDate(request.reviewedAt)}`}
                                {request.reviewerName && ` by ${request.reviewerName}`}
                            </p>
                            {request.declineReason && (
                                <p className="text-red-700 mt-1">
                                    Reason: {request.declineReason}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const AdminRevisionRequestsPanel: React.FC<AdminRevisionRequestsPanelProps> = ({
    requests,
    onApprove,
    onDecline,
}) => {
    const pendingRequests = requests.filter((r) => r.status === 'pending');
    const processedRequests = requests.filter((r) => r.status !== 'pending');

    if (requests.length === 0) {
        return (
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 text-center">
                <FolderOpen className="h-10 w-10 text-zinc-400 mx-auto mb-3" />
                <p className="text-sm text-zinc-600">No additional revision requests</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
                <div className="space-y-3">
                    <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-500" />
                        Pending Requests ({pendingRequests.length})
                    </h3>
                    <div className="space-y-2">
                        {pendingRequests.map((request) => (
                            <RequestItem
                                key={request.id}
                                request={request}
                                onApprove={(count, notes) => onApprove(request.id, count, notes)}
                                onDecline={(reason) => onDecline(request.id, reason)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Processed Requests */}
            {processedRequests.length > 0 && (
                <div className="space-y-3">
                    <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-zinc-400" />
                        Processed Requests ({processedRequests.length})
                    </h3>
                    <div className="space-y-2">
                        {processedRequests.map((request) => (
                            <RequestItem
                                key={request.id}
                                request={request}
                                onApprove={(count, notes) => onApprove(request.id, count, notes)}
                                onDecline={(reason) => onDecline(request.id, reason)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
