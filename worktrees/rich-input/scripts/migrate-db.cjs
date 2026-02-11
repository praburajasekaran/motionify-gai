
const pg = require('pg');
const fs = require('fs');
const path = require('path');

const { Client } = pg;

async function run() {
    const DATABASE_URL = process.env.DATABASE_URL;
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        console.log('Connected to DB');

        const sqlPath = path.join(__dirname, '../database/add-missing-tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing migration...');
        await client.query(sql);
        console.log('Migration completed successfully.');

        client.end();
    } catch (err) {
        console.error('Migration failed:', err);
        client.end();
    }
}

run();
