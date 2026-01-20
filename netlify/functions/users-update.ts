/**
 * PATCH /api/users-update/:userId
 *
 * Update user details (name, role). Super Admin only.
 *
 * Body:
 * - full_name: string (optional)
 * - role: 'super_admin' | 'project_manager' | 'client' | 'team' (optional)
 */

import {
    query,
    validateCors,
    getCorsHeaders,
    requireAuthAndRole,
    validateRequest,
    updateUserSchema,
    uuidSchema,
    createLogger,
    getCorrelationId,
} from './_shared';

interface NetlifyEvent {
    httpMethod: string;
    headers: Record<string, string>;
    body: string | null;
    path: string;
}

interface NetlifyResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
}

export const handler = async (event: NetlifyEvent): Promise<NetlifyResponse> => {
    const correlationId = getCorrelationId(event.headers);
    const logger = createLogger('users-update', correlationId);
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);

    // Handle CORS
    const corsResult = validateCors(event);
    if (corsResult) {
        return corsResult;
    }

    // Only allow PATCH
    if (event.httpMethod !== 'PATCH') {
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
    if (!userIdValidation.success || userId === 'users-update') {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: 'Valid user ID is required' }),
        };
    }

    // Require Super Admin role
    const authResult = await requireAuthAndRole(event, ['super_admin']);
    if (!authResult.success) {
        logger.warn('Unauthorized user update attempt', { targetUserId: userId });
        return authResult.response;
    }

    // Validate request body
    const validation = validateRequest(event.body, updateUserSchema, origin);
    if (!validation.success) {
        return validation.response;
    }

    const { full_name, role, profile_picture_url } = validation.data;

    // Check if at least one field to update
    if (!full_name && !role && profile_picture_url === undefined) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: 'No fields to update' }),
        };
    }

    try {
        // Check if user exists
        const existingUser = await query('SELECT id FROM users WHERE id = $1', [userId]);

        if (existingUser.rows.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ success: false, error: 'User not found' }),
            };
        }

        // Build update query dynamically
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (full_name) {
            updates.push(`full_name = $${paramIndex++}`);
            values.push(full_name);
        }
        if (role) {
            updates.push(`role = $${paramIndex++}`);
            values.push(role);
        }
        if (profile_picture_url !== undefined) {
            updates.push(`profile_picture_url = $${paramIndex++}`);
            values.push(profile_picture_url);
        }

        values.push(userId);

        const updateQuery = `
            UPDATE users
            SET ${updates.join(', ')}, updated_at = NOW()
            WHERE id = $${paramIndex}
            RETURNING id, email, full_name, role, is_active, created_at, updated_at
        `;

        const result = await query(updateQuery, values);

        logger.info('User updated', {
            userId,
            updatedBy: authResult.user.email,
            fields: Object.keys(validation.data).filter((k) => (validation.data as any)[k] !== undefined),
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                user: result.rows[0],
            }),
        };
    } catch (error) {
        logger.error('Failed to update user', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Failed to update user',
            }),
        };
    }
};
