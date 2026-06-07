---
title: "feat: Add Work page and public chat"
type: feat
status: completed
date: 2026-06-07
---

# feat: Add Work page and public chat

## Summary

Add a public `/work` page that presents the supplied YouTube portfolio videos with performance-conscious loading and a concise approach section. Add Tawk.to chat only on public marketing pages, excluding portal and public handoff flows. Tighten public-site polish by matching the footer logo to the header logo, opening Login and Portal links in new tabs, and adding the Motionify process video to the "From Idea to Impact" section.

---

## Problem Frame

The site header, footer, and portfolio teaser already link to `/work`, but `App.tsx` does not register a public Work route. The requested page should make the portfolio destination real without adding pricing, and the chat widget should support visitor conversations on marketing pages without entering authenticated workspace screens.

---

## Requirements

- R1. `/work` renders as a public marketing route with the existing `Header` and `Footer`.
- R2. The Work page shows every supplied YouTube video in a scannable responsive layout without eagerly loading all players on first paint.
- R3. The Work page includes an approach section and does not include pricing copy or pricing cards.
- R4. Tawk.to chat loads on public marketing pages only: `/`, `/about`, `/contact`, and `/work`.
- R5. Tawk.to chat does not load on `/portal/*`, public proposal/payment handoff routes, inquiry verification routes, or inquiry-status routes.
- R6. Third-party scripts are loaded once, guarded against duplicate insertion during React route changes and development remounts.
- R7. The implementation preserves existing public-site styling, route splitting, and accessibility expectations.
- R8. The footer uses the same Motionify Studio logo asset and alt text pattern as the top navigation.
- R9. Public-site Login and Portal links open in a new tab with safe external-window attributes.
- R10. The "From Idea to Impact" process section includes the Motionify process video from `https://youtu.be/Lvv_T_8fNjI`.

---

## Key Technical Decisions

- **Route-gated chat component:** Implement Tawk.to as a small React component mounted in the public-site router branch, using `useLocation` to allow only marketing paths. This avoids putting the script in `index.html`, where it would load on portal pages too.
- **No visitor identity wiring:** Do not call Tawk visitor identity APIs in this pass. Tawk's JavaScript API notes that SPA identity updates need `setAttributes`, and secure user identity would require a server-side hash design, which is outside the marketing-page chat request.
- **Click-to-load or lazy video embeds:** Prefer thumbnail cards that create the iframe only after user interaction, with a fallback of `loading="lazy"` if thumbnail data is not practical. The Work page has 29 videos, so eager iframes would create avoidable network and main-thread cost.
- **Local video data:** Keep the supplied video IDs in a local data structure near the Work page or in `data/workVideos.ts`. There is no current CMS or backend contract for marketing portfolio content, so static data is the lowest-risk fit.
- **Public route only:** Register `/work` in the non-portal `BrowserRouter` branch of `App.tsx`. It should not be wrapped by `AuthProvider`, `NotificationProvider`, or `ProtectedRoute`.
- **Header/footer asset parity:** Treat the header logo as authoritative for public branding and update the footer to use the same asset. This keeps public navigation visually consistent without introducing a second brand mark.
- **New-tab portal entry links:** Apply `target="_blank"` and `rel="noopener noreferrer"` to public Login and Portal links so visitors do not lose their marketing-page context when entering the portal.

---

## High-Level Technical Design

```mermaid
flowchart TB
  App[App route classifier] --> PublicRouter[Public BrowserRouter]
  PublicRouter --> PublicRoutes[Marketing routes]
  PublicRoutes --> WorkPage[/work page]
  PublicRoutes --> TawkGate[TawkChat route gate]
  TawkGate -->|/, /about, /contact, /work| Inject[Inject Tawk script once]
  TawkGate -->|portal and handoff paths| Skip[Do not inject]
  WorkPage --> VideoData[Static YouTube video IDs]
  VideoData --> VideoCards[Thumbnail or lazy embed cards]
  PublicRoutes --> ProcessSection[From Idea to Impact]
  ProcessSection --> ProcessVideo[Motionify process video]
```

