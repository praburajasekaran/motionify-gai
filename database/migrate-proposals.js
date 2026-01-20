import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const runMigration = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'add-client-to-proposals.sql'),
      'utf8'
    );

    await client.query(migrationSQL);
    console.log('✓ Migration completed successfully');
    console.log('  - Added client_user_id column to proposals table');
    console.log('  - Assigned all proposals to their inquiry contacts');
    console.log('  - Created new user accounts for contacts without existing accounts');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
};

runMigration();
