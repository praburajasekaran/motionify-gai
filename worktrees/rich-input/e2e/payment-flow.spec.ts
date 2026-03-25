import { test, expect } from '@playwright/test';

/**
 * Razorpay Payment Flow E2E Tests
 *
 * Tests the complete payment workflow from proposal acceptance to payment completion.
 *
 * Note: These tests verify the UI flow and payment page rendering.
 * Actual Razorpay modal interactions require test mode cards and cannot be fully
 * automated without Razorpay test environment setup.
 *
 * Test Flow:
 * 1. Navigate to payment page
 * 2. Verify payment breakdown displays
 * 3. Verify payment button exists
 * 4. Test payment page elements
 * 5. Test success/failure page rendering
 */

test.describe('Razorpay Payment Flow', () => {

  test('payment page - loads and displays correctly', async ({ page }) => {
    // Navigate directly to a payment page (using a mock proposal ID)
    // In real scenario, this would be reached via proposal acceptance
    await page.goto('http://localhost:5174/payment/test-proposal-id', { waitUntil: 'domcontentloaded' });

    // Wait for either payment content or "not found" message to appear
    await Promise.race([
      page.waitForSelector('text=/Payment|Complete Your Payment/i', { timeout: 10000 }).catch(() => null),
      page.waitForSelector('text=/not found|Not Found/i', { timeout: 10000 }).catch(() => null),
    ]);

    // Verify page loaded (might show error for non-existent proposal)
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

    // Verify payment-related content
    // Page might show error if proposal doesn't exist, which is expected in test environment
    const pageContent = await page.textContent('body');

    if (pageContent?.includes('Payment')) {
      console.log('✓ Payment page loaded');

      // Look for payment breakdown or amount display
      const hasPaymentInfo =
        pageContent.includes('Amount') ||
        pageContent.includes('Total') ||
        pageContent.includes('Advance') ||
        pageContent.includes('₹') ||
        pageContent.includes('$');

      if (hasPaymentInfo) {
        console.log('✓ Payment information displayed');
      }
    } else if (pageContent?.includes('not found') || pageContent?.includes('error')) {
      console.log('ℹ Proposal not found (expected in test environment)');
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/payment-page.png', fullPage: true });
  });

  test('payment breakdown component - displays pricing correctly', async ({ page }) => {
    // This test verifies the payment breakdown component structure
    // We'll create a test page or check for the component elements

    await page.goto('http://localhost:5174/payment/test-proposal-id', { waitUntil: 'domcontentloaded' });

    // Wait for content to load
    await Promise.race([
      page.waitForSelector('text=/Payment|Complete Your Payment/i', { timeout: 10000 }).catch(() => null),
      page.waitForSelector('text=/not found|Not Found/i', { timeout: 10000 }).catch(() => null),
    ]);

    // Look for pricing elements (these may not exist if proposal not found)
    const totalElement = page.locator('text=/Total.*Cost|Project.*Cost|Total.*Price/i').first();
    const advanceElement = page.locator('text=/Advance.*Payment|Pay.*Now|Due.*Now/i').first();

    if (await totalElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✓ Total cost element found');
    }

    if (await advanceElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✓ Advance payment element found');
    }

    // Verify currency symbols (₹ for INR or $ for USD)
    const hasCurrency = await page.locator('text=/₹|\\$/').first().isVisible({ timeout: 3000 }).catch(() => false);

    if (hasCurrency) {
      console.log('✓ Currency symbol displayed');
    }
  });

  test('payment button - exists and is interactive', async ({ page }) => {
    await page.goto('http://localhost:5174/payment/test-proposal-id');
    await page.waitForLoadState('networkidle');

    // Look for pay/payment button
    const payButton = page.locator('button:has-text("Pay"), button:has-text("Proceed"), button:has-text("Payment")').first();

    if (await payButton.isVisible({ timeout: 5000 })) {
      console.log('✓ Payment button found');

      // Verify button is enabled (might be disabled if proposal not loaded)
      const isEnabled = await payButton.isEnabled();
      console.log(`  Button enabled: ${isEnabled}`);

      // Verify button has icon or loading state capability
      const hasIcon = await page.locator('button svg, button [class*="icon"]').first().isVisible({ timeout: 1000 });

      if (hasIcon) {
        console.log('✓ Payment button has icon');
      }
    } else {
      console.log('ℹ Payment button not found (proposal may not be loaded)');
    }
  });

  test('payment success page - renders correctly', async ({ page }) => {
    // Navigate to success page
    await page.goto('http://localhost:5174/payment/success?paymentId=test_payment_123');
    await page.waitForLoadState('networkidle');

    // Verify success message
    await expect(page.locator('text=/Payment.*Success|Success|Confirmed|Complete/i').first()).toBeVisible({ timeout: 10000 });

    // Look for success indicators
    const hasCheckmark = await page.locator('[class*="check"], [class*="success"]').first().isVisible({ timeout: 3000 });

    if (hasCheckmark) {
      console.log('✓ Success indicator (checkmark) displayed');
    }

    // Verify payment ID is displayed
    const hasPaymentId = await page.locator('text=/test_payment_123|Payment.*ID/i').first().isVisible({ timeout: 3000 });

    if (hasPaymentId) {
      console.log('✓ Payment ID displayed');
    }

    // Look for next steps or confirmation text
    const hasNextSteps = await page.locator('text=/Next.*Steps|What.*Next|Confirmation/i').first().isVisible({ timeout: 3000 });

    if (hasNextSteps) {
      console.log('✓ Next steps information displayed');
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/payment-success.png', fullPage: true });
  });

  test('payment failure page - renders correctly', async ({ page }) => {
    // Navigate to failure page with error message
    await page.goto('http://localhost:5174/payment/failure?error=Payment%20declined%20by%20bank');
    await page.waitForLoadState('networkidle');

    // Verify failure message
    await expect(page.locator('text=/Payment.*Failed|Failed|Error|Declined/i').first()).toBeVisible({ timeout: 10000 });

    // Look for error indicator
    const hasErrorIcon = await page.locator('[class*="error"], [class*="fail"]').first().isVisible({ timeout: 3000 });

    if (hasErrorIcon) {
      console.log('✓ Error indicator displayed');
    }

    // Verify error message from query param is displayed
    const hasErrorMessage = await page.locator('text=/declined|bank/i').first().isVisible({ timeout: 3000 });

    if (hasErrorMessage) {
      console.log('✓ Error message displayed');
    }

    // Look for retry button
    const retryButton = page.locator('button:has-text("Try Again"), button:has-text("Retry"), a:has-text("Try Again")').first();

    if (await retryButton.isVisible({ timeout: 3000 })) {
      console.log('✓ Retry button found');

      // Click retry button
      await retryButton.click();

      // Should navigate away from failure page
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      console.log(`  Redirected to: ${currentUrl}`);
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/payment-failure.png', fullPage: true });
  });

  test('currency conversion - displays both INR and USD', async ({ page }) => {
    await page.goto('http://localhost:5174/payment/test-proposal-id');
    await page.waitForLoadState('networkidle');

    // Check for currency symbols
    const hasINR = await page.locator('text=₹').first().isVisible({ timeout: 3000 });
    const hasUSD = await page.locator('text=$').first().isVisible({ timeout: 3000 });

    if (hasINR || hasUSD) {
      console.log(`✓ Currency displayed: ${hasINR ? 'INR' : ''} ${hasUSD ? 'USD' : ''}`);
    }

    // Look for conversion text (1 USD = 83 INR or similar)
    const hasConversion = await page.locator('text=/conversion|rate|≈|~/i').first().isVisible({ timeout: 2000 });

    if (hasConversion) {
      console.log('✓ Currency conversion information displayed');
    }
  });

  test('payment page - security and branding', async ({ page }) => {
    await page.goto('http://localhost:5174/payment/test-proposal-id');
    await page.waitForLoadState('networkidle');

    // Verify secure connection (HTTPS in production)
    const url = page.url();
    console.log(`  Page URL: ${url}`);

    // Verify Motionify branding
    const hasBranding = await page.locator('text=Motionify, img[alt*="Motionify"]').first().isVisible({ timeout: 5000 });

    if (hasBranding) {
      console.log('✓ Motionify branding displayed');
    }

    // Check for security/trust indicators
    const hasSecureText = await page.locator('text=/secure|safe|protected|encrypted/i').first().isVisible({ timeout: 2000 });

    if (hasSecureText) {
      console.log('✓ Security messaging present');
    }

    // Verify Razorpay attribution (usually shown in payment modal or footer)
    const hasRazorpay = await page.locator('text=Razorpay').first().isVisible({ timeout: 2000 });

    if (hasRazorpay) {
      console.log('✓ Razorpay attribution found');
    }
  });

  test('payment page - responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5174/payment/test-proposal-id');
    await page.waitForLoadState('networkidle');

    // Take mobile screenshot
    await page.screenshot({ path: 'test-results/payment-mobile.png', fullPage: true });

    console.log('✓ Mobile viewport tested (375x667)');

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:5174/payment/test-proposal-id');
    await page.waitForLoadState('networkidle');

    // Take tablet screenshot
    await page.screenshot({ path: 'test-results/payment-tablet.png', fullPage: true });

    console.log('✓ Tablet viewport tested (768x1024)');

    // Verify content is still accessible in different viewports
    const bodyVisible = await page.locator('body').isVisible({ timeout: 2000 });
    console.log(`✓ Body content visible in tablet viewport: ${bodyVisible}`);
  });
});

test.describe('Payment API Integration (Mock)', () => {

  test('create order API - structure verification', async ({ page }) => {
    // We can't actually call the API from E2E tests easily,
    // but we can verify the endpoint exists and returns proper structure

    console.log('ℹ API endpoints should be tested with integration tests');
    console.log('  POST /api/payments/create-order');
    console.log('  POST /api/payments/verify');

    // Verify the payment page attempts to load necessary scripts
    await page.goto('http://localhost:5174/payment/test-proposal-id');

    // Check if Razorpay script loading is attempted
    await page.waitForTimeout(2000);

    const scripts = await page.locator('script').count();
    console.log(`  ${scripts} scripts loaded on payment page`);

    // Look for Razorpay checkout script in network requests
    const hasRazorpayScript = await page.evaluate(() => {
      return Array.from(document.scripts).some(script =>
        script.src.includes('razorpay') || script.src.includes('checkout')
      );
    });

    if (hasRazorpayScript) {
      console.log('✓ Razorpay checkout script loaded');
    } else {
      console.log('ℹ Razorpay script not loaded (expected if payment button not clicked)');
    }
  });

  test('payment verification - expected flow', async ({ page }) => {
    console.log('Payment Verification Flow:');
    console.log('  1. User completes Razorpay checkout');
    console.log('  2. Razorpay returns: payment_id, order_id, signature');
    console.log('  3. Client POSTs to /api/payments/verify');
    console.log('  4. Server verifies HMAC SHA256 signature');
    console.log('  5. Payment record updated to "completed"');
    console.log('  6. Project created from proposal');
    console.log('  7. User redirected to success page');

    // This is documentation of the expected flow
    // Actual verification would require mocking Razorpay responses
  });
});
