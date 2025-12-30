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
    type: ActivityType.TASK_STATUS_CHANGED,
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
    type: ActivityType.TASK_CREATED,
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
    type: ActivityType.TASK_UPDATED,
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
    type: ActivityType.REVISION_REQUESTED,
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
    type: ActivityType.COMMENT_ADDED,
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
    type: ActivityType.FILE_UPLOADED,
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
    type: ActivityType.TEAM_MEMBER_INVITED,
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
 * Create a team updated activity
 */
export function createTeamUpdatedActivity(
  user: User,
  changeDescription: string
): Activity {
  return {
    id: generateActivityId(),
    type: ActivityType.TEAM_UPDATED,
    timestamp: Date.now(),
    userId: user.id,
    userName: user.name,
    details: {
      changeDescription,
    },
  };
}