The design keeps chat route eligibility separate from route classification. `classifyRoute` decides the app shell; `TawkChat` decides whether the marketing chat widget belongs on the current public path.

---

## Scope Boundaries

- Pricing is out of scope for this Work page.
- Portal pages under `/portal/*` must not load Tawk.to.
- Public handoff flows such as `/proposal/:proposalId`, `/payment/:proposalId`, verification, and inquiry-status pages are excluded from chat unless explicitly requested later.
- Tawk secure mode, visitor identity sync, tags, and chat event analytics are deferred to follow-up work.

---

## Assumptions

- "Landing page and related routes" means public marketing pages: `/`, `/about`, `/contact`, and `/work`.
- If a YouTube thumbnail request fails, the card can still render a button or plain placeholder that loads the embed on click.

---

## Implementation Units

### U1. Create the Work page content model and route

**Goal:** Add the missing `/work` public route and make all supplied video links available to the page.

**Requirements:** R1, R2, R3, R7

**Dependencies:** None

**Files:**
- `App.tsx`
- `pages/WorkPage.tsx`
- `data/workVideos.ts`
- `e2e/public-work.spec.ts`

**Approach:** Add a lazy `WorkPage` import beside `LandingPage`, `AboutPage`, and `ContactPage`, then register `<Route path="/work" element={<WorkPage />} />` in the public router branch. Normalize the supplied YouTube URLs into video IDs and embed URLs in a typed static array so the page rendering does not parse URLs at runtime.

**Patterns to follow:** `pages/AboutPage.tsx` and `pages/ContactPage.tsx` for public page shell structure; `components/PortfolioGrid.tsx` for iframe attributes and responsive video aspect ratio.

**Test scenarios:**
- Visiting `/work` renders the Work page heading, the existing public navigation, and the footer without redirecting to `/`.
- The page exposes 29 video entries derived from the supplied URLs.
- The page has no visible pricing section, pricing package, or pricing CTA copy.

**Verification:** `/work` is reachable from the header/footer links and renders as a public page without authentication.

### U2. Build performance-conscious video presentation

**Goal:** Render the Work portfolio as a responsive video gallery without creating 29 active YouTube iframes on initial load.

**Requirements:** R2, R7

**Dependencies:** U1

**Files:**
- `pages/WorkPage.tsx`
- `data/workVideos.ts`
- `e2e/public-work.spec.ts`

**Approach:** Render video cards with stable 16:9 media boxes and accessible titles. Prefer click-to-load cards that use YouTube thumbnail images and instantiate the iframe only after the user activates a play button. If implementation chooses always-visible iframes, each iframe must use `loading="lazy"`, `referrerPolicy="strict-origin-when-cross-origin"`, `allowFullScreen`, and the existing YouTube player parameters from `PortfolioGrid`.

**Patterns to follow:** `components/PortfolioGrid.tsx` for media card proportions and safe iframe attributes; `docs/solutions/performance-issues/production-page-load-7s-bundle-splitting-Portal-20260226.md` for avoiding unnecessary initial bundle and network cost.

**Test scenarios:**
- Initial `/work` render creates zero or a small bounded number of YouTube iframes before user interaction.
- Activating a video card creates an iframe with the correct `youtube.com/embed/<id>` or `youtube-nocookie.com/embed/<id>` URL.
- Keyboard activation on a video card loads the same player as pointer activation.
- The gallery does not produce horizontal overflow at 320px, 375px, 768px, and desktop widths.

**Verification:** The first viewport remains responsive, the video grid is usable by keyboard, and embed loading is deferred until needed.

### U3. Add Work page approach section

**Goal:** Add concise approach content that explains how Motionify works without introducing pricing.

**Requirements:** R3, R7

**Dependencies:** U1

