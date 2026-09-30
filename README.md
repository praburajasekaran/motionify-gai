<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1kFMxQkdh8z548ENJzdnbQqVYbD0ip2HO

## Run Locally

**Prerequisites:** Node.js 22.18 or newer and an isolated development database.


1. Install dependencies:
   `npm ci --legacy-peer-deps`
2. Create a local `.env` from `.env.example` and configure `DATABASE_URL`,
   `JWT_SECRET`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL` for development.
   Set `APP_URL` and `PORTAL_URL` to `http://localhost:5173` so login emails
   return to the local app. Keep credentials out of Git.
3. Run the app and Netlify Functions together:
   `npm run dev:all`

`npm run dev` starts only the frontend. Login requires the functions service
on port 8888. The frontend proxies API requests to that port by default;
`VITE_NETLIFY_FUNCTIONS_ORIGIN` can select another local functions origin.

To inspect a production build locally, run `npm run build`,
`npm run preview -- --host 127.0.0.1 --port 4173`, and `npm run dev:functions`
in a separate terminal. Use `http://127.0.0.1:4173` for `APP_URL` and
`PORTAL_URL` when testing emailed links against the preview.

Run `npm run test:payment:integration` to verify payment persistence against a
temporary PostgreSQL database. See [payment verification](docs/testing/payment-verification.md)
for prerequisites and the Razorpay test checkout procedure.

Run `npm run verify:development-tooling` after dependency changes. It verifies
Artillery CSV input, the browser load engine, and Netlify's image conversion.
