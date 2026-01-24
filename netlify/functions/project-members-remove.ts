import pg from 'pg';
import { compose, withCORS, withProjectManager, type AuthResult, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';

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
    withCORS(['POST', 'DELETE']),
    withProjectManager()
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

    const client = getDbClient();

    try {
        await client.connect();

        // 1. Check if the user is the assigned Project Manager (via Inquiry)
        const projectResult = await client.query(
            `SELECT p.id, i.assigned_to_admin_id, i.id as inquiry_id
       FROM vertical_slice_projects p
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
            // User IS the Assigned PM.
            // Since the schema currently supports only ONE assigned PM via this column,
            // removing them would leave the project with NO PM.
            // (Unless we check for other 'team' members in invitations, but typically PM is the 'owner' of the project info)

            // We check if there are any *other* Motionify team members linked via accepted invitations
            // If yes, maybe we can't delete the MAIN PM unless we transfer? 
            // The requirement says "Cannot Delete Last Project Manager".
            // If there is another PM, we could perhaps allow it (by swapping?), but "Remove" usually implies "Unassign".
            // If we unassign, we have 0 assigned.

            // Let's count TOTAL internal team members (Assigned PM + Accepted 'team' invitations)
            const otherTeamMembersVResult = await client.query(
                `SELECT COUNT(*) 
         FROM project_invitations 
         WHERE project_id = $1 
         AND role = 'team' 
         AND status = 'accepted'
         AND email != (SELECT email FROM users WHERE id = $2)`,
                [projectId, userIdToRemove]
            );

            const otherMembersCount = parseInt(otherTeamMembersVResult.rows[0].count, 10);

            // Logic: If there are NO other members, we definitely cannot remove the last one.
            // Even if there ARE other members, can we remove the `assigned_to_admin_id`?
            // Does the 'team' member automatically become the 'assigned_to_admin_id'? No.
            // So removing the assigned admin leaves the project leaderless.
            // Requirement: "Suggestion: 'Assign another PM first'".
            // This implies we MUST have someone in `assigned_to_admin_id`.

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
        const deleteInvitationResult = await client.query(
            `DELETE FROM project_invitations
       USING users
       WHERE project_invitations.email = users.email
       AND users.id = $1
       AND project_invitations.project_id = $2
       RETURNING project_invitations.id`,
            [userIdToRemove, projectId]
        );

        // Also check if they are the Client Primary Contact (sanity check, covered by TC-TC-007 but good to enforce)
        const projectClientResult = await client.query(
            `SELECT client_user_id FROM vertical_slice_projects WHERE id = $1`,
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

        if (deleteInvitationResult.rowCount === 0) {
            // Maybe they technically don't have an invitation row (if manually inserted)? 
            // Or maybe they were just not found.
            // If they are not the PM and not Primary Contact and not in invitations... they might not be on the project?
            // Return 404 or success (idempotent)?
            // Let's return success but note nothing changed, or 404 if strictly strict.
            // For now, assume success to be idempotent.
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
    } finally {
        await client.end();
    }
});
