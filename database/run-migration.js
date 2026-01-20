import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

// Load environment variables
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    const DATABASE_URL = process.env.DATABASE_URL;

    if (!DATABASE_URL) {
        console.error('❌ Error: DATABASE_URL not found in .env file');
        process.exit(1);
    }

    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        const sqlFile = process.argv[2];
        if (!sqlFile) {
            throw new Error('Please provide an SQL file to run (e.g. node run-migration.js add-pending-inquiries-table.sql)');
        }

        console.log(`📡 Connecting to Neon PostgreSQL...`);
        await client.connect();

        const sqlPath = path.join(__dirname, sqlFile);
        console.log(`📖 Reading ${sqlFile}...`);
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('⚙️  Executing SQL...');
        await client.query(sql);
        console.log('✅ Migration executed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
