import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const projectId = searchParams.get('projectId');

        if (!userId && !projectId) {
            return NextResponse.json(
                { error: 'Either userId or projectId is required' },
                { status: 400 }
            );
        }

        let paymentsResult;

        if (projectId) {
            // Fetch payments for a specific project
            paymentsResult = await query(
                `SELECT 
          p.id,
          p.amount,
          p.currency,
          p.payment_type,
          p.status,
          p.razorpay_order_id,
          p.razorpay_payment_id,
          p.razorpay_signature,
          p.paid_at,
          p.created_at,
          proj.id as project_id,
          proj.project_number,
          proj.status as project_status,
          prop.description as proposal_description
         FROM payments p
         LEFT JOIN projects proj ON p.project_id = proj.id
         LEFT JOIN proposals prop ON p.proposal_id = prop.id
         WHERE p.project_id = $1
         ORDER BY p.created_at DESC`,
                [projectId]
            );
        } else if (userId) {
            // Fetch all payments for a user's projects
            paymentsResult = await query(
                `SELECT 
          p.id,
          p.amount,
          p.currency,
          p.payment_type,
          p.status,
          p.razorpay_order_id,
          p.razorpay_payment_id,
          p.razorpay_signature,
          p.paid_at,
          p.created_at,
          proj.id as project_id,
          proj.project_number,
          proj.status as project_status,
          prop.description as proposal_description
         FROM payments p
         LEFT JOIN projects proj ON p.project_id = proj.id
         LEFT JOIN proposals prop ON p.proposal_id = prop.id
         WHERE proj.client_user_id = $1
         ORDER BY p.created_at DESC`,
                [userId]
            );
        }

        const payments = paymentsResult!.rows.map((row) => ({
            id: row.id,
            amount: row.amount,
            currency: row.currency,
            paymentType: row.payment_type,
            status: row.status,
            razorpayOrderId: row.razorpay_order_id,
            razorpayPaymentId: row.razorpay_payment_id,
            paidAt: row.paid_at,
            createdAt: row.created_at,
            project: row.project_id ? {
                id: row.project_id,
                projectNumber: row.project_number,
                status: row.project_status,
            } : null,
            proposalDescription: row.proposal_description,
        }));

        console.log(`✅ Fetched ${payments.length} payment(s) for ${userId ? 'user' : 'project'}`);

        return NextResponse.json({
            success: true,
            payments,
            count: payments.length,
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching payment history:', errorMessage);
        console.error('Stack trace:', error instanceof Error ? error.stack : '');

        return NextResponse.json(
            { error: 'Failed to fetch payment history', details: errorMessage },
            { status: 500 }
        );
    }
}
