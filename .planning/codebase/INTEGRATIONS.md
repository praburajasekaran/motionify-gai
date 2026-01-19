# External Integrations

**Analysis Date:** 2026-01-19

## APIs & External Services

**Payment Processing:**
- Razorpay - Payment gateway for INR and USD transactions
  - SDK/Client: `razorpay` v2.9.6
  - Auth: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
  - Implementation: `netlify/functions/payments.ts`, `landing-page-new/src/lib/razorpay-client.ts`
  - Features: Order creation, payment verification, receipt generation

**AI Services:**
- Google Gemini AI - Task generation and project risk analysis
  - SDK/Client: `@google/genai` v1.30.0
  - Auth: `GEMINI_API_KEY` or `API_KEY`
  - Implementation: `services/geminiService.ts`
  - Model: `gemini-2.5-flash`
  - Use cases: Generate project tasks from descriptions, analyze project risk

**Email Delivery:**
- Resend - Primary email service for transactional emails
  - SDK/Client: `resend` v6.7.0
  - Auth: `RESEND_API_KEY`
  - Implementation: `netlify/functions/send-email.ts`, `landing-page-new/src/lib/email/emailService.ts`
  - From address: `RESEND_FROM_EMAIL` (default: `Motionify <onboarding@resend.dev>`)
  - Use cases: Magic link authentication, mention notifications, payment receipts, invoice delivery

- Nodemailer - Alternative email service (fallback/development)
  - SDK/Client: `nodemailer` v7.0.12
  - Auth: `MAILTRAP_HOST`, `MAILTRAP_PORT`, `MAILTRAP_USER`, `MAILTRAP_PASS`
  - Implementation: `landing-page-new/src/lib/email.ts`
  - Default: Mailtrap.io for development testing

## Data Storage

**Databases:**
- PostgreSQL - Primary relational database
  - Connection: `DATABASE_URL` (with SSL in production)
  - Client: `pg` v8.16.3
  - Implementation: Throughout `netlify/functions/*.ts`, `landing-page-new/src/lib/db.ts`
  - Schema: `database/schema.sql`
  - Tables: users, sessions, inquiries, proposals, projects, payments, deliverables, tasks, notifications, invitations

**File Storage:**
- Cloudflare R2 - Object storage for project deliverables and files
  - Connection: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
  - Client: `@aws-sdk/client-s3` v3.958.0 (S3-compatible API)
  - Implementation: `netlify/functions/r2-presign.ts`, `services/storage.ts`
  - Endpoint: `https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  - Features: Presigned URLs for upload/download, 1-hour expiry, folder structure: `projects/{projectId}/{folder}/{timestamp}-{filename}`

**Caching:**
- None (client-side caching via React Query)

## Authentication & Identity

**Auth Provider:**
- Custom magic link authentication
  - Implementation: Session-based with JWT tokens
  - Tables: `sessions`, `magic_link_tokens`
  - Token storage: PostgreSQL with expiry tracking
  - JWT Secret: `JWT_SECRET` env var (defaults to 'dev-secret-key-change-in-production')
  - Functions: `netlify/functions/auth-request-magic-link.ts`, `netlify/functions/auth-verify-magic-link.ts`
  - Email delivery: Via Resend
  - Session duration: Configurable via `expires_at` column

## Monitoring & Observability

**Error Tracking:**
- None (console logging only)

**Logs:**
- Console-based logging in Netlify Functions
- Development: Verbose logging with emoji indicators
- Production: Standard console.error/console.log

## CI/CD & Deployment

**Hosting:**
- Netlify - Primary hosting platform
  - Build command: `npm run build:all`
  - Publish directory: `landing-page-new/.next`
  - Functions directory: `netlify/functions`
  - Node version: 20
  - Deployment: Git-based continuous deployment

**CI Pipeline:**
- None (relying on Netlify's built-in CI)

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string
- `RAZORPAY_KEY_ID` - Razorpay public key
- `RAZORPAY_KEY_SECRET` - Razorpay secret key
- `RESEND_API_KEY` - Resend email service API key
- `R2_ACCOUNT_ID` - Cloudflare R2 account ID
- `R2_ACCESS_KEY_ID` - R2 access key
- `R2_SECRET_ACCESS_KEY` - R2 secret key
- `R2_BUCKET_NAME` - R2 bucket name

**Optional env vars:**
- `GEMINI_API_KEY` / `API_KEY` - Google Gemini AI (for task generation)
- `JWT_SECRET` - Custom JWT secret (defaults provided)
- `RESEND_FROM_EMAIL` - Custom sender email
- `RESEND_DOMAIN` - Custom domain for emails
- `MAILTRAP_HOST` / `MAILTRAP_PORT` / `MAILTRAP_USER` / `MAILTRAP_PASS` - Development email testing
- `PORTAL_URL` - Portal application URL (for email links)
- `ADMIN_NOTIFICATION_EMAIL` - Admin notification recipient
- `VITE_R2_PUBLIC_DOMAIN` - Public R2 domain for direct file access

**Secrets location:**
- Environment variables in Netlify dashboard
- Local development: `.env` file (not committed)
- Example configuration: `.env.example`

## Webhooks & Callbacks

**Incoming:**
- Razorpay payment webhooks (payment verification endpoints)
  - Endpoint: `/api/payments` (POST)
  - Implementation: `netlify/functions/payments.ts`
  - Verification: HMAC signature validation

**Outgoing:**
- Email notifications via Resend/Nodemailer
- File upload callbacks to R2 via presigned URLs

---

*Integration audit: 2026-01-19*
