/**
 * Notification System Types
 * 
 * Comprehensive TypeScript types based on features/notifications-system/03-data-models.md
 * This file contains all types, enums, and constants for the notifications system.
 */

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export type NotificationType =
    // Task Notifications
    | 'task_assigned'
    | 'task_status_changed'
    | 'task_comment_added'

    // Comment Notifications
    | 'comment_mention'
    | 'comment_reply'

    // File Notifications
    | 'file_uploaded'
    | 'file_comment_added'

    // Approval & Revision Notifications
    | 'approval_request'
    | 'approval_granted'
    | 'revision_requested'
    | 'revision_completed'

    // Payment Notifications
    | 'payment_advance_received'
    | 'payment_balance_received'
    | 'payment_failed'

    // Team Notifications
    | 'team_member_added'
    | 'team_member_removed'
    | 'invitation_sent'
    | 'invitation_accepted'
    | 'invitation_expired'
    | 'invitation_resent'

    // Project Notifications
    | 'project_created'
    | 'project_status_changed'
    | 'terms_accepted'
    | 'terms_updated';

export type NotificationCategory =
    | 'task_updates'
    | 'comments_mentions'
    | 'file_updates'
    | 'approvals_revisions'
    | 'team_changes'
    | 'project_updates';

export type EmailBatchingFrequency =
    | 'immediately'  // No batching (send each notification separately)
    | 'every_5_min'  // Batch notifications every 5 minutes (default)
    | 'hourly'       // Hourly digest
    | 'daily';       // Daily digest

export type EmailQueueStatus =
    | 'pending'      // Waiting to be processed
    | 'batched'      // Grouped with other notifications
    | 'sending'      // Currently being sent
    | 'sent'         // Successfully delivered
    | 'failed'       // Delivery failed
    | 'abandoned';   // Max retries exceeded

export type EmailType =
    | 'individual'   // Single notification email
    | 'digest';      // Batched notification digest

// ============================================================================
// INTERFACES
// ============================================================================

export interface NotificationMetadata {
    // Context-specific data (flexible JSON structure)
    taskId?: string;
    taskTitle?: string;
    fileId?: string;
    fileName?: string;
    commentId?: string;
    deliverableId?: string;
    deliverableName?: string;
    oldStatus?: string;
    newStatus?: string;
    mentionedBy?: string;
    projectName?: string;
    // Extensible for future notification types
}

export interface Notification {
    // Core Identification
    id: string;                          // UUID
    userId: string;                      // UUID - recipient of notification
    projectId: string;                   // UUID - which project this relates to
    type: NotificationType;
    category: NotificationCategory;
    read: boolean;                       // Has user marked as read
    createdAt: Date;
    readAt: Date | null;                 // Timestamp when marked read
    deletedAt: Date | null;              // Soft delete timestamp

    // Notification Content
    title: string;                       // Short title (e.g., "Task Assigned")
    message: string;                     // Full message (e.g., "You were assigned to 'Create storyboard'")
    icon: string;                        // Emoji or icon identifier (e.g., "🎯", "task-icon")

    // Action/Navigation
    actionUrl: string | null;            // Deep link to related item (e.g., "/projects/xxx/tasks/yyy")
    actionLabel: string | null;          // Button text (e.g., "View Task", "View File")

    // Metadata (JSON)
    metadata: NotificationMetadata;

    // Actor Information
    actorId: string | null;              // UUID - who triggered this notification
    actorName: string | null;            // Cached actor name for display
}

export interface CategoryPreference {
    category: NotificationCategory;      // Which notification type
    inAppEnabled: boolean;               // Receive in-app notifications
    emailEnabled: boolean;               // Receive email notifications
}

export interface NotificationPreference {
    // Core Identification
    id: string;                          // UUID
    userId: string;                      // UUID - user these preferences belong to
    createdAt: Date;
    updatedAt: Date;

    // Category Preferences (JSON array)
    preferences: CategoryPreference[];

