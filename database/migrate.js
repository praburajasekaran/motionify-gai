#!/usr/bin/env node

/**
 * Database Migration Script
 * Deploys schema.sql to Neon PostgreSQL
 * 
 * Usage: node database/migrate.js
 */

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

async function migrate() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL not found in .env file');
    console.error('Please add your Neon connection string to the .env file');
    process.exit(1);
  }

  console.log('🚀 Starting database migration...\n');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    // Connect to database
    console.log('📡 Connecting to Neon PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    console.log('📖 Reading schema.sql...');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('✅ Schema loaded\n');

    // Execute schema
    console.log('⚙️  Executing SQL commands...');
    await client.query(schema);
    console.log('✅ Schema deployed successfully!\n');

    // Verify tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('📊 Created tables:');
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
    console.log(`\n✨ Total: ${result.rows.length} tables created\n`);

    // Show admin user
    const adminResult = await client.query(`SELECT id, email, full_name, role FROM users WHERE role = 'admin' LIMIT 1`);
    if (adminResult.rows.length > 0) {
      const admin = adminResult.rows[0];
      console.log('👤 Admin user created:');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Name: ${admin.full_name}`);
      console.log(`   Role: ${admin.role}\n`);
    }

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

migrate();
