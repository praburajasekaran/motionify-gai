/**
 * CSRF protection headers for authenticated API requests.
 * Include these in all state-changing fetch calls.
 */
export const CSRF_HEADERS = {
  'X-Requested-With': 'fetch',
} as const;
