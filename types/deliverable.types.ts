/**
 * TypeScript Type Definitions for Deliverable Approval Flow
 *
 * This file defines all interfaces and types for the deliverable approval workflow,
 * including deliverables, approvals, timestamped comments, issue categories, and revision tracking.
 */

// ============================================================================
// DELIVERABLE STATUS & PRIORITY
// ============================================================================

/**
 * Deliverable status through its lifecycle
 * - pending: Not started yet
 * - in_progress: Team is actively working on it
 * - beta_ready: Beta file uploaded, ready for client review
 * - awaiting_approval: Client notified, awaiting approve/reject decision
 * - approved: Client approved, awaiting payment
 * - rejected: Client rejected, needs revisions
 * - payment_pending: Approved, waiting for balance payment
 * - final_delivered: Final file delivered to client (complete)
 */
export type DeliverableStatus =
  | 'pending'
  | 'in_progress'
  | 'beta_ready'
  | 'awaiting_approval'
  | 'approved'
  | 'rejected'
  | 'payment_pending'
  | 'final_delivered';

/**
 * Priority levels for revision requests
 */
export type Priority = 'critical' | 'important' | 'nice-to-have';

/**
 * Issue categories for structured feedback
 */
export type IssueCategory = 'color' | 'audio' | 'timing' | 'editing' | 'content' | 'other';

/**
 * Deliverable types
 */
export type DeliverableType = 'Video' | 'Image' | 'Document';

// ============================================================================
// FEEDBACK & COMMENTS
// ============================================================================

/**
 * Timestamped comment on a video deliverable
 * Allows clients to provide feedback at specific points in the video timeline
 * Note: Category is set at the project-level in Issue Categories, not per comment
 */
export interface TimestampedComment {
  id: string;
  timestamp: number; // Seconds from video start (e.g., 32 for 0:32)
  comment: string;
  resolved: boolean; // Whether the team has addressed this comment
}

/**
 * File attachment for feedback (reference images, documents, etc.)
 */
export interface FeedbackAttachment {
  id: string;
  fileName: string;
  fileSize: number; // Bytes
  fileType: string; // MIME type (e.g., 'image/png')
  url: string;
  thumbnailUrl?: string; // For image previews
}

// ============================================================================
// DELIVERABLE APPROVAL
// ============================================================================

/**
 * Deliverable approval/rejection record with enhanced feedback tracking
 * Stores the complete history of each approval or rejection decision
 */
export interface DeliverableApproval {
  id: string;
  deliverableId: string;
  action: 'approved' | 'rejected';
  timestamp: Date;
  userId: string;
  userName: string;
  userEmail: string;

  // Rejection Details (only if action = 'rejected')
  feedback?: string; // General text feedback
  timestampedComments?: TimestampedComment[]; // Video timeline comments
  issueCategories?: IssueCategory[]; // Selected issue types
  priority?: Priority; // Urgency level
  attachments?: FeedbackAttachment[]; // Reference files
}

// ============================================================================
// REVISION QUOTA
// ============================================================================

/**
 * Revision quota tracking (project-level)
 * Tracks how many revisions are included vs. used
 */
export interface RevisionQuota {
  total: number; // Total included revisions (e.g., 3)
  used: number; // Revisions consumed (e.g., 2)
  remaining: number; // Calculated: total - used
}

// ============================================================================
// DELIVERABLE
// ============================================================================

/**
 * Main Deliverable interface
 * Represents a project deliverable with full approval workflow tracking
 */
export interface Deliverable {
  // Core Identification
  id: string;
  projectId: string;
  title: string; // e.g., "Final Video", "Script & Concept"
  description: string;
  type: DeliverableType;

  // Status & Progress
  status: DeliverableStatus;
  progress: number; // 0-100 percentage
  dueDate: string; // ISO date string

  // Beta Delivery
  betaFileUrl?: string; // URL to beta file (watermarked)
  watermarked: boolean; // Whether current file has watermark
  duration?: string; // Video duration (e.g., "2:45")
  format?: string; // File format (e.g., "MP4")
  resolution?: string; // Video resolution (e.g., "1920x1080")

  // Approval History
  approvalHistory: DeliverableApproval[]; // Full history of approvals/rejections

  // Final Delivery
  finalFileUrl?: string; // URL to final file (no watermark)
  finalDeliveredAt?: Date; // When final was delivered
  expiresAt?: Date; // 365 days after final delivery
}
