# Email Setup Guide: Resend + motionify.studio

This guide walks you through setting up Resend so your app can send emails from `noreply@motionify.studio`.

Estimated time: **15–20 minutes** (plus DNS propagation, which can take up to 24 hours).

---

## Step 1: Create a Resend Account

1. Go to [resend.com](https://resend.com)
2. Click **Get Started** and sign up with your work email
3. Verify your email address to activate the account

---

## Step 2: Add Your Domain

1. In the Resend dashboard, go to **Domains** in the left sidebar
2. Click **Add Domain**
3. Enter `motionify.studio` and click **Add**
4. Choose your DNS region (select the one closest to your users — **US East** is fine if unsure)

---

## Step 3: Add DNS Records

Resend will show you a set of DNS records to add to your domain. You'll need to log in to wherever `motionify.studio` is registered (e.g. Namecheap, GoDaddy, Cloudflare, etc.) and add each record.

The records will look something like this (your exact values will be shown in Resend):

| Type | Name | Value |
|------|------|-------|
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` |
| TXT | `resend._domainkey` | `p=MIGfMA0GCSq...` (DKIM key) |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` |

> **Tip:** If your domain is on Cloudflare, make sure the records are set to **DNS only** (grey cloud), not proxied.

Once added, click **Verify DNS Records** in Resend. It may take a few minutes to a few hours for DNS to propagate.

---

## Step 4: Create an API Key

1. In the Resend dashboard, go to **API Keys** in the left sidebar
2. Click **Create API Key**
3. Give it a name like `Motionify App`
4. Set permission to **Sending access**
5. Click **Add** and **copy the API key** — you'll only see it once

Keep this API key safe. You'll need to paste it into your app's environment variables (your developer can handle this once you share it with them).

---

## Step 5: Share Access with Me

To allow me to make configuration changes on your behalf:

1. In the Resend dashboard, click your **team name** in the top-left corner
2. Go to **Settings** → **Team**
3. Click **Invite Member**
4. Enter: `prabu@paretoid.com` 
5. Set role to **Admin** and send the invite

---

## Step 6: Share the API Key

Once you have your API key from Step 4, please send it to me securely. You can use:

- A secure note in WhatsApp or Signal (avoid plain email for API keys)

---

## What Happens Next

Once I receive access, I will:

- Configure the app to send emails from `noreply@motionify.studio` via Resend
- Update Supabase to use Resend for auth emails (magic links, etc.)
- Test that emails are delivered correctly

---

If you have any questions at any step, feel free to reach out.
