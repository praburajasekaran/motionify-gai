/**
 * Activity API Client
 *
 * Client for the activities API endpoint.
 * Used to log and fetch activities for inquiries, proposals, and projects.
 */

import { api } from '../lib/api-config';

export type ActivityType =
  // Task activities
  | 'TASK_STATUS_CHANGED'
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'REVISION_REQUESTED'
  | 'COMMENT_ADDED'
  // File activities
  | 'FILE_UPLOADED'
  | 'FILE_RENAMED'
  | 'FILE_DOWNLOADED'
  // Team activities
  | 'TEAM_MEMBER_INVITED'
  | 'TEAM_MEMBER_REMOVED'
  | 'TEAM_UPDATED'
  // Proposal activities
  | 'PROPOSAL_SENT'
  | 'PROPOSAL_ACCEPTED'
  | 'PROPOSAL_REJECTED'
  | 'PROPOSAL_CHANGES_REQUESTED'
  // Deliverable activities
  | 'DELIVERABLE_APPROVED'
  | 'DELIVERABLE_REJECTED'
  | 'DELIVERABLE_UPLOADED'
  // Payment activities
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_REMINDER_SENT'
  // Project activities
  | 'PROJECT_CREATED'
  | 'TERMS_ACCEPTED';

export interface Activity {
  id: string;
  type: ActivityType;
  userId: string;
  userName: string;
  targetUserId?: string;
  targetUserName?: string;
  inquiryId?: string;
  proposalId?: string;
  projectId?: string;
  details: Record<string, string | number>;
  timestamp: number;
}

export interface CreateActivityParams {
  type: ActivityType;
  userId: string;
  userName: string;
  targetUserId?: string;
  targetUserName?: string;
  inquiryId?: string;
  proposalId?: string;
  projectId?: string;
  details?: Record<string, string | number>;
}

/**
 * Create an activity record
 */
export async function createActivity(params: CreateActivityParams): Promise<Activity | null> {
  try {
    const response = await api.post<Activity>('/activities', {
      ...params,
      details: params.details || {},
    });

    if (response.success && response.data) {
      console.log('Activity logged:', params.type);
      return response.data;
    }

    console.error('Failed to create activity:', response.error);
    return null;
  } catch (error) {
    console.error('Error creating activity:', error);
    return null;
  }
}

/**
 * Fetch activities for a given context
 */
export async function fetchActivities(params: {
  inquiryId?: string;
  proposalId?: string;
  projectId?: string;
  limit?: number;
}): Promise<Activity[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params.inquiryId) searchParams.set('inquiryId', params.inquiryId);
    if (params.proposalId) searchParams.set('proposalId', params.proposalId);
    if (params.projectId) searchParams.set('projectId', params.projectId);
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const response = await api.get<Activity[]>(`/activities?${searchParams.toString()}`);

    if (response.success && response.data) {
      return response.data;
    }

    console.error('Failed to fetch activities:', response.error);
    return [];
  } catch (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
}

// Convenience functions for proposal activities

/**
 * Log a "proposal sent" activity
 */
export async function logProposalSent(params: {
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  inquiryId: string;
  proposalId: string;
  proposalName?: string;
}): Promise<Activity | null> {
  return createActivity({
    type: 'PROPOSAL_SENT',
    userId: params.senderId,
    userName: params.senderName,
    targetUserId: params.recipientId,
    targetUserName: params.recipientName,
    inquiryId: params.inquiryId,
    proposalId: params.proposalId,
    details: {
      proposalName: params.proposalName || `Proposal for inquiry`,
    },
  });
}

/**
 * Log a "proposal accepted" activity
 */
export async function logProposalAccepted(params: {
  accepterId: string;
  accepterName: string;
  senderId: string;
  senderName: string;
  inquiryId: string;
  proposalId: string;
  proposalName?: string;
}): Promise<Activity | null> {
  return createActivity({
    type: 'PROPOSAL_ACCEPTED',
    userId: params.accepterId,
    userName: params.accepterName,
    targetUserId: params.senderId,
    targetUserName: params.senderName,
    inquiryId: params.inquiryId,
    proposalId: params.proposalId,
    details: {
      proposalName: params.proposalName || `Proposal for inquiry`,
    },
  });
}

/**
 * Log a "proposal rejected" activity
 */
export async function logProposalRejected(params: {
  rejecterId: string;
  rejecterName: string;
  senderId: string;
  senderName: string;
  inquiryId: string;
  proposalId: string;
  proposalName?: string;
  reason?: string;
}): Promise<Activity | null> {
  return createActivity({
    type: 'PROPOSAL_REJECTED',
    userId: params.rejecterId,
    userName: params.rejecterName,
    targetUserId: params.senderId,
    targetUserName: params.senderName,
    inquiryId: params.inquiryId,
    proposalId: params.proposalId,
    details: {
      proposalName: params.proposalName || `Proposal for inquiry`,
      ...(params.reason && { reason: params.reason }),
    },
  });
}

/**
 * Log a "proposal changes requested" activity
 */
export async function logProposalChangesRequested(params: {
  requesterId: string;
  requesterName: string;
  senderId: string;
  senderName: string;
  inquiryId: string;
  proposalId: string;
  proposalName?: string;
  feedback?: string;
}): Promise<Activity | null> {
  return createActivity({
    type: 'PROPOSAL_CHANGES_REQUESTED',
    userId: params.requesterId,
    userName: params.requesterName,
    targetUserId: params.senderId,
    targetUserName: params.senderName,
    inquiryId: params.inquiryId,
    proposalId: params.proposalId,
    details: {
      proposalName: params.proposalName || `Proposal for inquiry`,
      ...(params.feedback && { feedback: params.feedback.substring(0, 100) + (params.feedback.length > 100 ? '...' : '') }),
    },
  });
}
