/**
 * CSRF Protection — Global fetch interceptor
 *
 * Adds X-Requested-With header to all same-origin requests.
 * This triggers CORS preflight on cross-origin requests, which the
 * server rejects for unauthorized origins — preventing CSRF attacks.
 *
 * Must be called once at app initialization (before any API calls).
 */
export function installCSRFProtection(): void {
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    // Only add header for same-origin or relative URL requests (API calls)
    const isSameOrigin = url.startsWith('/') || url.startsWith(window.location.origin);

    if (isSameOrigin) {
      const headers = new Headers(init?.headers);
      if (!headers.has('X-Requested-With')) {
        headers.set('X-Requested-With', 'fetch');
      }
      return originalFetch(input, { ...init, headers });
    }

    return originalFetch(input, init);
  };
}
