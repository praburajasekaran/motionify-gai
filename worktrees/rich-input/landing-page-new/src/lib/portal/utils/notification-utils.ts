/**
 * Notification Utility Functions
 * 
 * Helper functions for working with notifications, based on
 * features/notifications-system/03-data-models.md
 */

import {
    Notification,
    NotificationType,
    NotificationCategory,
    NotificationMetadata,
    NOTIFICATION_CONFIG,
    NOTIFICATION_CATEGORY_MAPPING,
    NOTIFICATION_ICONS,
    NOTIFICATION_TYPE_LABELS,
} from '../types/notification-types';

// ============================================================================
// TIME FORMATTING
// ============================================================================

/**
 * Format a date as a human-readable "time ago" string
 * @param date - The date to format
 * @returns Human-readable time string (e.g., "just now", "5 minutes ago")
 */
export function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600);
        return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }
    if (seconds < 604800) {
        const days = Math.floor(seconds / 86400);
        return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }

    return date.toLocaleDateString();
}

// ============================================================================
// NOTIFICATION HELPERS
// ============================================================================

/**
 * Get the category for a given notification type
 * @param type - The notification type
 * @returns The corresponding category
 */
export function getCategoryFromType(type: NotificationType): NotificationCategory {
    return NOTIFICATION_CATEGORY_MAPPING[type];
}

/**
 * Check if a notification is unread
 * @param notification - The notification to check
 * @returns True if notification is unread and not deleted
 */
export function isNotificationUnread(notification: Notification): boolean {
    return !notification.read && notification.deletedAt === null;
}

/**
 * Format unread count for display (shows "99+" if over 99)
 * @param count - The unread count
 * @returns Formatted string
 */
export function formatUnreadCount(count: number): string {
    if (count > NOTIFICATION_CONFIG.MAX_UNREAD_DISPLAY) {
        return `${NOTIFICATION_CONFIG.MAX_UNREAD_DISPLAY}+`;
    }
    return count.toString();
}

// ============================================================================
// MESSAGE BUILDERS
// ============================================================================

/**
 * Build notification message based on type and metadata
 * @param type - The notification type
 * @param metadata - The notification metadata
 * @param actorName - Name of the person who triggered the notification
 * @returns The notification message string
 */
export function buildNotificationMessage(
    type: NotificationType,
    metadata: NotificationMetadata,
    actorName: string
): string {
    switch (type) {
        case 'task_assigned':
            return `You were assigned to '${metadata.taskTitle}' by ${actorName}`;
        case 'task_status_changed':
            return `Task status changed: '${metadata.taskTitle}' → ${metadata.newStatus}`;
        case 'task_comment_added':
            return `${actorName} commented on '${metadata.taskTitle}'`;
        case 'comment_mention':
            return `${actorName} mentioned you in a comment`;
        case 'comment_reply':
            return `${actorName} replied to your comment`;
        case 'file_uploaded':
            return `New file uploaded: ${metadata.fileName} by ${actorName}`;
        case 'file_comment_added':
            return `${actorName} commented on ${metadata.fileName}`;
        case 'approval_request':
            return `Deliverable awaiting your approval: ${metadata.deliverableName}`;
        case 'approval_granted':
            return `${actorName} approved ${metadata.deliverableName}`;
        case 'revision_requested':
            return `${actorName} requested revision on ${metadata.deliverableName}`;
        case 'revision_completed':
            return `Revision completed for ${metadata.deliverableName}`;
        case 'payment_advance_received':
            return `Advance payment received for ${metadata.projectName}`;
        case 'payment_balance_received':
            return `Balance payment received for ${metadata.projectName}`;
        case 'payment_failed':
            return `Payment failed for ${metadata.projectName}`;
        case 'team_member_added':
            return `${actorName} was added to the team`;
        case 'team_member_removed':
            return `${actorName} was removed from the team`;
        case 'invitation_sent':
            return `Invitation sent to ${actorName}`;
        case 'invitation_accepted':
            return `${actorName} accepted the invitation`;
        case 'invitation_expired':
            return `Invitation for ${actorName} has expired`;
        case 'invitation_resent':
            return `Invitation resent to ${actorName}`;
        case 'project_created':
            return `New project created: ${metadata.projectName}`;
        case 'project_status_changed':
            return `Project status changed: ${metadata.oldStatus} → ${metadata.newStatus}`;
        case 'terms_accepted':
            return `${actorName} accepted the project terms`;
        case 'terms_updated':
            return `Project terms have been updated`;
        default:
            return 'New notification';
    }
}

