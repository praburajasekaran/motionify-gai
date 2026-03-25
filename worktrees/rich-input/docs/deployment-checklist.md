# Deployment Checklist - Motionify PM Portal

Use this checklist to ensure a smooth deployment to production.

---

## Pre-Deployment

### Code & Repository

- [ ] All code committed to Git
- [ ] `.env` file is in `.gitignore`
- [ ] No sensitive data in committed files
- [ ] `README.md` is up to date
- [ ] All tests passing (when tests are added)
- [ ] Code reviewed (if working with team)

### External Services Setup

- [ ] **Neon PostgreSQL**
  - [ ] Database created
  - [ ] Schema migrated (`psql $DATABASE_URL -f database/schema.sql`)
  - [ ] Admin user exists in `users` table
  - [ ] Connection pooling enabled (pooled connection string)
  - [ ] Auto-backup enabled

- [ ] **Mailtrap** (Development)
  - [ ] Account created
  - [ ] Inbox configured
  - [ ] SMTP credentials copied

- [ ] **Cloudflare R2** (Optional for MVP)
  - [ ] Bucket created (`motionify-pm-files`)
  - [ ] CORS configured for uploads
  - [ ] API tokens generated
  - [ ] Public URL noted

---

## Netlify Deployment

### Initial Setup

- [ ] GitHub repository created
- [ ] Repository is private (for client project)
- [ ] Code pushed to GitHub
- [ ] Netlify account created
- [ ] Repository connected to Netlify
- [ ] Build settings verified:
  - Build command: `cd client && npm run build`
  - Publish directory: `client/dist`
  - Functions directory: `netlify/functions`

### Environment Variables

Copy from `.env.example` and add to Netlify:

- [ ] `DATABASE_URL` (Neon pooled connection string)
- [ ] `SMTP_HOST` (sandbox.smtp.mailtrap.io)
- [ ] `SMTP_PORT` (2525)
- [ ] `SMTP_USER`
- [ ] `SMTP_PASS`
- [ ] `EMAIL_FROM` (noreply@motionify.local)
- [ ] `EMAIL_FROM_NAME` (Motionify PM Portal)
- [ ] `JWT_SECRET` (64+ character random string)
- [ ] `JWT_EXPIRES_IN` (7d)

### First Deploy

- [ ] Trigger initial deployment
- [ ] Wait for build to complete (~2-3 minutes)
- [ ] Note the Netlify URL (e.g., `random-name-123.netlify.app`)
- [ ] Check build logs for errors
- [ ] Verify functions are deployed

---

## Testing Production

### Manual Testing

- [ ] Visit Netlify URL
- [ ] Redirected to `/login` page
- [ ] Login page loads correctly (no console errors)
- [ ] Enter test email (`admin@motionify.studio`)
- [ ] Check "Remember me" checkbox
- [ ] Click "Send magic link"
- [ ] Success message appears
- [ ] Check Mailtrap inbox
- [ ] Magic link email received
- [ ] Click magic link
- [ ] Redirected to `/auth/verify`
- [ ] Loading spinner appears
- [ ] Success message appears
- [ ] Redirected to `/dashboard`
- [ ] User info displayed correctly
- [ ] Role badge shows correct role
- [ ] Click "Sign out"
- [ ] Redirected to `/login`

### API Testing

Test endpoints with cURL:

```bash
# Replace YOUR_SITE with your Netlify URL
SITE_URL="https://random-name-123.netlify.app"

# Test magic link generation
curl -X POST $SITE_URL/api/auth-request-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@motionify.studio","rememberMe":true}'

# Should return: {"success":true,"message":"..."}
```

- [ ] API endpoint responds (200 OK)
- [ ] Email received in Mailtrap
- [ ] Magic link token works

### Browser Testing

Test in multiple browsers:

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### Performance Check

- [ ] Page load time < 3 seconds
- [ ] No console errors
- [ ] No console warnings (except dev-only)
- [ ] Images/fonts load correctly
- [ ] Mobile responsive design works

---

## Custom Domain Setup (Optional)

### DNS Configuration

- [ ] Custom domain purchased (`portal.motionify.studio`)
- [ ] Domain added in Netlify
- [ ] DNS records updated:
  - Option A: Netlify nameservers
  - Option B: CNAME record
- [ ] DNS propagation complete (wait 1-24 hours)
- [ ] SSL certificate provisioned automatically
- [ ] HTTPS enabled
- [ ] HTTP redirects to HTTPS
- [ ] Test custom domain URL works

### Update Production Settings

- [ ] Magic links use custom domain
- [ ] Email templates reference custom domain
- [ ] Update any hardcoded URLs

---

## Switch to Amazon SES (Production Emails)

### Prerequisites

- [ ] Custom domain verified in SES
- [ ] Production access granted (out of sandbox)
- [ ] Sender email verified (`noreply@motionify.studio`)

### Update Environment Variables

Remove Mailtrap variables:
- [ ] Remove `SMTP_HOST`
- [ ] Remove `SMTP_PORT`
- [ ] Remove `SMTP_USER`
- [ ] Remove `SMTP_PASS`

