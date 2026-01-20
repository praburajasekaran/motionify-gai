#!/usr/bin/env node
/**
 * Seed Test Users for E2E Testing
 * 
 * Usage: node database/seed-test-users.js
 * 
 * Creates 5 test users:
 * - admin@motionify.test (Admin)
 * - pm@motionify.test (Admin - acts as PM)
 * - team@motionify.test (Admin - team member)
 * - client@motionify.test (Client - primary contact)
 * - clientteam@motionify.test (Client - team member)
 */

const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env');
    process.exit(1);
}

async function seedTestUsers() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        console.log('🔌 Connecting to database...');
        await client.connect();

        // Read SQL file
        const sqlPath = path.join(__dirname, 'seed-test-users.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('🌱 Seeding test users...');
        const result = await client.query(sql);

        console.log('✅ Test users seeded successfully!\n');
        console.log('📋 Created/Updated Users:');
        console.log('─'.repeat(60));

        // The last result should be the SELECT query
        const users = result[result.length - 1]?.rows || result.rows || [];
        users.forEach(user => {
            console.log(`  ${user.role.padEnd(8)} | ${user.email.padEnd(30)} | ${user.full_name}`);
        });

        console.log('─'.repeat(60));
        console.log('\n🔑 Use these emails to request magic links for testing.');

    } catch (error) {
        console.error('❌ Error seeding users:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

seedTestUsers();
