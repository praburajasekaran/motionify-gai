/**
 * Shared Database Client Module
 *
 * Provides a centralized database connection with:
 * - Neon serverless HTTP driver for edge-optimized queries
 * - No connection pooling needed (handled by Neon infrastructure)
 * - 5-second timeout for all queries
 * - SSL configuration based on environment
 */

import { neon } from '@neondatabase/serverless';

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Validate DATABASE_URL exists
function validateDatabaseUrl(): string {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not configured');
    }
    return DATABASE_URL;
}

// Initialize Neon SQL client with timeout
// Uses HTTP-based queries - no connection pooling needed
const DATABASE_URL = validateDatabaseUrl();
const sql = neon(DATABASE_URL, {
    fetchOptions: {
        signal: AbortSignal.timeout(5000), // 5-second timeout for all queries
    },
});

/**
 * Execute a query using the Neon HTTP driver.
 * Automatically handles parameterization and returns results.
 *
 * @param text - SQL query with $1, $2, etc. placeholders
 * @param params - Array of parameters to bind to query
 * @returns Query result with rows array and metadata
 */
export async function query<T = any>(
    text: string,
    params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
    try {
        // Convert parameterized query to tagged template
        // Replace $1, $2, etc. with actual values
        if (params && params.length > 0) {
            // Build the query by replacing placeholders
            // For Neon's tagged template, we need to construct the query differently
            let queryText = text;
            const values = [...params];

            // Neon driver expects tagged template literals, but for backward compatibility
            // we need to handle parameterized queries ($1, $2 style)
            // We'll use a workaround by building a dynamic query
            const result = await sql(text, params);

            // Neon returns array of rows directly, we wrap it for compatibility
            return {
                rows: result as T[],
                rowCount: (result as any[]).length,
            };
        } else {
            // No parameters - use tagged template directly
            const result = await sql([text] as any);
            return {
                rows: result as T[],
                rowCount: (result as any[]).length,
            };
        }
    } catch (error: any) {
        console.error('Database query error:', error);
        throw error;
    }
}

/**
 * Execute a transaction with automatic commit/rollback.
 * Uses Neon's transaction() method for atomic operations.
 *
 * @param callback - Function that receives sql client for queries
 * @returns Result from the callback
 */
export async function transaction<T>(
    callback: (txSql: typeof sql) => Promise<T>
): Promise<T> {
    try {
        // Neon's transaction support uses sql.transaction([...queries])
        // For complex transactions, we'll execute BEGIN/COMMIT manually
        await sql`BEGIN`;

        try {
            const result = await callback(sql);
            await sql`COMMIT`;
            return result;
        } catch (error) {
            await sql`ROLLBACK`;
            throw error;
        }
    } catch (error: any) {
        console.error('Database transaction error:', error);
        throw error;
    }
}

// Export sql client for direct use if needed
export { sql };

// Type exports for convenience
export interface QueryResult<T = any> {
    rows: T[];
    rowCount: number;
}
