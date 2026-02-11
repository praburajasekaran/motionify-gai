/**
 * Activity logging utility
 * Fixes Bug #2: Missing Activity Logging
 */

import { Activity, ActivityType, User, Task, TaskStatus } from '../types';
import { generateActivityId } from './idGenerator';

/**
 * Create a task status changed activity
 */
export function createTaskStatusChangedActivity(
  user: User,
  task: Task,
  oldStatus: TaskStatus,
  newStatus: TaskStatus
): Activity {
  return {
    id: generateActivityId(),
    type: 'TASK_STATUS_CHANGED',
    timestamp: Date.now(),
    userId: user.id,
    userName: user.name,
    details: {
      taskId: task.id,
      taskTitle: task.title,
      oldStatus,
      newStatus,
    },
  };
}

/**
 * Create a task created activity
 */
export function createTaskCreatedActivity(
  user: User,
  task: Task
): Activity {
  return {
    id: generateActivityId(),
    type: 'TASK_CREATED',
    timestamp: Date.now(),
    userId: user.id,
    userName: user.name,
    details: {
      taskId: task.id,
      taskTitle: task.title,
    },
  };
}

/**
 * Create a task updated activity
 */
export function createTaskUpdatedActivity(
  user: User,
  task: Task,
  changes: string[]
): Activity {
  return {
    id: generateActivityId(),
    type: 'TASK_UPDATED',
    timestamp: Date.now(),
    userId: user.id,
    userName: user.name,
    details: {
      taskId: task.id,
      taskTitle: task.title,
      changes: changes.join(', '),
    },
  };
}

/**
 * Create a revision requested activity
 */
export function createRevisionRequestedActivity(
  user: User,
  task: Task,
  details: string
): Activity {
  return {
    id: generateActivityId(),
    type: 'REVISION_REQUESTED',
    timestamp: Date.now(),
    userId: user.id,
    userName: user.name,
    details: {
      taskId: task.id,
      taskTitle: task.title,
      revisionDetails: details,
    },
  };
}

/**
 * Create a comment added activity
 */
export function createCommentAddedActivity(
  user: User,
  taskId: string,
  taskTitle: string,
  comment: string
): Activity {
  return {
    id: generateActivityId(),
    type: 'COMMENT_ADDED',
    timestamp: Date.now(),
    userId: user.id,
    userName: user.name,
    details: {
      taskId,
      taskTitle,
      commentPreview: comment.substring(0, 50) + (comment.length > 50 ? '...' : ''),
    },
  };
}

/**
 * Create a file uploaded activity
 */
export function createFileUploadedActivity(
  user: User,
  fileName: string,
  fileSize: number,
  deliverableId?: string
): Activity {
  return {
    id: generateActivityId(),
    type: 'FILE_UPLOADED',
    timestamp: Date.now(),
    userId: user.id,
    userName: user.name,
    details: {
      fileName,
      fileSize,
      ...(deliverableId && { deliverableId }),
    },
  };
}

/**
 * Create a team member invited activity
 */
export function createTeamMemberInvitedActivity(
  user: User,
  invitedMemberName: string,
  invitedMemberEmail: string
): Activity {
  return {
    id: generateActivityId(),
    type: 'TEAM_MEMBER_INVITED',
    timestamp: Date.now(),
    userId: user.id,
    userName: user.name,
    details: {
      invitedMemberName,
      invitedMemberEmail,
    },
  };
}

/**
 * Create a team member removed activity
 */
export function createTeamMemberRemovedActivity(
  user: User,
  removedMemberName: string,
  removedMemberEmail: string
): Activity {
  return {
    id: generateActivityId(),
    type: 'TEAM_MEMBER_REMOVED',
    timestamp: Date.now(),
    userId: user.id,
    userName: user.name,
    details: {
      removedMemberName,
      removedMemberEmail,
    },
  };
}

/**
 * Create a team updated activity
 */
export function createTeamUpdatedActivity(
  user: User,
  changeDescription: string
): Activity {
  return {
    id: generateActivityId(),
    type: 'TEAM_UPDATED',
    timestamp: Date.now(),
    userId: user.id,
    userName: user.name,
    details: {
      changeDescription,
    },
  };
}

/**
 * Create a file renamed activity
 */
export function createFileRenamedActivity(
  user: User,
  oldName: string,
  newName: string
): Activity {
  return {
    id: generateActivityId(),
    type: 'FILE_RENAMED',
    timestamp: Date.now(),
    userId: user.id,
    userName: user.name,
    details: {
      oldName,
      newName,
    },
  };
}

// ============================================
// Proposal Activities (with role-aware support)
// ============================================

