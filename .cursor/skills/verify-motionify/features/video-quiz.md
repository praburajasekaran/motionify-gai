# Video quiz and inquiry

Visitors answer five questions to receive a video recommendation, go back to edit their choices, enter project/contact details, submit an inquiry, and follow its status.

## Sub-features

- `quiz-hero`, `quiz-footer`, and `quiz-direct` enter the quiz from the hero, footer, and shared anchor URL.
- `quiz-recommendation` selects a matching video recommendation from five answers.
- `quiz-back` retains selected answers when moving back; `quiz-reset` returns to the welcome state.
- `quiz-validation` rejects missing project details without sending a request.
- `inquiry-submit`, `inquiry-copy`, and `inquiry-track` cover stored inquiry creation, its number, confirmation email, and tracking.

## How to get to it (user POV)

- On home, choose `Find Your Video Style` or the footer's prominent `Contact Us` button; direct `/#video-style-quiz` reaches the same section.
- Choose `Get Started`, answer the five questions, and choose `Start This Project` from the recommendation.
- Choose `Back` to edit, or `Retake Quiz` to restart.
- Submit the contact form with `Send Me a Proposal`, then choose `Copy inquiry number` or `Track My Inquiry`. The canonical direct tracking route is `/inquiry-status/` followed by the visible inquiry number.

## Driving it with Playwright

Preconditions: the owned baseline passes doctor. A live submission additionally requires a disposable full-stack instance and a controlled email inbox; no such fixture is needed for recommendation/validation proof.

- **Automated baseline.** Run `rtk node .cursor/skills/verify-motionify/scripts/control.mjs drive "$VERIFY_RUN" quiz`. It drives the hero entry, Back behavior, recommendation, invalid contact submission, and reset, with screenshots and action/network logs.
- **Footer entry.** From `/`, click `page.locator('footer').getByRole('link', { name: 'Contact Us', exact: true })`; assert the URL ends in `#video-style-quiz` and the quiz section is in view. From a non-home page, test this same button independently and record whether it actually reaches the quiz.
- **Direct entry.** Run `await page.goto('/#video-style-quiz')`; require the `Create Your Video Project` heading and `Get Started` control. Capture the loaded anchor position.
- **Answer sequence.** Scope to `const quiz = page.locator('#video-style-quiz')`. Click `quiz.getByRole('button', { name: 'Get Started', exact: true })`, then exact answer buttons `Tech`, `Businesses`, `Mixed Media`, `Bold`, and `Explainer (1–2 min)`. Require the `Mixed Media Explainer` heading and `Start This Project`. All actions must go through buttons.
- **Back and reset.** After choosing Tech, choose `Back` and require Tech's `aria-pressed="true"`. Complete the sequence, then choose `Retake Quiz`; require the `Create Your Perfect Video` welcome heading. The shipped case also tests `Back` from the contact form before resetting.
- **Validation.** Choose `Start This Project`; fill `quiz.getByLabel('Full Name', { exact: false })` with `Verification Runner` and `quiz.getByLabel('Email Address', { exact: false })` with `verification@example.test`. Leave project details blank and click `Send Me a Proposal`. Require `Project details are required` and observe zero non-GET requests, not merely the absence of a success screen.
- **Live submission.** On a disposable full stack, use a deliverable address in the controlled inbox, fill `quiz.getByLabel('Tell us more about your project', { exact: false })`, and choose `Send Me a Proposal`. Save the request/response and resulting `Inquiry Submitted!` screen, visible inquiry number, and actual controlled confirmation email. Reopen the new inquiry from the admin `Inquiries` view to verify stored contact and selections. An API mock or the final screen alone does not prove this path.
- **Copy and track.** Grant the test context clipboard permissions, click `page.getByRole('button', { name: 'Copy inquiry number', exact: true })`, and compare `await page.evaluate(() => navigator.clipboard.readText())` with the visible number. Click `Track My Inquiry` and require that number's actual tracking view. Also navigate to the canonical direct path using the captured number; log the two entry points separately.

## Gotchas

- Duration button labels include punctuation and a Unicode en dash: `Explainer (1–2 min)`. Hidden question buttons must not be driven with broad CSS clicks.
- Required project details can be missing while the submit button is enabled; the shipped case verifies rejection after the click.
- Recommendations insert a YouTube iframe automatically; inspect the network log to distinguish insertion from real playback.
- The current success-screen tracking link is `/#/inquiry-status/<number>` even though the app uses BrowserRouter and the canonical tracking route is `/inquiry-status/<number>`. Test the visible link honestly; a direct-route pass cannot certify that link. This known discrepancy is outside the starter baseline proof.
- Existing historical quiz documentation describes breadcrumb editing that is absent from the current component. The map follows current Back/Retake controls.
