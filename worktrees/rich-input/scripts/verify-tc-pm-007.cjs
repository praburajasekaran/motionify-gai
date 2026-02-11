
const pg = require('pg');
const http = require('http');

const { Client } = pg;

async function run() {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
        console.error('DATABASE_URL not set');
        process.exit(1);
    }

    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        console.log('Connected to DB');

        // 1. Ensure we have data
        let res = await client.query(`
      SELECT p.id as project_id, i.assigned_to_admin_id
      FROM vertical_slice_projects p
      JOIN inquiries i ON p.inquiry_id = i.id
      WHERE i.assigned_to_admin_id IS NOT NULL
      LIMIT 1
    `);

        if (res.rows.length === 0) {
            console.log('No project found. Seeding test data...');

            // Seed User (Project Manager)
            const userRes = await client.query(`
        INSERT INTO users (email, full_name, role)
        VALUES ('testpm@example.com', 'Test PM', 'project_manager')
        ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
        RETURNING id
      `);
            const userId = userRes.rows[0].id;

            // Seed Inquiry
            const inquiryRes = await client.query(`
        INSERT INTO inquiries (inquiry_number, contact_name, contact_email, quiz_answers, assigned_to_admin_id)
        VALUES ('INQ-TEST-001', 'Test Contact', 'test@example.com', '{}', $1)
        ON CONFLICT (inquiry_number) DO UPDATE SET assigned_to_admin_id = $1
        RETURNING id
      `, [userId]);
            const inquiryId = inquiryRes.rows[0].id;

            // Seed Project
            await client.query(`
        INSERT INTO vertical_slice_projects (project_number, inquiry_id)
        VALUES ('PROJ-TEST-001', $1)
        ON CONFLICT (project_number) DO NOTHING
      `, [inquiryId]);

            // Retrieve again
            res = await client.query(`
        SELECT p.id as project_id, i.assigned_to_admin_id
        FROM vertical_slice_projects p
        JOIN inquiries i ON p.inquiry_id = i.id
        WHERE p.project_number = 'PROJ-TEST-001'
      `);
        }

        if (res.rows.length === 0) {
            console.error('Failed to seed or find project data.');
            process.exit(1);
        }

        const { project_id, assigned_to_admin_id } = res.rows[0];
        console.log(`Testing with Project: ${project_id}, Admin: ${assigned_to_admin_id}`);

        // 2. Make request to Netlify Function
        const data = JSON.stringify({
            projectId: project_id,
            userId: assigned_to_admin_id
        });

        const options = {
            hostname: 'localhost',
            port: 5173, // Vite dev server port (proxies to functions)
            path: '/.netlify/functions/project-members-remove',
            method: 'POST', // or DELETE
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        console.log('Sending request to', options.path);

        const req = http.request(options, (res) => {
            console.log(`StatusCode: ${res.statusCode}`);

            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                console.log('Response:', body);

                if (res.statusCode === 400 && body.includes('Cannot remove the last Project Manager')) {
                    console.log('✅ TEST PASSED: Prevented removing last PM.');
                } else {
                    console.error('❌ TEST FAILED: Unexpected response.');
                    process.exit(1);
                }
                client.end();
            });
        });

        req.on('error', (error) => {
            console.error('Request Error:', error);
            client.end();
        });

        req.write(data);
        req.end();

    } catch (err) {
        console.error(err);
        client.end();
    }
}

run();
