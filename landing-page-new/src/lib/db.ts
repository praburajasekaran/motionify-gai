/**
 * PostgreSQL Database Connection
 * 
 * Singleton connection pool for the Next.js application.
 * Uses environment variable DATABASE_URL for connection.
 */

import { Pool, PoolClient, QueryResult } from 'pg';

let pool: Pool | null = null;

/**
 * Get or create the database connection pool
 */
export function getPool(): Pool {
    if (!pool) {
        const databaseUrl = process.env.DATABASE_URL;

        if (!databaseUrl) {
            throw new Error('DATABASE_URL environment variable is not set');
        }

        const isProduction = process.env.NODE_ENV === 'production';

        pool = new Pool({
            connectionString: databaseUrl,
            ssl: isProduction
                ? true // Production: enforce SSL with certificate validation
                : process.env.DATABASE_SSL === 'true'
                    ? true // Development/Staging: SSL with certificate validation
                    : undefined, // Development: no SSL
            max: 20, // Maximum number of clients in the pool
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        // Handle pool errors
        pool.on('error', (err) => {
            console.error('Unexpected error on idle database client', err);
        });

        console.log('✅ Database pool created');
    }

    return pool;
}

/**
 * Execute a query with automatic connection handling
 */
export async function query<T extends Record<string, any> = any>(
    text: string,
    params?: any[]
): Promise<QueryResult<T>> {
    const pool = getPool();
    const start = Date.now();

    try {
        const result = await pool.query<T>(text, params);
        const duration = Date.now() - start;

        if (process.env.NODE_ENV === 'development') {
            console.log('Executed query', { text, duration, rows: result.rowCount });
        }

        return result;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
    const pool = getPool();
    return await pool.connect();
}

/**
 * Execute a transaction with automatic rollback on error
 */
export async function transaction<T>(
    callback: (client: PoolClient) => Promise<T>
): Promise<T> {
    const client = await getClient();

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
 * Close the database pool (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('✅ Database pool closed');
    }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
    try {
        const result = await query('SELECT NOW() as now');
        console.log('✅ Database connection successful:', result.rows[0].now);
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}
