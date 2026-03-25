
import dotenv from 'dotenv';
import { Pool } from 'pg';
import path from 'path';

// Load environment variables from the parent directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

async function checkDatabase() {
    console.log('🔍 Checking Database Connection...');

    try {
        const client = await pool.connect();
        console.log('✅ Connected to database successfully.');

        // Check if payments table exists
        const tableRes = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'payments'
      );
    `);

        if (tableRes.rows[0].exists) {
            console.log('✅ Table "payments" exists.');

            // Check column structure
            const columnsRes = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'payments';
      `);

            console.log('📋 Table Schema:');
            columnsRes.rows.forEach((row: any) => {
                console.log(`   - ${row.column_name} (${row.data_type})`);
            });

        } else {
            console.error('❌ Table "payments" does NOT exist.');
        }

        client.release();
    } catch (err: any) {
        console.error('❌ Database connection failed:', err.message);
    } finally {
        await pool.end();
    }
}

checkDatabase();
