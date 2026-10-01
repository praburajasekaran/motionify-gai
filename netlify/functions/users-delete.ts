/**
 * DELETE /api/users-delete/:userId
 *
 * Deactivate a user (soft delete). Super Admin only.
 * Preserves historical data for audit purposes.
 *
 * Test Cases:
 * - TC-AD-003: Prevent deactivating the last Super Admin
 */

import {
    transaction,
    getCorsHeaders,
    uuidSchema,
    z,
    parseJsonBody,
    createLogger,
    getCorrelationId,
} from './_shared';
import { compose, withCORS, withSuperAdmin, withRateLimit, type NetlifyEvent as MWNetlifyEvent, type NetlifyResponse as MWNetlifyResponse, type AuthResult } from './_shared/middleware';
import { RATE_LIMITS } from './_shared/rateLimit';
import { sendUserDeactivationEmail, type EmailDeliveryResult } from './send-email';

interface NetlifyEvent {
    httpMethod: string;
    headers: Record<string, string>;
    path: string;
    body: string | null;
}

interface NetlifyResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
}

// Request body schema
const deleteUserSchema = z.object({
    reason: z.string().max(500).optional(),
});

interface DeactivateUserInput {
    userId: string;
    reason: string;
    correlationId?: string;
}

interface DeactivateUserDependencies {
    sendNotification?: (
        data: Parameters<typeof sendUserDeactivationEmail>[0]
    ) => Promise<EmailDeliveryResult>;
}

interface DeactivateUserResult {
    success: true;
    message: string;
    emailDelivery: { status: EmailDeliveryResult['status'] };
}

export async function deactivateUserAccount(
    input: DeactivateUserInput,
    dependencies: DeactivateUserDependencies = {}
): Promise<DeactivateUserResult> {
    const user = await transaction(async (client) => {
        const existingUser = await client.query(
            'SELECT id, email, full_name, role FROM users WHERE id = $1',
            [input.userId]
        );

        if (existingUser.rows.length === 0) {
            throw { statusCode: 404, error: 'User not found' };
        }

        const target = existingUser.rows[0];

        if (target.role === 'super_admin') {
            const superAdminCount = await client.query(
                `SELECT COUNT(*) as count FROM users WHERE role = 'super_admin' AND is_active = true`
            );
            const activeSuper = parseInt(superAdminCount.rows[0].count, 10);

            if (activeSuper <= 1) {
                throw {
                    statusCode: 400,
                    error: 'Cannot deactivate last Super Admin. Promote another user to Super Admin first.',
                };
            }
        }

        await client.query(
            `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`,
            [input.userId]
        );
        await client.query(`DELETE FROM sessions WHERE user_id = $1`, [input.userId]);
        await client.query(
            `DELETE FROM magic_link_tokens WHERE email = $1`,
            [target.email.toLowerCase()]
        );

        return {
            email: target.email,
            fullName: target.full_name,
        };
    });

    const sendNotification = dependencies.sendNotification || sendUserDeactivationEmail;
    let delivery: EmailDeliveryResult;
    try {
        delivery = await sendNotification({
            to: user.email,
            recipientName: user.fullName,
            reason: input.reason,
            correlationId: input.correlationId,
        });
    } catch {
        createLogger('users-delete', input.correlationId).error(
            'Deactivation email helper failed after account mutation',
            new Error('Deactivation email helper failed')
        );
        delivery = { status: 'failed', code: 'EMAIL_DELIVERY_FAILED', retryable: true };
    }

    return {
        success: true,
        message: 'User deactivated successfully',
        emailDelivery: { status: delivery.status },
    };
}

export const handler = compose(
    withCORS(['DELETE']),
    withSuperAdmin(),
    withRateLimit(RATE_LIMITS.apiStrict, 'users_delete')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
    const correlationId = getCorrelationId(event.headers);
    const logger = createLogger('users-delete', correlationId);
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);

    // Extract user ID from path
    const pathParts = event.path.split('/');
    const userId = pathParts[pathParts.length - 1];

    // Validate user ID
    const userIdValidation = uuidSchema.safeParse(userId);
    if (!userIdValidation.success || userId === 'users-delete') {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: 'Valid user ID is required' }),
        };
    }

    // Prevent self-deactivation
    if (auth?.user?.userId === userId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Cannot deactivate your own account',
            }),
        };
    }

    // Parse reason from body (optional)
    let reason = 'No reason provided';
    const bodyParsed = parseJsonBody(event.body);
    if (bodyParsed.success) {
        const schemaResult = deleteUserSchema.safeParse(bodyParsed.data);
        if (schemaResult.success && schemaResult.data.reason) {
            reason = schemaResult.data.reason;
        }
    }

    try {
        const result = await deactivateUserAccount({
            userId,
            reason,
            correlationId,
        });
        logger.info('User deactivated', {
            userId,
            reason,
            emailDeliveryStatus: result.emailDelivery.status,
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result),
        };
    } catch (error: any) {
        if (error.statusCode) {
            return {
                statusCode: error.statusCode,
                headers,
                body: JSON.stringify({ success: false, error: error.error }),
            };
        }

        logger.error('Failed to deactivate user', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Failed to deactivate user',
            }),
        };
    }
});
