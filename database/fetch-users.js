import dotenv from 'dotenv';
import pg from 'pg';
const { Client } = pg;
dotenv.config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

try {
    await client.connect();
    console.log('\nFetching users...\n');

    let result = await client.query('SELECT id, full_name, email FROM users ORDER BY full_name');

    if (result.rows.length === 0) {
        console.log('No users found. Creating mock users...');
        // Insert mock users matching constants.ts
        const users = [
            { name: 'Alex Rivera', email: 'alex@motionify.com' },
            { name: 'Sarah Chen', email: 'sarah@motionify.com' },
            { name: 'Mike Ross', email: 'mike@techcorp.com' },
            { name: 'Jessica Day', email: 'jess@motionify.com' },
            { name: 'David Kim', email: 'david@motionify.com' }
        ];

        for (const u of users) {
            await client.query(
                'INSERT INTO users (full_name, email, role) VALUES ($1, $2, $3)',
                [u.name, u.email, 'client'] // Default to client for safety, except admin?
            );
        }

        result = await client.query('SELECT id, full_name, email FROM users ORDER BY full_name');
    }

    console.log('--- FOUND USERS ---');
    result.rows.forEach(u => {
        console.log(`${u.full_name} (${u.email}) -> ${u.id}`);
    });
    console.log('-------------------');

    await client.end();
} catch (error) {
    console.error('Error:', error);
    await client.end();
}
