import { Payment } from '../types';

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