**Files:**
- `pages/WorkPage.tsx`
- `e2e/public-work.spec.ts`
- `e2e/a11y/public-screens.a11y.spec.ts`

**Approach:** Use the established dark public marketing style from `AboutPage` and `ContactPage`. Keep the approach section practical and scannable, such as discovery, story direction, production, and delivery/review. Include a contact CTA if needed, but keep all pricing language out.

**Patterns to follow:** `pages/AboutPage.tsx` for simple public content sections; `styles/brand-voice.md` for collaborative, clear, creator-focused language.

**Test scenarios:**
- The approach section is visible after the video gallery and contains the expected process headings.
- The page has a clear path to `/contact`.
- Accessibility audit for `/work` reports no critical heading, landmark, contrast, or button-name issues.

**Verification:** The Work page reads as a complete public marketing page with portfolio proof and approach, not a placeholder list.

### U4. Add route-gated Tawk.to chat loader

**Goal:** Load the provided Tawk.to widget only on public marketing pages.

**Requirements:** R4, R5, R6

**Dependencies:** None

**Files:**
- `components/TawkChat.tsx`
- `App.tsx`
- `e2e/tawk-chat-routing.spec.ts`

**Approach:** Create a client-side component that uses `useLocation` and a marketing-path allowlist. When the current path is eligible, initialize `window.Tawk_API`, set `window.Tawk_LoadStart`, and append the async script with `src="https://embed.tawk.to/6a24f7a06d77da1c401dea56/1jqg6ejm4"`, `charset="UTF-8"`, and `crossorigin="*"`. Guard by script ID or exact `src` query so React remounts and path changes cannot insert duplicates. Mount this component inside the non-portal `BrowserRouter` branch where `useLocation` is available.

**Patterns to follow:** `pages/client/Payment.tsx` and `pages/public/PublicPaymentPage.tsx` for dynamic third-party script loading; Tawk.to JavaScript API guidance for defining `window.Tawk_API` before the widget script loads.

**Test scenarios:**
- Visiting `/` inserts one Tawk script with the supplied embed URL.
- Navigating among `/`, `/about`, `/contact`, and `/work` does not insert duplicate Tawk scripts.
- Visiting `/portal/login` does not insert the Tawk script.
- Visiting `/proposal/example`, `/payment/example`, `/verify-inquiry`, and `/inquiry-status/INQ-TEST` does not insert the Tawk script.
- If the Tawk script already exists, the component does not append another script.

**Verification:** Chat appears on marketing pages and no Tawk network request is made on portal or handoff pages.

### U5. Add public route regression coverage

**Goal:** Cover the new marketing page and chat route boundaries in existing Playwright suites.

**Requirements:** R1, R4, R5, R6, R7

**Dependencies:** U1, U2, U3, U4

**Files:**
- `e2e/public-work.spec.ts`
- `e2e/tawk-chat-routing.spec.ts`
- `e2e/a11y/public-screens.a11y.spec.ts`

**Approach:** Add focused Playwright tests rather than broad snapshots. For chat tests, intercept or inspect the script element instead of depending on Tawk service availability. Extend public accessibility coverage to include `/work`.

**Patterns to follow:** `e2e/a11y/public-screens.a11y.spec.ts` for accessibility helpers; `playwright.config.ts` for base URL expectations.

**Test scenarios:**
- `/work` loads from a production build and contains the video gallery and approach section.
- The Work page has no horizontal overflow on mobile and tablet viewports.
- Tawk script gating passes for eligible and excluded routes without relying on third-party uptime.
- Existing public routes still render after adding the Work route and Tawk component.

**Verification:** The implementation has route, performance, and accessibility coverage for the new public surface.

### U6. Polish public branding and portal link behavior

**Goal:** Make shared public navigation consistent and preserve marketing-page context when visitors open portal entry points.

**Requirements:** R8, R9, R7

**Dependencies:** None

**Files:**
- `components/Footer.tsx`
- `components/Header.tsx`
- `e2e/public-work.spec.ts`

