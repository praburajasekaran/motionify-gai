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
  console.log('\n📊 Checking existing tables in your database...\n');
  
  const result = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  
  if (result.rows.length === 0) {
    console.log('✅ No tables found - database is clean!\n');
  } else {
    console.log(`Found ${result.rows.length} existing tables:\n`);
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
    console.log('\n⚠️  Database already has tables!');
    console.log('\nOptions:');
    console.log('  1. Keep existing tables (skip migration)');
    console.log('  2. Drop all tables and re-run migration (DANGEROUS - loses data!)');
  }
  
  await client.end();
} catch (error) {
  console.error('❌ Error:', error.message);
  await client.end();
  process.exit(1);
}
