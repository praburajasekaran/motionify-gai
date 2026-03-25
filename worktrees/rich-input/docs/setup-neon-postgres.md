# Neon PostgreSQL Setup Guide

## Step 1: Create Neon Account

1. Go to https://neon.tech
2. Click "Sign Up" (free tier includes):
   - 3GB storage
   - 10GB data transfer/month
   - Unlimited databases
   - Auto-scaling
3. Sign up with GitHub or email

## Step 2: Create New Project

1. After login, click **"New Project"**
2. Fill in details:
   - **Project Name**: `motionify-pm-portal`
   - **Region**: Choose closest to your users (e.g., US East, EU West)
   - **PostgreSQL Version**: 16 (latest stable)
3. Click **"Create Project"**

## Step 3: Get Connection String

After project creation, you'll see your connection details:

```
Connection String (psql):
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

**Copy this entire string** - you'll need it for:
- Environment variables (`.env`)
- Running migrations
- Backend API configuration

Example:
```
postgresql://motionify_user:abc123xyz@ep-cool-meadow-123456.us-east-2.aws.neon.tech/motionify_pm?sslmode=require
```

## Step 4: Save Connection String Securely

Create `.env` file in project root:

```bash
# Database
DATABASE_URL=postgresql://[your-connection-string]
```

**Important:** Add `.env` to `.gitignore` (never commit credentials!)

## Step 5: Run Schema Migration

From your project root:

```bash
# Install PostgreSQL client (if not already installed)
# macOS:
brew install postgresql

# Ubuntu/Debian:
sudo apt-get install postgresql-client

# Run migration
psql $DATABASE_URL -f database/schema.sql
```

You should see output like:
```
CREATE EXTENSION
CREATE TYPE
CREATE TYPE
...
CREATE TABLE
CREATE TABLE
...
CREATE INDEX
CREATE INDEX
...
INSERT 0 1
```

## Step 6: Verify Setup

Connect to database and check tables:

```bash
psql $DATABASE_URL
```

In the PostgreSQL console:
```sql
-- List all tables
\dt

-- Should show:
-- organizations
-- users
-- projects
-- project_agreements
-- project_members
-- tasks
-- files
-- messages
-- message_attachments
-- revision_requests
-- meetings
-- magic_links
-- sessions
-- notifications

-- Check admin user was created
SELECT email, full_name, role FROM users;

-- Exit
\q
```

## Step 7: Configure for Production

### Enable Connection Pooling (Important!)

Neon provides connection pooling for serverless functions:

1. In Neon dashboard, go to **"Connection Details"**
2. Toggle **"Pooled connection"**
3. Copy the **pooled connection string**
4. Use this for Netlify Functions:

```bash
# .env
DATABASE_URL=postgresql://[pooled-connection-string]
```

Pooled string looks like:
```
postgresql://[user]:[password]@[host]/[database]?sslmode=require&pgbouncer=true
```

### Enable Auto-Suspend (Cost Optimization)

Free tier auto-suspends after 5 minutes of inactivity:
- First query after suspend takes ~1-2 seconds (cold start)
- This is fine for MVP usage
- Can disable in paid plans if needed

## Step 8: Backup Strategy

Neon provides:
- **Point-in-time recovery**: 7 days on free tier
- **Branching**: Create test branches of production DB

To create a branch:
```bash
# Via CLI (optional)
neonctl branches create --project-id [project-id] --name staging
```

Or use the dashboard: **Branches → Create Branch**

## Environment Variables Summary

Add these to your `.env`:

```bash
# Neon PostgreSQL
DATABASE_URL=postgresql://[pooled-connection-string]

# For local development (optional - direct connection)
DATABASE_URL_DIRECT=postgresql://[direct-connection-string]
```

## Troubleshooting

### Connection Refused
- Check if connection string includes `?sslmode=require`
- Verify project is not suspended (first query may take longer)

### Too Many Connections
- Use pooled connection string for serverless functions
- Neon free tier limits: 100 concurrent connections

### Migration Errors
- Ensure you're using PostgreSQL 14+
- Run `CREATE EXTENSION "uuid-ossp";` first if UUID errors occur

### Performance Issues
- Add indexes (already included in schema.sql)
- Check query performance in Neon dashboard → Monitoring

## Next Steps

✅ Database schema created
✅ Connection string secured
⬜ Connect backend API to database
⬜ Set up Cloudflare R2 for file storage
⬜ Configure Amazon SES for emails

---

**Need Help?**
- Neon Docs: https://neon.tech/docs
- Neon Discord: https://discord.gg/neon
