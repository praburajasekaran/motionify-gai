import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
    Link2,
    RotateCcw,
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { Permissions } from '../../lib/permissions';
import {
    fetchAllPayments,
    sendPaymentReminder,
    linkPaymentToProject,
    refundPayment,
    fetchProjectsForLinking,
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
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

// Status badge color mapping
const STATUS_COLORS: Record<string, { variant: 'success' | 'warning' | 'destructive' | 'secondary'; icon: React.ElementType }> = {
    completed: { variant: 'success', icon: CheckCircle2 },
    pending: { variant: 'warning', icon: Clock },
    failed: { variant: 'destructive', icon: XCircle },
    refunded: { variant: 'secondary', icon: RotateCcw },
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
        <div className="bg-card rounded-xl p-4 ring-1 ring-border shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
                    {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
                </div>
                <div className={`w-12 h-12 rounded-lg ${bgColors[color]} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${iconColors[color]}`} />
                </div>
            </div>
        </div>
    );
}

function formatCurrency(amount: number, currency: string = 'INR'): string {
    const locale = currency === 'USD' ? 'en-US' : 'en-IN';
    return new Intl.NumberFormat(locale, {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount / 100);
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

    // API filters (status/date) — changes trigger server fetch
    const [apiFilters, setApiFilters] = useState<Pick<PaymentFilters, 'status' | 'dateFrom' | 'dateTo'>>({
        status: 'all',
        dateFrom: '',
        dateTo: '',
    });

    // Text search — filtered client-side, no API call needed
    const [clientName, setClientName] = useState('');
    const [projectSearch, setProjectSearch] = useState('');

    // Reminder state
    const [sendingReminder, setSendingReminder] = useState<string | null>(null);
    const [reminderSuccess, setReminderSuccess] = useState<string | null>(null);

    // Link to project state
    const [linkModalPayment, setLinkModalPayment] = useState<AdminPayment | null>(null);
    const [availableProjects, setAvailableProjects] = useState<Array<{ id: string; projectNumber: string; clientName: string }>>([]);
    const [projectSearchQuery, setProjectSearchQuery] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [linking, setLinking] = useState(false);

    // Refund state
    const [refundPaymentTarget, setRefundPaymentTarget] = useState<AdminPayment | null>(null);
    const [refunding, setRefunding] = useState(false);

    const apiFiltersRef = useRef(apiFilters);
    apiFiltersRef.current = apiFilters;

    const loadPayments = useCallback(async (signal?: AbortSignal) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetchAllPayments(apiFiltersRef.current, signal);
            // Backend may return a raw array or { payments, summary } object
            if (Array.isArray(response)) {
                setPayments(response);
                setSummary(null);
            } else {
                setPayments(response.payments ?? []);
                setSummary(response.summary ?? null);
            }
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') return;
            console.error('Failed to load payments:', err);
            setError(err instanceof Error ? err.message : 'Failed to load payments');
        } finally {
            setLoading(false);
        }
    }, []);

    // Only re-fetch from API when status/date filters change
    useEffect(() => {
        if (!user) return;
        const controller = new AbortController();
        loadPayments(controller.signal);
        return () => controller.abort();
    }, [user, apiFilters, loadPayments]);

    // Client-side text filtering (instant, no API call)
    const filteredPayments = useMemo(() => {
        let result = payments;
        const cn = clientName.toLowerCase().trim();
        const ps = projectSearch.toLowerCase().trim();
        if (cn) {
            result = result.filter((p) => p.clientName?.toLowerCase().includes(cn));
        }
        if (ps) {
            result = result.filter((p) => p.projectNumber?.toLowerCase().includes(ps));
        }
        return result;
    }, [payments, clientName, projectSearch]);

    const handleFilterChange = (key: keyof PaymentFilters, value: string) => {
        if (key === 'clientName') setClientName(value);
        else if (key === 'projectSearch') setProjectSearch(value);
        else setApiFilters((prev) => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setApiFilters({ status: 'all', dateFrom: '', dateTo: '' });
        setClientName('');
        setProjectSearch('');
    };

    const hasActiveFilters =
        (apiFilters.status && apiFilters.status !== 'all') ||
        apiFilters.dateFrom ||
        apiFilters.dateTo ||
        clientName ||
        projectSearch;

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

    const handleOpenLinkModal = async (payment: AdminPayment) => {
        setLinkModalPayment(payment);
        setSelectedProjectId(null);
        setProjectSearchQuery('');
        try {
            const projects = await fetchProjectsForLinking();
            setAvailableProjects(projects);
        } catch (err) {
            console.error('Failed to fetch projects:', err);
            setAvailableProjects([]);
        }
    };

    const handleLinkProject = async () => {
        if (!linkModalPayment || !selectedProjectId) return;
        setLinking(true);
        try {
            await linkPaymentToProject(linkModalPayment.id, selectedProjectId);
            setLinkModalPayment(null);
            loadPayments();
        } catch (err) {
            console.error('Failed to link payment:', err);
            setError(err instanceof Error ? err.message : 'Failed to link payment');
        } finally {
            setLinking(false);
        }
    };

    const handleRefund = async () => {
        if (!refundPaymentTarget) return;
        setRefunding(true);
        try {
            await refundPayment(refundPaymentTarget.id);
            setRefundPaymentTarget(null);
            loadPayments();
        } catch (err) {
            console.error('Failed to refund payment:', err);
            setError(err instanceof Error ? err.message : 'Failed to refund payment');
        } finally {
            setRefunding(false);
        }
    };

    const filteredProjects = availableProjects.filter((p) =>
        p.projectNumber.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
        p.clientName.toLowerCase().includes(projectSearchQuery.toLowerCase())
    );

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
                            <h1 className="text-3xl font-bold text-foreground">Payments</h1>
                            <p className="text-muted-foreground">Track and manage all payment transactions</p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadPayments()}
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
            <div className="bg-card rounded-xl p-4 ring-1 ring-border shadow-sm mb-6">
                <div className="flex flex-col lg:flex-row gap-4 items-end">
                    {/* Status Filter */}
                    <div className="w-full lg:w-40">
                        <label className="block text-xs font-medium text-foreground mb-1.5">
                            Status
                        </label>
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <select
                                value={apiFilters.status || 'all'}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent appearance-none cursor-pointer"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="failed">Failed</option>
                                <option value="refunded">Refunded</option>
                            </select>
                        </div>
                    </div>

                    {/* Date From */}
                    <div className="w-full lg:w-44">
                        <label className="block text-xs font-medium text-foreground mb-1.5">
                            From Date
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="date"
                                value={apiFilters.dateFrom || ''}
                                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Date To */}
                    <div className="w-full lg:w-44">
                        <label className="block text-xs font-medium text-foreground mb-1.5">
                            To Date
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="date"
                                value={apiFilters.dateTo || ''}
                                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Client Name */}
                    <div className="flex-1 min-w-0">
                        <label className="block text-xs font-medium text-foreground mb-1.5">
                            Client Name
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search by client name..."
                                value={clientName}
                                onChange={(e) => handleFilterChange('clientName', e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-muted border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Project Search */}
                    <div className="w-full lg:w-48">
                        <label className="block text-xs font-medium text-foreground mb-1.5">
                            Project #
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="PRJ-..."
                                value={projectSearch}
                                onChange={(e) => handleFilterChange('projectSearch', e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-muted border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Clear Button */}
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="gap-1.5 text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4" />
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="bg-card rounded-xl ring-1 ring-border shadow-sm p-12 text-center">
                    <Spinner className="w-8 h-8 mx-auto mb-4" />
                    <p className="text-foreground">Loading payments...</p>
                </div>
            ) : error ? (
                <div className="bg-card rounded-xl ring-1 ring-border shadow-sm">
                    <ErrorState error={error} onRetry={() => loadPayments()} />
                </div>
            ) : filteredPayments.length === 0 ? (
                <div className="bg-card rounded-xl ring-1 ring-border shadow-sm">
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
                <div className="bg-card rounded-xl ring-1 ring-border shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted">
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
                            {filteredPayments.map((payment) => {
                                const statusConfig = STATUS_COLORS[payment.status] || STATUS_COLORS.pending;
                                const StatusIcon = statusConfig.icon;

                                return (
                                    <TableRow key={payment.id} className="hover:bg-muted">
                                        <TableCell className="whitespace-nowrap">
                                            <div className="text-sm font-medium text-foreground">
                                                {formatDate(payment.createdAt)}
                                            </div>
                                            {payment.paidAt && (
                                                <div className="text-xs text-muted-foreground">
                                                    Paid: {formatDateTime(payment.paidAt)}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {payment.clientName ? (
                                                <div>
                                                    <div className="text-sm font-medium text-foreground">
                                                        {payment.clientName}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {payment.clientEmail}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
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
                                            ) : payment.status !== 'refunded' ? (
                                                <button
                                                    onClick={() => handleOpenLinkModal(payment)}
                                                    className="inline-flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 hover:underline"
                                                >
                                                    <Link2 className="w-3 h-3" />
                                                    Link to project
                                                </button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={cn(
                                                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 capitalize',
                                                    PAYMENT_TYPE_COLORS[payment.paymentType] ||
                                                        'bg-muted text-foreground ring-gray-600/20'
                                                )}
                                            >
                                                {payment.paymentType}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <span className={cn(
                                                    'text-[10px] font-semibold px-1 py-0.5 rounded',
                                                    payment.currency === 'USD'
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : 'bg-orange-50 text-orange-700'
                                                )}>
                                                    {payment.currency}
                                                </span>
                                                <span className="text-sm font-semibold text-foreground">
                                                    {formatCurrency(payment.amount, payment.currency)}
                                                </span>
                                            </div>
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
                                                {payment.status === 'completed' && !payment.projectId && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setRefundPaymentTarget(payment)}
                                                        className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <RotateCcw className="w-3 h-3" />
                                                        Refund
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
                    <div className="px-4 py-3 border-t border-border bg-muted">
                        <p className="text-sm text-muted-foreground">
                            Showing {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            )}

            {/* Link to Project Modal */}
            <Modal
                isOpen={!!linkModalPayment}
                onClose={() => setLinkModalPayment(null)}
                title="Link Payment to Project"
                size="sm"
            >
                <div className="p-6 space-y-4">
                    {linkModalPayment && (
                        <div className="bg-muted rounded-lg p-3 text-sm">
                            <p className="text-foreground font-medium">
                                {formatCurrency(linkModalPayment.amount, linkModalPayment.currency)}
                            </p>
                            <p className="text-muted-foreground">
                                {linkModalPayment.clientName || 'Unknown client'} &middot; {formatDate(linkModalPayment.createdAt)}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            Select a project
                        </label>
                        <div className="relative mb-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={projectSearchQuery}
                                onChange={(e) => setProjectSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                            />
                        </div>
                        <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                            {filteredProjects.length === 0 ? (
                                <p className="text-sm text-muted-foreground p-3 text-center">
                                    No projects found
                                </p>
                            ) : (
                                filteredProjects.map((project) => (
                                    <button
                                        key={project.id}
                                        onClick={() => setSelectedProjectId(project.id)}
                                        className={cn(
                                            'w-full text-left px-3 py-2.5 text-sm flex items-center justify-between hover:bg-muted transition-colors border-b border-border last:border-b-0',
                                            selectedProjectId === project.id && 'bg-violet-50 ring-1 ring-violet-200'
                                        )}
                                    >
                                        <div>
                                            <span className="font-mono font-medium text-foreground">{project.projectNumber}</span>
                                            <span className="text-muted-foreground ml-2">{project.clientName}</span>
                                        </div>
                                        {selectedProjectId === project.id && (
                                            <CheckCircle2 className="w-4 h-4 text-violet-600 flex-shrink-0" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" size="sm" onClick={() => setLinkModalPayment(null)}>
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleLinkProject}
                            disabled={!selectedProjectId || linking}
                            className="gap-1.5"
                        >
                            {linking ? <Spinner className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                            {linking ? 'Linking...' : 'Link Payment'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Refund Confirmation Dialog */}
            <ConfirmDialog
                isOpen={!!refundPaymentTarget}
                onClose={() => setRefundPaymentTarget(null)}
                onConfirm={handleRefund}
                title="Refund Payment"
                message={
                    refundPaymentTarget
                        ? `Are you sure you want to refund ${formatCurrency(refundPaymentTarget.amount, refundPaymentTarget.currency)} to ${refundPaymentTarget.clientName || 'the client'}? ${refundPaymentTarget.razorpayPaymentId ? 'This will initiate a Razorpay refund.' : 'This payment has no Razorpay ID — it will be marked as refunded manually.'}`
                        : ''
                }
                confirmLabel="Refund"
                variant="danger"
                isLoading={refunding}
            />
        </div>
    );
}
