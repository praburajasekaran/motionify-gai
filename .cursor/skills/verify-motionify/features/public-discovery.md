# Public discovery

Visitors browse Motionify's portfolio, choose a video to load its player, use desktop or mobile navigation, and find the studio's project and support contact addresses.

## Sub-features

- `work-header`, `work-footer`, `work-mobile`, and `work-direct` reach the same portfolio from distinct entry points.
- `work-video` inserts a YouTube player only after choosing Play.
- `work-responsive` keeps the portfolio within a narrow viewport.
- `contact-links` exposes the correct project and support mailto destinations.

## How to get to it (user POV)

- Choose `Work` in the desktop header or opened mobile menu.
- Choose `Works` in the footer, or visit `/work` directly.
- Choose a video's `Play …` button.
- Choose `Get in touch` in the header or mobile menu, `Contact Us` in the hero, `Contact` in the footer, or `Start a project conversation` on Work; direct `/contact` is also available.

## Driving it with Playwright

Preconditions: the owned baseline instance passes doctor; the browser is signed out; external video and chat requests are blocked and recorded.

- **Automated Work paths.** Run `rtk node .cursor/skills/verify-motionify/scripts/control.mjs drive "$VERIFY_RUN" work`. It clicks header `Work`, footer `Works`, and mobile `Open menu` → `Work`, checks the portfolio heading and 29 video cards, inserts the selected player, and asserts no horizontal overflow at 390px. Its before/after screenshots and trace prove these entry points.
- **Direct path.** In a focused spec, run `await page.goto('/work')` and `await expect(page.getByRole('heading', { name: /Visual stories built/ })).toBeVisible()`. This is additional coverage, not a substitute for the navigation entries.
- **Video.** Use `page.getByRole('button', { name: /Play Mastering the Art of Visual Storytelling/i }).click()`. Before clicking, require zero YouTube iframes; afterward require one `iframe[src*="youtube-nocookie.com/embed/"]`. Capture both states. Claim player insertion only while external requests are blocked.
- **Contact entry points.** Separately click `page.locator('header').getByRole('link', { name: 'Get in touch', exact: true })`, `page.locator('footer').getByRole('link', { name: 'Contact', exact: true })`, and `page.getByRole('link', { name: 'Start a project conversation', exact: true })` from Work. Each must navigate to `/contact` and render the `Contact Us` heading. The hero's `Contact Us` link is on `/` and must be scoped outside the header/footer; the mobile header entry requires opening the menu first.
- **Contact destinations.** On `/contact`, assert `page.getByRole('link', { name: /New projects/ })` has `href="mailto:hello@motionify.studio"`, `page.getByRole('link', { name: /Support/ })` has `href="mailto:support@motionify.studio"`, and `page.getByRole('link', { name: 'Email Motionify', exact: true })` targets the project email. Save the ARIA snapshot and screenshot without launching an email client or sending mail.

## Gotchas

- Header and mobile links are duplicated in source; role queries exclude hidden entries. Scope to `header` or `footer` and assert the correct viewport.
- The footer's prominent `Contact Us` button targets `/#video-style-quiz`, while the footer navigation's `Contact` link targets `/contact`. Cover each intended path separately.
- YouTube and Tawk are production external boundaries. Aborting them stabilizes local UI proof; it does not prove playback or chat delivery.
- The portfolio count is grounded in `data/workVideos.ts` and the existing `e2e/public-work.spec.ts`; update the assertion when the catalog changes.
