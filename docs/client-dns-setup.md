# Email Deliverability Setup: Resend + motionify.studio

## Current DNS Status

| Record | Status | Notes |
|--------|--------|-------|
| `send` MX → `feedback-smtp.us-east-1.amazonses.com` | ✅ Added | Resend bounce handling |
| `send` TXT → `v=spf1 include:amazonses.com ~all` | ✅ Added | Resend SPF |
| `resend._domainkey` TXT → *(DKIM key)* | ❌ Missing | Need value from Resend dashboard |
| `_dmarc` TXT → `v=DMARC1; p=none; rua=mailto:prabu@paretoid.com` | ✅ Added | DMARC policy |
| `motionify.studio` SPF → `v=spf1 include:_spf.mail.hostinger.com ~all` | ✅ Added | Hostinger email SPF |
| `hostingermail-a/b/c._domainkey` CNAME | ✅ Added | Hostinger email DKIM |
| `motionify.studio` MX → Hostinger | ✅ Added | Hostinger email inboxes |

---

## Remaining Step: Add Resend DKIM Record

The only missing record is the Resend DKIM TXT key. The value is unique to the client's Resend account.

### How to get it

1. Client logs in to [resend.com](https://resend.com)
2. Go to **Domains** → click `motionify.studio`
3. Find the TXT record named `resend._domainkey` — copy the full value (starts with `p=MIGfMA0...`)
4. Share the value with Prabu

### Add it in Netlify DNS

| Type | Name | Value |
|------|------|-------|
| TXT | `resend._domainkey` | *(paste value from Resend)* |

---

## After Adding the DKIM Record

1. Client goes to Resend → **Domains** → click **Verify DNS Records** next to `motionify.studio`
2. Should show **Verified** ✓ (wait 15–30 mins if not immediately)
3. Update Netlify environment variables:
   - `RESEND_FROM_EMAIL` → `Motionify <noreply@motionify.studio>`
   - `RESEND_DOMAIN` → `motionify.studio`
4. Redeploy the site
5. Send a test email — verify it lands in inbox, not spam
6. Check score at [mail-tester.com](https://mail-tester.com) (target: 9+/10)
