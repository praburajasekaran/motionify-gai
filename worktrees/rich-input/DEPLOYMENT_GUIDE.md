# 🚀 Motionify PM Portal - Deployment Guide

## Overview

This guide walks you through deploying both apps (Landing Page + Portal) to Netlify with a single deployment.

### Architecture

```
motionify-gai-1/
├── Portal (Vite + React) → Served at /portal
├── Landing Page (Next.js) → Served at / (root)
└── API (Netlify Functions) → Served at /.netlify/functions
```

---

## 📋 Pre-Deployment Checklist

### Step 1: Install Dependencies

```bash
# Install root dependencies
npm install

# Install landing page dependencies (happens automatically via postinstall)
# Or manually: cd landing-page-new && npm install
```

### Step 2: Setup Environment Variables

Create a `.env` file in the root:

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@hostname/database?sslmode=require

# Razorpay (Test Mode)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx

# Email (Mailtrap for dev)
MAILTRAP_HOST=smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=xxxxx
MAILTRAP_PASS=xxxxx
```

### Step 3: Setup Database

1. **Create Neon PostgreSQL database**: https://neon.tech
2. **Run migrations**:
   ```bash
   # Connect to your database
   psql $DATABASE_URL
   
   # Run the schema
   \i database/schema.sql
   ```

3. **Verify tables created**:
   ```sql
   \dt
   ```

### Step 4: Test Locally

```bash
# Run both apps
npm run dev:all

# Test URLs:
# - Portal: http://localhost:5173
# - Landing: http://localhost:5174
# - Functions: http://localhost:8888/.netlify/functions
```

---

## 🌐 Deploy to Netlify

### Option 1: GitHub → Netlify (Recommended)

#### 1. Push to GitHub

```bash
# Initialize git (if not done)
git init
git add .
git commit -m "Initial commit: Ready for deployment"

# Create GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/motionify-pm-portal.git
git branch -M main
git push -u origin main
```

#### 2. Connect to Netlify

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click **"Add new site" → "Import an existing project"**
3. Choose **GitHub** → Select your repo
4. Configure build settings:

   ```
   Build command: npm run build:all
   Publish directory: landing-page-new/.next
   Functions directory: netlify/functions
   ```

5. Click **"Deploy site"**

#### 3. Add Environment Variables

In Netlify Dashboard → **Site settings → Environment variables**:

```
DATABASE_URL=postgresql://...
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
MAILTRAP_HOST=smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=...
MAILTRAP_PASS=...
```

#### 4. Redeploy

- **Deploys → Trigger deploy → Deploy site**

---

### Option 2: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Initialize site
netlify init

# Deploy
netlify deploy --prod
```

---

## ✅ Post-Deployment Verification

### Test Your Deployment

1. **Landing Page**: `https://your-site.netlify.app`
2. **Portal**: `https://your-site.netlify.app/portal`
3. **API Test**: `https://your-site.netlify.app/.netlify/functions/inquiries`

### Common Issues & Fixes

#### Build Fails

```bash
# Check build logs in Netlify
# Common issues:
# 1. Missing dependencies → Check package.json
# 2. Environment variables → Add in Netlify dashboard
# 3. Node version mismatch → Set NODE_VERSION=20 in netlify.toml
```

#### Portal Routes 404

```
# Verify netlify.toml has portal redirects:
[[redirects]]
  from = "/portal/*"
  to = "/portal/:splat"
  status = 200
```

#### API Errors

```bash
# Check function logs in Netlify dashboard
# Verify DATABASE_URL is set correctly
# Test database connection
```

---

## 🔄 Making Updates

### Deploy New Changes

```bash
# Make changes
git add .
git commit -m "Your commit message"
git push origin main

# Netlify auto-deploys!
```

### Rollback Deployment

In Netlify Dashboard:
- **Deploys → Find previous deploy → Publish deploy**

---

## 📊 Monitoring

### Netlify Analytics

- **Site overview → Analytics**
- View traffic, performance, errors

### Function Logs

- **Functions → Select function → View logs**
- Real-time debugging

### Database Monitoring

- Neon dashboard: https://console.neon.tech
- View query performance, connections

---

## 🔐 Production Checklist

Before going live:

- [ ] Switch from test to live Razorpay keys
- [ ] Setup real SMTP (Amazon SES, SendGrid)
- [ ] Setup Cloudflare R2 for file uploads
- [ ] Enable Netlify Analytics
- [ ] Setup error monitoring (Sentry)
- [ ] Configure custom domain
- [ ] Setup SSL (auto with Netlify)
- [ ] Add security headers
- [ ] Run security audit

---

## 📚 Next Steps

1. **State Management**: Already set up with TanStack Query!
2. **API Contracts**: Already using Zod validation!
3. **Authentication**: Upgrade to production magic links
4. **File Uploads**: Setup Cloudflare R2
5. **Monitoring**: Add Sentry for error tracking

---

## 🆘 Need Help?

- Netlify Docs: https://docs.netlify.com
- TanStack Query: https://tanstack.com/query
- Zod: https://zod.dev
- Neon PostgreSQL: https://neon.tech/docs

---

**You're ready to deploy! 🎉**
