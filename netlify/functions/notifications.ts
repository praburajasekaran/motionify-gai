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
import { compose, withCORS, withRateLimit, type NetlifyEvent, type NetlifyResponse } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';

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

const isValidUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(id);
};

export const handler = compose(
    withCORS(['GET', 'PATCH', 'OPTIONS']),
    withRateLimit(RATE_LIMITS.api, 'notifications')
)(async (event: NetlifyEvent) => {
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

            if (!userId || !isValidUUID(userId)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, error: 'Valid userId is required' }),
                };
            }

            const result = await client.query(
                `SELECT 
          id,
          user_id as "userId",
          project_id as "projectId",
          type,
          title,
          message,
            is_read as "read",
          action_url as "actionUrl",
          actor_id as "actorId",
          actor_name as "actorName",
          created_at as "createdAt",
          read_at as "readAt"
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
                [userId, parseInt(limit, 10)]
            );

            // Transform to match frontend AppNotification interface
            const notifications = result.rows.map(row => ({
                id: row.id,
                type: row.type,
                title: row.title,
                message: row.message,
                timestamp: new Date(row.createdAt).getTime(),
                read: row.read,
                actionUrl: row.actionUrl,
                actorName: row.actorName,
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
            const body = event.body ? JSON.parse(event.body) : {};
            const { userId, notificationId } = body;
            const markAll = params.markAll === 'true';

            if (!userId || !isValidUUID(userId)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, error: 'Valid userId is required' }),
                };
            }

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
                // Mark single notification as read
                if (!notificationId || !isValidUUID(notificationId)) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ success: false, error: 'Valid notificationId is required' }),
                    };
                }

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
