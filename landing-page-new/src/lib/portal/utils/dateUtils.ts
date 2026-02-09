/**
 * Date utility functions with timezone support
 * Fixes Bug #3: Timezone-Unsafe Date Formatting
 * Fixes Bug #15: Code Duplication (timeAgo function)
 *
 * Timezone support: call setUserTimezone() once at login to apply the user's
 * preferred timezone to all formatting functions automatically.
 * Calendar-date functions (formatDeadline, isOverdue, toInputDateFormat) are
 * intentionally timezone-unaware to avoid shifting dates.
 */

/** Module-level timezone. null = use browser default. */
let _userTimezone: string | null = null;

export function setUserTimezone(tz: string | null): void {
  _userTimezone = tz;
}

export function getUserTimezone(): string | null {
  return _userTimezone;
}

/** Inject timeZone into Intl options when a user timezone is set. */
function withTz(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions {
  if (_userTimezone) {
    return { ...options, timeZone: _userTimezone };
  }
  return options;
}

/** Format a date string for comparison in the user's timezone. */
function toDateKey(date: Date): string {
  return date.toLocaleDateString('en-CA', withTz({
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }));
}

/**
 * Format a date string or timestamp in the user's timezone
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

    return dateObj.toLocaleDateString(undefined, withTz(defaultOptions));
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date with time in the user's timezone
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
 * Format a deadline date (YYYY-MM-DD string)
 * Intentionally timezone-unaware — deadlines are calendar dates, not moments in time.
 * Applying a timezone offset could shift "Jan 15" to "Jan 14".
 */
export function formatDeadline(deadline: string): string {
  try {
    // Parse as local date (YYYY-MM-DD format)
    // Add 'T00:00:00' to ensure it's parsed as local midnight, not UTC
    const dateObj = new Date(deadline + 'T00:00:00');

    if (isNaN(dateObj.getTime())) {
      return deadline; // Return original if invalid
    }

    // Use toLocaleDateString WITHOUT timezone override for calendar dates
    return dateObj.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    console.error('Error formatting deadline:', error);
    return deadline;
  }
}

/**
 * Format time portion of a timestamp (e.g., "3:45 PM")
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, withTz({
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }));
}

/**
 * Check if a timestamp is from today (in the user's timezone)
 */
function isToday(timestamp: number): boolean {
  return toDateKey(new Date(timestamp)) === toDateKey(new Date());
}

/**
 * Check if a timestamp is from yesterday (in the user's timezone)
 */
function isYesterday(timestamp: number): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return toDateKey(new Date(timestamp)) === toDateKey(yesterday);
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

  const time = formatTime(timestamp);

  // For very recent (within last minute)
  if (seconds < 60) {
    return `just now`;
  }

  // For today: show relative time + actual time
  if (isToday(timestamp)) {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago at ${time}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} ago at ${time}`;
  }

  // For yesterday
  if (isYesterday(timestamp)) {
    return `Yesterday at ${time}`;
  }

  // For this week (2-6 days ago)
  if (days < 7) {
    const dayName = new Date(timestamp).toLocaleDateString(undefined, withTz({ weekday: 'long' }));
    return `${dayName} at ${time}`;
  }

  // For older dates: show date + time
  if (weeks < 4) {
    const dateStr = new Date(timestamp).toLocaleDateString(undefined, withTz({
      month: 'short',
      day: 'numeric'
    }));
    return `${dateStr} at ${time}`;
  }

  // For much older dates
  if (months < 12) {
    const dateStr = new Date(timestamp).toLocaleDateString(undefined, withTz({
      month: 'short',
      day: 'numeric'
    }));
    return `${dateStr} at ${time}`;
  }

  // For dates over a year old
  const dateStr = new Date(timestamp).toLocaleDateString(undefined, withTz({
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }));
  return `${dateStr} at ${time}`;
}

/**
 * Check if a deadline is overdue
 * Intentionally timezone-unaware — uses local machine time for deadline comparison.
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
 * Get ISO string for current date (for deadline inputs)
 * Timezone-aware: returns "today" in the user's timezone.
 */
export function getTodayISODate(): string {
  if (_userTimezone) {
    // en-CA locale returns YYYY-MM-DD format
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: _userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert ISO date string to YYYY-MM-DD format for input fields
 * Intentionally timezone-unaware — preserves the date as-is for form inputs.
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

/**
 * Contextual timestamp: relative for recent (<7 days), absolute for older.
 * Returns null for falsy input (handles optional timestamps).
 */
export function formatTimestamp(date: string | number | Date | null | undefined): string | null {
  if (!date) return null;
  const dateObj = typeof date === 'string' ? new Date(date)
    : typeof date === 'number' ? new Date(date)
    : date;
  if (isNaN(dateObj.getTime())) return null;

  const now = Date.now();
  const diffMs = now - dateObj.getTime();
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

  if (diffMs < SEVEN_DAYS && diffMs >= 0) {
    return timeAgo(dateObj.getTime());
  }
  return formatDate(dateObj);
}
