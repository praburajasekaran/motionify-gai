/**
 * Script to create a test project in the database for terms acceptance testing
 * Run with: node database/create-test-project.js
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function createTestProject() {
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

        // First, check if we have any users to assign as client
        const usersResult = await client.query(`
      SELECT id, email, full_name, role FROM users LIMIT 5
    `);
        console.log('\nExisting users:');
        console.table(usersResult.rows);

        // Check if test project already exists
        const existingProject = await client.query(`
      SELECT id, project_number, status, terms_accepted_at 
      FROM projects 
      WHERE project_number = 'PROJ-TEST-001'
    `);

        if (existingProject.rows.length > 0) {
            console.log('\n✓ Test project already exists:');
            console.table(existingProject.rows);

            // Update MOCK_PROJECTS mapping info
            console.log('\n📝 Use this project ID in your MOCK_PROJECTS:');
            console.log(`   Project ID: ${existingProject.rows[0].id}`);
            return;
        }

        // Get or create a test client user
        let clientUserId;
        const existingClient = await client.query(`
      SELECT id FROM users WHERE email = 'test-client@motionify.com'
    `);

        if (existingClient.rows.length > 0) {
            clientUserId = existingClient.rows[0].id;
            console.log('\nUsing existing test client user:', clientUserId);
        } else {
            const newClient = await client.query(`
        INSERT INTO users (email, full_name, role)
        VALUES ('test-client@motionify.com', 'Test Client', 'client')
        RETURNING id
      `);
            clientUserId = newClient.rows[0].id;
            console.log('\nCreated new test client user:', clientUserId);
        }

        // Create a test project
        const projectResult = await client.query(`
      INSERT INTO projects (
        project_number,
        client_user_id,
        status,
        total_revisions_allowed,
        revisions_used
      ) VALUES (
        'PROJ-TEST-001',
        $1,
        'active',
        3,
        0
      )
      RETURNING id, project_number, client_user_id, status
    `, [clientUserId]);

        const testProject = projectResult.rows[0];
        console.log('\n✓ Test project created:');
        console.table([testProject]);

        console.log('\n📝 Update your MOCK_PROJECTS in constants.ts with this ID:');
        console.log(`   Project ID: ${testProject.id}`);
        console.log('\n   Example:');
        console.log(`   { id: '${testProject.id}', title: 'TechCorp Product Launch Q3', ... }`);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

createTestProject();
