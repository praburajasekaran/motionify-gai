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
    query,
    transaction,
    validateCors,
    getCorsHeaders,
    requireAuthAndRole,
    uuidSchema,
    z,
    parseJsonBody,
    createLogger,
    getCorrelationId,
} from './_shared';

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

export const handler = async (event: NetlifyEvent): Promise<NetlifyResponse> => {
    const correlationId = getCorrelationId(event.headers);
    const logger = createLogger('users-delete', correlationId);
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);

    // Handle CORS
    const corsResult = validateCors(event);
    if (corsResult) {
        return corsResult;
    }

    // Only allow DELETE
    if (event.httpMethod !== 'DELETE') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, error: 'Method not allowed' }),
        };
    }

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

    // Require Super Admin role
    const authResult = await requireAuthAndRole(event, ['super_admin']);
    if (!authResult.success) {
        logger.warn('Unauthorized user deletion attempt', { targetUserId: userId });
        return authResult.response;
    }

    // Prevent self-deactivation
    if (authResult.user.id === userId) {
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
        await transaction(async (client) => {
            // Check if user exists
            const existingUser = await client.query(
                'SELECT id, email, full_name, role FROM users WHERE id = $1',
                [userId]
            );

            if (existingUser.rows.length === 0) {
                throw { statusCode: 404, error: 'User not found' };
            }

            const user = existingUser.rows[0];

            // TC-AD-003: Prevent deactivating the last Super Admin
            if (user.role === 'super_admin') {
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

            // Soft delete - set is_active to false
            await client.query(`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`, [userId]);

            // Invalidate all sessions for this user
            await client.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);

            // Also invalidate any magic link tokens
            await client.query(`DELETE FROM magic_link_tokens WHERE email = $1`, [user.email.toLowerCase()]);

            logger.info('User deactivated', {
                userId,
                email: user.email.slice(0, 3) + '***',
                deactivatedBy: authResult.user.email,
                reason,
            });
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'User deactivated successfully',
            }),
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
};
