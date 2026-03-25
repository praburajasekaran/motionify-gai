# Netlify Deployment Guide - Motionify PM Portal

## Prerequisites

- GitHub account (to host repository)
- Netlify account (free tier is sufficient)
- Neon PostgreSQL database set up
- Mailtrap account for development emails (or Amazon SES for production)

---

## Step 1: Prepare Your Repository

### 1.1 Initialize Git (if not already done)

```bash
git init
git add .
git commit -m "Initial commit: Complete authentication system"
```

### 1.2 Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `motionify-pm-portal`
3. Visibility: **Private** (recommended for client projects)
4. Click **"Create repository"**

### 1.3 Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/motionify-pm-portal.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy to Netlify

### 2.1 Connect Repository to Netlify

1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **"Deploy with GitHub"**
4. Authorize Netlify to access your GitHub account
5. Select the `motionify-pm-portal` repository

### 2.2 Configure Build Settings

Netlify should auto-detect settings from `netlify.toml`, but verify:

**Build settings:**
- **Base directory**: (leave empty)
- **Build command**: `cd client && npm run build`
- **Publish directory**: `client/dist`
- **Functions directory**: `netlify/functions`

Click **"Deploy site"**

### 2.3 Wait for Initial Deploy

- First deployment will take 2-3 minutes
- You'll get a random URL like `https://random-name-123.netlify.app`
- This deploy will work but won't function fully without environment variables

---

## Step 3: Configure Environment Variables

### 3.1 Add Environment Variables in Netlify

1. In Netlify dashboard, go to **"Site settings"** → **"Environment variables"**
2. Click **"Add a variable"** and add each of the following:

#### Database

```
Variable: DATABASE_URL
Value: postgresql://your-neon-connection-string
```

#### Email (Mailtrap for Development)

```
Variable: SMTP_HOST
Value: sandbox.smtp.mailtrap.io

Variable: SMTP_PORT
Value: 2525

Variable: SMTP_USER
Value: your-mailtrap-username

Variable: SMTP_PASS
Value: your-mailtrap-password

Variable: EMAIL_FROM
Value: noreply@motionify.local

Variable: EMAIL_FROM_NAME
Value: Motionify PM Portal
```

#### Authentication

```
Variable: JWT_SECRET
Value: [Generate a secure random string - see below]

Variable: JWT_EXPIRES_IN
Value: 7d
```

**Generate secure JWT_SECRET:**
```bash
# Run this in terminal to generate a secure secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Cloudflare R2 (when ready)

```
Variable: R2_ACCOUNT_ID
Value: your-account-id

Variable: R2_ACCESS_KEY_ID
Value: your-access-key

Variable: R2_SECRET_ACCESS_KEY
Value: your-secret-key

Variable: R2_BUCKET_NAME
Value: motionify-pm-files

Variable: R2_ENDPOINT
Value: https://[account-id].r2.cloudflarestorage.com

Variable: R2_PUBLIC_URL
Value: https://pub-[random-id].r2.dev
```

### 3.2 Trigger Redeploy

1. After adding all environment variables
2. Go to **"Deploys"** tab
3. Click **"Trigger deploy"** → **"Clear cache and deploy site"**

---

## Step 4: Configure Custom Domain (Optional)

### 4.1 Add Custom Domain

1. In Netlify dashboard, go to **"Domain settings"**
2. Click **"Add custom domain"**
3. Enter: `portal.motionify.studio`
4. Click **"Verify"**

### 4.2 Update DNS Records

Netlify will provide DNS records. In your domain registrar (e.g., Namecheap, GoDaddy):

**Option A: Using Netlify DNS (Recommended)**
1. Update nameservers to Netlify's:
   ```
   dns1.p01.nsone.net
   dns2.p01.nsone.net
   dns3.p01.nsone.net
   dns4.p01.nsone.net
   ```

**Option B: Using CNAME Record**
1. Add CNAME record:
   ```
   Type: CNAME
   Name: portal
   Value: random-name-123.netlify.app
   ```

### 4.3 Enable HTTPS

1. Netlify automatically provisions SSL certificate
2. Wait 1-24 hours for DNS propagation
3. HTTPS will be enabled automatically

---

## Step 5: Update Production Environment

### 5.1 Switch from Mailtrap to Amazon SES

Once domain is verified in SES:

1. Update environment variables in Netlify:
   ```
   AWS_REGION=us-east-1
   AWS_SES_ACCESS_KEY_ID=AKIA...
   AWS_SES_SECRET_ACCESS_KEY=wJalrXUtn...
   SES_FROM_EMAIL=noreply@motionify.studio
   SES_FROM_NAME=Motionify PM Portal
   ```

2. Remove Mailtrap variables:
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`

3. Update `netlify/functions/utils/email.js` to use SES:
   ```javascript
   // Replace Mailtrap transporter with SES
   import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
   ```

### 5.2 Update Magic Link URLs

Magic links will automatically use production URL (`portal.motionify.studio`) because we use `process.env.URL` in the backend.

---

## Step 6: Test Production Deployment

### 6.1 Test Authentication Flow

