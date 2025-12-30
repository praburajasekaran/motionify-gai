/**
 * API Configuration
 * Determines the base URL for API calls based on environment
 */

/**
 * Get the API base URL
 * - In production: Uses `/.netlify/functions` (Netlify handles routing)
 * - In development: Uses `/api` (Next.js API routes proxy to Netlify functions)
 * - Can be overridden with NEXT_PUBLIC_API_BASE_URL environment variable
 * 
 * Note: For best development experience, run `netlify dev` which starts both
 * Next.js and Netlify functions. The `/api` routes will proxy to Netlify functions.
 */
export function getApiBase(): string {
    // Check if we have an explicit API URL set (client-side only)
    if (typeof window !== 'undefined') {
        const explicitUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        if (explicitUrl) {
            return explicitUrl;
        }
    }

    // In production or when deployed, use Netlify functions path
    // This works because Netlify's redirects handle /.netlify/functions/*
    if (process.env.NODE_ENV === 'production') {
        return '/.netlify/functions';
    }

    // In development, use Next.js API routes which proxy to Netlify functions
    // The API routes will try to connect to Netlify Dev server (port 8888)
    // If Netlify Dev isn't running, you'll get a helpful error message
    return '/api';
}

// Export as a function call for client-side, but evaluate once for server-side
// In Next.js App Router, this runs on both server and client
export const API_BASE = typeof window !== 'undefined' 
    ? getApiBase() 
    : '/api'; // Default to /api on server-side (SSR)

