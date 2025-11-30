# Email Templates: Authentication System

This document specifies all email notifications for the authentication system.

## Email Service Configuration

- **Provider:** Amazon SES
- **From Address:** `hello@motionify.studio`
- **From Name:** `Motionify`
- **Reply-To:** `hello@motionify.studio`

## Customer Email Templates

### 1. Magic Link Email

**Trigger:** User requests magic link login  
**To:** User's email address  
**Subject:** `Your Motionify Portal Login Link`

```
Hi there,

You requested a login link for the Motionify Portal.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Click the button below to log in to your account:

                    ┌────────────────────────┐
                    │ Log In to Portal       │
                    │ {{magicLinkUrl}}       │
                    └────────────────────────┘

This link will expire in 15 minutes and can only be used once.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECURITY TIPS:
• Only click this link if you requested it
• Never share this link with anyone
• This link expires at {{expiryTime}}

If you didn't request this login link, you can safely ignore this email.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? Reply to this email or contact us at hello@motionify.studio

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

**Variables:**
- `{{magicLinkUrl}}` - Full URL with token: `https://portal.motionify.studio/auth/verify?token={{token}}&rememberMe={{rememberMe}}`
- `{{expiryTime}}` - Formatted expiry time (15 minutes from now)
- `{{userEmail}}` - User's email address (for logging, not displayed)

---

### 2. Welcome Email (First Login)

**Trigger:** User's first successful login via magic link  
**To:** User's email address  
**Subject:** `Welcome to Motionify Portal - Your Account is Ready!`

```
Hi {{fullName}},

Welcome to the Motionify Portal! Your account is now active and ready to use.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT YOU CAN DO IN THE PORTAL:

✓ Track your project progress in real-time
✓ Review and approve deliverables
✓ Provide feedback and request revisions
✓ Download final files (after payment)
✓ Communicate with your production team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To access your portal anytime, visit:

                    ┌────────────────────────┐
                    │ Go to Portal           │
                    │ {{portalUrl}}          │
                    └────────────────────────┘

You'll receive a secure magic link via email each time you log in.
No password needed!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOUR ACCOUNT DETAILS:
• Email: {{email}}
• Role: {{role}}
• Account Created: {{createdAt}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Need help getting started? We're here for you!
Reply to this email or contact us at hello@motionify.studio

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

**Variables:**
- `{{fullName}}` - User's full name
- `{{email}}` - User's email address
- `{{role}}` - User's role (Client, Project Manager, Admin)
- `{{portalUrl}}` - Portal base URL: `https://portal.motionify.studio`
- `{{createdAt}}` - Formatted account creation date

---

### 3. Session Expiry Warning (Optional)

**Trigger:** 24 hours before session expires (optional feature)  
**To:** User's email address  
**Subject:** `Your Portal Session Expires Soon`

```
Hi {{fullName}},

This is a friendly reminder that your Motionify Portal session will expire in 24 hours.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Session Details:
• Expires: {{expiryDate}}
• Last Activity: {{lastActiveAt}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To continue accessing your projects, simply visit the portal before expiry.
Your session will auto-refresh when you log in:

                    ┌────────────────────────┐
                    │ Access Portal Now      │
                    │ {{portalUrl}}          │
                    └────────────────────────┘

If you don't log in, you'll need to request a new magic link to access
your account after {{expiryDate}}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? Reply to this email.

Best regards,
The Motionify Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify | Video Production for Modern Brands
https://motionify.studio
```

**Variables:**
- `{{fullName}}` - User's full name
- `{{expiryDate}}` - Formatted session expiry date/time
- `{{lastActiveAt}}` - Formatted last activity timestamp
- `{{portalUrl}}` - Portal URL

**Note:** This email is optional and may not be implemented in v1.

---

## Admin Email Templates

### 4. Admin: Suspicious Login Activity

**Trigger:** Invalid JWT detected or multiple failed token verifications  
**To:** `hello@motionify.studio` (admin team)  
**Subject:** `[SECURITY] Suspicious Login Activity Detected`

```
⚠️  Security Alert: Suspicious Login Activity

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

USER DETAILS:
• Email: {{userEmail}}
• User ID: {{userId}}

ACTIVITY:
• Type: {{activityType}}
• Description: {{description}}
• IP Address: {{ipAddress}}
• User Agent: {{userAgent}}
• Timestamp: {{timestamp}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACTION REQUIRED: Review activity logs and take appropriate action
if this appears to be a security incident.

                    ┌────────────────────────┐
                    │ View Security Logs     │
                    │ {{adminLogsUrl}}       │
                    └────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Studio Admin
https://portal.motionify.studio/admin
```

**Variables:**
- `{{userEmail}}` - Email of user involved
- `{{userId}}` - UUID of user
- `{{activityType}}` - Type of suspicious activity (e.g., "Invalid JWT", "Tampered Token")
- `{{description}}` - Detailed description
- `{{ipAddress}}` - Source IP address
- `{{userAgent}}` - Browser user agent
- `{{timestamp}}` - When activity occurred
- `{{adminLogsUrl}}` - Link to admin security logs

---

### 5. Admin: SES Quota Alert

**Trigger:** SES quota exceeded or near limit  
**To:** `hello@motionify.studio`  
**Subject:** `[CRITICAL] Amazon SES Email Quota Alert`

```
🚨 CRITICAL: SES Email Quota Alert

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUOTA STATUS:
• Current Usage: {{currentUsage}} emails
• Daily Limit: {{dailyLimit}} emails
• Percentage Used: {{percentageUsed}}%
• Status: {{status}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  IMPACT: Login emails may be blocked if quota is exceeded.
Users will be unable to log in until quota resets.

ACTION REQUIRED:
1. Request quota increase from AWS if needed
2. Monitor email sending patterns
3. Check for email loops or spam

Quota resets at: {{quotaResetTime}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Motionify Studio Admin
```

**Variables:**
- `{{currentUsage}}` - Number of emails sent today
- `{{dailyLimit}}` - SES daily sending limit
- `{{percentageUsed}}` - Percentage of quota used
- `{{status}}` - "Warning" or "Exceeded"
- `{{quotaResetTime}}` - When quota resets (midnight UTC)

---

## Email Design Guidelines

### Branding
- Plain text format for maximum deliverability
- Professional, friendly tone
- Clear call-to-action buttons (ASCII art boxes)
- Motionify branding in footer

### Security
- Clear expiry times for time-sensitive links
- Security tips included in magic link emails
- No sensitive information in email body
- HTTPS links only

### Accessibility
- Clear subject lines (45-60 characters)
- Descriptive link text (not "click here")
- Good visual hierarchy with dividers (━)
- Mobile-friendly formatting (75 chars per line max)

### Variables

All templates support Handlebars syntax:
- `{{variableName}}` - Simple variable
- `{{#if condition}}...{{/if}}` - Conditional blocks
- `{{#each items}}...{{/each}}` - Loop through arrays

### Testing

**Development:**
- Use Mailtrap for email testing
- Test all personalization variables
- Verify all links work correctly
- Test on mobile email clients

**Production:**
- Monitor SES delivery metrics
- Track bounce and complaint rates
- Test magic link expiry timing
- Verify unsubscribe links (if applicable)

---

**Last Updated:** November 19, 2025  
**Template Version:** 1.0  
**Status:** Ready for Implementation
