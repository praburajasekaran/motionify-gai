import dotenv from 'dotenv';
dotenv.config();

console.log('\n🔍 Checking your DATABASE_URL...\n');

const url = process.env.DATABASE_URL;

if (!url) {
  console.log('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

// Parse the connection string (hide password)
const urlObj = new URL(url);
console.log('Database Host:', urlObj.hostname);
console.log('Database Name:', urlObj.pathname.slice(1));
console.log('Username:', urlObj.username);
console.log('Password:', urlObj.password ? '***' + urlObj.password.slice(-4) : 'NOT SET');
console.log('\n📝 Connection string format looks:', url.startsWith('postgresql://') ? '✅ Good' : '❌ Should start with postgresql://');
