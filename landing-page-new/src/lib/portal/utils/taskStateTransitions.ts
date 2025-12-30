/**
 * Task state transition validation
 * Fixes Bug #18: Invalid Task Transitions
 */

import { TaskStatus } from '../types';

/**
 * Valid state transitions matrix
 * Maps each status to the statuses it can transition to
 */
export const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.PENDING]: [
    TaskStatus.IN_PROGRESS,
  ],
  [TaskStatus.IN_PROGRESS]: [
    TaskStatus.PENDING,
    TaskStatus.AWAITING_APPROVAL,
  ],
  [TaskStatus.AWAITING_APPROVAL]: [
    TaskStatus.COMPLETED,
    TaskStatus.REVISION_REQUESTED,
    TaskStatus.IN_PROGRESS,
  ],
  [TaskStatus.COMPLETED]: [
    TaskStatus.IN_PROGRESS, // Can reopen completed tasks
  ],
  [TaskStatus.REVISION_REQUESTED]: [
    TaskStatus.IN_PROGRESS,
    TaskStatus.PENDING,
  ],
};

/**
 * Check if a state transition is valid
 */
export function isValidTransition(
  fromStatus: TaskStatus,
  toStatus: TaskStatus
): boolean {
  // Same status is always valid (no-op)
  if (fromStatus === toStatus) {
    return true;
  }

  const allowedTransitions = VALID_TRANSITIONS[fromStatus];
  return allowedTransitions.includes(toStatus);
}

/**
 * Validate a state transition and return error message if invalid
 */
export function validateStateTransition(
  fromStatus: TaskStatus,
  toStatus: TaskStatus
): { valid: boolean; error?: string } {
  if (isValidTransition(fromStatus, toStatus)) {
    return { valid: true };
  }

  return {
    valid: false,
    error: `Cannot transition from ${fromStatus} to ${toStatus}. Allowed transitions: ${VALID_TRANSITIONS[fromStatus].join(', ')}`,
  };
}

/**
 * Get all valid next states for a given status
 */
export function getValidNextStates(currentStatus: TaskStatus): TaskStatus[] {
  return VALID_TRANSITIONS[currentStatus];
}
