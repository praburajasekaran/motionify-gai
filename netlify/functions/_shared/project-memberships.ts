import { query } from './db';
import type { ProjectTeamMembership } from '../../../types';

interface MembershipRow {
    project_id: string;
    is_primary_contact: boolean;
    added_at: string | Date | null;
}

type MembershipQuery = (text: string, params: string[]) => Promise<{ rows: MembershipRow[] }>;

export async function readProjectMemberships(
    userId: string,
    executeQuery: MembershipQuery = query
): Promise<Record<string, ProjectTeamMembership>> {
    const result = await executeQuery(
        `SELECT project_id, is_primary_contact, added_at
         FROM project_team
         WHERE user_id = $1 AND removed_at IS NULL`,
        [userId]
    );
    return Object.fromEntries(result.rows.map(row => [row.project_id, {
        projectId: row.project_id,
        isPrimaryContact: row.is_primary_contact === true,
        ...(row.added_at && {
            joinedAt: row.added_at instanceof Date ? row.added_at.toISOString() : row.added_at,
        }),
    }]));
}
