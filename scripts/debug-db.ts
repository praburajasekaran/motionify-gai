import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Client } = pg;

const testConnection = async () => {
    console.log('Testing DB connection...');
    const DATABASE_URL = process.env.DATABASE_URL;

    if (!DATABASE_URL) {
        console.error('ERROR: DATABASE_URL is not set in environment.');
        // Don't print the actual URL for security, unless debugging specifically
        return;
    }

    console.log('DATABASE_URL is set.');

    const isProduction = process.env.NODE_ENV === 'production';

    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: isProduction
            ? true // Production: enforce SSL with certificate validation
            : { rejectUnauthorized: false }, // Development: SSL with self-signed support
        connectionTimeoutMillis: 5000, // Fail fast
    });

    try {
        console.log('Connecting...');
        await client.connect();
        console.log('Connected!');

        console.log('Running query...');
        const res = await client.query('SELECT NOW()');
        console.log('Query result:', res.rows[0]);

        console.log('Checking project...');
        const projectRes = await client.query('SELECT id, terms_accepted_at FROM projects WHERE id = $1', ['a1b2c3d4-e5f6-7890-abcd-ef1234567890']);
        console.log('Project found:', projectRes.rows.length > 0 ? projectRes.rows[0] : 'NO');

        console.log('Checking user...');
        const userRes = await client.query('SELECT id, role FROM users WHERE id = $1', ['e1e1e3de-fae9-4684-8bab-2fb03826029e']);
        console.log('User found:', userRes.rows.length > 0 ? userRes.rows[0] : 'NO');

        await client.end();
        console.log('Connection closed.');
    } catch (err: any) {
        console.error('Connection failed:', err);
        if (err.message) console.error('Error message:', err.message);
        if (err.code) console.error('Error code:', err.code);
    }
};

testConnection();
