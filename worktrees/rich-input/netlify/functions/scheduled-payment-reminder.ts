/**
 * Scheduled Payment Reminder Job
 *
 * Sends payment reminder emails for pending balance payments:
 * - Finds payments pending for 7+ days
 * - Only sends reminders once per 7 days per payment
 *
 * Schedule: Daily at 9:00 AM UTC (2:30 PM IST)
 */

import type { Config, Context } from '@netlify/functions';
import { getPool, createLogger, generateCorrelationId } from './_shared';
import { sendPaymentReminderEmail } from './send-email';

export default async function handler(req: Request, context: Context) {
    const correlationId = generateCorrelationId();
    const logger = createLogger('scheduled-payment-reminder', correlationId);

    logger.info('Starting scheduled payment reminder check');

    const pool = getPool();

    try {
        // Find pending payments that are 7+ days old and haven't had a reminder in the last 7 days
        const result = await pool.query(`
            SELECT
                p.id as payment_id,
                p.amount,
                p.currency,
                p.created_at,
                p.last_reminder_sent,
                proj.project_number,
                proj.id as project_id,
                u.email as client_email,
                u.full_name as client_name
            FROM payments p
            JOIN projects proj ON p.project_id = proj.id
            JOIN users u ON proj.client_user_id = u.id
            WHERE p.status = 'pending'
                AND p.payment_type = 'balance'
                AND p.created_at < NOW() - INTERVAL '7 days'
                AND (p.last_reminder_sent IS NULL OR p.last_reminder_sent < NOW() - INTERVAL '7 days')
        `);

        const pendingPayments = result.rows;
        let remindersSent = 0;
        let remindersFailed = 0;

        for (const payment of pendingPayments) {
            const daysOverdue = Math.floor(
                (Date.now() - new Date(payment.created_at).getTime()) / (1000 * 60 * 60 * 24)
            );

            // Format amount (stored in smallest unit: paise/cents)
            const formattedAmount = (payment.amount / 100).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
            });

            const paymentUrl = `${process.env.APP_URL || 'https://portal.motionify.studio'}/projects/${payment.project_id}?tab=payments`;

            try {
                // Send actual email using Resend
                const emailResult = await sendPaymentReminderEmail({
                    to: payment.client_email,
                    clientName: payment.client_name,
                    projectNumber: payment.project_number,
                    amount: formattedAmount,
                    currency: payment.currency,
                    paymentUrl,
                    daysOverdue,
                });

                if (emailResult) {
                    // Mark reminder as sent
                    await pool.query('UPDATE payments SET last_reminder_sent = NOW() WHERE id = $1', [
                        payment.payment_id,
                    ]);
                    remindersSent++;

                    logger.info('Payment reminder sent', {
                        paymentId: payment.payment_id,
                        projectNumber: payment.project_number,
                        daysOverdue,
                    });
                } else {
                    remindersFailed++;
                    logger.error('Payment reminder email failed', undefined, {
                        paymentId: payment.payment_id,
                        clientEmail: payment.client_email.slice(0, 3) + '***',
                    });
                }
            } catch (emailError) {
                remindersFailed++;
                logger.error('Payment reminder failed', emailError, {
                    paymentId: payment.payment_id,
                });
            }
        }

        const stats = {
            pendingPaymentsFound: pendingPayments.length,
            remindersSent,
            remindersFailed,
        };

        logger.info('Payment reminder check completed', stats);

        return new Response(
            JSON.stringify({
                success: true,
                ...stats,
                timestamp: new Date().toISOString(),
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    } catch (error) {
        logger.error('Payment reminder check failed', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}

// Netlify Scheduled Function configuration
// Runs daily at 9:00 AM UTC (2:30 PM IST)
export const config: Config = {
    schedule: '0 9 * * *',
};
