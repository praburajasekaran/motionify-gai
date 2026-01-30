import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
    CreditCard,
    Search,
    Filter,
    Calendar,
    Send,
    CheckCircle2,
    Clock,
    XCircle,
    RefreshCw,
    TrendingUp,
    AlertCircle,
    DollarSign,
    X,
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { Permissions } from '../../lib/permissions';
import {
    fetchAllPayments,
    sendPaymentReminder,
    PaymentFilters,
    PaymentSummary,
    AdminPayment,
} from '../../services/paymentApi';
import {
    cn,
    Button,
    Badge,
    Card,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Spinner,
} from '../../components/ui/design-system';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';

// Status badge color mapping
const STATUS_COLORS: Record<string, { variant: 'success' | 'warning' | 'destructive' | 'secondary'; icon: React.ElementType }> = {
    completed: { variant: 'success', icon: CheckCircle2 },
    pending: { variant: 'warning', icon: Clock },
    failed: { variant: 'destructive', icon: XCircle },
};

// Payment type badge colors
const PAYMENT_TYPE_COLORS: Record<string, string> = {
    advance: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    balance: 'bg-purple-50 text-purple-700 ring-purple-600/20',
};

interface StatCardProps {
    label: string;
    value: string | number;
    icon: React.ComponentType<{ className: string }>;
    color: 'blue' | 'amber' | 'green' | 'red' | 'purple';
    subtitle?: string;
}

