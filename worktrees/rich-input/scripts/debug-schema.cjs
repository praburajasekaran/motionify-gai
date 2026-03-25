
const pg = require('pg');

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

        // Inspect columns
        const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects'
    `);

        console.log('Columns in projects table:', res.rows.map(r => r.column_name));

        client.end();
    } catch (err) {
        console.error(err);
        client.end();
    }
}

run();