Add SES variables:
- [ ] `AWS_REGION` (us-east-1)
- [ ] `AWS_SES_ACCESS_KEY_ID`
- [ ] `AWS_SES_SECRET_ACCESS_KEY`
- [ ] `SES_FROM_EMAIL` (noreply@motionify.studio)
- [ ] `SES_FROM_NAME` (Motionify PM Portal)

### Update Code

- [ ] Install AWS SDK: `npm install @aws-sdk/client-ses`
- [ ] Update `netlify/functions/utils/email.js` to use SES
- [ ] Test email sending with SES
- [ ] Verify emails delivered to real inboxes
- [ ] Check spam folder if not delivered

### Test Production Emails

- [ ] Send test magic link
- [ ] Email received in real inbox (not spam)
- [ ] Magic link works
- [ ] Email formatting looks correct
- [ ] Links are clickable

---

## Security Checklist

### Authentication

- [ ] JWT secret is strong (64+ characters)
- [ ] Magic links expire in 15 minutes
- [ ] Magic links are one-time use
- [ ] Sessions expire after 7 days (or 24 hours)
- [ ] Passwords not stored anywhere (passwordless)

### Database

- [ ] Database credentials secure
- [ ] Connection uses SSL (`sslmode=require`)
- [ ] Connection pooling enabled
- [ ] No SQL injection vulnerabilities
- [ ] Prepared statements used everywhere

### API

- [ ] CORS configured correctly
- [ ] Rate limiting implemented (future feature)
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive info
- [ ] Function logs don't contain secrets

### General

- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] `.env` not committed to Git
- [ ] No API keys in frontend code
- [ ] HTTP-only cookies for sessions
- [ ] Content Security Policy headers (future)

---

## Monitoring & Maintenance

### Set Up Monitoring

- [ ] Enable Netlify Analytics (optional, paid)
- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Monitor function execution times
- [ ] Monitor bandwidth usage
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)

### Database Maintenance

- [ ] Verify Neon auto-backup is active
- [ ] Test database restore procedure
- [ ] Clean up expired magic_links periodically
- [ ] Clean up expired sessions periodically
- [ ] Monitor database storage usage

### Performance Monitoring

- [ ] Check Netlify usage dashboard weekly
- [ ] Monitor build times
- [ ] Monitor function timeouts
- [ ] Monitor database connection pool
- [ ] Optimize slow queries

---

## Post-Deployment

### Documentation

- [ ] Update `README.md` with production URL
- [ ] Document deployment process for team
- [ ] Create runbook for common issues
- [ ] Document environment variables
- [ ] Share credentials securely (1Password, LastPass)

### Team Onboarding

- [ ] Create admin accounts for team
- [ ] Send login instructions to team
- [ ] Train team on portal features
- [ ] Provide support contact

### Client Handoff

- [ ] Create client admin account
- [ ] Send welcome email with login link
- [ ] Schedule onboarding call
- [ ] Provide user documentation
- [ ] Set up support channel

---

## Rollback Plan

In case something goes wrong:

### Quick Rollback (Netlify)

1. Go to Netlify → **Deploys**
2. Find last working deploy
3. Click **"..."** → **"Publish deploy"**
4. Site reverts immediately

### Git Rollback

```bash
# Find last working commit
git log --oneline

# Revert to that commit
git revert abc123
git push origin main

# Or hard reset (use with caution)
git reset --hard abc123
git push -f origin main
```

### Database Rollback

1. Go to Neon dashboard
2. **Branches** → Find last backup
3. Restore from backup
4. Update `DATABASE_URL` if needed

---

## Success Criteria

Deployment is successful when:

- [ ] Site is live and accessible
- [ ] Authentication flow works end-to-end
- [ ] Emails are being sent and received
- [ ] No errors in function logs
- [ ] Database connections working
- [ ] Mobile responsive design works
- [ ] HTTPS is active (if custom domain)
- [ ] All team members can log in
- [ ] Performance is acceptable (< 3s page load)

---

## Common Issues & Solutions

### Build Fails

**Issue**: npm install errors
**Solution**: Delete `package-lock.json`, run `npm install` locally, commit

**Issue**: TypeScript errors
**Solution**: This project uses JavaScript, not TypeScript

### Functions Timeout

**Issue**: Database query times out
**Solution**: Use pooled connection, optimize queries

**Issue**: Email sending times out
**Solution**: Check SMTP/SES credentials, verify network access

### Authentication Not Working

**Issue**: Magic link expired
**Solution**: Request new link (15-minute expiration is correct)

**Issue**: JWT invalid
**Solution**: Clear localStorage, log in again

### Emails Not Sending

**Issue**: SMTP connection refused
**Solution**: Verify SMTP credentials in environment variables

**Issue**: Emails go to spam
**Solution**: Verify domain in SES, add SPF/DKIM records

---

## Support Resources

- **Netlify Support**: https://www.netlify.com/support
- **Neon Docs**: https://neon.tech/docs
- **AWS SES Docs**: https://docs.aws.amazon.com/ses
- **Project Docs**: `/docs` folder

---

## Final Sign-Off

- [ ] All checklist items completed
- [ ] Production tested by developer
- [ ] Production tested by team member
- [ ] Client approval received (if applicable)
- [ ] Deployment documented
- [ ] Team notified of go-live

**Deployed by**: _______________________
**Date**: _______________________
**Production URL**: _______________________

---

**Congratulations! Your Motionify PM Portal is now live! 🎉**
