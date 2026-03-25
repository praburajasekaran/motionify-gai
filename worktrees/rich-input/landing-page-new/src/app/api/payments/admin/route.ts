import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Admin Payments API
 *
 * Returns all payments with client information and filter support.
 * Only accessible by authenticated admin users.
 */

interface PaymentWithClient {
    id: string;
    amount: number;
    currency: string;
    paymentType: string;
    status: string;
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

interface PaymentSummary {
    totalAmount: number;
    pendingAmount: number;
    completedAmount: number;
    failedCount: number;
    totalCount: number;
    currency: string;
}

export async function GET(request: NextRequest) {
    try {
        // Get cookies for authentication proxy to Netlify function
        const cookies = request.headers.get('cookie') || '';
        const netlifyAuthUrl = process.env.NETLIFY_FUNCTIONS_URL
            ? `${process.env.NETLIFY_FUNCTIONS_URL}/auth-me`
            : 'http://localhost:8888/.netlify/functions/auth-me';

        // Verify authentication by calling auth-me endpoint
        const authResponse = await fetch(netlifyAuthUrl, {
            method: 'GET',
            headers: {
                'Cookie': cookies,
            },
        });

        if (!authResponse.ok) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Authentication required' },
                { status: 401 }
            );
        }

        const authData = await authResponse.json();

        // Check if user is admin (super_admin or project_manager)
        const adminRoles = ['super_admin', 'project_manager'];
        if (!authData.user || !adminRoles.includes(authData.user.role)) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Admin access required' },
                { status: 403 }
            );
        }

        // Parse query parameters for filtering
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const clientName = searchParams.get('clientName');
        const projectSearch = searchParams.get('projectSearch');

        // Build the query with JOINs to get client info
        const paymentsResult = await query(
            `SELECT
                p.id, p.amount, p.currency, p.payment_type, p.status,
                p.razorpay_order_id, p.razorpay_payment_id, p.paid_at, p.created_at,
                proj.id as project_id, proj.project_number, proj.status as project_status,
                u.id as client_id, u.full_name as client_name, u.email as client_email
            FROM payments p
            LEFT JOIN projects proj ON p.project_id = proj.id
            LEFT JOIN proposals prop ON p.proposal_id = prop.id
            LEFT JOIN users u ON proj.client_user_id = u.id
            WHERE 1=1
                AND ($1::text IS NULL OR p.status = $1)
                AND ($2::timestamp IS NULL OR p.created_at >= $2)
                AND ($3::timestamp IS NULL OR p.created_at <= $3)
                AND ($4::text IS NULL OR u.full_name ILIKE '%' || $4 || '%')
                AND ($5::text IS NULL OR proj.project_number ILIKE '%' || $5 || '%')
            ORDER BY p.created_at DESC`,
            [
                status || null,
                dateFrom || null,
                dateTo || null,
                clientName || null,
                projectSearch || null,
            ]
        );

        // Transform rows to camelCase response format
        const payments: PaymentWithClient[] = paymentsResult.rows.map((row) => ({
            id: row.id,
            amount: Number(row.amount),
            currency: row.currency,
            paymentType: row.payment_type,
            status: row.status,
            razorpayOrderId: row.razorpay_order_id,
            razorpayPaymentId: row.razorpay_payment_id,
            paidAt: row.paid_at,
            createdAt: row.created_at,
            projectId: row.project_id,
            projectNumber: row.project_number,
            projectStatus: row.project_status,
            clientId: row.client_id,
            clientName: row.client_name,
            clientEmail: row.client_email,
        }));

        // Calculate summary metrics
        const completedPayments = payments.filter(p => p.status === 'completed');
        const pendingPayments = payments.filter(p => p.status === 'pending');
        const failedPayments = payments.filter(p => p.status === 'failed');

        // Determine currency from data (default to INR)
        const primaryCurrency = payments.length > 0 ? payments[0].currency : 'INR';

        const summary: PaymentSummary = {
            totalAmount: completedPayments.reduce((sum, p) => sum + p.amount, 0),
            pendingAmount: pendingPayments.reduce((sum, p) => sum + p.amount, 0),
            completedAmount: completedPayments.reduce((sum, p) => sum + p.amount, 0),
            failedCount: failedPayments.length,
            totalCount: payments.length,
            currency: primaryCurrency,
        };

        console.log(`[Admin Payments API] Fetched ${payments.length} payment(s) with filters: status=${status}, dateFrom=${dateFrom}, dateTo=${dateTo}`);

        return NextResponse.json({
            success: true,
            payments,
            summary,
            count: payments.length,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Admin Payments API] Error:', errorMessage);
        console.error('Stack trace:', error instanceof Error ? error.stack : '');

        return NextResponse.json(
            { error: 'Failed to fetch admin payments', details: errorMessage },
            { status: 500 }
        );
    }
}
