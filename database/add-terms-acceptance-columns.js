/**
 * Migration script to add terms acceptance columns to projects table
 * Run with: node database/add-terms-acceptance-columns.js
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function addTermsAcceptanceColumns() {
    const DATABASE_URL = process.env.DATABASE_URL;

    if (!DATABASE_URL) {
        console.error('DATABASE_URL not configured in .env');
        process.exit(1);
    }

    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // Add terms_accepted_at column
        console.log('Adding terms_accepted_at column...');
        await client.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ
    `);

        // Add terms_accepted_by column
        console.log('Adding terms_accepted_by column...');
        await client.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS terms_accepted_by UUID REFERENCES users(id)
    `);

        // Add terms_ip_address column
        console.log('Adding terms_ip_address column...');
        await client.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS terms_ip_address VARCHAR(50)
    `);

        // Verify columns were added
        const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'projects' 
        AND column_name IN ('terms_accepted_at', 'terms_accepted_by', 'terms_ip_address')
    `);

        console.log('\nColumns in projects table:');
        console.table(result.rows);

        console.log('\n✓ Migration completed successfully!');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

addTermsAcceptanceColumns();
