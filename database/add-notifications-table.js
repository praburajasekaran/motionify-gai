/**
 * Migration: Add Notifications Table
 * 
 * Run with: node database/add-notifications-table.js
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
    const DATABASE_URL = process.env.DATABASE_URL;

    if (!DATABASE_URL) {
        console.error('❌ DATABASE_URL environment variable is not set');
        process.exit(1);
    }

    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Connecting to database...');
        await client.connect();

        console.log('📄 Reading migration SQL...');
        const sqlPath = join(__dirname, 'add-notifications-table.sql');
        const sql = readFileSync(sqlPath, 'utf8');

        console.log('🚀 Running migration...');
        await client.query(sql);

        console.log('✅ Migration completed successfully!');

        // Verify table was created
        const result = await client.query(`
      SELECT COUNT(*) as count FROM notifications
    `);
        console.log(`📊 Notifications table has ${result.rows[0].count} rows`);

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
