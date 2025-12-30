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

async function addMissingTables() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL not found in .env file');
    process.exit(1);
  }

  console.log('🚀 Adding missing tables to database...\n');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('📡 Connecting to Neon PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    const sqlPath = path.join(__dirname, 'add-missing-tables.sql');
    console.log('📖 Reading add-missing-tables.sql...');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('✅ SQL loaded\n');

    console.log('⚙️  Executing SQL commands...');
    await client.query(sql);
    console.log('✅ Tables added successfully!\n');

    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name IN ('inquiries', 'proposals', 'deliverables', 'payments')
      ORDER BY table_name
    `);

    console.log('📊 Newly added tables:');
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
    console.log(`\n✨ Total: ${result.rows.length} new tables\n`);

    const allTablesResult = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    console.log(`📈 Total tables in database: ${allTablesResult.rows[0].count}\n`);

    console.log('🎉 Migration complete!');
    console.log('🔗 View your database: https://console.neon.tech\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addMissingTables();
