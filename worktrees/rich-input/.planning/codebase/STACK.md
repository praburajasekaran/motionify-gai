# Technology Stack

**Analysis Date:** 2026-01-19

## Languages

**Primary:**
- TypeScript 5.8.2 - Full-stack application code (React, Next.js, Netlify Functions)
- JavaScript (ES2022) - Configuration files and legacy code

**Secondary:**
- SQL - PostgreSQL database schema and queries (`database/schema.sql`)
- HTML - Templates and static pages

## Runtime

**Environment:**
- Node.js v20 (specified in `netlify.toml`)

**Package Manager:**
- npm with `--legacy-peer-deps` flag
- Lockfiles: Present in both root and `landing-page-new/` directory
- Monorepo structure: Root project (Vite Portal) + `landing-page-new/` (Next.js)

## Frameworks

**Core:**
- React 19.2.0 - UI library for both applications
- Next.js 16.0.1 - Landing page and client-facing application (`landing-page-new/`)
- Vite 6.2.0 - Portal admin application build tool
- Netlify Functions 5.1.2 - Serverless backend API endpoints

**Testing:**
- Playwright 1.57.0 - E2E testing framework for UI flows
- Jest 30.2.0 - Unit testing (configured in `landing-page-new/`)
- @testing-library/react 16.3.1 - React component testing utilities

**Build/Dev:**
- TypeScript ~5.8.2 - Type checking and compilation
- Vite 6.2.0 - Dev server and bundler for Portal
- Next.js 16.0.1 - Dev server and bundler for Landing Page
- Netlify CLI 23.13.0 - Local development environment
- Concurrently 9.2.1 - Run multiple dev servers in parallel
- tsx 4.19.2 - TypeScript execution for scripts

## Key Dependencies

**Critical:**
- @tanstack/react-query 5.62.7 - Server state management and data fetching
- react-router-dom 7.9.6 - Client-side routing (Portal app)
- pg 8.16.3 - PostgreSQL client for database connections
- zod 3.24.1 - Schema validation throughout application
- react-hook-form 7.71.0 - Form state management and validation

**Infrastructure:**
- @aws-sdk/client-s3 3.958.0 - S3-compatible API client for Cloudflare R2
- @aws-sdk/s3-request-presigner 3.958.0 - Presigned URL generation for R2
- razorpay 2.9.6 - Payment processing SDK
- resend 6.7.0 - Transactional email delivery
- nodemailer 7.0.12 - Email sending (alternative to Resend)

**UI Components:**
- @radix-ui/* - Headless UI component primitives (Avatar, Checkbox, Dialog, Dropdown Menu, Label, Slot)
- lucide-react 0.555.0 - Icon library
- tailwindcss 3.4.18 - Utility-first CSS framework
- next-themes 0.4.6 - Dark mode support
- sonner 2.0.7 - Toast notifications

**AI/ML:**
- @google/genai 1.30.0 - Google Gemini AI integration for task generation and risk analysis
- @anthropic-ai/sdk 0.71.2 - Claude AI SDK (installed but usage not detected)
- @aws-sdk/client-bedrock-runtime 3.962.0 - AWS Bedrock integration (installed but usage not detected)

**Data Visualization:**
- recharts 3.5.1 - Chart components
- d3 7.9.0 - Data visualization primitives
- topojson-client 3.1.0 - Geographic data processing

**Build Tools:**
- autoprefixer 10.4.22 - PostCSS plugin for vendor prefixes
- postcss 8.5.6 - CSS processing
- @swc/core 1.15.8 - Fast TypeScript/JavaScript compiler
- @swc/jest 0.2.39 - Jest transformer using SWC

## Configuration

**Environment:**
- Environment variables via `.env` files
- Key configs required:
  - `DATABASE_URL` - PostgreSQL connection string
  - `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` - Payment gateway credentials
  - `RESEND_API_KEY` / `RESEND_FROM_EMAIL` - Email service configuration
  - `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` - Cloudflare R2 storage
  - `VITE_API_URL` - Portal API endpoint (development: http://localhost:8888/.netlify/functions)
  - `NEXT_PUBLIC_API_URL` - Landing page API endpoint
  - `GEMINI_API_KEY` / `API_KEY` - Google Gemini AI credentials (optional)
  - `JWT_SECRET` - Authentication token signing (defaults to 'dev-secret-key-change-in-production')

**Build:**
- `vite.config.ts` - Portal app configuration with React plugin and path aliases
- `landing-page-new/next.config.ts` - Next.js configuration with custom rewrites
- `netlify.toml` - Deployment and build configuration
- `tsconfig.json` - TypeScript compiler options (ES2022 target, ESNext modules)
- `tailwind.config.js` - Tailwind CSS theme customization
- `postcss.config.js` - PostCSS with Tailwind and Autoprefixer
- `playwright.config.ts` - E2E test configuration
- `landing-page-new/jest.config.js` - Unit test configuration with SWC transformer

## Platform Requirements

**Development:**
- Node.js 20+
- PostgreSQL database (local or remote with SSL)
- Port 5173 - Vite dev server (Portal)
- Port 5174 - Next.js dev server (Landing Page)
- Port 9999 - Netlify Functions dev server
- Port 8888 - Netlify proxy server

**Production:**
- Netlify - Hosting platform for both Portal and Landing Page
- PostgreSQL database with SSL support
- Cloudflare R2 - Object storage for deliverables
- Razorpay - Payment gateway
- Resend - Email delivery service

---

*Stack analysis: 2026-01-19*
