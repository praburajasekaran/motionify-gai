/**
 * Contextual date formatting utilities for the admin app.
 * Mirrors formatTimestamp from landing-page-new/src/lib/portal/utils/dateUtils.ts
 *
 * Timezone support: call setUserTimezone() once at login to apply the user's
 * preferred timezone to all formatting functions automatically.
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

/**
 * Format a date as a short absolute string (e.g., "Jan 15, 2026")
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, withTz({
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }));
}

/**
 * Format a date+time string (e.g., "Jan 15, 2026, 3:45 PM") for tooltips
 */
export function formatDateTime(date: string | number | Date | null | undefined): string | null {
  if (!date) return null;
  const dateObj = typeof date === 'string' ? new Date(date)
    : typeof date === 'number' ? new Date(date)
    : date;
  if (isNaN(dateObj.getTime())) return null;

  return dateObj.toLocaleDateString(undefined, withTz({
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }));
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, withTz({
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }));
}

function isToday(timestamp: number): boolean {
  return toDateKey(new Date(timestamp)) === toDateKey(new Date());
}

function isYesterday(timestamp: number): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return toDateKey(new Date(timestamp)) === toDateKey(yesterday);
}

function timeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const time = formatTime(timestamp);

  if (seconds < 60) {
    return 'just now';
  }

  if (isToday(timestamp)) {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago at ${time}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} ago at ${time}`;
  }

  if (isYesterday(timestamp)) {
    return `Yesterday at ${time}`;
  }

  if (days < 7) {
    const dayName = new Date(timestamp).toLocaleDateString(undefined, withTz({ weekday: 'long' }));
    return `${dayName} at ${time}`;
  }

  const dateStr = new Date(timestamp).toLocaleDateString(undefined, withTz({
    month: 'short',
    day: 'numeric',
  }));
  return `${dateStr} at ${time}`;
}
