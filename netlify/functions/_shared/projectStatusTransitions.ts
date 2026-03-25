const VALID_TRANSITIONS: Record<string, string[]> = {
    'draft': ['active'],
    'active': ['on_hold', 'completed', 'awaiting_payment', 'in_review'],
    'on_hold': ['active'],
    'awaiting_payment': ['active', 'completed'],
    'in_review': ['active', 'completed'],
    'completed': ['active', 'archived'],
    'archived': [],
    'cancelled': [],
};

export function validateStatusTransition(
    currentStatus: string,
    newStatus: string
): { valid: boolean; error?: string } {
    if (currentStatus === newStatus) return { valid: true };

    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (allowed.includes(newStatus)) return { valid: true };

    return {
        valid: false,
        error: `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowed.join(', ') || 'none'}`,
    };
}
