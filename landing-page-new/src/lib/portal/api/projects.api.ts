/**
 * Projects API client
 * Fetches project data from the backend API
 */

import { Project, ProjectStatus, User, UserRole, Deliverable } from '../types';

const API_BASE = '/.netlify/functions';

export interface ApiProject {
    id: string;
    project_number: string;
    inquiry_id: string;
    proposal_id: string;
    client_user_id: string;
    status: string;
    total_revisions_allowed: number;
    revisions_used: number;
    created_at: string;
    updated_at: string;
    client_name: string;
    client_company?: string;
}

/**
 * Transform API project response to frontend Project type
 */
function transformProject(apiProject: ApiProject): Project {
    // Map DB status to frontend status
    let projectStatus = ProjectStatus.IN_PROGRESS;
    if (apiProject.status === 'completed') projectStatus = ProjectStatus.COMPLETED;
    if (apiProject.status === 'cancelled' || apiProject.status === 'on_hold') projectStatus = ProjectStatus.ARCHIVED;

    return {
        id: apiProject.id,
        name: `Project ${apiProject.project_number}`,
        client: {
            name: apiProject.client_name || 'Unknown Client',
            logoUrl: apiProject.client_company
                ? `https://logo.clearbit.com/${apiProject.client_company.toLowerCase().replace(/\s+/g, '')}.com`
                : undefined,
        },
        scope: {
            deliverables: [],
            nonInclusions: [],
        },
        milestones: [],
        totalRevisions: apiProject.total_revisions_allowed || 2,
        usedRevisions: apiProject.revisions_used || 0,
        tasks: [],
        clientTeam: [],
        motionifyTeam: [],
        status: projectStatus,
        files: [],
        activities: [],
    };
}

/**
 * Fetch all projects for a user
 */
export async function fetchProjects(userId: string): Promise<{ success: boolean; projects?: Project[]; error?: string }> {
    try {
        const response = await fetch(`${API_BASE}/projects?userId=${userId}`, {
            method: 'GET',
            credentials: 'include',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.error || `Failed to fetch projects: ${response.status}`,
            };
        }

        const apiProjects: ApiProject[] = await response.json();
        const projects = apiProjects.map(transformProject);

        return {
            success: true,
            projects,
        };
    } catch (error) {
        console.error('Error fetching projects:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch projects',
        };
    }
}