function StatCard({ label, value, icon: Icon, color, subtitle }: StatCardProps) {
    const bgColors = {
        blue: 'bg-blue-500/10',
        amber: 'bg-amber-500/10',
        green: 'bg-green-500/10',
        red: 'bg-red-500/10',
        purple: 'bg-purple-500/10',
    };
    const iconColors = {
        blue: 'text-blue-500',
        amber: 'text-amber-500',
        green: 'text-green-500',
        red: 'text-red-500',
        purple: 'text-purple-500',
    };

    return (
        <div className="bg-white rounded-xl p-4 ring-1 ring-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600">{label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                    {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
                </div>
                <div className={`w-12 h-12 rounded-lg ${bgColors[color]} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${iconColors[color]}`} />
                </div>
            </div>
        </div>
    );
}

function formatCurrency(amount: number, currency: string = 'INR'): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function Payments() {
    const { user, isLoading: authLoading } = useAuthContext();
    const navigate = useNavigate();

    // Data state
    const [payments, setPayments] = useState<AdminPayment[]>([]);
    const [summary, setSummary] = useState<PaymentSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter state
    const [filters, setFilters] = useState<PaymentFilters>({
        status: 'all',
        dateFrom: '',
        dateTo: '',
        clientName: '',
        projectSearch: '',
    });

    // Reminder state
    const [sendingReminder, setSendingReminder] = useState<string | null>(null);
    const [reminderSuccess, setReminderSuccess] = useState<string | null>(null);

    const loadPayments = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetchAllPayments(filters);
            setPayments(response.payments);
            setSummary(response.summary);
        } catch (err) {
            console.error('Failed to load payments:', err);
            setError(err instanceof Error ? err.message : 'Failed to load payments');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        if (user) {
            loadPayments();
        }
    }, [user, loadPayments]);

    const handleFilterChange = (key: keyof PaymentFilters, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({
            status: 'all',
            dateFrom: '',
            dateTo: '',
            clientName: '',
            projectSearch: '',
        });
    };

    const hasActiveFilters =
        (filters.status && filters.status !== 'all') ||
        filters.dateFrom ||
        filters.dateTo ||
        filters.clientName ||
        filters.projectSearch;

    const handleSendReminder = async (paymentId: string) => {
        setSendingReminder(paymentId);
        setReminderSuccess(null);

        try {
            await sendPaymentReminder(paymentId);
            setReminderSuccess(paymentId);
            setTimeout(() => setReminderSuccess(null), 3000);
        } catch (err) {
            console.error('Failed to send reminder:', err);
            setError(err instanceof Error ? err.message : 'Failed to send reminder');
        } finally {
            setSendingReminder(null);
        }
    };

    const handleViewProject = (projectId: string | null) => {
        if (projectId) {
            navigate(`/projects/${projectId}`);
        }
    };

    // Wait for auth to load before checking permissions
    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Spinner className="w-8 h-8" />
            </div>
        );
    }

    // Permission check - Only admins can access payments dashboard
    if (!Permissions.canManageProjects(user)) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
                            <p className="text-gray-600">Track and manage all payment transactions</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadPayments}
                        disabled={loading}
                        className="gap-2"
                    >
                        <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatCard
                        label="Total Revenue"
                        value={formatCurrency(summary.completedAmount, summary.currency)}
                        icon={TrendingUp}
                        color="green"
                        subtitle={`${summary.totalCount} transactions`}
                    />
                    <StatCard
                        label="Pending Amount"
                        value={formatCurrency(summary.pendingAmount, summary.currency)}
                        icon={Clock}
                        color="amber"
                    />
                    <StatCard
                        label="Completed"
                        value={formatCurrency(summary.completedAmount, summary.currency)}
                        icon={CheckCircle2}
                        color="blue"
                    />
                    <StatCard
                        label="Failed Payments"
                        value={summary.failedCount}
                        icon={AlertCircle}
                        color="red"
                    />
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 ring-1 ring-gray-200 shadow-sm mb-6">
                <div className="flex flex-col lg:flex-row gap-4 items-end">
                    {/* Status Filter */}
                    <div className="w-full lg:w-40">
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Status
                        </label>
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={filters.status || 'all'}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent appearance-none cursor-pointer"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="failed">Failed</option>
                            </select>
                        </div>
                    </div>

                    {/* Date From */}
                    <div className="w-full lg:w-44">
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            From Date
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                value={filters.dateFrom || ''}
                                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Date To */}
                    <div className="w-full lg:w-44">
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            To Date
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                value={filters.dateTo || ''}
                                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Client Name */}
                    <div className="flex-1 min-w-0">
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Client Name
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by client name..."
                                value={filters.clientName || ''}
                                onChange={(e) => handleFilterChange('clientName', e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Project Search */}
                    <div className="w-full lg:w-48">
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            Project #
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="PRJ-..."
                                value={filters.projectSearch || ''}
                                onChange={(e) => handleFilterChange('projectSearch', e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Clear Button */}
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="gap-1.5 text-gray-600 hover:text-gray-900"
                        >
                            <X className="w-4 h-4" />
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm p-12 text-center">
                    <Spinner className="w-8 h-8 mx-auto mb-4" />
                    <p className="text-gray-700">Loading payments...</p>
                </div>
            ) : error ? (
                <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm">
                    <ErrorState error={error} onRetry={loadPayments} />
                </div>
            ) : payments.length === 0 ? (
                <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm">
                    <EmptyState
                        icon={CreditCard}
                        title="No payments found"
                        description={
                            hasActiveFilters
                                ? 'Try adjusting your filters'
                                : 'Payment records will appear here when clients make transactions'
                        }
                    />
                </div>
            ) : (
                /* Payments Table */
                <div className="bg-white rounded-xl ring-1 ring-gray-200 shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead className="font-semibold">Date</TableHead>
                                <TableHead className="font-semibold">Client</TableHead>
                                <TableHead className="font-semibold">Project</TableHead>
                                <TableHead className="font-semibold">Type</TableHead>
                                <TableHead className="font-semibold text-right">Amount</TableHead>
                                <TableHead className="font-semibold">Status</TableHead>
                                <TableHead className="font-semibold text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments.map((payment) => {
                                const statusConfig = STATUS_COLORS[payment.status] || STATUS_COLORS.pending;
                                const StatusIcon = statusConfig.icon;

                                return (
                                    <TableRow key={payment.id} className="hover:bg-gray-50">
                                        <TableCell className="whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {formatDate(payment.createdAt)}
                                            </div>
                                            {payment.paidAt && (
                                                <div className="text-xs text-gray-500">
                                                    Paid: {formatDateTime(payment.paidAt)}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {payment.clientName ? (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {payment.clientName}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {payment.clientEmail}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {payment.projectNumber ? (
                                                <button
                                                    onClick={() => handleViewProject(payment.projectId)}
                                                    className="text-sm font-mono text-violet-600 hover:text-violet-800 hover:underline"
                                                >
                                                    {payment.projectNumber}
                                                </button>
                                            ) : (
                                                <span className="text-gray-400 text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={cn(
                                                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 capitalize',
                                                    PAYMENT_TYPE_COLORS[payment.paymentType] ||
                                                        'bg-gray-50 text-gray-700 ring-gray-600/20'
                                                )}
                                            >
                                                {payment.paymentType}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="text-sm font-semibold text-gray-900">
                                                {formatCurrency(payment.amount, payment.currency)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={statusConfig.variant} className="gap-1 capitalize">
                                                <StatusIcon className="w-3 h-3" />
                                                {payment.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {payment.status === 'pending' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleSendReminder(payment.id)}
                                                        disabled={sendingReminder === payment.id}
                                                        className={cn(
                                                            'gap-1.5 text-xs',
                                                            reminderSuccess === payment.id &&
                                                                'text-green-600'
                                                        )}
                                                    >
                                                        {sendingReminder === payment.id ? (
                                                            <Spinner className="w-3 h-3" />
                                                        ) : reminderSuccess === payment.id ? (
                                                            <CheckCircle2 className="w-3 h-3" />
                                                        ) : (
                                                            <Send className="w-3 h-3" />
                                                        )}
                                                        {reminderSuccess === payment.id ? 'Sent!' : 'Remind'}
                                                    </Button>
                                                )}
                                                {payment.projectId && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleViewProject(payment.projectId)}
                                                        className="text-xs"
                                                    >
                                                        View
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>

                    {/* Results Count */}
                    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                        <p className="text-sm text-gray-600">
                            Showing {payments.length} payment{payments.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