/**
 * Create a proposal sent activity
 * @param sender - The admin/PM who sent the proposal
 * @param recipient - The client who received the proposal
 * @param proposalName - Name or identifier of the proposal
 */
export function createProposalSentActivity(
  sender: User,
  recipient: { id: string; name: string },
  proposalName: string
): Activity {
  return {
    id: generateActivityId(),
    type: 'PROPOSAL_SENT',
    timestamp: Date.now(),
    userId: sender.id,
    userName: sender.name,
    targetUserId: recipient.id,
    targetUserName: recipient.name,
    details: {
      proposalName,
    },
  };
}

/**
 * Create a proposal accepted activity
 */
export function createProposalAcceptedActivity(
  accepter: User,
  sender: { id: string; name: string },
  proposalName: string
): Activity {
  return {
    id: generateActivityId(),
    type: 'PROPOSAL_ACCEPTED',
    timestamp: Date.now(),
    userId: accepter.id,
    userName: accepter.name,
    targetUserId: sender.id,
    targetUserName: sender.name,
    details: {
      proposalName,
    },
  };
}

/**
 * Create a proposal rejected activity
 */
export function createProposalRejectedActivity(
  rejecter: User,
  sender: { id: string; name: string },
  proposalName: string,
  reason?: string
): Activity {
  return {
    id: generateActivityId(),
    type: 'PROPOSAL_REJECTED',
    timestamp: Date.now(),
    userId: rejecter.id,
    userName: rejecter.name,
    targetUserId: sender.id,
    targetUserName: sender.name,
    details: {
      proposalName,
      ...(reason && { reason }),
    },
  };
}

/**
 * Create a proposal changes requested activity
 */
export function createProposalChangesRequestedActivity(
  requester: User,
  sender: { id: string; name: string },
  proposalName: string,
  feedback?: string
): Activity {
  return {
    id: generateActivityId(),
    type: 'PROPOSAL_CHANGES_REQUESTED',
    timestamp: Date.now(),
    userId: requester.id,
    userName: requester.name,
    targetUserId: sender.id,
    targetUserName: sender.name,
    details: {
      proposalName,
      ...(feedback && { feedback: feedback.substring(0, 100) + (feedback.length > 100 ? '...' : '') }),
    },
  };
}

// ============================================
// Deliverable Activities (with role-aware support)
// ============================================

/**
 * Create a deliverable approved activity
 */
export function createDeliverableApprovedActivity(
  approver: User,
  uploader: { id: string; name: string },
  deliverableName: string
): Activity {
  return {
    id: generateActivityId(),
    type: 'DELIVERABLE_APPROVED',
    timestamp: Date.now(),
    userId: approver.id,
    userName: approver.name,
    targetUserId: uploader.id,
    targetUserName: uploader.name,
    details: {
      deliverableName,
    },
  };
}

/**
 * Create a deliverable uploaded activity
 */
export function createDeliverableUploadedActivity(
  uploader: User,
  recipient: { id: string; name: string },
  deliverableName: string,
  version?: string
): Activity {
  return {
    id: generateActivityId(),
    type: 'DELIVERABLE_UPLOADED',
    timestamp: Date.now(),
    userId: uploader.id,
    userName: uploader.name,
    targetUserId: recipient.id,
    targetUserName: recipient.name,
    details: {
      deliverableName,
      ...(version && { version }),
    },
  };
}

// ============================================
// Payment Activities (with role-aware support)
// ============================================

/**
 * Create a payment received activity
 */
export function createPaymentReceivedActivity(
  payer: User,
  recipient: { id: string; name: string },
  amount: number,
  paymentType: string
): Activity {
  return {
    id: generateActivityId(),
    type: 'PAYMENT_RECEIVED',
    timestamp: Date.now(),
    userId: payer.id,
    userName: payer.name,
    targetUserId: recipient.id,
    targetUserName: recipient.name,
    details: {
      amount,
      paymentType,
    },
  };
}

// ============================================
// Project Activities
// ============================================

/**
 * Create a project created activity
 */
export function createProjectCreatedActivity(
  creator: User,
  projectName: string
): Activity {
  return {
    id: generateActivityId(),
    type: 'PROJECT_CREATED',
    timestamp: Date.now(),
    userId: creator.id,
    userName: creator.name,
    details: {
      projectName,
    },
  };
}

/**
 * Create a terms accepted activity
 */
export function createTermsAcceptedActivity(
  accepter: User,
  projectName: string
): Activity {
  return {
    id: generateActivityId(),
    type: 'TERMS_ACCEPTED',
    timestamp: Date.now(),
    userId: accepter.id,
    userName: accepter.name,
    details: {
      projectName,
    },
  };
}
