import React, { useEffect, useState } from 'react';
import { Download, CreditCard, Calendar, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, EmptyState } from '../ui/design-system';
import { Payment, Project } from '../../types';
import { fetchPaymentsForProject } from '../../services/paymentApi';
import { formatTimestamp, formatDateTime } from '../../utils/dateFormatting';
import { formatCurrency } from '../../utils/format';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { getProposalById } from '../../lib/proposals';

interface PaymentHistoryProps {
    project: Project;
}

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({ project }) => {
    const navigate = useNavigate();
    const { user } = useAuthContext();
    const primaryClient = user?.role === 'client' && user.projectTeamMemberships?.[project.id]?.isPrimaryContact === true;
    const [balanceAmount, setBalanceAmount] = useState<number | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        const loadPayments = async () => {
            if (!project.id) return;
            try {
                setLoading(true);
                setError(null);
                const [data, proposal] = await Promise.all([
                    fetchPaymentsForProject(project.id),
                    primaryClient && project.proposal_id ? getProposalById(project.proposal_id) : Promise.resolve(null),
                ]);
                if (!active) return;
                setPayments(data);
                setBalanceAmount(proposal?.status === 'accepted' ? proposal.balanceAmount : null);
            } catch (err) {
                console.error('Failed to load payments:', err);
                if (active) setError('Failed to load payment history.');
            } finally {
                if (active) setLoading(false);
            }
        };

        loadPayments();
        return () => { active = false; };
    }, [project.id, project.proposal_id, primaryClient]);

    const canPayBalance = primaryClient && project.proposal_id && balanceAmount !== null && balanceAmount > 0
        && payments.some(payment => payment.payment_type === 'advance' && payment.status === 'completed')
        && !payments.some(payment => payment.payment_type === 'balance' && payment.status === 'completed');

    const paidByCurrency = new Map<string, number>();
    for (const payment of payments) {
        if (payment.status === 'completed') {
            paidByCurrency.set(payment.currency,
                (paidByCurrency.get(payment.currency) || 0) + Number(payment.amount));
        }
    }

    const getStatusBadge = (status: Payment['status']) => {
        switch (status) {
            case 'completed':
                return <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Paid</Badge>;
            case 'pending':
                return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
            case 'failed':
                return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading payment history...</div>;
    }

    if (error) {
        return (
            <div className="p-8 text-center bg-red-50 text-red-600 rounded-lg border border-red-100 flex flex-col items-center gap-2">
                <AlertTriangle className="h-8 w-8" />
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {canPayBalance && (
                <Button onClick={() => navigate(`/payment/${project.proposal_id}?paymentType=balance`)}>
                    Pay balance
                </Button>
            )}
            <div className="grid grid-cols-1 gap-4">
                <Card className="bg-card border-border">
                    <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground mb-1">Total Paid</p>
                        {paidByCurrency.size === 0 ? (
                            <p className="text-sm text-muted-foreground">No completed payments</p>
                        ) : Array.from(paidByCurrency, ([currency, amount]) => (
                            <p key={currency} className="text-2xl font-bold text-emerald-600">
                                {formatCurrency(amount, currency)}
                            </p>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <Card className="border-0 shadow-sm bg-card overflow-hidden">
                <CardHeader className="border-b border-border bg-accent pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        Transaction History
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {payments.length === 0 ? (
                        <EmptyState
                            title="No payments found"
                            description="There are no payment records for this project yet."
                            icon={CreditCard}
                            className="py-12"
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground font-medium">
                                    <tr>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Description</th>
                                        <th className="px-6 py-3">Amount</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Invoice</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {payments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-accent transition-colors">
                                            <td className="px-6 py-4 text-muted-foreground">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-2" title={formatDateTime(payment.created_at) || undefined}>
                                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                                        {formatTimestamp(payment.created_at) || formatDate(payment.created_at)}
                                                    </div>
                                                    {payment.paid_at && (
                                                        <div className="flex items-center gap-2 text-xs text-emerald-600" title={formatDateTime(payment.paid_at) || undefined}>
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            Paid {formatTimestamp(payment.paid_at)}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-medium text-foreground capitalize">
                                                    {payment.payment_type} Payment
                                                </span>
                                                <p className="text-xs text-muted-foreground">
                                                    ID: {payment.razorpay_payment_id || payment.id.slice(0, 8)}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 font-mono font-medium text-foreground">
                                                {formatCurrency(Number(payment.amount), payment.currency)}
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(payment.status)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {payment.invoice_url ? (
                                                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-primary" onClick={() => window.open(payment.invoice_url, '_blank')}>
                                                        <Download className="h-4 w-4 mr-1" /> PDF
                                                    </Button>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
