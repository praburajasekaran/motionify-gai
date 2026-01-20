const { Client } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const sql = fs.readFileSync(path.join(__dirname, 'add-client-user-id-to-inquiries.sql'), 'utf8');
    
    console.log('📝 Running migration: add client_user_id to inquiries table...');
    await client.query(sql);
    
    console.log('✅ Migration completed successfully');
    
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'inquiries' AND column_name = 'client_user_id'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verified: client_user_id column exists');
      console.log('   Column details:', result.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