/**
 * Build action URL based on notification type and metadata
 * @param type - The notification type
 * @param metadata - The notification metadata
 * @param projectId - The project ID
 * @returns The action URL or null
 */
export function buildActionUrl(
    type: NotificationType,
    metadata: NotificationMetadata,
    projectId: string
): string | null {
    // Task-related notifications
    if (metadata.taskId) {
        if (metadata.commentId) {
            return `/portal/projects/${projectId}/tasks/${metadata.taskId}#comment-${metadata.commentId}`;
        }
        return `/portal/projects/${projectId}/tasks/${metadata.taskId}`;
    }

    // File-related notifications
    if (metadata.fileId) {
        return `/portal/projects/${projectId}/files/${metadata.fileId}`;
    }

    // Deliverable-related notifications
    if (metadata.deliverableId) {
        return `/portal/projects/${projectId}/deliverables/${metadata.deliverableId}`;
    }

    // Default to project overview
    return `/portal/projects/${projectId}`;
}

/**
 * Build action label based on notification type
 * @param type - The notification type
 * @returns The action button label
 */
export function buildActionLabel(type: NotificationType): string | null {
    if (type.includes('task')) return 'View Task';
    if (type.includes('file')) return 'View File';
    if (type.includes('comment')) return 'View Comment';
    if (type.includes('approval') || type.includes('revision')) return 'View Deliverable';
    if (type.includes('project')) return 'View Project';
    if (type.includes('team') || type.includes('invitation')) return 'View Team';
    return 'View Details';
}

// ============================================================================
// NOTIFICATION FACTORY
// ============================================================================

/**
 * Create a notification object with all required fields
 * @param params - Notification creation parameters
 * @returns A partial notification object (missing id, createdAt, etc.)
 */
export function createNotification(params: {
    userId: string;
    projectId: string;
    type: NotificationType;
    metadata: NotificationMetadata;
    actorId?: string;
    actorName?: string;
}): Omit<Notification, 'id' | 'createdAt' | 'readAt' | 'deletedAt'> {
    const category = getCategoryFromType(params.type);
    const icon = NOTIFICATION_ICONS[params.type];
    const title = NOTIFICATION_TYPE_LABELS[params.type];
    const message = buildNotificationMessage(
        params.type,
        params.metadata,
        params.actorName || 'Someone'
    );
    const actionUrl = buildActionUrl(params.type, params.metadata, params.projectId);
    const actionLabel = buildActionLabel(params.type);

    return {
        userId: params.userId,
        projectId: params.projectId,
        type: params.type,
        category,
        read: false,
        title,
        message,
        icon,
        actionUrl,
        actionLabel,
        metadata: params.metadata,
        actorId: params.actorId || null,
        actorName: params.actorName || null,
    };
}

// ============================================================================
// GROUPING HELPERS
// ============================================================================

/**
 * Group notifications into unread and read sections
 * @param notifications - Array of notifications to group
 * @returns Object with unread and read notification arrays
 */
export function groupNotifications(notifications: Notification[]) {
    const unread = notifications.filter(n => isNotificationUnread(n));
    const read = notifications.filter(n => !isNotificationUnread(n));

    return { unread, read };
}

/**
 * Check if a notification is from today
 * @param notification - The notification to check
 * @returns True if notification was created today
 */
export function isToday(notification: Notification): boolean {
    const today = new Date();
    const notifDate = new Date(notification.createdAt);

    return today.toDateString() === notifDate.toDateString();
}
