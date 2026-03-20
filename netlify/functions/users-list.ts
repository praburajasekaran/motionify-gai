/**
 * GET /api/users-list
 *
 * List all users with optional filters. Super Admin only.
 *
 * Query params:
 * - status: 'active' | 'inactive' (optional)
 * - role: filter by role (optional)
 * - search: search by name or email (optional)
 */

import {
    query,
    getCorsHeaders,
    requireAuthAndRole,
    createLogger,
    getCorrelationId,
    z,
    validateQueryParams,
} from './_shared';
import { compose, withCORS, withSuperAdmin, withRateLimit, type NetlifyEvent as MWNetlifyEvent, type NetlifyResponse as MWNetlifyResponse } from './_shared/middleware';
import { RATE_LIMITS } from './_shared/rateLimit';

interface NetlifyEvent {
    httpMethod: string;
    headers: Record<string, string>;
    queryStringParameters: Record<string, string> | null;
}

interface NetlifyResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
}

// Query params schema
const querySchema = z.object({
    status: z.enum(['active', 'inactive', 'all']).optional(),
    role: z.enum(['super_admin', 'project_manager', 'client', 'team', 'all']).optional(),
    search: z.string().max(100).optional(),
});

export const handler = compose(
    withCORS(['GET']),
    withSuperAdmin(),
    withRateLimit(RATE_LIMITS.api, 'users_list')
)(async (event: NetlifyEvent) => {
    const correlationId = getCorrelationId(event.headers);
    const logger = createLogger('users-list', correlationId);
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);

    // Validate query params
    const paramsValidation = validateQueryParams(event.queryStringParameters, querySchema, origin);
    if (!paramsValidation.success) {
        return paramsValidation.response;
    }

    const { status, role, search } = paramsValidation.data;

    try {
        // Build query with filters
        let queryText = `
            SELECT id, email, full_name, role, is_active, created_at, updated_at
            FROM users
            WHERE 1=1
        `;
        const values: (string | boolean)[] = [];
        let paramIndex = 1;

        // Filter by status
        if (status === 'active') {
            queryText += ` AND is_active = $${paramIndex++}`;
            values.push(true);
        } else if (status === 'inactive') {
            queryText += ` AND is_active = $${paramIndex++}`;
            values.push(false);
        }

        // Filter by role
        if (role && role !== 'all') {
            queryText += ` AND role = $${paramIndex++}`;
            values.push(role);
        }

        // Search filter
        if (search && search.trim()) {
            queryText += ` AND (LOWER(full_name) LIKE $${paramIndex} OR LOWER(email) LIKE $${paramIndex})`;
            values.push(`%${search.toLowerCase()}%`);
            paramIndex++;
        }

        queryText += ` ORDER BY created_at DESC`;

        const result = await query(queryText, values);

        logger.info('Users list fetched', { count: result.rows.length });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                users: result.rows,
                total: result.rows.length,
            }),
        };
    } catch (error) {
        logger.error('Failed to fetch users', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Failed to fetch users',
            }),
        };
    }
});
