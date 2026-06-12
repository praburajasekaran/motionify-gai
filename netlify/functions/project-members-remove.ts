import { query as dbQuery } from './_shared/db';
import { compose, withCORS, withProjectManager, withRateLimit, type AuthResult, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import {
    AuthorizationError,
    createAuthorizationResponse,
    requireProjectManagerAccess,
} from './_shared/authorization';

export const handler = compose(
    withCORS(['POST', 'DELETE']),
    withProjectManager(),
    withRateLimit(RATE_LIMITS.apiStrict, 'project_members_remove')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
    const origin = event.headers.origin || event.headers.Origin;
    const headers = getCorsHeaders(origin);

    // Parse body
    let projectId: string | undefined;
    let userIdToRemove: string | undefined;

    try {
        if (event.body) {
            const body = JSON.parse(event.body);
            projectId = body.projectId;
            userIdToRemove = body.userId;
        }
    } catch (e) {
        // ignore parse error, check params
    }

    // Fallback to Query Params
    if (!projectId) projectId = event.queryStringParameters?.projectId;
    if (!userIdToRemove) userIdToRemove = event.queryStringParameters?.userId;

    if (!projectId || !userIdToRemove) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'projectId and userId are required' }),
        };
    }

    try {
        await requireProjectManagerAccess(auth?.user, projectId, {
            operation: 'project-members-remove.remove',
        });

        // 1. Check if the user is the assigned Project Manager (via Inquiry)
        const projectResult = await dbQuery(
            `SELECT p.id, i.assigned_to_admin_id, i.id as inquiry_id
       FROM projects p
       JOIN inquiries i ON p.inquiry_id = i.id
       WHERE p.id = $1`,
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Project not found' }),
            };
        }

        const { assigned_to_admin_id, inquiry_id } = projectResult.rows[0];

        // 2. Perform Validation
        if (assigned_to_admin_id === userIdToRemove) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Cannot remove the last Project Manager.',
                    message: 'Cannot remove the last Project Manager. Assign another Project Manager first.'
                }),
            };
        }

        const memberResult = await dbQuery(
            `SELECT id, role, is_primary_contact
             FROM project_team
             WHERE project_id = $1 AND user_id = $2 AND removed_at IS NULL`,
            [projectId, userIdToRemove]
        );

        if (memberResult.rows.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Team member not found or already removed' }),
            };
        }

        if (memberResult.rows[0].is_primary_contact) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Cannot remove Primary Contact.',
                    message: 'Transfer primary contact role first.'
                }),
            };
        }

        if (memberResult.rows[0].role === 'support') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Cannot remove support user.',
                    message: 'Support users are automatically assigned to projects and cannot be removed.'
                }),
            };
        }

        await dbQuery(
            `UPDATE project_team
             SET removed_at = NOW(), removed_by = $1
             WHERE project_id = $2 AND user_id = $3 AND removed_at IS NULL`,
            [auth?.user?.userId, projectId, userIdToRemove]
        );

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'Member removed' }),
        };

    } catch (error) {
        if (error instanceof AuthorizationError) {
            return createAuthorizationResponse(error, origin);
        }
        console.error('Remove member error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
});