**Approach:** Compare the footer logo with the header logo and update the footer to use the same Motionify Studio logo asset and equivalent alt text. Update public Header Login and Portal anchors so they open in a new tab using `target="_blank"` with `rel="noopener noreferrer"`; include the same behavior in the mobile menu links.

**Patterns to follow:** `components/Header.tsx` for the canonical logo asset and public navigation link sources.

**Test scenarios:**
- The footer renders the same logo source used by the header.
- Desktop Login and Portal links have `target="_blank"` and `rel` containing `noopener` and `noreferrer`.
- Mobile menu Login and Portal links have the same new-tab behavior after opening the menu.

**Verification:** Public branding is consistent from top to footer, and portal entry links no longer replace the current marketing page.

### U7. Add process video to From Idea to Impact

**Goal:** Add the Motionify process video to the existing process section without hurting initial page performance.

**Requirements:** R10, R7

**Dependencies:** None

**Files:**
- `components/ProcessTimeline/ProcessTimeline.tsx`
- `e2e/public-work.spec.ts`
- `e2e/a11y/public-screens.a11y.spec.ts`

**Approach:** Locate the "From Idea to Impact" section in the Process Timeline component and add the video `https://youtu.be/Lvv_T_8fNjI` using the same deferred embed pattern chosen for the Work page. Keep the process section layout stable on mobile and desktop, and give the video an accessible title that describes the Motionify process.

**Patterns to follow:** U2 video-card loading pattern; `components/ProcessTimeline/ProcessTimeline.tsx` for section spacing and visual style.

**Test scenarios:**
- The "From Idea to Impact" section renders a Motionify process video card or lazy embed.
- The process video does not create an eager YouTube iframe before user activation if the Work page uses click-to-load embeds.
- The section remains free of horizontal overflow at mobile widths.
- Accessibility audit still passes with the added video control.

**Verification:** The process section now supports its narrative with the supplied video while preserving the site performance posture.

---

## System-Wide Impact

The Work page adds a new public route to the public-site router branch and should not affect portal authentication or protected layout behavior. Tawk.to is an external script and must remain route-gated so it does not collect or display on workspace, proposal, payment, or inquiry handoff experiences. Header/footer and process-section updates affect shared public marketing surfaces, so regression checks should cover both desktop and mobile navigation.

---

## Risks & Dependencies

- **Third-party script performance:** Tawk.to adds external JavaScript. Mitigation: route-gate it to marketing pages and load it asynchronously.
- **Privacy boundary drift:** Loading chat on portal or handoff pages could expose user or project context to a third party. Mitigation: use an explicit marketing allowlist and regression tests for excluded routes.
- **Video page weight:** Many YouTube embeds can degrade load performance. Mitigation: use click-to-load thumbnails or strict lazy iframes.
- **Thumbnail availability:** YouTube thumbnails may be unavailable for some videos. Mitigation: keep card layout stable and allow click-to-load with a fallback visual state.

---

## Sources & Research

- `App.tsx` currently lazy-loads public pages and has no `/work` route.
- `components/Header.tsx`, `components/Footer.tsx`, and `components/PortfolioGrid.tsx` already link to `/work`.
- `components/PortfolioGrid.tsx` provides the local iframe attribute pattern for YouTube embeds.
- `components/Header.tsx` contains the canonical public header logo and Login/Portal links.
- `components/ProcessTimeline/ProcessTimeline.tsx` owns the "From Idea to Impact" section.
- `pages/AboutPage.tsx` and `pages/ContactPage.tsx` provide the public-page shell pattern.
- `docs/solutions/performance-issues/production-page-load-7s-bundle-splitting-Portal-20260226.md` records the repo's preference for route-level loading and avoiding unnecessary third-party cost.
- Tawk.to JavaScript API docs: https://developer.tawk.to/jsapi/
- Tawk.to React integration docs: https://help.tawk.to/article/react-js