1. Visit `https://portal.motionify.studio/login` (or your Netlify URL)
2. Enter email: `admin@motionify.studio`
3. Check email inbox (Mailtrap or real email)
4. Click magic link
5. Should redirect to dashboard

### 6.2 Verify Functions

```bash
# Test magic link generation
curl -X POST https://portal.motionify.studio/api/auth-request-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@motionify.studio"}'

# Should return: {"success":true,"message":"..."}
```

### 6.3 Check Function Logs

1. In Netlify dashboard, go to **"Functions"**
2. Click on a function (e.g., `auth-request-magic-link`)
3. View logs to debug issues

---

## Continuous Deployment

### Auto-Deploy on Git Push

Netlify automatically deploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Add new feature"
git push origin main

# Netlify will automatically:
# 1. Detect the push
# 2. Build the project
# 3. Deploy to production
# 4. Takes ~2-3 minutes
```

### Deploy Previews for Branches

1. Create a feature branch:
   ```bash
   git checkout -b feature/new-feature
   git push origin feature/new-feature
   ```

2. Netlify creates a **deploy preview** at:
   ```
   https://deploy-preview-123--your-site.netlify.app
   ```

3. Test the preview before merging to main

---

## Monitoring & Debugging

### Function Logs

View real-time function logs:
```bash
netlify functions:log
```

Or in Netlify dashboard: **Functions** → Select function → **Function log**

### Build Logs

View build output: **Deploys** → Select deploy → **Deploy log**

### Error Monitoring

Common issues:

**1. Build Fails**
- Check build log for npm errors
- Verify `package.json` scripts
- Ensure all dependencies are installed

**2. Functions Timeout**
- Netlify free tier: 10-second timeout
- Optimize database queries
- Use connection pooling

**3. Database Connection Fails**
- Verify `DATABASE_URL` in environment variables
- Check Neon database is not suspended
- Test connection locally first

**4. Emails Not Sending**
- Check SMTP/SES credentials
- Verify sender email is verified in SES
- Check function logs for errors

---

## Performance Optimization

### Enable Edge Caching

In `netlify.toml`, add caching headers:

```toml
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### Optimize Build Time

```toml
[build]
  command = "cd client && npm ci && npm run build"
```

Using `npm ci` instead of `npm install` is faster for production builds.

---

## Security Checklist

Before going live:

- [ ] All environment variables configured
- [ ] JWT_SECRET is secure (64+ character random string)
- [ ] DATABASE_URL uses pooled connection
- [ ] HTTPS is enabled (SSL certificate active)
- [ ] `.env` files are in `.gitignore`
- [ ] No sensitive data committed to Git
- [ ] Database backups configured (Neon auto-backup)
- [ ] Rate limiting enabled (future feature)
- [ ] SES sandbox mode exited (production access granted)

---

## Rollback Strategy

### Rollback to Previous Deploy

1. Go to **Deploys** tab
2. Find last working deploy
3. Click **"..."** → **"Publish deploy"**
4. Site reverts to that version immediately

### Rollback in Git

```bash
# Find commit to revert to
git log --oneline

# Revert to specific commit
git revert abc123

# Or reset (more dangerous)
git reset --hard abc123
git push -f origin main
```

---

## Cost Monitoring

### Netlify Free Tier Limits

- **Build minutes**: 300/month
- **Bandwidth**: 100GB/month
- **Function invocations**: 125k/month
- **Function runtime**: 100 hours/month

**Monitor usage**: Dashboard → **Team settings** → **Usage and billing**

### Expected Usage (20 clients)

- **Build minutes**: ~5 minutes per deploy, ~10 deploys/month = 50 minutes
- **Bandwidth**: ~2GB/month (mostly API calls)
- **Function invocations**: ~10k/month (auth + API calls)
- **Function runtime**: ~5 hours/month

**Well within free tier limits!** ✅

---

## Troubleshooting

### Common Issues & Solutions

**Issue**: "Function timeout after 10 seconds"
**Solution**: Optimize database queries, use connection pooling

**Issue**: "Module not found" in functions
**Solution**: Install missing dependencies in root `package.json`

**Issue**: "CORS error" from frontend
**Solution**: Add CORS headers in function responses:
```javascript
return {
  statusCode: 200,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  },
  body: JSON.stringify(data),
};
```

**Issue**: "Database connection failed"
**Solution**: Use Neon's pooled connection string with `?pgbouncer=true`

---

## Next Steps After Deployment

1. **Test everything** in production
2. **Monitor function logs** for first few days
3. **Set up analytics** (Netlify Analytics or Google Analytics)
4. **Create backup admin user** in database
5. **Document production URLs** for team
6. **Set up status page** (e.g., status.motionify.studio)

---

## Support Resources

- **Netlify Docs**: https://docs.netlify.com
- **Netlify Support**: https://www.netlify.com/support
- **Neon Docs**: https://neon.tech/docs
- **Community**: Netlify Discord, Neon Discord

---

**Deployment Checklist**: See `docs/deployment-checklist.md`

**Last Updated**: 2025-01-11
