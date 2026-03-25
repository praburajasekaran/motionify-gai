
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

        // List all tables
        const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        console.log('Tables:', tables.rows.map(r => r.table_name));

        // Check vertical_slice_projects
        const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'vertical_slice_projects'
    `);
        console.log('Columns in vertical_slice_projects:', res.rows.map(r => r.column_name));

        client.end();
    } catch (err) {
        console.error(err);
        client.end();
    }
}

run();
