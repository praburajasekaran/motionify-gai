/**
 * Date utility functions with timezone support
 * Fixes Bug #3: Timezone-Unsafe Date Formatting
 * Fixes Bug #15: Code Duplication (timeAgo function)
 */

/**
 * Format a date string or timestamp in the user's local timezone
 * Safely handles ISO strings, timestamps, and Date objects
 */
export function formatDate(date: string | number | Date, options?: Intl.DateTimeFormatOptions): string {
  try {
    const dateObj = typeof date === 'string'
      ? new Date(date) // Parses ISO strings with timezone info
      : typeof date === 'number'
      ? new Date(date) // Unix timestamp
      : date;

    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date:', date);
      return 'Invalid date';
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options,
    };

    return dateObj.toLocaleDateString(undefined, defaultOptions);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date with time in the user's local timezone
 */
export function formatDateTime(date: string | number | Date): string {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a deadline date (YYYY-MM-DD string) in user's local timezone
 * Handles the common case of date-only strings without time component
 */
export function formatDeadline(deadline: string): string {
  try {
    // Parse as local date (YYYY-MM-DD format)
    // Add 'T00:00:00' to ensure it's parsed as local midnight, not UTC
    const dateObj = new Date(deadline + 'T00:00:00');

    if (isNaN(dateObj.getTime())) {
      return deadline; // Return original if invalid
    }

    return formatDate(dateObj);
  } catch (error) {
    console.error('Error formatting deadline:', error);
    return deadline;
  }
}

/**
 * Convert a relative time to human-readable format
 * Consolidated from multiple duplicated implementations across the codebase
 */
export function timeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) {
    return 'just now';
  } else if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (days < 7) {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } else if (weeks < 4) {
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  } else if (months < 12) {
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  } else {
    return `${years} year${years !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Check if a deadline is overdue
 */
export function isOverdue(deadline: string): boolean {
  try {
    const deadlineDate = new Date(deadline + 'T23:59:59'); // End of deadline day in local time
    return deadlineDate.getTime() < Date.now();
  } catch (error) {
    return false;
  }
}

/**
 * Get ISO string for current date at local midnight (for deadline inputs)
 */
export function getTodayISODate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert ISO date string to YYYY-MM-DD format for input fields
 */
export function toInputDateFormat(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    return '';
  }
}
