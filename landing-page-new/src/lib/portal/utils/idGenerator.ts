/**
 * Centralized ID generation utility to prevent ID collisions
 * Uses crypto.randomUUID() for web-safe unique identifiers
 */

let idCounter = 0;

/**
 * Generates a unique ID using crypto.randomUUID() if available,
 * otherwise falls back to a combination of timestamp and counter
 */
function generateUniqueId(): string {
  // Use crypto.randomUUID() if available (modern browsers and Node.js 16+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: timestamp + counter + random
  const timestamp = Date.now();
  const counter = ++idCounter;
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${counter}-${random}`;
}

/**
 * Type-safe ID generators for each entity type
 */

export function generateNotificationId(): string {
  return `notif-${generateUniqueId()}`;
}

export function generateUserId(type: 'client' | 'motion' = 'client'): string {
  return `user-${type}-${generateUniqueId()}`;
}

export function generateTaskId(): string {
  return `task-${generateUniqueId()}`;
}

export function generateCommentId(): string {
  return `comment-${generateUniqueId()}`;
}

export function generateFileCommentId(): string {
  return `file-comment-${generateUniqueId()}`;
}

export function generateFileId(): string {
  return `file-${generateUniqueId()}`;
}

export function generateProjectId(): string {
  return `proj-${generateUniqueId()}`;
}

export function generateDeliverableId(prefix: string = 'del'): string {
  return `${prefix}-${generateUniqueId()}`;
}

export function generateActivityId(): string {
  return `act-${generateUniqueId()}`;
}
