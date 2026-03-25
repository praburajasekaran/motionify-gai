# Environment Variables Setup Guide

## Quick Start

Create a `.env` file in the **project root** (not in `landing-page/`):

```env
# Database (Neon PostgreSQL)
# IMPORTANT: Use POOLED connection string for serverless functions
DATABASE_URL=postgresql://user:password@host-pooler.region.aws.neon.tech/dbname?sslmode=require&channel_binding=require

# DIRECT connection string for migrations (optional)
DATABASE_URL_DIRECT=postgresql://user:password@host.region.aws.neon.tech/dbname?sslmode=require&channel_binding=require

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
MAGIC_LINK_EXPIRY=15

# Email (Development - Mailtrap)
MAILTRAP_USER=your_mailtrap_username
MAILTRAP_PASS=your_mailtrap_password

# Production Email (AWS SES) - uncomment for production
# SES_ACCESS_KEY_ID=your_ses_access_key
# SES_SECRET_ACCESS_KEY=your_ses_secret_key
# SES_REGION=us-east-1

# File Storage (Cloudflare R2) - optional, configure later
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=motionify-portal-files
R2_PUBLIC_URL=https://files.motionify.studio

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Generate Secure JWT_SECRET

Run this command to generate a cryptographically secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the output and use it as your `JWT_SECRET`.

**Important:** Never commit this secret to version control!

## Environment Variables Explained

### DATABASE_URL
- **Development:** Use Neon's **pooled** connection string (ends with `-pooler`)
- **Production:** Always use pooled connections for serverless functions
- **Why pooled?** Netlify functions are serverless - pooled connections prevent connection exhaustion

### DATABASE_URL_DIRECT
- Optional, only needed for database migrations
- Uses direct connection (not pooled)
- More stable for long-running migration scripts

### JWT_SECRET
- **Critical:** Used to sign authentication tokens
- Must be at least 32 bytes (256 bits)
- Different secret = all existing sessions invalidated
- **Never share or commit this!**

### MAGIC_LINK_EXPIRY
- How long magic links stay valid (in minutes)
- Default: 15 minutes
- Recommended: 10-30 minutes
- Shorter = more secure, Longer = better UX

### Email Configuration

**Development (Mailtrap):**
- Sign up at https://mailtrap.io (free)
- Get credentials from Inbox → SMTP Settings
- All emails intercepted, not delivered

**Production (AWS SES):**
- Requires AWS account and SES setup
- Must verify domain
- Start in sandbox mode (limited)
- Request production access for unlimited sending

### NEXT_PUBLIC_APP_URL
- Used for generating magic link URLs
- **Development:** `http://localhost:3000`
- **Production:** `https://yourdomain.com`
- Must match where users access the app

## File Location

```
motionify-portal-1/
├── .env                    ← CREATE THIS FILE HERE
├── .env.example           ← Example template
├── netlify.toml           ← Loads .env automatically
├── landing-page/
│   └── ...
└── netlify/
    └── functions/         ← These functions access .env variables
```

**❌ Wrong:** `landing-page/.env`
**✅ Correct:** `.env` (project root)

## Setup Steps

1. **Create .env file:**
   ```bash
   cd /path/to/motionify-portal-1
   touch .env
   # Edit with your values
   ```

2. **Add .env to .gitignore:**
   ```bash
   echo ".env" >> .gitignore
   ```

3. **Verify Netlify config:**
   Check `netlify.toml` has:
   ```toml
   [dev]
     command = "cd landing-page && npm run dev"
     port = 3000
   ```

4. **Start Netlify Dev:**
   ```bash
   netlify dev
   ```

5. **Verify variables loaded:**
   Check console output - should NOT see errors about missing env vars

## Common Issues

### ❌ "JWT_SECRET environment variable is not set"

**Cause:** Environment variables not loaded by Netlify functions

**Fix:**
1. Ensure `.env` is in project root (not `landing-page/`)
2. Restart Netlify Dev completely: `Ctrl+C` then `netlify dev`
3. Check `netlify.toml` is in project root
4. Verify file has correct format (no quotes around values)

### ❌ "DATABASE_URL environment variable is not set"

**Same fix as above** - environment variables not loading

### ❌ "Connection pool exhausted"

**Cause:** Using direct connection instead of pooled

**Fix:** Update `DATABASE_URL` to use `-pooler` endpoint

### ❌ Magic link shows localhost in production

**Cause:** `NEXT_PUBLIC_APP_URL` still set to localhost

**Fix:** Update to production domain in Netlify environment variables

## Production Environment Variables

For Netlify deployment, set these in **Netlify UI** (Site Settings → Environment Variables):

### Required Variables
```
DATABASE_URL
JWT_SECRET
MAGIC_LINK_EXPIRY
SES_ACCESS_KEY_ID
SES_SECRET_ACCESS_KEY
SES_REGION
NEXT_PUBLIC_APP_URL
```

### How to Set in Netlify

1. Go to your Netlify site dashboard
2. Site Settings → Environment Variables
3. Click "Add a variable"
4. Add each variable with its value
5. Choose scope: "All scopes" or specific environments
6. Save and redeploy

**Note:** Changes to environment variables require a new deployment to take effect.

## Security Checklist

- [ ] `.env` added to `.gitignore`
- [ ] JWT_SECRET is a secure random string (32+ bytes)
- [ ] Database uses SSL (sslmode=require)
- [ ] Production uses AWS SES, not Mailtrap
- [ ] NEXT_PUBLIC_APP_URL uses HTTPS in production
- [ ] Different JWT_SECRET for dev/staging/production

## Verification Script

Run this to verify environment variables are working:

```bash
node -e "
require('dotenv').config();
console.log('Environment Check:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ Set' : '✗ Missing');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✓ Set' : '✗ Missing');
console.log('MAILTRAP_USER:', process.env.MAILTRAP_USER ? '✓ Set' : '✗ Missing');
console.log('APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
"
```

## Need Help?

- See full setup guide: `docs/AUTHENTICATION_SETUP.md`
- Check Netlify Functions logs for specific errors
- Test authentication: `node scripts/test-magic-link.js`


