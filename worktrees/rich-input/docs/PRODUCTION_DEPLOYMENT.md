# Production Deployment Checklist

This document provides a comprehensive checklist for deploying the Motionify Portal to production.

## Pre-Deployment Checklist

### 1. Database Setup

- [ ] Production database created (Neon PostgreSQL)
- [ ] Database schema applied (`database/schema.sql`)
- [ ] Database connections use **pooled** connection strings
- [ ] SSL/TLS enabled (sslmode=require)
- [ ] Connection limits configured for serverless
- [ ] Backup strategy in place
- [ ] Admin users created

**Verify:**
```bash
# Test connection
node scripts/check-user-tokens.js
```

### 2. Environment Variables

- [ ] All environment variables configured in Netlify UI
- [ ] JWT_SECRET is production-ready (32+ bytes, cryptographically secure)
- [ ] DATABASE_URL uses pooled connection
- [ ] NEXT_PUBLIC_APP_URL points to production domain
- [ ] Email service configured (AWS SES, not Mailtrap)
- [ ] SES credentials valid and verified
- [ ] SES domain verified and out of sandbox mode

**Required Variables:**
```
DATABASE_URL=postgresql://...pooler...
JWT_SECRET=<secure-random-32byte-string>
MAGIC_LINK_EXPIRY=15
SES_ACCESS_KEY_ID=<aws-key>
SES_SECRET_ACCESS_KEY=<aws-secret>
SES_REGION=us-east-1
NEXT_PUBLIC_APP_URL=https://yourdomain.com
R2_ACCOUNT_ID=<cloudflare-account>
R2_ACCESS_KEY_ID=<r2-key>
R2_SECRET_ACCESS_KEY=<r2-secret>
R2_BUCKET_NAME=motionify-portal-files
R2_PUBLIC_URL=https://files.motionify.studio
```

### 3. Email Service (AWS SES)

- [ ] AWS account created
- [ ] SES setup in correct region (us-east-1 recommended)
- [ ] Domain verified in SES
- [ ] Email addresses verified (if in sandbox)
- [ ] Production access requested and granted
- [ ] Sending limits checked (default: 200/day in sandbox)
- [ ] Email templates tested
- [ ] SPF/DKIM records configured for domain

**Test SES:**
```bash
aws ses verify-email-identity --email-address noreply@yourdomain.com
aws ses get-send-quota
```

### 4. File Storage (Cloudflare R2)

- [ ] Cloudflare account created
- [ ] R2 bucket created
- [ ] API tokens generated with appropriate permissions
- [ ] CORS configured for browser uploads
- [ ] Public access configured correctly
- [ ] Custom domain configured (optional)

### 5. Code & Configuration

- [ ] All code committed to Git
- [ ] `.env` not committed (in .gitignore)
- [ ] `netlify.toml` configured correctly
- [ ] API routes redirect properly
- [ ] Build command verified: `npm install && npm run build`
- [ ] Functions directory set: `netlify/functions`
- [ ] No hardcoded localhost URLs
- [ ] Error handling in place
- [ ] Logging configured

### 6. Security

- [ ] JWT_SECRET is unique and secure (not the dev one!)
- [ ] Database uses SSL
- [ ] Cookies set with `Secure` flag in production
- [ ] HTTPS enforced
- [ ] CORS configured properly
- [ ] Rate limiting considered for login endpoint
- [ ] Magic link expiry set appropriately (15 min recommended)
- [ ] Session timeout configured (7 days default)
- [ ] No sensitive data in logs
- [ ] No secrets in frontend code

### 7. Testing

- [ ] All authentication flows tested in staging
- [ ] Magic link email delivery works
- [ ] Login successful
- [ ] Session persistence works
- [ ] Logout works
- [ ] Token expiry handled correctly
- [ ] Error messages user-friendly
- [ ] Mobile responsive
- [ ] Cross-browser tested

---

## Deployment Steps

### Step 1: Prepare Database

