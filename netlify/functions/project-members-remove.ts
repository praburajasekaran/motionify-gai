import { query as dbQuery } from './_shared/db';
import { compose, withCORS, withProjectManager, withRateLimit, type AuthResult, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';

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

        // 3. If not the assigned PM, assume it's an invited team member or client team member
        // Check invitations
        const deleteInvitationResult = await dbQuery(
            `DELETE FROM project_invitations
       USING users
       WHERE project_invitations.email = users.email
       AND users.id = $1
       AND project_invitations.project_id = $2
       RETURNING project_invitations.id`,
            [userIdToRemove, projectId]
        );

        // Also check if they are the Client Primary Contact
        const projectClientResult = await dbQuery(
            `SELECT client_user_id FROM projects WHERE id = $1`,
            [projectId]
        );

        if (projectClientResult.rows.length > 0 && projectClientResult.rows[0].client_user_id === userIdToRemove) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Cannot remove Primary Contact.',
                    message: 'Transfer primary contact role first.'
                }),
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'Member removed' }),
        };

    } catch (error) {
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
