/**
 * API Configuration
 * Determines the base URL for API calls based on environment
 */

/**
 * Get the API base URL
 * - In production: Uses `/.netlify/functions` (Netlify handles routing)
 * - In development: Uses relative `/.netlify/functions` path (proxied by Next.js/Vite to port 8888)
 * - Can be overridden with VITE_API_BASE_URL or NEXT_PUBLIC_API_BASE_URL environment variable
 */
export function getApiBase(): string {
    // Check if we have an explicit API URL set (client-side only)
    if (typeof window !== 'undefined') {
        // Check for Vite env variable first
        const viteApiUrl = (import.meta as any).env?.VITE_API_BASE_URL;
        if (viteApiUrl) {
            return viteApiUrl;
        }

        // Check for Next.js env variable
        const explicitUrl = (process as any).env?.NEXT_PUBLIC_API_BASE_URL;
        if (explicitUrl) {
            return explicitUrl;
        }
    }

    // Always use relative path - both Vite (port 5173) and Next.js (port 5174)
    // have proxy/rewrite rules to forward /.netlify/functions/* to port 8888
    return '/.netlify/functions';
}

// Export as a function call for client-side
export const API_BASE = typeof window !== 'undefined'
    ? getApiBase()
    : 'http://localhost:8888/.netlify/functions'; // Server-side (SSR) needs absolute URL
