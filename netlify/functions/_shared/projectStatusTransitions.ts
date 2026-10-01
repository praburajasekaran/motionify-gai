const VALID_TRANSITIONS: Record<string, string[]> = {
    'draft': ['active', 'cancelled'],
    'active': ['on_hold', 'completed', 'awaiting_payment', 'in_review', 'cancelled'],
    'on_hold': ['active', 'cancelled'],
    'awaiting_payment': ['active', 'completed', 'cancelled'],
    'in_review': ['active', 'completed', 'cancelled'],
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
