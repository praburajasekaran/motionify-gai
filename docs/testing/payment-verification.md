# Verify payment transactions

Use Node.js 22.18 or newer. PostgreSQL 14 or newer must provide `initdb`,
`pg_ctl`, and `psql` on your path. Install dependencies with
`npm ci --legacy-peer-deps`.

Run `npm run test:payment:integration`. The runner creates a temporary local
database, loads the repository schema and payment migrations, runs the production
handlers, and removes the database after the tests. It replaces inherited
database settings and disables outgoing email. It requires no provider credentials.

The suite checks authenticated and token-based access, signatures, failed
payments, capture validation, activation rollback, duplicate delivery, and retries.
Its webhook deliveries and provider signatures are synthetic.

## Run Razorpay test checkout

Create an untracked `.env.payment-test` containing `RAZORPAY_KEY_ID` and
`RAZORPAY_KEY_SECRET`. The key ID must start with `rzp_test_`. To use another
credentials file, set `PAYMENT_TEST_ENV_FILE` to its path. The runner reads only
the two Razorpay settings from that file.

1. Run `npm run build`.
2. Run `npm run preview -- --host 127.0.0.1 --port 4173` in one terminal.
3. Run `npm run dev:payment:sandbox` in another terminal.
4. Open the payment URL printed by the sandbox.
5. Confirm that the checkout displays Test Mode. Complete checkout with a
   Razorpay test instrument.
6. Stop the sandbox with Ctrl+C. Inspect the payment evidence printed before
   cleanup. A successful advance payment has provider status `captured`, local
   status `completed`, `project_count` of `1`, and `primary_contact_count` of `1`.

Set `PAYMENT_TEST_EVIDENCE_FILE` to save the evidence as JSON. The evidence omits
credentials, signatures, and contact details. This test does not exercise
Razorpay's external webhook delivery or production funds.

## Verified test receipt

On 2026-09-30, manual checkout captured 100 paise in INR through Razorpay test
order `order_TiJ1fjj9y2Coef` and payment `pay_TiJ5B4zULPFlEd`. The provider API
reported `captured: true`. The local database recorded a completed payment,
exactly one project, and one primary client contact. Two additional verification
requests with the original proof returned the same project.

## Verified hosted preview receipt

On 2026-10-01, manual Razorpay Test Mode checkout in PR #118's Netlify preview
completed order `order_TiW5Jea9SVczz8` with payment `pay_TiWaWujgj4nklv`.
The preview displayed Payment Successful. Its isolated Neon database recorded
100 paise INR as completed, exactly one project, and one primary client contact.
The activated project is `d6ff8b4b-b12a-48ae-a0e4-97de3882bbf3`.

The preview uses separate JWT, database, and Razorpay Test Mode settings.
This hosted check verified checkout confirmation and project activation.
Provider capture status was not independently fetched for this receipt.
Live funds and Razorpay's external webhook delivery remain untested.

## Verify development dependencies

Run `npm audit` and `npm run verify:development-tooling` after a clean install.
The smoke checks use a temporary local HTTP server. They send no load to
production and disable Artillery telemetry.

Artillery 2.0.34 expects the default export from csv-parse 4. The patched
csv-parse 7 release exports `parse` by name. The version-specific patch in
`patches/artillery+2.0.34.patch` updates Artillery's source and distributed
runtime. `patch-package` applies it during installation. Revisit the patch when
upgrading Artillery. The smoke check confirms that CSV values reach the local
server and that the browser engine loads the expected page.
