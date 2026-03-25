# Amazon SES (Simple Email Service) Setup Guide

## Why SES for Motionify?

✅ **Cost-effective**: $0.10 per 1,000 emails
✅ **Free tier**: 62,000 emails/month when sending from EC2 (or 3,000/month otherwise)
✅ **Reliable delivery**: High deliverability rates
✅ **Easy integration**: AWS SDK support
✅ **Email tracking**: Bounce and complaint handling

**Expected cost**: ~$1-5/month for 20 clients

## Step 1: Create AWS Account

1. Go to https://aws.amazon.com
2. Click **"Create an AWS Account"**
3. Fill in:
   - Email address
   - Password
   - AWS account name: `Motionify`
4. Complete verification (credit card required, but won't be charged beyond usage)
5. Choose **"Basic Support - Free"** plan

## Step 2: Navigate to SES

1. Sign in to AWS Console: https://console.aws.amazon.com
2. Search for **"SES"** in top search bar
3. Click **"Amazon Simple Email Service"**
4. **Important**: Select region (top-right dropdown)
   - Recommended: **US East (N. Virginia)** - `us-east-1`
   - Or choose region closest to your users
   - **Note**: SES setup is region-specific

## Step 3: Verify Your Domain (Recommended)

**Option A: Verify Domain (Professional - Recommended)**

1. In SES console, click **"Verified identities"** (left sidebar)
2. Click **"Create identity"**
3. Select **"Domain"**
4. Enter: `motionify.studio`
5. Select:
   - ✅ **"Use a custom MAIL FROM domain"** (optional but recommended)
   - ✅ **"Publish DNS records to Route 53"** (if using AWS DNS)
6. Click **"Create identity"**

7. **Add DNS Records**:

You'll be given DNS records to add to your domain registrar:

```
Type: TXT
Name: _amazonses.motionify.studio
Value: [verification string]

Type: CNAME
Name: [ses-domain-key-1]._domainkey.motionify.studio
Value: [ses-dkim-value-1].dkim.amazonses.com

Type: CNAME
Name: [ses-domain-key-2]._domainkey.motionify.studio
Value: [ses-dkim-value-2].dkim.amazonses.com

Type: CNAME
Name: [ses-domain-key-3]._domainkey.motionify.studio
Value: [ses-dkim-value-3].dkim.amazonses.com
```

8. Wait 24-72 hours for DNS propagation and verification

**Option B: Verify Email Address (Quick Start)**

1. In SES console, click **"Verified identities"**
2. Click **"Create identity"**
3. Select **"Email address"**
4. Enter: `noreply@motionify.studio`
5. Click **"Create identity"**
6. Check email inbox and click verification link
7. Repeat for any additional sender addresses

## Step 4: Request Production Access

By default, SES is in **Sandbox mode**:
- ❌ Can only send to verified emails
- ❌ Limited to 200 emails/day
- ❌ 1 email/second send rate

**Move to Production:**

1. In SES console, click **"Account dashboard"** (left sidebar)
2. Click **"Request production access"**
3. Fill in form:
   - **Mail type**: Transactional
   - **Website URL**: https://motionify.studio
   - **Use case description**:
   ```
   Client portal for video production project management.
   Emails include:
   - Magic link authentication (passwordless login)
   - Project notifications (task updates, new messages)
   - Revision request alerts
   - File upload notifications
   - Meeting request confirmations

   Expected volume: 500-1000 emails/month for 20 active clients.
   All emails are transactional and user-initiated.
   ```
   - **Compliance**: Confirm you have processes for bounces/complaints
   - **Additional contacts**: (optional)
4. Click **"Submit request"**

**Approval time**: Usually 24-48 hours

## Step 5: Create IAM User for API Access

1. Go to **IAM** console: https://console.aws.amazon.com/iam
2. Click **"Users"** (left sidebar)
3. Click **"Add users"**
4. Configure:
   - **User name**: `motionify-ses-api`
   - **Access type**: ✅ Programmatic access (API, SDK)
5. Click **"Next: Permissions"**
6. Click **"Attach policies directly"**
7. Search and select: **"AmazonSESFullAccess"**
   - (Or create custom policy with only `ses:SendEmail` for security)
8. Click **"Next"** through tags (optional)
9. Click **"Create user"**

10. **IMPORTANT**: Copy credentials (shown only once):

```
Access key ID: AKIA...
Secret access key: wJalrXUtn...
```

## Step 6: Add Environment Variables

Add to your `.env` file:

```bash
# Amazon SES
AWS_REGION=us-east-1
AWS_SES_ACCESS_KEY_ID=AKIA...
AWS_SES_SECRET_ACCESS_KEY=wJalrXUtn...
SES_FROM_EMAIL=noreply@motionify.studio
SES_FROM_NAME=Motionify PM Portal
```

## Step 7: Test Email Sending

Create test script:

```javascript
// test-ses-email.js
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
  },
});

async function testSES() {
  const params = {
    Source: `${process.env.SES_FROM_NAME} <${process.env.SES_FROM_EMAIL}>`,
    Destination: {
      ToAddresses: ["your-test-email@example.com"], // Change this!
    },
    Message: {
      Subject: {
        Data: "Test Email from Motionify PM Portal",
      },
      Body: {
        Html: {
          Data: `
            <h1>Hello from Motionify!</h1>
            <p>This is a test email to verify SES setup.</p>
          `,
        },
        Text: {
          Data: "Hello from Motionify! This is a test email.",
        },
      },
    },
  };

  try {
    const result = await sesClient.send(new SendEmailCommand(params));
    console.log("✅ Email sent successfully!");
    console.log("Message ID:", result.MessageId);
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testSES();
```

Run test:
```bash
npm install @aws-sdk/client-ses
node test-ses-email.js
```

## Step 8: Create Email Templates

### Magic Link Email Template

```javascript
// utils/email-templates.js
export const magicLinkEmail = (recipientName, magicLink) => {
  return {
    subject: "Sign in to Motionify PM Portal",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 24px; border-radius: 8px;">
          <h1 style="color: #1a1a1a; margin-top: 0;">Sign in to Motionify PM Portal</h1>
          <p>Hi ${recipientName},</p>
          <p>Click the button below to securely sign in to your project portal:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${magicLink}" style="background: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Sign In to Portal
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            This link will expire in 15 minutes. If you didn't request this, please ignore this email.
          </p>
          <p style="color: #666; font-size: 14px;">
            Or copy and paste this URL into your browser:<br>
            <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-size: 12px; word-break: break-all;">${magicLink}</code>
          </p>
        </div>
        <div style="margin-top: 24px; text-align: center; color: #666; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Motionify. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
    text: `
Sign in to Motionify PM Portal

Hi ${recipientName},

Click this link to securely sign in to your project portal:
${magicLink}

This link will expire in 15 minutes. If you didn't request this, please ignore this email.

© ${new Date().getFullYear()} Motionify. All rights reserved.
    `,
  };
};
```

### Notification Email Template

```javascript
export const notificationEmail = (recipientName, title, content, ctaText, ctaLink) => {
  return {
    subject: title,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 24px; border-radius: 8px;">
          <h2 style="color: #1a1a1a; margin-top: 0;">${title}</h2>
          <p>Hi ${recipientName},</p>
          <p>${content}</p>
          ${ctaLink ? `
            <div style="margin: 24px 0;">
              <a href="${ctaLink}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                ${ctaText}
              </a>
            </div>
          ` : ''}
        </div>
        <div style="margin-top: 24px; text-align: center; color: #666; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Motionify. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
    text: `
${title}

Hi ${recipientName},

${content}

${ctaLink ? `${ctaText}: ${ctaLink}` : ''}

© ${new Date().getFullYear()} Motionify. All rights reserved.
    `,
  };
};
```

## Step 9: Handle Bounces & Complaints

Set up SNS notifications for bounces:

1. In SES console, go to **"Configuration sets"**
2. Create configuration set: `motionify-emails`
3. Add **"Event destination"** → SNS Topic
4. Create SNS topic: `ses-bounces`
5. Subscribe your email to receive bounce notifications

**Best practice**: Monitor bounce rate (<5%) and complaint rate (<0.1%)

## Step 10: Set Up Email Sending Rate

Free tier limits:
- 1 email/second
- Increase automatically with production access

For bulk notifications:
```javascript
// utils/send-bulk-emails.js
async function sendBulkEmails(recipients, emailData) {
  for (const recipient of recipients) {
    await sendEmail(recipient, emailData);
    await new Promise(resolve => setTimeout(resolve, 1100)); // Rate limit: 1/sec
  }
}
```

## Security Best Practices

✅ **Never expose AWS credentials in frontend**
✅ **Use IAM roles with minimal permissions** (only `ses:SendEmail`)
✅ **Rotate access keys every 90 days**
✅ **Enable MFA on AWS root account**
✅ **Monitor SES sending statistics** for unusual activity

## Cost Monitoring

Set up billing alert:

1. Go to **AWS Billing Console**
2. Click **"Budgets"**
3. Create budget:
   - **Budget type**: Cost budget
   - **Monthly budget**: $10
   - **Alert**: 80% threshold
   - **Email**: your-email@example.com

## Troubleshooting

### Email Not Sent (Sandbox Mode)
- Verify recipient email in SES console
- Request production access

### "Email Address Not Verified"
- Verify sender email/domain in SES
- Wait for DNS propagation (up to 72 hours)

### High Bounce Rate
- Use double opt-in for user signups
- Clean invalid emails from database
- Monitor bounce notifications

### Rate Limit Exceeded
- Implement retry logic with exponential backoff
- Use SES sending quotas dashboard to monitor

## Environment Variables Summary

```bash
# Amazon SES
AWS_REGION=us-east-1
AWS_SES_ACCESS_KEY_ID=AKIA...
AWS_SES_SECRET_ACCESS_KEY=wJalrXUtn...
SES_FROM_EMAIL=noreply@motionify.studio
SES_FROM_NAME=Motionify PM Portal
SES_CONFIGURATION_SET=motionify-emails
```

## Next Steps

✅ SES account created and verified
✅ Domain/email verified
✅ Production access requested
✅ API credentials secured
⬜ Implement email sending in backend
⬜ Create email templates
⬜ Initialize React project

---

**Need Help?**
- SES Docs: https://docs.aws.amazon.com/ses/
- AWS Support: https://console.aws.amazon.com/support/