    // Global Settings
    emailBatchingFrequency: EmailBatchingFrequency;
    pausedUntil: Date | null;            // Temporary pause (e.g., vacation mode)
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const NOTIFICATION_CONFIG = {
    MAX_UNREAD_DISPLAY: 99,                    // Show "99+" if more than this
    DROPDOWN_LIMIT: 10,                        // Notifications in dropdown
    HISTORY_PAGE_SIZE: 50,                     // Notifications per page
    AUTO_READ_DAYS: 7,                         // Auto-mark read after X days
    RETENTION_DAYS: 90,                        // Delete after X days
    EMAIL_BATCH_WINDOW_MINUTES: 2,             // Wait X minutes before batching
    EMAIL_MAX_BATCH_SIZE: 10,                  // Max notifications per email
    EMAIL_RETRY_ATTEMPTS: 3,                   // Retry failed emails X times
    EMAIL_RETRY_DELAYS: [120, 600, 3600],      // Seconds: 2min, 10min, 1hr
} as const;

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
    'task_assigned': 'Task Assigned',
    'task_status_changed': 'Task Status Changed',
    'task_comment_added': 'Task Comment',
    'comment_mention': 'Mentioned',
    'comment_reply': 'Comment Reply',
    'file_uploaded': 'File Uploaded',
    'file_comment_added': 'File Comment',
    'approval_request': 'Approval Request',
    'approval_granted': 'Approved',
    'revision_requested': 'Revision Requested',
    'revision_completed': 'Revision Completed',
    'payment_advance_received': 'Advance Payment Received',
    'payment_balance_received': 'Balance Payment Received',
    'payment_failed': 'Payment Failed',
    'team_member_added': 'Team Member Added',
    'team_member_removed': 'Team Member Removed',
    'invitation_sent': 'Invitation Sent',
    'invitation_accepted': 'Invitation Accepted',
    'invitation_expired': 'Invitation Expired',
    'invitation_resent': 'Invitation Resent',
    'project_created': 'Project Created',
    'project_status_changed': 'Project Status Changed',
    'terms_accepted': 'Terms Accepted',
    'terms_updated': 'Terms Updated',
} as const;

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
    'task_updates': 'Task Updates',
    'comments_mentions': 'Comments & Mentions',
    'file_updates': 'File Updates',
    'approvals_revisions': 'Approvals & Revisions',
    'team_changes': 'Team Changes',
    'project_updates': 'Project Updates',
} as const;

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
    'task_assigned': '🎯',
    'task_status_changed': '✅',
    'task_comment_added': '💬',
    'comment_mention': '💬',
    'comment_reply': '💬',
    'file_uploaded': '📁',
    'file_comment_added': '📁',
    'approval_request': '👍',
    'approval_granted': '✅',
    'revision_requested': '🔄',
    'revision_completed': '✅',
    'payment_advance_received': '💰',
    'payment_balance_received': '💰',
    'payment_failed': '❌',
    'team_member_added': '👥',
    'team_member_removed': '👥',
    'invitation_sent': '✉️',
    'invitation_accepted': '✅',
    'invitation_expired': '⏰',
    'invitation_resent': '✉️',
    'project_created': '📂',
    'project_status_changed': '📂',
    'terms_accepted': '📝',
    'terms_updated': '📝',
} as const;

export const NOTIFICATION_CATEGORY_MAPPING: Record<NotificationType, NotificationCategory> = {
    'task_assigned': 'task_updates',
    'task_status_changed': 'task_updates',
    'task_comment_added': 'comments_mentions',
    'comment_mention': 'comments_mentions',
    'comment_reply': 'comments_mentions',
    'file_uploaded': 'file_updates',
    'file_comment_added': 'file_updates',
    'approval_request': 'approvals_revisions',
    'approval_granted': 'approvals_revisions',
    'revision_requested': 'approvals_revisions',
    'revision_completed': 'approvals_revisions',
    'payment_advance_received': 'project_updates',
    'payment_balance_received': 'project_updates',
    'payment_failed': 'project_updates',
    'team_member_added': 'team_changes',
    'team_member_removed': 'team_changes',
    'invitation_sent': 'team_changes',
    'invitation_accepted': 'team_changes',
    'invitation_expired': 'team_changes',
    'invitation_resent': 'team_changes',
    'project_created': 'project_updates',
    'project_status_changed': 'project_updates',
    'terms_accepted': 'project_updates',
    'terms_updated': 'project_updates',
} as const;

export const DEFAULT_PREFERENCES: CategoryPreference[] = [
    { category: 'task_updates', inAppEnabled: true, emailEnabled: true },
    { category: 'comments_mentions', inAppEnabled: true, emailEnabled: true },
    { category: 'file_updates', inAppEnabled: true, emailEnabled: false },
    { category: 'approvals_revisions', inAppEnabled: true, emailEnabled: true },
    { category: 'team_changes', inAppEnabled: true, emailEnabled: true },
    { category: 'project_updates', inAppEnabled: true, emailEnabled: false },
];
