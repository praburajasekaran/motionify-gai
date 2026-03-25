'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CreditCard, Download, ArrowLeft, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface Payment {
    id: string;
    amount: number;
    currency: string;
    paymentType: string;
    status: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    paidAt: string | null;
    createdAt: string;
    project: {
        id: string;
        projectNumber: string;
        status: string;
    } | null;
    proposalDescription: string;
}

function formatCurrency(amount: number, currency: string): string {
    const value = amount / 100;
    if (currency === 'USD') {
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    } else {
        return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function PaymentStatusBadge({ status }: { status: string }) {
    const statusConfig = {
        completed: {
            icon: CheckCircle2,
            className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            label: 'Completed',
        },
        pending: {
            icon: Clock,
            className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            label: 'Pending',
        },
        failed: {
            icon: XCircle,
            className: 'bg-red-100 text-red-700 border-red-200',
            label: 'Failed',
        },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${config.className}`}>
            <Icon className="w-4 h-4" />
            {config.label}
        </span>
    );
}

// Loading fallback for Suspense
function PaymentHistoryLoading() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white/80">Loading payment history...</p>
            </div>
        </div>
    );
}

// Main content component that uses useSearchParams
function PaymentHistoryContent() {
    const searchParams = useSearchParams();
    const userId = searchParams.get('userId');
    const projectId = searchParams.get('projectId');

    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchPayments() {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (userId) params.set('userId', userId);
                if (projectId) params.set('projectId', projectId);

                const response = await fetch(`/api/payments/history?${params.toString()}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch payment history');
                }

                const data = await response.json();
                setPayments(data.payments);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load payments');
            } finally {
                setLoading(false);
            }
        }

        if (userId || projectId) {
            fetchPayments();
        } else {
            setError('Please provide userId or projectId');
            setLoading(false);
        }
    }, [userId, projectId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white/80">Loading payment history...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 py-12">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                    <h1 className="text-4xl font-bold text-white mb-2">Payment History</h1>
                    <p className="text-white/60">
                        {payments.length} {payments.length === 1 ? 'transaction' : 'transactions'} found
                    </p>
                </div>

                {/* Payments List */}
                {payments.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
                        <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Payments Yet</h2>
                        <p className="text-gray-600">You haven't made any payments yet.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {payments.map((payment) => (
                            <div
                                key={payment.id}
                                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                            >
                                <div className="p-6">
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                        {/* Left: Payment Info */}
                                        <div className="flex-1">
                                            <div className="flex items-start gap-4">
                                                <div className="flex-shrink-0">
                                                    <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
                                                        <CreditCard className="w-6 h-6 text-violet-600" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="text-lg font-semibold text-gray-900">
                                                            {formatCurrency(payment.amount, payment.currency)}
                                                        </h3>
                                                        <PaymentStatusBadge status={payment.status} />
                                                    </div>
                                                    {payment.project && (
                                                        <p className="text-sm text-gray-600 mb-1">
                                                            Project: <span className="font-mono font-medium">{payment.project.projectNumber}</span>
                                                        </p>
                                                    )}
                                                    <p className="text-sm text-gray-500">
                                                        {payment.paidAt ? formatDate(payment.paidAt) : formatDate(payment.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Transaction Details */}
                                        <div className="lg:text-right">
                                            <div className="space-y-1 text-sm">
                                                <p className="text-gray-600">
                                                    Payment ID: <code className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{payment.razorpayPaymentId || 'Pending'}</code>
                                                </p>
                                                <p className="text-gray-600">
                                                    Order ID: <code className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{payment.razorpayOrderId}</code>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expandable Details */}
                                    {payment.proposalDescription && (
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">Description:</span> {payment.proposalDescription}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                {payment.status === 'completed' && (
                                    <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
                                        <Link
                                            href={`/payments/receipt/${payment.id}`}
                                            className="inline-flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 font-medium"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download Receipt
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Default export with Suspense wrapper
export default function PaymentHistoryPage() {
    return (
        <Suspense fallback={<PaymentHistoryLoading />}>
            <PaymentHistoryContent />
        </Suspense>
    );
}