1. **Backup existing data (if applicable):**
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
   ```

2. **Apply schema to production database:**
   ```bash
   psql $DATABASE_URL_DIRECT < database/schema.sql
   ```

3. **Verify schema:**
   ```bash
   node scripts/check-user-tokens.js
   ```

4. **Create admin user:**
   ```sql
   INSERT INTO users (email, full_name, role)
   VALUES ('admin@yourdomain.com', 'Admin User', 'admin');
   ```

### Step 2: Configure Netlify

1. **Link repository to Netlify:**
   - Go to Netlify dashboard
   - Click "New site from Git"
   - Connect your Git provider (GitHub/GitLab)
   - Select repository

2. **Configure build settings:**
   - Base directory: `landing-page`
   - Build command: `npm install && npm run build`
   - Publish directory: `landing-page/.next`
   - Functions directory: `netlify/functions`

3. **Set environment variables:**
   - Go to Site Settings → Environment Variables
   - Add all production variables (see checklist above)
   - Use "All scopes" or separate dev/prod
   - Save changes

4. **Configure domain:**
   - Go to Domain Settings
   - Add custom domain
   - Configure DNS (A/CNAME records)
   - Enable HTTPS (auto via Let's Encrypt)
   - Force HTTPS redirect

### Step 3: Deploy

1. **Trigger deployment:**
   ```bash
   git push origin main
   ```
   Or manually trigger from Netlify UI

2. **Monitor build logs:**
   - Watch for errors
   - Verify functions compiled
   - Check build time

3. **Wait for deployment:**
   - Typically 2-5 minutes
   - DNS propagation may take longer (up to 48 hours)

### Step 4: Post-Deployment Verification

1. **Test authentication flow:**
   - Go to https://yourdomain.com/login
   - Enter your email
   - Check email inbox (not Mailtrap!)
   - Click magic link
   - Verify login successful
   - Verify session persists on refresh
   - Test logout

2. **Check function logs:**
   - Netlify UI → Functions tab
   - Look for errors
   - Verify no "missing env var" messages

3. **Test error scenarios:**
   - Expired magic link
   - Already-used magic link
   - Invalid token
   - Non-existent user

4. **Performance check:**
   - Page load times acceptable
   - Functions respond quickly
   - Database queries efficient

5. **Security verification:**
   - HTTPS enforced
   - Cookies have `Secure` flag
   - No sensitive data in client-side code
   - XSS protection in place

---

## Post-Deployment Monitoring

### What to Monitor

1. **Error Rates:**
   - Function errors
   - Database connection errors
   - Email delivery failures

2. **Performance:**
   - Function execution time
   - Database query time
   - Page load times

3. **Usage:**
   - Login attempts
   - Active sessions
   - Magic link requests

### Monitoring Tools

- **Netlify Analytics:** Built-in site analytics
- **Netlify Functions Logs:** Real-time function execution logs
- **Database Monitoring:** Neon dashboard for query performance
- **Email Monitoring:** SES dashboard for delivery rates

### Setting Up Alerts

Consider setting up alerts for:
- High error rates (>5% of requests)
- Slow function execution (>3 seconds)
- Database connection failures
- Email bounce rates

---

## Rollback Procedure

If deployment fails or issues arise:

### Quick Rollback

1. **Via Netlify UI:**
   - Go to Deploys tab
   - Find previous working deployment
   - Click "Publish deploy"

2. **Via CLI:**
   ```bash
   netlify deploy --prod --dir=landing-page/.next
   ```

### Full Rollback

1. **Revert code:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Rollback database (if schema changed):**
   ```bash
   psql $DATABASE_URL < backup_YYYYMMDD.sql
   ```

3. **Verify functionality**

---

## Troubleshooting Common Production Issues

### Issue: Functions return 500 error

**Check:**
1. Environment variables set correctly in Netlify
2. Database connection string uses `-pooler`
3. Function logs for specific errors

**Fix:**
- Update environment variables in Netlify UI
- Redeploy

### Issue: Email not sending

**Check:**
1. SES credentials valid
2. SES out of sandbox mode
3. Domain verified
4. Email address not on suppression list

**Fix:**
- Verify SES setup
- Check SES sending limits
- Review SES bounce/complaint rates

### Issue: Database connection timeout

**Check:**
1. Using pooled connection string
2. Connection limits not exceeded
3. Network connectivity

**Fix:**
- Switch to pooled connection
- Increase connection timeout
- Scale database tier if needed

### Issue: CORS errors

**Check:**
1. API routes configured in `netlify.toml`
2. CORS headers in function responses

**Fix:**
```javascript
return {
  statusCode: 200,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
};
```

### Issue: Session not persisting

**Check:**
1. Cookie domain configured correctly
2. `Secure` flag set (requires HTTPS)
3. SameSite attribute correct

**Fix:**
- Update cookie settings in `netlify/functions/utils/jwt.js`
- Ensure HTTPS is enforced

---

## Maintenance Tasks

### Regular Tasks

**Daily:**
- [ ] Monitor error logs
- [ ] Check email delivery rates
- [ ] Review failed login attempts

**Weekly:**
- [ ] Review performance metrics
- [ ] Check database size/usage
- [ ] Clean up expired tokens
- [ ] Review active sessions

**Monthly:**
- [ ] Database backup verification
- [ ] Security updates for dependencies
- [ ] Review and rotate secrets (JWT_SECRET, API keys)
- [ ] Performance optimization

### Database Cleanup

Run periodically to clean up old data:

```sql
-- Delete expired magic link tokens older than 30 days
DELETE FROM magic_link_tokens
WHERE expires_at < NOW() - INTERVAL '30 days';

