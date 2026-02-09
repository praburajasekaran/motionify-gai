import { NextRequest, NextResponse } from 'next/server';
import { query, transaction } from '@/lib/db';
import { sendWelcomeEmail } from '@/lib/email';
import { sendClientPaymentAndProjectEmail, sendAdminPaymentAndProjectEmail } from '@/lib/email/emailService';

interface CreateClientRequest {
    email: string;
    name: string;
    projectId: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: CreateClientRequest = await request.json();
        const { email, name, projectId } = body;

        if (!email || !name || !projectId) {
            return NextResponse.json(
                { error: 'Missing required fields: email, name, projectId' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Use transaction to ensure all operations succeed or fail together
        const result = await transaction(async (client) => {
            // Check if user already exists
            const existingUserResult = await client.query(
                'SELECT id, email, full_name, role FROM users WHERE email = $1',
                [email.toLowerCase()]
            );

            let user;

            if (existingUserResult.rows.length > 0) {
                // User exists, just return the existing user
                user = existingUserResult.rows[0];
                console.log('✅ User already exists:', user.id);
            } else {
                // Create new user
                const newUserResult = await client.query(
                    `INSERT INTO users (email, full_name, role, is_active)
           VALUES ($1, $2, $3, $4)
           RETURNING id, email, full_name, role, created_at`,
                    [email.toLowerCase(), name, 'client', true]
                );

                user = newUserResult.rows[0];
                console.log('✅ New user created:', user.id);
            }

            // Update project with client_user_id
            await client.query(
                'UPDATE projects SET client_user_id = $1 WHERE id = $2',
                [user.id, projectId]
            );

            // Add client to project_team as primary contact
            await client.query(
                `INSERT INTO project_team (user_id, project_id, role, is_primary_contact, added_at)
                 VALUES ($1, $2, 'client', true, NOW())
                 ON CONFLICT (user_id, project_id) DO NOTHING`,
                [user.id, projectId]
            );

            // Get the updated project
            const projectResult = await client.query(
                `SELECT 
          p.id,
          p.project_number,
          p.inquiry_id,
          p.proposal_id,
          p.status,
          p.created_at
         FROM projects p
         WHERE p.id = $1`,
                [projectId]
            );

            if (projectResult.rows.length === 0) {
                throw new Error('Project not found');
            }

            const project = projectResult.rows[0];

            // Update inquiry status to 'converted'
            await client.query(
                `UPDATE inquiries 
         SET status = 'converted' 
         WHERE id = $1`,
                [project.inquiry_id]
            );

            return { user, project };
        });

        console.log('✅ Client user created/updated successfully:', {
            userId: result.user.id,
            email: result.user.email,
            projectId: result.project.id,
            projectNumber: result.project.project_number,
        });

        // Send welcome email asynchronously
        sendWelcomeEmail({
            email: result.user.email,
            name: result.user.full_name,
            projectNumber: result.project.project_number,
            projectId: result.project.id,
        }).catch(err => {
            console.error('⚠️ Failed to send welcome email:', err);
        });

        // Send payment + project notification emails (fire-and-forget)
        (async () => {
            try {
                // Fetch payment and inquiry details for the emails
                const [paymentResult, inquiryResult] = await Promise.all([
                    query(
                        'SELECT amount, currency, razorpay_payment_id FROM payments WHERE proposal_id = $1 ORDER BY created_at DESC LIMIT 1',
                        [result.project.proposal_id]
                    ),
                    query(
                        'SELECT company_name FROM inquiries WHERE id = $1',
                        [result.project.inquiry_id]
                    ),
                ]);

                const payment = paymentResult.rows[0];
                const inquiry = inquiryResult.rows[0];

                if (!payment) {
                    console.warn('⚠️ No payment found for proposal, skipping payment notification emails');
                    return;
                }

                // Amount is stored in smallest unit (paise/cents), convert to major unit
                const amountInMajorUnit = payment.amount / 100;

                // Client email
                sendClientPaymentAndProjectEmail({
                    to: result.user.email,
                    customerName: result.user.full_name,
                    amount: amountInMajorUnit,
                    currency: payment.currency,
                    projectNumber: result.project.project_number,
                    projectId: result.project.id,
                    transactionId: payment.razorpay_payment_id,
                }).catch(err => {
                    console.error('⚠️ Failed to send client payment notification email:', err);
                });

                // Admin email
                sendAdminPaymentAndProjectEmail({
                    clientName: result.user.full_name,
                    clientEmail: result.user.email,
                    companyName: inquiry?.company_name,
                    amount: amountInMajorUnit,
                    currency: payment.currency,
                    razorpayPaymentId: payment.razorpay_payment_id,
                    projectNumber: result.project.project_number,
                    projectId: result.project.id,
                }).catch(err => {
                    console.error('⚠️ Failed to send admin payment notification email:', err);
                });
            } catch (err) {
                console.error('⚠️ Failed to fetch data for payment notification emails:', err);
            }
        })();

        return NextResponse.json({
            success: true,
            user: {
                id: result.user.id,
                email: result.user.email,
                name: result.user.full_name,
                role: result.user.role,
            },
            project: {
                id: result.project.id,
                projectNumber: result.project.project_number,
                status: result.project.status,
            },
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error creating/updating client user:', errorMessage);
        console.error('Stack trace:', error instanceof Error ? error.stack : '');

        return NextResponse.json(
            { error: 'Failed to create/update client user', details: errorMessage },
            { status: 500 }
        );
    }
}
