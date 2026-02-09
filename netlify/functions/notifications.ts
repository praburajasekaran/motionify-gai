/**
 * Notifications API Endpoint
 * 
 * Handles fetching and updating notification read status.
 * Implements TC-NT-004: In-App Notification Bell
 * 
 * Routes:
 * - GET /api/notifications?userId=<uuid> - Fetch notifications for user
 * - PATCH /api/notifications - Mark notification as read / mark all as read
 */

import pg from 'pg';
import { compose, withCORS, withAuth, withRateLimit, type AuthResult, type NetlifyEvent, type NetlifyResponse } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { SCHEMAS } from './_shared/schemas';
import { validateRequest, uuidSchema } from './_shared/validation';
import { maskSupportName } from './_shared/displayName';

const { Client } = pg;

const getDbClient = () => {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
        throw new Error('DATABASE_URL not configured');
    }

    return new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });
};

export const handler = compose(
    withCORS(['GET', 'PATCH', 'OPTIONS']),
    withAuth(),
    withRateLimit(RATE_LIMITS.api, 'notifications')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);

    let client;

    try {
        client = getDbClient();
        await client.connect();

        // GET - Fetch notifications for a user
        if (event.httpMethod === 'GET') {
            const params = event.queryStringParameters || {};
            const { userId, limit = '20' } = params;

            // Validate userId using Zod schema
            const userIdResult = uuidSchema.safeParse(userId);
            if (!userIdResult.success) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, error: 'Valid userId is required' }),
                };
            }

            const result = await client.query(
                `SELECT
          n.id,
          n.user_id as "userId",
          n.project_id as "projectId",
          n.type,
          n.title,
          n.message,
          n.is_read as "read",
          n.action_url as "actionUrl",
          n.actor_id as "actorId",
          n.actor_name as "actorName",
          n.created_at as "createdAt",
          n.read_at as "readAt",
          u_actor.role as "actorRole"
        FROM notifications n
        LEFT JOIN users u_actor ON n.actor_id = u_actor.id
        WHERE n.user_id = $1
        ORDER BY n.created_at DESC
        LIMIT $2`,
                [userId, parseInt(limit, 10)]
            );

            // Transform to match frontend AppNotification interface
            const requesterRole = auth?.user?.role || '';
            const notifications = result.rows.map(row => ({
                id: row.id,
                type: row.type,
                title: row.title,
                message: row.message,
                timestamp: new Date(row.createdAt).getTime(),
                read: row.read,
                actionUrl: row.actionUrl,
                actorName: row.actorName ? maskSupportName(row.actorName, row.actorRole || '', requesterRole) : row.actorName,
                projectId: row.projectId,
            }));

            // Get unread count
            const countResult = await client.query(
                `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false`,
                [userId]
            );

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    notifications,
                    unreadCount: parseInt(countResult.rows[0].count, 10),
                }),
            };
        }

        // PATCH - Mark notification(s) as read
        if (event.httpMethod === 'PATCH') {
            const params = event.queryStringParameters || {};
            const markAll = params.markAll === 'true';

            // Use appropriate schema based on operation
            const schema = markAll ? SCHEMAS.notification.markAllRead : SCHEMAS.notification.markRead;
            const validation = validateRequest(event.body, schema, origin);
            if (!validation.success) return validation.response;
            const { userId, notificationId } = validation.data;

            if (markAll) {
                // Mark all as read
                const result = await client.query(
                    `UPDATE notifications
           SET is_read = true, read_at = NOW()
           WHERE user_id = $1 AND is_read = false
           RETURNING id`,
                    [userId]
                );

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        message: `Marked ${result.rowCount} notifications as read`,
                        updatedCount: result.rowCount,
                    }),
                };
            } else {
                // Mark single notification as read - notificationId validated by schema
                const result = await client.query(
                    `UPDATE notifications
           SET is_read = true, read_at = NOW()
           WHERE id = $1 AND user_id = $2
           RETURNING id`,
                    [notificationId, userId]
                );

                if (result.rowCount === 0) {
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ success: false, error: 'Notification not found' }),
                    };
                }

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        message: 'Notification marked as read',
                    }),
                };
            }
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, error: 'Method not allowed' }),
        };

    } catch (error) {
        console.error('notifications error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
            }),
        };
    } finally {
        if (client) await client.end();
    }
});
