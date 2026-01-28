'use client';

import { useAuth } from '@/context/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import PaymentButton from '@/components/payment/PaymentButton';
import Card from '@/lib/portal/components/ui/Card';
import {
  Download,
  CreditCard,
  CheckCircle2,
  Clock,
  Wallet,
  AlertCircle,
  Receipt,
  Calendar,
  Building2
} from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  paymentType: string;  // 'advance' | 'balance'
  status: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  paidAt: string | null;
  createdAt: string;
  project: {
    id: string;
    projectNumber: string;
    status: string;
  } | null;
  proposalDescription: string | null;
}

interface PaymentSummary {
  totalPaid: number;
  outstandingBalance: number;
  nextPaymentDue: Payment | null;
  currency: string;
}

function formatCurrency(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getPaymentTypeLabel(paymentType: string): { label: string; className: string } {
  switch (paymentType) {
    case 'advance':
      return {
        label: 'Advance Payment',
        className: 'bg-blue-100 text-blue-700 border-blue-200'
      };
    case 'balance':
      return {
        label: 'Final Payment',
        className: 'bg-purple-100 text-purple-700 border-purple-200'
      };
    default:
      return {
        label: paymentType,
        className: 'bg-gray-100 text-gray-700 border-gray-200'
      };
  }
}

function getStatusBadge(status: string): { label: string; className: string; icon: React.ReactNode } {
  switch (status) {
    case 'completed':
      return {
        label: 'Paid',
        className: 'bg-green-100 text-green-700 border-green-200',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />
      };
    case 'pending':
      return {
        label: 'Pending',
        className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        icon: <Clock className="w-3.5 h-3.5" />
      };
    case 'failed':
      return {
        label: 'Failed',
        className: 'bg-red-100 text-red-700 border-red-200',
        icon: <AlertCircle className="w-3.5 h-3.5" />
      };
    default:
      return {
        label: status,
        className: 'bg-gray-100 text-gray-700 border-gray-200',
        icon: <Clock className="w-3.5 h-3.5" />
      };
  }
}

export default function PaymentsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/payments/history?userId=${user.id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment history');
      }

      const data = await response.json();
      setPayments(data.payments || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isAuthLoading && user?.id) {
      fetchPayments();
    }
  }, [user?.id, isAuthLoading, fetchPayments]);

  // Calculate summary
  const summary: PaymentSummary = (() => {
    const currency = payments.length > 0 ? payments[0].currency : 'INR';
    const completedPayments = payments.filter(p => p.status === 'completed');
    const pendingPayments = payments.filter(p => p.status === 'pending');

    const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const outstandingBalance = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

    // Find next due payment (oldest pending payment)
    const nextPaymentDue = pendingPayments.length > 0
      ? pendingPayments.reduce((oldest, p) =>
          new Date(p.createdAt) < new Date(oldest.createdAt) ? p : oldest
        )
      : null;

    return { totalPaid, outstandingBalance, nextPaymentDue, currency };
  })();

  // Group payments by project
  const paymentsByProject = payments.reduce((acc, payment) => {
    const projectKey = payment.project?.projectNumber || 'No Project';
    if (!acc[projectKey]) {
      acc[projectKey] = [];
    }
    acc[projectKey].push(payment);
    return acc;
  }, {} as Record<string, Payment[]>);

  const handlePaymentSuccess = useCallback(() => {
    // Refresh the payments list after successful payment
    fetchPayments();
  }, [fetchPayments]);

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
        <AlertCircle className="w-12 h-12 mb-4" />
        <p>Please log in to view your payments</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
        <AlertCircle className="w-12 h-12 mb-4" />
        <p>{error}</p>
        <button
          onClick={fetchPayments}
          className="mt-4 px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="mt-1 text-gray-600">View your payment history and manage pending payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="!p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Paid</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(summary.totalPaid, summary.currency)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="!p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Outstanding Balance</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(summary.outstandingBalance, summary.currency)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="!p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Next Payment Due</p>
              <p className="text-xl font-bold text-gray-900">
                {summary.nextPaymentDue
                  ? formatCurrency(summary.nextPaymentDue.amount, summary.nextPaymentDue.currency)
                  : 'None'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Payments List */}
      {payments.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Receipt className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">No payments yet</p>
            <p className="text-sm mt-1">Your payment history will appear here</p>
          </div>
        </Card>
      ) : (
        Object.entries(paymentsByProject).map(([projectNumber, projectPayments]) => (
          <Card key={projectNumber} title={`Project: ${projectNumber}`}>
            <div className="space-y-4">
              {projectPayments.map((payment) => {
                const typeInfo = getPaymentTypeLabel(payment.paymentType);
                const statusInfo = getStatusBadge(payment.status);

                return (
                  <div
                    key={payment.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4"
                  >
                    {/* Payment Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Payment Type Badge */}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${typeInfo.className}`}>
                          {typeInfo.label}
                        </span>

                        {/* Status Badge */}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${statusInfo.className}`}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="font-semibold text-lg text-gray-900">
                          {formatCurrency(payment.amount, payment.currency)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {payment.paidAt
                            ? `Paid on ${formatDate(payment.paidAt)}`
                            : `Created ${formatDate(payment.createdAt)}`}
                        </span>
                      </div>

                      {payment.proposalDescription && (
                        <p className="text-sm text-gray-500 line-clamp-1">
                          {payment.proposalDescription}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      {payment.status === 'pending' && user && (
                        <PaymentButton
                          proposalId={payment.project?.id || ''}
                          amount={payment.amount}
                          currency={payment.currency as 'INR' | 'USD'}
                          clientEmail={user.email}
                          clientName={user.fullName || user.email}
                          onPaymentSuccess={handlePaymentSuccess}
                          variant="compact"
                        />
                      )}

                      {payment.status === 'completed' && payment.razorpayPaymentId && (
                        <a
                          href={`/api/payments/receipt/${payment.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Receipt
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
