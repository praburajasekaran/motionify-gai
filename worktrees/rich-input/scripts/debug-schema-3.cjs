
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

        // Check views
        const views = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
    `);
        console.log('Views:', views.rows.map(r => r.table_name));

        // Check project_members columns
        const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'project_members'
    `);
        console.log('Columns in project_members:', res.rows.map(r => r.table_name + '.' + r.column_name));

        // Check inquiries columns
        const inc = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'inquiries'
    `);
        console.log('Columns in inquiries:', inc.rows.map(r => r.column_name));

        client.end();
    } catch (err) {
        console.error(err);
        client.end();
    }
}

run();
