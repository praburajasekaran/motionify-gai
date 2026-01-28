import { Payment } from '../types';

// Admin Payment Types
export interface PaymentFilters {
    status?: 'pending' | 'completed' | 'failed' | 'all';
    dateFrom?: string;  // ISO date
    dateTo?: string;    // ISO date
    clientName?: string;
    projectSearch?: string;
}

export interface PaymentSummary {
    totalAmount: number;
    pendingAmount: number;
    completedAmount: number;
    failedCount: number;
    totalCount: number;
    currency: string;
}

export interface AdminPayment {
    id: string;
    amount: number;
    currency: string;
    paymentType: 'advance' | 'balance';
    status: 'pending' | 'completed' | 'failed';
    razorpayOrderId: string | null;
    razorpayPaymentId: string | null;
    paidAt: string | null;
    createdAt: string;
    projectId: string | null;
    projectNumber: string | null;
    projectStatus: string | null;
    clientId: string | null;
    clientName: string | null;
    clientEmail: string | null;
}

export interface AdminPaymentsResponse {
    success: boolean;
    payments: AdminPayment[];
    summary: PaymentSummary;
    count: number;
}

/**
 * Fetch all payments for admin dashboard with optional filters
 */
export async function fetchAllPayments(filters?: PaymentFilters): Promise<AdminPaymentsResponse> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);
    if (filters?.clientName) params.set('clientName', filters.clientName);
    if (filters?.projectSearch) params.set('projectSearch', filters.projectSearch);

    const queryString = params.toString();
    const url = queryString
        ? `/api/payments/admin?${queryString}`
        : '/api/payments/admin';

    const response = await fetch(url, {
        credentials: 'include',
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to fetch payments');
    }

    return response.json();
}

/**
 * Send payment reminder to client
 */
export async function sendPaymentReminder(paymentId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch('/.netlify/functions/payments/send-reminder', {
        method: 'POST',
        body: JSON.stringify({ paymentId }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send payment reminder');
    }

    return response.json();
}

export const fetchPaymentsForProject = async (projectId: string): Promise<Payment[]> => {
    try {
        const response = await fetch(`/.netlify/functions/payments?projectId=${projectId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch payments');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching payments:', error);
        return [];
    }
};

export const fetchPaymentsForProposal = async (proposalId: string): Promise<Payment[]> => {
    try {
        const response = await fetch(`/.netlify/functions/payments?proposalId=${proposalId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch payments');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching payments:', error);
        return [];
    }
};

export const markPaymentAsPaid = async (paymentId: string): Promise<Payment | null> => {
    try {
        const response = await fetch('/.netlify/functions/payments/manual-complete', {
            method: 'POST',
            body: JSON.stringify({ paymentId }),
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to mark payment as paid');
        }
        return await response.json();
    } catch (error) {
        console.error('Error marking payment as paid:', error);
        throw error;
    }
};
