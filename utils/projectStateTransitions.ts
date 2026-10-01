import { ProjectStatus } from '../types';

interface TransitionResult {
    isValid: boolean;
    error?: string;
}

const VALID_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
    'Draft': ['Active', 'Cancelled'],
    'Active': ['On Hold', 'Completed', 'Awaiting Payment', 'In Review', 'Cancelled'],
    'On Hold': ['Active', 'Cancelled'],
    'Awaiting Payment': ['Active', 'Completed', 'Cancelled'],
    'Completed': ['Active', 'Archived'],
    'Archived': [], // Terminal state, requires special un-archive flow if we ever implement it
    'In Review': ['Active', 'Completed', 'Cancelled'],
    'Cancelled': [],
};

/**
 * Checks if a project status transition is valid
 * @param currentStatus Current project status
 * @param newStatus Desired new project status
 * @returns TransitionResult with validation status and optional error message
 */
export const validateProjectStatusTransition = (
    currentStatus: ProjectStatus,
    newStatus: ProjectStatus
): TransitionResult => {
    // If status is unchanged, it's valid (no-op)
    if (currentStatus === newStatus) {
        return { isValid: true };
    }

    const allowedNextStatuses = VALID_TRANSITIONS[currentStatus] || [];

    if (allowedNextStatuses.includes(newStatus)) {
        return { isValid: true };
    }

    return {
        isValid: false,
        error: `Cannot transition project from '${currentStatus}' to '${newStatus}'. allowed transitions: ${allowedNextStatuses.join(', ') || 'None'}`
    };
};

/**
 * Gets all valid next statuses for a given status
 */
export const getAvailableTransitions = (currentStatus: ProjectStatus): ProjectStatus[] => {
    return VALID_TRANSITIONS[currentStatus] || [];
};
