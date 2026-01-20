#!/usr/bin/env node

import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL not found in .env file');
    process.exit(1);
  }

  console.log('🚀 Fixing client_user_id column type...\n');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    const sqlPath = path.join(__dirname, 'fix-client-user-id-type.sql');
    console.log('📖 Reading migration SQL...');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('⚙️  Executing migration...');
    await client.query(sql);
    console.log('✅ Migration complete!\n');

    const checkResult = await client.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'inquiries' AND column_name = 'client_user_id'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log(`📊 Column type: ${checkResult.rows[0].data_type}`);
    }

    console.log('\n🎉 client_user_id column is now TEXT type!');
    console.log('✅ You can now create inquiries with mock user IDs like "user-4"\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
