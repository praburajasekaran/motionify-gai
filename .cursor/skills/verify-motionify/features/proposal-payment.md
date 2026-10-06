# Proposal and payment handoff

Clients open a proposal review link, review scope/pricing, request changes or decline, and accept by proceeding to advance payment. A successful payment activates the project and exposes Open Project.

## Sub-features

- `proposal-email` and `proposal-direct` open a real issued proposal link.
- `proposal-changes` opens/cancels feedback and submits a sufficiently detailed change request.
- `proposal-decline` records a decline and its resulting state.
- `proposal-accept-pay` carries the review token into payment.
- `payment-sandbox` verifies the payment and activated project; `project-open` follows its access path.
- `proposal-invalid` and `payment-invalid` show unavailable-link states.

## How to get to it (user POV)

- Open the sandbox email's proposal link at `/proposal/` followed by the issued proposal ID and its token. The same issued URL can be visited directly.
- Choose `Request Changes`, `Decline`, or `Accept & Pay` below the proposal.
- On the payment page choose `Pay` followed by the displayed advance amount, complete Razorpay's test checkout, and choose `Open Project` after `Payment Successful`.
- Portal proposal details at `/portal/proposals/` and `/portal/admin/proposals/` are separate authenticated surfaces, not equivalent to a public review link.

## Driving it with Playwright

Preconditions: an owned disposable full stack, real issued proposal links from a controlled inbox, separate `sent` proposal fixtures for each response branch, and confirmed `rzp_test_` credentials for payment. Set `reviewUrl` to the actual sandbox email link after validating its origin; no synthetic `?data=` payloads. Baseline `control.mjs drive` does not execute these backend cases.

- **Review entries.** Open the actual email link using the controlled inbox, then independently run `await page.goto(reviewUrl)` in a fresh context. Require the `Proposal` heading, known company, version, scope, total, advance, balance, and real proposal/inquiry fetch responses. Record the origin and fixture ID without exposing the access token in shareable evidence.
- **Feedback open/cancel.** Click `page.getByRole('button', { name: 'Request Changes', exact: true })`; require the `Describe the changes you would like...` textarea. Fill fewer than ten characters and require the exact `Submit` button to remain disabled. Click `Cancel` and require the textarea to disappear without a mutation.
- **Submit changes.** Reopen Request Changes, fill `page.getByPlaceholder('Describe the changes you would like...', { exact: true })` with `Please shorten the opening scene.`, and click `page.getByRole('button', { name: 'Submit', exact: true })`. Observe the real update response. Reload and require `You have already responded to this proposal.`; reopen the fixture in the admin proposal view to confirm the stored status and feedback.
- **Decline.** With a different untouched `sent` fixture, click `page.getByRole('button', { name: 'Decline', exact: true })`, observe the real update response, reload, and require the already-responded message. Confirm rejection from the admin view as well.
- **Accept and navigate.** With another untouched fixture, click `page.getByRole('button', { name: 'Accept & Pay', exact: true })`. Require `/payment/`, the `Complete Your Advance Payment` heading, correct advance amount, and preserved review token. This button navigates to payment; do not report acceptance/project activation before successful payment verification.
- **Sandbox checkout.** Click `page.getByRole('button', { name: /^Pay / })`, observe the real `payment-handoff/create-order` response, and use Razorpay's documented test checkout. Capture the resulting `payment-handoff/verify` response, `Payment Successful` heading, stored payment amount/status, and activated project from a read-only second view. Do not replace Razorpay's verification response with a success mock or use live keys.
- **Open Project.** Click `page.getByRole('button', { name: 'Open Project', exact: true })`; require `/portal/project-access`, the correct project, and then its usable workspace through the real access/login path. Capture both the button action and destination.
- **Invalid-link branches.** Against the owned full-stack instance, visit `/proposal/00000000-0000-0000-0000-000000000000` and require `Proposal Not Found`; visit `/payment/00000000-0000-0000-0000-000000000000` and require `Payment Not Found`. Capture real API error responses. A network failure rendering the same heading does not prove invalid-token handling.

## Gotchas

- Proposal tokens, pending status, role, payment state, and fixture expiry matter. Reusing an already-responded proposal cannot prove another response branch.
- Accept & Pay navigates; the irreversible business side effects occur through order/payment verification. Observe which writes and emails actually happen.
- PublicPaymentPage loads Razorpay's external script on entry. A test label is not proof of zero external traffic; record requests and confirm test credentials before clicking Pay.
- Backend email and payment operations can affect other users if data is shared. Require disposable records/inboxes and retain evidence; do not reset shared data.
- A base64 `?data=` proposal or injected auth session can render a screen without proving the issued-link access path, persistence, or payment activation.
