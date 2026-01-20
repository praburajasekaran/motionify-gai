#!/usr/bin/env node
/**
 * Seed Actual Test Users for Role-Based Access Testing
 * 
 * Usage: node database/seed-actual-users.cjs
 * 
 * Creates 5 actual test users:
 * - ekalaivan+sa@gmail.com (Super Admin)
 * - ekalaivan+pm@gmail.com (Project Manager)
 * - ekalaivan+mt@gmail.com (Motionify Team Member)
 * - ekalaivan+c@gmail.com (Client)
 * - ekalaivan+ct@gmail.com (Client Team Member)
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

async function seedActualUsers() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        console.log('🔌 Connecting to database...');
        await client.connect();

        // Read SQL file
        const sqlPath = path.join(__dirname, 'seed-actual-users.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('🌱 Seeding actual test users...');
        const result = await client.query(sql);

        console.log('✅ Actual test users seeded successfully!\n');
        console.log('📋 Created/Updated Users:');
        console.log('─'.repeat(80));

        // The last result should be the SELECT query
        const users = result[result.length - 1]?.rows || result.rows || [];
        users.forEach(user => {
            const roleLabel = {
                'super_admin': 'Super Admin',
                'project_manager': 'Project Manager',
                'team_member': 'Motionify Team',
                'client': 'Client'
            }[user.role] || user.role;
            console.log(`  ${roleLabel.padEnd(18)} | ${user.email.padEnd(30)} | ${user.full_name}`);
        });

        console.log('─'.repeat(80));
        console.log('\n🔑 Use these emails to request magic links for testing role-based access.');
        console.log('\n📝 Roles Overview:');
        console.log('  - Super Admin:     Full system access, can manage all users/projects');
        console.log('  - Project Manager: Can manage projects, view all projects');
        console.log('  - Motionify Team:  Can be assigned to tasks, upload files');
        console.log('  - Client:          Can view assigned projects, approve deliverables');
        console.log('  - Client Team:     Can view assigned projects (limited access)');

    } catch (error) {
        console.error('❌ Error seeding users:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

seedActualUsers();
