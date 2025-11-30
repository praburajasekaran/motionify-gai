# Authentication System Setup Guide

This guide documents the authentication system setup, common issues, and deployment procedures for the Motionify Portal.

## Table of Contents

- [Overview](#overview)
- [Environment Setup](#environment-setup)
- [Database Schema Requirements](#database-schema-requirements)
- [Development Setup](#development-setup)
- [Common Issues & Solutions](#common-issues--solutions)
- [Production Deployment](#production-deployment)
- [Testing Authentication](#testing-authentication)

---

## Overview

The Motionify Portal uses a **magic link authentication** system:
- Users request a login link via email
- Click the link to authenticate (no passwords)
- JWT tokens are used for session management
- Sessions are stored in the database for tracking

### Architecture

```
User requests login
    ↓
Magic link sent to email (via Mailtrap/SES)
    ↓
User clicks link
    ↓
Token verified → Session created → JWT issued
    ↓
Cookie set (sb-session)
    ↓
User authenticated
```

---

## Environment Setup

### Required Environment Variables

Create a `.env` file in the **project root** (not in `landing-page/`):

```bash
# Database (Neon PostgreSQL)
# Use POOLED connection string for serverless functions
DATABASE_URL=postgresql://user:password@host-pooler.region.aws.neon.tech/dbname?sslmode=require

# DIRECT connection string for migrations (optional)
DATABASE_URL_DIRECT=postgresql://user:password@host.region.aws.neon.tech/dbname?sslmode=require

# Authentication
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
JWT_SECRET=your_jwt_secret_here

# Magic Link Expiry in minutes (default 15)
MAGIC_LINK_EXPIRY=15

# Email Configuration
# Development: Use Mailtrap (https://mailtrap.io)
MAILTRAP_USER=your_mailtrap_user
MAILTRAP_PASS=your_mailtrap_password

# Production: Use AWS SES
# SES_ACCESS_KEY_ID=your_ses_access_key
# SES_SECRET_ACCESS_KEY=your_ses_secret_key
# SES_REGION=us-east-1

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Environment Variables in Netlify

For production deployment on Netlify:

1. Go to Site Settings → Environment Variables
2. Add all the variables from `.env` (except `NEXT_PUBLIC_*` ones)
3. `NEXT_PUBLIC_*` variables should be added as build-time environment variables

**Important:** Netlify functions need environment variables to be set in the Netlify UI, not just in `.env` files.

---

## Database Schema Requirements

### Critical Tables

The authentication system requires these tables with specific columns:

#### 1. `users` Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    profile_picture_url TEXT,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'client', 'team')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);
```

#### 2. `sessions` Table

**IMPORTANT:** This table must have BOTH `token` and `jwt_token_hash` columns:

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,                    -- Session token
    jwt_token_hash VARCHAR(255) NOT NULL,          -- JWT token hash
    remember_me BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. `magic_link_tokens` Table

```sql
CREATE TABLE magic_link_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP WITH TIME ZONE
);
```

### Schema Migration Script

If you need to fix an existing database, run:

```bash
node scripts/fix-sessions-table.js
```

This script will:
- Check if the `token` column exists in `sessions`
- Add it if missing
- Preserve existing data

---

## Development Setup

### Prerequisites

- Node.js 20+
- PostgreSQL database (Neon recommended)
- Netlify CLI installed globally: `npm install -g netlify-cli`

### Step-by-Step Setup

1. **Clone the repository and install dependencies:**
   ```bash
   cd motionify-portal-1
   npm install
   cd landing-page
   npm install
   cd ..
   ```

2. **Set up environment variables:**
   ```bash
   # Copy example and edit
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Initialize the database:**
   ```bash
   # Connect to your database and run the schema
   psql $DATABASE_URL < database/schema.sql

   # Add sample data (optional)
   psql $DATABASE_URL < database/sample-data.sql
   ```

4. **Create a test user:**
   ```bash
   node scripts/create-test-user.js
   ```

5. **Start the development server:**
   ```bash
   # IMPORTANT: Run from project root, not landing-page/
   netlify dev
   ```

   This command will:
   - Start Netlify Functions on `http://localhost:8888`
   - Start Next.js on `http://localhost:3000`
   - Load environment variables from `.env`

6. **Access the application:**
   - Open `http://localhost:3000`
   - Go to `/login` and enter your email
   - Check Mailtrap for the magic link

### Project Structure

```
motionify-portal-1/
├── .env                          # Environment variables (DO NOT COMMIT)
├── netlify.toml                  # Netlify configuration
├── netlify/
│   └── functions/                # Netlify serverless functions
│       ├── auth-request-magic-link.js
│       ├── auth-verify-magic-link.js
│       ├── auth-me.js
│       └── auth-logout.js
├── landing-page/                 # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/           # Login page
│   │   │   ├── auth/verify/     # Magic link verification
│   │   │   └── portal/          # Protected portal pages
│   │   ├── context/
│   │   │   └── AuthContext.tsx  # Authentication context
│   │   └── lib/portal/api/
│   │       └── auth.api.ts      # Auth API client
│   └── netlify.toml             # Next.js specific config
├── database/
│   ├── schema.sql               # Database schema
│   └── sample-data.sql          # Sample data
└── scripts/
    ├── create-test-user.js      # Create test users
    ├── test-magic-link.js       # Generate test magic links
    └── fix-sessions-table.js    # Fix database schema
```

---

## Common Issues & Solutions

### Issue 1: "500 Internal Server Error" on Login

**Symptoms:**
- Magic link verification fails with 500 error
- Login page redirects back immediately

**Cause:**
- Missing environment variables in Netlify functions
- Database connection issues

**Solution:**
1. Ensure `.env` file exists in project root
2. Restart Netlify Dev: `Ctrl+C` then `netlify dev`
3. Check environment variables are loading:
   ```bash
   # Add this to any function temporarily:
   console.log('ENV CHECK:', {
     hasDb: !!process.env.DATABASE_URL,
     hasJwt: !!process.env.JWT_SECRET
   });
   ```

### Issue 2: "column 'token' does not exist"

**Symptoms:**
- Error message mentions missing `token` column in `sessions` table

**Cause:**
- Database schema is outdated

**Solution:**
```bash
node scripts/fix-sessions-table.js
```

### Issue 3: "column 'is_active' does not exist"

**Symptoms:**
- Error in `auth-me` function about missing columns

**Cause:**
- Code expects different schema than database has

**Solution:**
- Already fixed in `netlify/functions/auth-me.js`
- Uses correct columns: `title`, `profile_picture_url`, `last_login_at`

### Issue 4: Magic Link Already Used

**Symptoms:**
- "This magic link has already been used"

**Cause:**
- Magic links can only be used once
- Clicking link multiple times marks it as used

**Solution:**
- Request a new magic link
- Only click the link once
- For testing, use: `node scripts/test-magic-link.js`

### Issue 5: Token Expired

**Symptoms:**
- "This magic link has expired"

**Cause:**
- Magic links expire after 15 minutes (configurable)

**Solution:**
- Request a new magic link
- Adjust `MAGIC_LINK_EXPIRY` in `.env` if needed

### Issue 6: Multiple Netlify Dev Processes

**Symptoms:**
- Port conflicts
- Inconsistent behavior

**Solution:**
```bash
# Kill all Netlify Dev processes
killall node
# or more specifically:
pkill -f "netlify dev"

# Restart from project root only
netlify dev
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Environment variables configured in Netlify
- [ ] Database schema is up to date
- [ ] Email service configured (SES for production)
- [ ] JWT_SECRET is a secure random string (32+ bytes)
- [ ] Database connection string uses pooled connection
- [ ] NEXT_PUBLIC_APP_URL points to production domain
- [ ] Test authentication flow in staging environment

### Netlify Configuration

The `netlify.toml` in the root configures:
- Build command and directory
- Functions directory
- Redirects for API routes
- Development server settings

```toml
[build]
  base = "landing-page"
  command = "npm install && npm run build"
  publish = ".next"

[functions]
  directory = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[dev]
  command = "cd landing-page && npm run dev"
  port = 3000
  targetPort = 3000
  publish = "landing-page/.next"
  autoLaunch = false
```

### Environment Variables for Production

Set these in Netlify UI (Site Settings → Environment Variables):

```
DATABASE_URL=postgresql://...pooler...
JWT_SECRET=<secure-random-string>
MAGIC_LINK_EXPIRY=15
SES_ACCESS_KEY_ID=<aws-key>
SES_SECRET_ACCESS_KEY=<aws-secret>
SES_REGION=us-east-1
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Email Configuration

**Development:**
- Uses Mailtrap for testing
- All emails intercepted, not delivered

**Production:**
- Switch to AWS SES
- Update email service in `netlify/functions/utils/email.js`
- Verify domain in SES
- Request production access (SES starts in sandbox mode)

### Database Migration

Before deploying to production:

1. **Backup your database**
2. **Apply schema updates:**
   ```bash
   # Use direct connection for migrations
   psql $DATABASE_URL_DIRECT < database/schema.sql
   ```
3. **Verify critical tables:**
   ```bash
   node scripts/check-user-tokens.js
   ```

### Deployment Steps

1. **Push to Git:**
   ```bash
   git add .
   git commit -m "Deploy authentication system"
   git push origin main
   ```

2. **Netlify Auto-Deploy:**
   - Netlify detects the push
   - Runs build command
   - Deploys functions and frontend

3. **Post-Deployment Verification:**
   - Test login flow
   - Check email delivery
   - Verify session persistence
   - Test logout

---

## Testing Authentication

### Manual Testing

1. **Request Magic Link:**
   ```bash
   curl -X POST http://localhost:8888/.netlify/functions/auth-request-magic-link \
     -H "Content-Type: application/json" \
     -d '{"email":"client@example.com"}'
   ```

2. **Verify Token (use token from email):**
   ```bash
   curl -X POST http://localhost:8888/.netlify/functions/auth-verify-magic-link \
     -H "Content-Type: application/json" \
     -d '{"email":"client@example.com","token":"YOUR_TOKEN_HERE"}'
   ```

3. **Check Current User:**
   ```bash
   curl -X GET http://localhost:8888/.netlify/functions/auth-me \
     -H "Cookie: sb-session=YOUR_JWT_HERE"
   ```

### Automated Testing Scripts

#### Generate Test Magic Link
```bash
node scripts/test-magic-link.js
```

Output:
```
📧 Magic Link:
http://localhost:3000/auth/verify?token=...&email=client@example.com

🔑 Token: ...
⏰ Expires: 2025-11-20T11:50:51.889Z
```

#### Check User and Tokens
```bash
node scripts/check-user-tokens.js
```

Shows:
- User details
- Recent magic link tokens
- Token status (used/expired)

#### Create Test User
```bash
node scripts/create-test-user.js
```

Creates/updates `client@example.com` user.

### Browser Testing

1. Go to `http://localhost:3000/login`
2. Enter email: `client@example.com`
3. Check Mailtrap inbox for magic link
4. Click link (only once!)
5. Should redirect to `/portal` and be logged in
6. Refresh page - should stay logged in
7. Test logout from portal

---

## Security Considerations

### Production Security

1. **JWT Secret:**
   - Use a cryptographically secure random string
   - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
   - Never commit to Git
   - Rotate periodically

2. **Database:**
   - Use pooled connections for Netlify functions
   - Use SSL/TLS (required by Neon)
   - Limit connection pool size for serverless

3. **Magic Links:**
   - Expire after 15 minutes
   - Single-use only
   - Token marked as used after verification
   - Rate limit login requests (implement in production)

4. **Sessions:**
   - HTTP-only cookies
   - Secure flag in production
   - 7-day expiration
   - Store session in DB for revocation

5. **Email Security:**
   - Validate email format
   - Prevent email enumeration attacks
   - Rate limit magic link requests

### OWASP Top 10 Considerations

- ✅ **A01:2021 – Broken Access Control:** Role-based access in JWT
- ✅ **A02:2021 – Cryptographic Failures:** Secure JWT signing, HTTPS only
- ✅ **A03:2021 – Injection:** Parameterized queries used throughout
- ✅ **A07:2021 – Authentication Failures:** Passwordless auth, secure tokens
- ✅ **A09:2021 – Security Logging:** Console logs for debugging (enhance for production)

---

## Troubleshooting

### Enable Debug Logging

In any Netlify function, add:

```javascript
console.log('DEBUG:', {
  method: event.httpMethod,
  headers: event.headers,
  body: event.body,
  env: {
    hasDb: !!process.env.DATABASE_URL,
    hasJwt: !!process.env.JWT_SECRET,
  }
});
```

### Check Database Connection

```javascript
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('DB Connected:', result.rows[0]);
  } catch (error) {
    console.error('DB Error:', error);
  }
}
```

### View Netlify Function Logs

In Netlify UI:
1. Go to Functions tab
2. Click on function name
3. View real-time logs

Or in CLI:
```bash
netlify functions:log auth-verify-magic-link
```

---

## Additional Resources

- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [Next.js Authentication](https://nextjs.org/docs/authentication)
- [Neon PostgreSQL](https://neon.tech/docs)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Magic Link Authentication Guide](https://magic.link/docs)

---

## Changelog

### 2025-11-20
- Fixed Netlify environment variable loading
- Added missing `token` column to `sessions` table
- Updated `auth-me.js` to use correct database schema
- Updated `auth-verify-magic-link.js` to populate all required session columns
- Created comprehensive setup documentation

---

## Support

For issues or questions:
- Email: hello@motionify.studio
- GitHub Issues: [motionify-portal/issues](https://github.com/motionify/portal/issues)
