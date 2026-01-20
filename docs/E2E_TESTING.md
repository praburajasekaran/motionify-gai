# End-to-End Testing with Playwright

This guide explains how to run and maintain E2E tests for the Motionify PM Portal using [Playwright](https://playwright.dev/).

## Quick Start

### Install Dependencies

Playwright and browsers are already installed. If you need to reinstall:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

### Run E2E Tests

```bash
# Run all tests (headless mode)
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests with browser visible
npm run test:e2e:headed

# Debug tests step-by-step
npm run test:e2e:debug

# Run payment flow tests (Next.js landing page)
npm run test:e2e:payment

# Run payment tests with UI mode
npm run test:e2e:payment:ui

# Debug payment tests
npm run test:e2e:payment:debug
```

## Test Structure

Tests are located in the `e2e/` directory:

```
e2e/
├── portal-smoke.spec.ts       # Client portal smoke tests (2 tests)
├── admin-smoke.spec.ts        # Admin portal smoke tests (3 tests)
├── admin-functional.spec.ts   # Super admin functional tests (4 tests)
├── proposal-acceptance.spec.ts # Proposal workflow tests (3 tests)
├── deliverable-review.spec.ts  # Deliverable review tests (4 tests)
└── payment-flow.spec.ts       # Razorpay payment flow tests (10 tests)
```

**Total: 26 E2E tests** (16 portal + 10 payment)

## Configuration

The Playwright configuration is in `playwright.config.ts`:

- **Test Directory**: `./e2e`
- **Base URL**: `http://localhost:8080` (production build)
- **Browser**: Chromium
- **Web Server**: Automatically starts a Python HTTP server serving the `dist/` folder

## Test Scenarios Covered

### Portal Smoke Test (`portal-smoke.spec.ts`)

**Test 1: should login as client and navigate portal**
- Navigate to login page
- Click "Client (Primary Contact)" login button
- Verify dashboard loads ("Dashboard")
- Navigate to Projects section
- Navigate to Settings (if available)

**Test 2: should display user profile correctly**
- Login as client
- Verify dashboard loaded
- Verify URL is correct

### Admin Smoke Test (`admin-smoke.spec.ts`)

**Test 1: should login as admin and access admin features**
- Navigate to login page
- Click "Super Admin" login button
- Verify dashboard loads

**Test 2: should access inquiry management**
- Login as admin
- Navigate to Inquiries (if available)
- Verify URL changes to inquiries page

**Test 3: should access user management**
- Login as admin
- Navigate to Team management (if available)

### Super Admin Functional Test (`admin-functional.spec.ts`)

**Test 1: complete super admin workflow - inquiry to proposal**

This comprehensive test covers the entire super admin workflow:

1. **Navigate to Inquiry Dashboard**
   - Click Inquiries link in sidebar
   - Verify inquiry dashboard loads

2. **View Inquiry Statistics**
   - Verify statistics cards display (Total Inquiries, New, Proposal Sent, Converted)
   - Take screenshot of dashboard

3. **Search and Filter**
   - Test search input functionality
   - Test status filter button
   - Handle empty state gracefully

4. **View Inquiry Detail** (if inquiries exist)
   - Click on first inquiry
   - Verify contact information displays
   - Verify action buttons available

5. **Create Proposal** (if available)
   - Click Create Proposal button
   - Verify proposal builder loads
   - Fill project description
   - Add deliverable information
   - Set pricing and advance percentage
   - Verify form validation

6. **View Existing Proposal** (if already exists)
   - Click View Proposal button
   - Verify proposal details display
   - Check for edit functionality

7. **Edit Proposal** (if editable)
   - Click Edit button
   - Verify edit mode activates
   - Verify Save/Cancel buttons appear

8. **Navigate Back**
   - Return to dashboard
   - Verify navigation works

**Test 2: inquiry dashboard - statistics and filtering**
- Verify inquiry dashboard loads correctly
- Test search functionality doesn't crash
- Test status filtering works
- Verify statistics cards display

**Test 3: inquiry detail - contact information and actions**
- Navigate to inquiry detail page
- Verify contact information section
- Check for action buttons (Create Proposal, View Proposal, Send Email, etc.)
- Test back navigation

**Test 4: proposal creation form - validation and fields**
- Navigate to proposal builder
- Verify all required form fields exist:
  - Project description
  - Deliverable name and description
  - Pricing
  - Currency selector
  - Advance percentage options (40%, 50%, 60%)
- Verify submit button exists

### Proposal Acceptance Flow (`proposal-acceptance.spec.ts`)

**Test 1: should view and navigate proposals as client**
- Login as client
- Navigate to projects
- Verify projects page loads

**Test 2: should display proposal details correctly**
- Login as client
- Try to click on a project card
- Verify project details display

**Test 3: should show accept/reject actions for pending proposals**
- Login as client
- Look for approve/reject buttons (if proposals exist)

### Deliverable Review Flow (`deliverable-review.spec.ts`)

**Test 1: should access deliverables section**
- Login as client
- Navigate to project
- Look for deliverables tab

**Test 2: should display deliverable card with actions**
- Login as client
- Check for deliverable cards
- Verify action buttons exist

**Test 3: should allow requesting revisions**
- Login as client
- Verify page loads correctly

**Test 4: should support video commenting feature**
- Login as client
- Verify page structure

### Razorpay Payment Flow Test (`payment-flow.spec.ts`)

**Note**: Payment tests use a separate configuration (`playwright.payment.config.ts`) that tests the Next.js landing page on port 5174.

**Configuration**:
- **Test Directory**: `./e2e`
- **Test Pattern**: `**/payment-*.spec.ts`
- **Base URL**: `http://localhost:5174` (Next.js dev server)
- **Web Server**: Automatically starts `npm run dev:landing`

**Test Coverage**:

**Test 1: payment page - loads and displays correctly**
- Navigate to payment page with test proposal ID
- Wait for page content to load
- Verify either payment form OR "not found" message displays
- Capture screenshot

**Test 2: payment breakdown component - displays pricing correctly**
- Navigate to payment page
- Look for pricing elements (Total Cost, Advance Payment)
- Verify currency symbols (₹ for INR, $ for USD)
- Handle gracefully when proposal doesn't exist

**Test 3: payment button - exists and is interactive**
- Verify payment/pay button exists
- Check if button is enabled
- Look for icon or loading state capability

**Test 4: payment success page - renders correctly**
- Navigate to success page with test payment ID
- Verify success message displays
- Look for success indicator (checkmark)
- Verify payment ID is shown
- Check for next steps information

**Test 5: payment failure page - renders correctly**
- Navigate to failure page with error message
- Verify failure message displays
- Look for error indicator
- Verify error message from query param shows
- Test retry button functionality

**Test 6: currency conversion - displays both INR and USD**
- Check for currency symbols
- Look for conversion rate information

**Test 7: payment page - security and branding**
- Verify page URL
- Check for Motionify branding
- Look for security/trust indicators
- Verify Razorpay attribution

**Test 8: payment page - responsive design**
- Test mobile viewport (375x667)
- Test tablet viewport (768x1024)
- Verify content is accessible in all viewports
- Capture screenshots for each viewport

**Test 9: create order API - structure verification**
- Document expected API endpoints
- Check for Razorpay script loading
- Note: Full API testing requires integration tests

**Test 10: payment verification - expected flow**
- Documents the complete payment verification flow:
  1. User completes Razorpay checkout
  2. Razorpay returns: payment_id, order_id, signature
  3. Client POSTs to /api/payments/verify
  4. Server verifies HMAC SHA256 signature
  5. Payment record updated to "completed"
  6. Project created from proposal
  7. User redirected to success page

**Running Payment Tests**:
```bash
# Run all payment tests
npm run test:e2e:payment

# Run with UI mode
npm run test:e2e:payment:ui

# Debug payment tests
npm run test:e2e:payment:debug
```

**Important Notes**:
- Payment tests verify UI flow and page rendering
- Actual Razorpay modal interactions require test mode credentials
- Tests handle "proposal not found" scenarios gracefully
- Success/failure pages are tested with mock query parameters

**Next.js Configuration Fix**:
- Removed `output: 'export'` from `next.config.ts` to support dynamic routes
- Payment pages use dynamic routing (`/payment/[proposalId]`)
- Static export is incompatible with dynamic routes without `generateStaticParams()`

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    // Navigate
    await page.goto('/#/some-page');

    // Interact
    await page.locator('button:has-text("Click Me")').click();

    // Assert
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Best Practices

1. **Use semantic selectors**
   ```typescript
   // Good
   await page.locator('button:has-text("Submit")').click();
   await page.getByRole('button', { name: 'Submit' }).click();

   // Avoid
   await page.locator('.btn-123').click();
   ```

2. **Wait for navigation**
   ```typescript
   await page.waitForURL(/\/#\/projects/);
   ```

3. **Handle conditional elements**
   ```typescript
   const element = page.locator('text=Optional');
   if (await element.isVisible()) {
     await element.click();
   }
   ```

4. **Use descriptive test names**
   ```typescript
   test('should allow admin to create new project', async ({ page }) => {
     // ...
   });
   ```

## Debugging Failed Tests

### View Test Report

After running tests, open the HTML report:

```bash
npx playwright show-report
```

This shows:
- Screenshots of failures
- Step-by-step execution logs
- Error messages
- Video recordings (if enabled)

### Debug a Specific Test

```bash
npx playwright test --debug e2e/portal-smoke.spec.ts
```

This opens the Playwright Inspector where you can:
- Step through each action
- Inspect the DOM
- See selector suggestions

### View Screenshots

Failed test screenshots are saved in `test-results/`:

```
test-results/
└── [test-name]/
    ├── test-failed-1.png
    └── error-context.md
```

## CI/CD Integration

### Running in CI

The configuration automatically:
- Retries failed tests 2 times in CI
- Runs tests serially in CI (parallel locally)
- Captures traces on first retry

Example GitHub Actions workflow:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Common Issues

### Port Already in Use

If port 8080 is in use:

```bash
lsof -ti:8080 | xargs kill -9
```

### Build Not Up to Date

Always rebuild before running tests:

```bash
npm run build && npm run test:e2e
```

### Selector Not Found

Tests use flexible selectors. If the UI changes significantly:

1. Run with `--debug` to inspect the page
2. Update selectors in test files
3. Consider adding `data-testid` attributes to components

### Timeout Errors

If tests timeout:

1. Increase timeout in specific tests:
   ```typescript
   test('slow test', async ({ page }) => {
     test.setTimeout(60000); // 60 seconds
     // ...
   });
   ```

2. Or globally in `playwright.config.ts`:
   ```typescript
   timeout: 60000
   ```

## Comparison with Maestro

We previously used Maestro for E2E testing but switched to Playwright because:

- **Better web support**: Maestro's web support is in beta and had compatibility issues with modern React
- **Rich debugging**: Playwright Inspector, trace viewer, and detailed error messages
- **Faster execution**: Playwright is optimized for web testing
- **Better CI integration**: Wide support in CI/CD platforms
- **Active maintenance**: Large community and frequent updates

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Debugging Guide](https://playwright.dev/docs/debug)
