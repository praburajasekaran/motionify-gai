/**
 * Safe API response parsing utilities
 * Prevents "Unexpected token '<', "<!DOCTYPE "... is not valid JSON" errors
 * by checking content type and response format before parsing
 */

/**
 * Safely parse a fetch Response as JSON
 * Returns the parsed JSON or throws an error with a helpful message
 */
export async function safeJsonParse<T = any>(response: Response): Promise<T> {
    // Check Content-Type header
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    // Get response text first to check format
    const text = await response.text();

    // If empty response, return empty object
    if (!text.trim()) {
        return {} as T;
    }

    // Check if response is HTML (common error page format)
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        console.error('Received HTML instead of JSON. Response:', text.substring(0, 200));
        const hint = process.env.NODE_ENV === 'development' 
            ? '\n\n💡 Development Tip: Make sure Netlify Dev is running:\n   Run: netlify dev (from project root)\n   This starts both Next.js and Netlify functions.'
            : '';
        throw new Error(
            `Server returned HTML instead of JSON. This usually means the endpoint doesn't exist or returned an error page. Status: ${response.status} ${response.statusText}${hint}`
        );
    }

    // Check if response looks like an error message (starts with common error prefixes)
    const trimmed = text.trim();
    if (trimmed.startsWith('Function') || trimmed.startsWith('Error') || trimmed.startsWith('Cannot')) {
        console.error('Received error message instead of JSON. Response:', text.substring(0, 200));
        const hint = process.env.NODE_ENV === 'development' 
            ? '\n\n💡 Development Tip: Make sure Netlify Dev is running:\n   Run: netlify dev (from project root)\n   This starts both Next.js and Netlify functions.'
            : '';
        throw new Error(
            `Server returned an error message instead of JSON: ${text.substring(0, 100)}. Status: ${response.status} ${response.statusText}${hint}`
        );
    }

    // If Content-Type says it's not JSON, but it might still be JSON (some servers don't set headers correctly)
    // Try to parse anyway if it looks like JSON
    if (!isJson) {
        const trimmed = text.trim();
        const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[');
        
        if (!looksLikeJson) {
            console.error('Response is not JSON. Content-Type:', contentType, 'Content:', text.substring(0, 200));
            throw new Error(
                `Server returned non-JSON response. Content-Type: ${contentType || 'unknown'}. Status: ${response.status} ${response.statusText}`
            );
        }
    }

    // Try to parse as JSON
    try {
        return JSON.parse(text) as T;
    } catch (error) {
        console.error('Failed to parse JSON. Response:', text.substring(0, 200));
        throw new Error(
            `Failed to parse response as JSON. Status: ${response.status} ${response.statusText}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Helper to handle API responses with proper error handling
 * Returns the parsed data or throws an error
 */
export async function handleApiResponse<T = any>(response: Response): Promise<T> {
    const data = await safeJsonParse<T>(response);
    
    if (!response.ok) {
        // If we have an error message in the data, use it
        const errorMessage = (data as any)?.error || (data as any)?.message || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
    }
    
    return data;
}