-- Delete expired sessions
DELETE FROM sessions
WHERE expires_at < NOW();
```

---

## Performance Optimization

### Database

1. **Indexes:**
   - Ensure indexes exist on frequently queried columns
   - Check index usage with EXPLAIN ANALYZE

2. **Connection pooling:**
   - Use pooled connections
   - Set appropriate pool size (5-10 for serverless)

3. **Query optimization:**
   - Review slow queries
   - Add indexes where needed
   - Use query caching if applicable

### Functions

1. **Cold starts:**
   - Keep functions warm with scheduled pings
   - Minimize dependencies

2. **Execution time:**
   - Optimize database queries
   - Use async/await properly
   - Avoid blocking operations

3. **Memory usage:**
   - Configure function memory (default 1024MB)
   - Monitor actual usage

### Frontend

1. **Next.js optimization:**
   - Enable ISR (Incremental Static Regeneration)
   - Use image optimization
   - Code splitting

2. **Caching:**
   - Set appropriate cache headers
   - Use CDN for static assets

---

## Security Best Practices

### Ongoing Security

1. **Dependency updates:**
   ```bash
   npm audit
   npm audit fix
   ```

2. **Secret rotation:**
   - Rotate JWT_SECRET every 90 days
   - Rotate API keys annually
   - Update database credentials regularly

3. **Access control:**
   - Review user permissions regularly
   - Audit admin access
   - Monitor suspicious activity

4. **Compliance:**
   - GDPR considerations (if applicable)
   - Data retention policies
   - Privacy policy updates

---

## Support & Resources

### Documentation
- Main setup guide: `docs/AUTHENTICATION_SETUP.md`
- Environment variables: `docs/setup-env-vars.md`
- Project progress: `docs/PROJECT_PROGRESS_TRACKER.md`

### External Resources
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [Neon PostgreSQL](https://neon.tech/docs)
- [AWS SES](https://docs.aws.amazon.com/ses/)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)

### Getting Help
- Email: hello@motionify.studio
- Check function logs in Netlify UI
- Review database logs in Neon dashboard

---

## Changelog

### 2025-11-20
- Initial production deployment checklist
- Added security considerations
- Included monitoring and maintenance tasks
- Added troubleshooting section

---

**Remember:** Always test in a staging environment before deploying to production!
