/**
 * Shared Database Client Module
 *
 * Provides a centralized database connection with:
 * - SSL verification based on environment
 * - Connection pooling for better performance
 * - Proper error handling
 */

import pg from 'pg';

const { Pool, Client } = pg;

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// SSL configuration based on environment
// Production: require SSL with certificate validation
// Development: configurable via env var, defaults to no SSL
function getSSLConfig(): boolean | { rejectUnauthorized: boolean } {
    if (isProduction) {
        // In production, enable SSL with certificate validation
        // Set DISABLE_SSL_VALIDATION=true only if your DB provider requires it
        const disableValidation = process.env.DISABLE_SSL_VALIDATION === 'true';
        return disableValidation ? { rejectUnauthorized: false } : true;
    }

    // In development, check if SSL should be enabled
    if (process.env.DATABASE_SSL === 'true') {
        return { rejectUnauthorized: false };
    }

    return false;
}

// Validate DATABASE_URL exists
function validateDatabaseUrl(): string {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not configured');
    }
    return DATABASE_URL;
}

// Pool configuration
const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: getSSLConfig(),
    // Pool settings
    max: 10,                      // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,     // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Timeout trying to connect after 10 seconds
};

// Singleton pool instance (lazy initialized)
let pool: pg.Pool | null = null;

/**
 * Get the database connection pool.
 * Creates a new pool if one doesn't exist.
 * Use this for most operations as it handles connection management automatically.
 */
export function getPool(): pg.Pool {
    validateDatabaseUrl();

    if (!pool) {
        pool = new Pool({
            ...poolConfig,
            connectionString: process.env.DATABASE_URL,
        });

        // Handle pool errors
        pool.on('error', (err) => {
            console.error('Unexpected pool error:', err);
        });
    }

    return pool;
}

/**
 * Get a single database client.
 * Use this when you need transaction support or explicit connection management.
 * Remember to call client.end() when done.
 *
 * @deprecated Prefer using getPool() for better connection management
 */
export function getDbClient(): pg.Client {
    const DATABASE_URL = validateDatabaseUrl();

    return new Client({
        connectionString: DATABASE_URL,
        ssl: getSSLConfig(),
    });
}

/**
 * Execute a query using the pool.
 * Automatically handles connection acquisition and release.
 */
export async function query<T = any>(
    text: string,
    params?: any[]
): Promise<pg.QueryResult<T>> {
    const pool = getPool();
    return pool.query(text, params);
}

/**
 * Execute a transaction with automatic commit/rollback.
 * The callback receives a client to perform queries.
 * If the callback throws, the transaction is rolled back.
 * If it succeeds, the transaction is committed.
 */
export async function transaction<T>(
    callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Close the pool connection.
 * Call this during graceful shutdown.
 */
export async function closePool(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

// Type exports for convenience
export type { Pool, Client, QueryResult } from 'pg';
export type PoolClient = pg.PoolClient;
