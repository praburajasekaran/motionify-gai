import { ProjectStatus } from '../types';

const DB_TO_DISPLAY: Record<string, ProjectStatus> = {
    'draft': 'Draft',
    'active': 'Active',
    'in_review': 'In Review',
    'awaiting_payment': 'Awaiting Payment',
    'on_hold': 'On Hold',
    'completed': 'Completed',
    'archived': 'Archived',
    'cancelled': 'Archived',
};

const DISPLAY_TO_DB: Record<ProjectStatus, string> = {
    'Draft': 'draft',
    'Active': 'active',
    'In Review': 'in_review',
    'Awaiting Payment': 'awaiting_payment',
    'On Hold': 'on_hold',
    'Completed': 'completed',
    'Archived': 'archived',
};

export function dbStatusToDisplay(dbStatus: string): ProjectStatus {
    return DB_TO_DISPLAY[dbStatus] || 'Active';
}

export function displayStatusToDb(displayStatus: ProjectStatus): string {
    return DISPLAY_TO_DB[displayStatus] || 'active';
}
