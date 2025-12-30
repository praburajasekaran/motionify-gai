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
  
  // Get all existing tables
  const result = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  
  const existingTables = result.rows.map(r => r.table_name);
  
  // Tables needed for vertical slice
  const neededTables = ['inquiries', 'proposals', 'deliverables', 'payments'];
  
  console.log('\n🔍 Checking tables needed for vertical slice...\n');
  
  const missing = [];
  neededTables.forEach(table => {
    const exists = existingTables.includes(table);
    const status = exists ? '✅' : '❌';
    console.log(`${status} ${table}`);
    if (!exists) missing.push(table);
  });
  
  if (missing.length === 0) {
    console.log('\n✨ All required tables exist! You\'re ready to go!\n');
  } else {
    console.log(`\n⚠️  Missing ${missing.length} tables: ${missing.join(', ')}`);
    console.log('We\'ll need to add these tables.\n');
  }
  
  await client.end();
} catch (error) {
  console.error('❌ Error:', error.message);
  await client.end();
  process.exit(1);
}
