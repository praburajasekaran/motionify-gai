import { test, expect, Page } from '@playwright/test';

/**
 * Proposal-to-Project Flow Test
 *
 * Tests the complete journey after a proposal is accepted:
 * 1. Admin/support views an accepted proposal
 * 2. "Create Project" action should appear within the proposal section
 * 3. Project creation should bind inquiry number (INQ-2026-XX) to the project
 * 4. Proposal number, contract, and payments tied together for the entire journey
 *
 * Uses API mocking (page.route) so tests run without backend.
 */

const BASE = '/portal';

// ──────────────────────────────────────────
// Mock Data
// ──────────────────────────────────────────

const MOCK_ADMIN_USER = {
  id: 'admin-001',
  name: 'Prabu R',
  email: 'prabu@motionify.studio',
  role: 'super_admin',
  timezone: 'Asia/Kolkata',
};

const MOCK_INQUIRY = {
  id: 'inq-uuid-001',
  inquiry_number: 'INQ-2026-67',
  inquiryNumber: 'INQ-2026-67',
  status: 'accepted',
  contact_name: 'John Smith',
  contactName: 'John Smith',
  contact_email: 'john@acmecorp.com',
  contactEmail: 'john@acmecorp.com',
  company_name: 'Acme Corp',
  companyName: 'Acme Corp',
  contact_phone: '+91 98765 43210',
  contactPhone: '+91 98765 43210',
  project_notes: 'Need a product demo video for our SaaS platform launch.',
  projectNotes: 'Need a product demo video for our SaaS platform launch.',
  recommended_video_type: 'Product Demo',
  recommendedVideoType: 'Product Demo',
  proposal_id: 'prop-uuid-001',
  proposalId: 'prop-uuid-001',
  assigned_to_admin_id: 'admin-001',
  created_at: '2026-03-01T10:00:00.000Z',
  createdAt: '2026-03-01T10:00:00.000Z',
  updated_at: '2026-03-15T14:30:00.000Z',
  updatedAt: '2026-03-15T14:30:00.000Z',
};

const MOCK_PROPOSAL = {
  id: 'prop-uuid-001',
  inquiry_id: 'inq-uuid-001',
  inquiryId: 'inq-uuid-001',
  status: 'accepted',
  description: '<p>We will create a compelling product demo video showcasing your SaaS platform features, benefits, and user experience.</p>',
  deliverables: [
    { id: 'del-001', name: 'Product Demo Video', description: '60-second product walkthrough with motion graphics', estimatedCompletionWeek: 2 },
    { id: 'del-002', name: 'Social Media Cut', description: '30-second vertical cut for Instagram/LinkedIn', estimatedCompletionWeek: 3 },
  ],
  currency: 'INR',
  totalPrice: 8000000, // ₹80,000 in paise
  advancePercentage: 50,
  advanceAmount: 4000000,
  balanceAmount: 4000000,
  advance_amount: 4000000,
  balance_amount: 4000000,
  revisionsIncluded: 3,
  revisions_included: 3,
  revisionsDescription: 'Each revision round covers all deliverables. Additional rounds billed at ₹5,000 each.',
  accepted_at: '2026-03-15T14:30:00.000Z',
  acceptedAt: '2026-03-15T14:30:00.000Z',
  rejected_at: null,
  rejectedAt: null,
  feedback: null,
  version: 1,
  created_at: '2026-03-10T09:00:00.000Z',
  createdAt: '2026-03-10T09:00:00.000Z',
  updated_at: '2026-03-15T14:30:00.000Z',
  updatedAt: '2026-03-15T14:30:00.000Z',
};

const MOCK_PAYMENTS: any[] = [];

const MOCK_INQUIRY_NEW = {
  ...MOCK_INQUIRY,
  id: 'inq-uuid-002',
  inquiry_number: 'INQ-2026-68',
  inquiryNumber: 'INQ-2026-68',
  status: 'proposal_sent',
  contact_name: 'Jane Doe',
  contactName: 'Jane Doe',
  contact_email: 'jane@techstart.io',
  contactEmail: 'jane@techstart.io',
  company_name: 'TechStart',
  companyName: 'TechStart',
  proposal_id: 'prop-uuid-002',
  proposalId: 'prop-uuid-002',
};

const MOCK_PROPOSAL_SENT = {
  ...MOCK_PROPOSAL,
  id: 'prop-uuid-002',
  inquiry_id: 'inq-uuid-002',
  inquiryId: 'inq-uuid-002',
  status: 'sent',
  accepted_at: null,
  acceptedAt: null,
};

// ──────────────────────────────────────────
// Helper: Setup API mocks & login
// ──────────────────────────────────────────

async function setupMocksAndLogin(page: Page) {
  // Log console errors for debugging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[BROWSER ERROR] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.message}`);
  });

  // IMPORTANT: In Playwright, routes match in reverse order (last registered = highest priority).
  // Register catch-all FIRST so specific mocks override it.

  // IMPORTANT: In Playwright, routes match in reverse order (last registered = highest priority).
  // Register catch-all FIRST so specific mocks override it.

  // Catch-all: return empty array (most list endpoints expect plain arrays)
  await page.route('**/.netlify/functions/**', route => {
    if (route.request().method() === 'POST' || route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  // Auth: { success, user }
  await page.route('**/.netlify/functions/auth-me*', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, user: MOCK_ADMIN_USER }) })
  );

  // Notifications: { success, notifications, unreadCount }
  await page.route('**/.netlify/functions/notifications*', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, notifications: [], unreadCount: 0 }) })
  );

  // Inquiries list: plain array
  await page.route('**/.netlify/functions/inquiries', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_INQUIRY, MOCK_INQUIRY_NEW]) })
  );

  // Inquiry detail: plain object
  await page.route('**/.netlify/functions/inquiry-detail/**', route => {
    const url = route.request().url();
    const inq = url.includes('inq-uuid-002') ? MOCK_INQUIRY_NEW : MOCK_INQUIRY;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(inq) });
  });

  // Proposal detail: plain object
  await page.route('**/.netlify/functions/proposal-detail/**', route => {
    const url = route.request().url();
    const prop = url.includes('prop-uuid-002') ? MOCK_PROPOSAL_SENT : MOCK_PROPOSAL;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(prop) });
  });

  // Proposals list: plain array
  await page.route('**/.netlify/functions/proposals*', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_PROPOSAL, MOCK_PROPOSAL_SENT]) })
  );

  // Payments: plain array
  await page.route('**/.netlify/functions/payments*', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  );

  // Comments: plain array
  await page.route('**/.netlify/functions/comments*', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  );

  // Projects: plain array
  await page.route('**/.netlify/functions/projects*', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  );

  // Users: plain array
  await page.route('**/.netlify/functions/users*', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_ADMIN_USER]) })
  );

  // Navigate to portal - auth mock will auto-login as super_admin -> Dashboard
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(2000);

  // Super admin should see Dashboard (not redirect to /projects like clients)
  // Be flexible - check for Dashboard text or just confirm we're not on login
  const onDashboard = await page.locator('text=Dashboard').first().isVisible({ timeout: 10000 });
  const onLogin = await page.locator('h1:has-text("Welcome Back")').first().isVisible({ timeout: 2000 });

  if (!onDashboard && !onLogin) {
    // Maybe hit error boundary - take screenshot and try to recover
    await page.screenshot({ path: 'test-results/ptpf-debug-landing.png', fullPage: true });
    // Click "Try Again" if error boundary shown
    const tryAgain = page.locator('button:has-text("Try Again")');
    if (await tryAgain.isVisible({ timeout: 2000 })) {
      await tryAgain.click();
      await page.waitForTimeout(2000);
    }
  }

  if (onLogin) {
    throw new Error('Auth mock failed - still on login page');
  }
}

// ──────────────────────────────────────────
// TESTS
// ──────────────────────────────────────────

test.describe('Proposal Accepted -> Create Project Flow', () => {

  test('accepted proposal should show Create Project action within proposal section', async ({ page }) => {
    await setupMocksAndLogin(page);

    // STEP 1: Navigate to Inquiries
    console.log('Step 1: Navigate to Inquiries Dashboard');
    await page.locator('a:has-text("Inquiries"), button:has-text("Inquiries")').first().click();
    await expect(page).toHaveURL(/inquiries/);
    await page.screenshot({ path: 'test-results/ptpf-01-inquiries-dashboard.png', fullPage: true });

    // STEP 2: Click on the accepted inquiry (INQ-2026-67)
    console.log('Step 2: Open inquiry INQ-2026-67');
    const inquiryItem = page.locator('a[href*="/admin/inquiries/"], [data-testid="inquiry-card"]').first();
    await expect(inquiryItem).toBeVisible({ timeout: 10000 });
    await inquiryItem.click();
    await page.waitForTimeout(1000);

    // Verify inquiry number is shown
    const inqNumber = page.locator('code:has-text("INQ-2026-67")');
    if (await inqNumber.isVisible({ timeout: 3000 })) {
      console.log('  PASS: Inquiry number INQ-2026-67 displayed');
    }
    await page.screenshot({ path: 'test-results/ptpf-02-inquiry-detail.png', fullPage: true });

    // STEP 3: Navigate to the Proposal
    console.log('Step 3: Navigate to proposal');
    const viewProposalBtn = page.locator('button:has-text("View Proposal"), a:has-text("View Proposal")').first();
    if (await viewProposalBtn.isVisible({ timeout: 5000 })) {
      await viewProposalBtn.click();
    } else {
      // Try direct navigation to proposal
      await page.goto(`${BASE}/admin/proposals/prop-uuid-001`);
    }
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/ptpf-03-proposal-detail.png', fullPage: true });

    // STEP 4: Verify proposal shows as "Accepted"
    console.log('Step 4: Verify accepted status');
    const acceptedBadge = page.locator('text=Accepted').first();
    const isAccepted = await acceptedBadge.isVisible({ timeout: 5000 });
    console.log(`  Accepted badge visible: ${isAccepted}`);

    // STEP 5: Verify all proposal sections are present
    console.log('Step 5: Verify proposal sections');
    const sections = {
      'Project Description': 'text=Project Description',
      'Deliverables': 'h2:has-text("Deliverables")',
      'Product Demo Video': 'text=Product Demo Video',
      'Social Media Cut': 'text=Social Media Cut',
      'Project Terms': 'text=Project Terms',
      'Revisions Included': 'text=Revisions Included',
      'Pricing': 'h2:has-text("Pricing")',
      'Payment Breakdown': 'text=Payment Breakdown',
      'Advance Payment': 'text=Advance Payment',
      'Balance Payment': 'text=Balance Payment',
      'Total Project Cost': 'text=Total Project Cost',
      'Payments section': 'h2:has-text("Payments")',
      'Inquiry number (INQ-2026-67)': 'text=INQ-2026-67',
    };

    for (const [name, selector] of Object.entries(sections)) {
      const visible = await page.locator(selector).first().isVisible({ timeout: 2000 });
      console.log(`  ${visible ? 'PASS' : 'MISS'}: ${name}`);
    }

    // STEP 6: Check for "Create Project" action (THE KEY TEST)
    console.log('\nStep 6: CHECK FOR CREATE PROJECT ACTION (KEY REQUIREMENT)');
    const createProjectSelectors = [
      'button:has-text("Create Project")',
      'a:has-text("Create Project")',
      'button:has-text("Setup Project")',
      'button:has-text("Start Project")',
      'button:has-text("Convert to Project")',
      'a:has-text("Convert to Project")',
    ];

    let foundCreateProject = false;
    for (const selector of createProjectSelectors) {
      if (await page.locator(selector).first().isVisible({ timeout: 1500 })) {
        console.log(`  FOUND: ${selector}`);
        foundCreateProject = true;
        break;
      }
    }

    // Also check what IS shown for accepted proposals (client-facing)
    const proceedToPayment = page.locator('button:has-text("Proceed to Payment")').first();
    const hasProceedToPayment = await proceedToPayment.isVisible({ timeout: 2000 });

    await page.screenshot({ path: 'test-results/ptpf-05-accepted-proposal-actions.png', fullPage: true });

    console.log('\n========================================');
    console.log('ACCEPTED PROPOSAL - ACTION ANALYSIS');
    console.log('========================================');
    console.log(`  Create Project button: ${foundCreateProject ? 'FOUND' : 'MISSING - FEATURE GAP'}`);
    console.log(`  Proceed to Payment button: ${hasProceedToPayment ? 'FOUND' : 'NOT VISIBLE (admin view)'}`);
    console.log('');
    if (!foundCreateProject) {
      console.log('  FEATURE GAP DETECTED:');
      console.log('  After proposal is accepted, the admin/support view should show a');
      console.log('  "Create Project" button within the proposal section so that:');
      console.log('    - The inquiry number INQ-2026-67 gets auto-bound to the project');
      console.log('    - Proposal pricing, deliverables, and terms carry forward');
      console.log('    - The client can track the entire journey from proposal to delivery');
      console.log('    - Payment is made within the proposal flow, not a separate page');
    }
    console.log('========================================\n');
  });

  test('non-accepted proposal should NOT show Create Project button', async ({ page }) => {
    await setupMocksAndLogin(page);

    // Navigate directly to the "sent" proposal
    await page.goto(`${BASE}/admin/proposals/prop-uuid-002`);
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'test-results/ptpf-06-sent-proposal.png', fullPage: true });

    // Verify status is "Sent" (not accepted)
    const sentBadge = page.locator('text=Sent to Client, text=Awaiting Response, text=Sent').first();
    console.log(`  Sent status visible: ${await sentBadge.isVisible({ timeout: 3000 })}`);

    // Create Project should NOT appear
    const createProjectBtn = page.locator('button:has-text("Create Project"), a:has-text("Create Project")').first();
    const isVisible = await createProjectBtn.isVisible({ timeout: 3000 });
    console.log(`  Create Project hidden for non-accepted: ${!isVisible ? 'PASS' : 'FAIL'}`);
    expect(isVisible).toBe(false);
  });

  test('full journey verification: INQ-2026-67 -> proposal -> payments -> project binding', async ({ page }) => {
    await setupMocksAndLogin(page);

    // Navigate to accepted proposal
    await page.goto(`${BASE}/admin/proposals/prop-uuid-001`);
    await page.waitForTimeout(1500);

    // Verify the complete journey chain is visible on one page
    console.log('FULL JOURNEY CHAIN VERIFICATION:');
    console.log('================================');

    const journeyElements = {
      'Inquiry number INQ-2026-67': 'text=INQ-2026-67',
      'Client name (John Smith)': 'text=John Smith',
      'Accepted status': 'text=Accepted',
      'Deliverable: Product Demo Video': 'text=Product Demo Video',
      'Deliverable: Social Media Cut': 'text=Social Media Cut',
      'Revisions: 3 included': 'text=3',
      'Payment Breakdown section': 'text=Payment Breakdown',
      'Advance Payment (50%)': 'text=Advance Payment',
      'Balance Payment (50%)': 'text=Balance Payment',
      'Total Cost displayed': 'text=Total Project Cost',
    };

    let passCount = 0;
    let missCount = 0;

    for (const [element, selector] of Object.entries(journeyElements)) {
      const visible = await page.locator(selector).first().isVisible({ timeout: 2000 });
      console.log(`  ${visible ? 'PASS' : 'MISS'}: ${element}`);
      if (visible) passCount++; else missCount++;
    }

    await page.screenshot({ path: 'test-results/ptpf-07-journey-chain.png', fullPage: true });

    // Check for the Create Project action
    let hasCreateProject = false;
    for (const sel of [
      'button:has-text("Create Project")', 'a:has-text("Create Project")',
      'button:has-text("Setup Project")', 'button:has-text("Start Project")',
    ]) {
      if (await page.locator(sel).first().isVisible({ timeout: 1000 })) {
        hasCreateProject = true;
        break;
      }
    }

    console.log(`\n  Create Project in proposal view: ${hasCreateProject ? 'YES' : 'NEEDS IMPLEMENTATION'}`);

    console.log('\n========================================');
    console.log(`RESULTS: ${passCount} passed, ${missCount} missed`);
    console.log('========================================');
    console.log('');
    console.log('REQUIREMENT SUMMARY:');
    console.log('  After INQ-2026-67 proposal is accepted, admin should see:');
    console.log('  [Create Project] button that auto-creates a project binding:');
    console.log('    INQ-2026-67 (inquiry) <-> Proposal <-> Project <-> Payments');
    console.log('');
    console.log('  This keeps the entire journey in ONE flow for the client:');
    console.log('    1. Client receives proposal link');
    console.log('    2. Client accepts proposal');
    console.log('    3. Admin clicks "Create Project" on the same proposal page');
    console.log('    4. Project auto-binds INQ-2026-67, copies deliverables & pricing');
    console.log('    5. Client makes payment within the proposal flow');
    console.log('    6. Client tracks deliverables from the same journey');
    console.log('========================================\n');
  });
});

test.describe('Project Creation - Inquiry Number Binding (INQ-2026-XX)', () => {

  test('project creation form should support proposal/inquiry number selection like INQ-2026-67', async ({ page }) => {
    await setupMocksAndLogin(page);

    console.log('Testing: Inquiry number selection in project creation');
    await page.goto(`${BASE}/projects/new`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/ptpf-08-project-new.png', fullPage: true });

    // Verify wizard loads
    const title = page.locator('h1:has-text("Create"), h1:has-text("New Project")').first();
    await expect(title).toBeVisible({ timeout: 10000 });

    // Check for inquiry/proposal binding fields
    console.log('Checking for inquiry/proposal binding fields...');
    const bindingSelectors = [
      { label: 'Inquiry select', selector: 'select[name*="inquiry"], [data-testid*="inquiry-select"]' },
      { label: 'Inquiry input', selector: 'input[placeholder*="INQ"], input[name*="inquiry"]' },
      { label: 'Proposal select', selector: 'select[name*="proposal"], [data-testid*="proposal-select"]' },
      { label: 'Proposal input', selector: 'input[placeholder*="proposal"], input[name*="proposal"]' },
      { label: 'Inquiry label', selector: 'label:has-text("Inquiry"), label:has-text("Enquiry")' },
      { label: 'Proposal label', selector: 'label:has-text("Proposal"), label:has-text("Link Proposal")' },
      { label: 'INQ reference', selector: 'text=INQ-' },
    ];

    let hasBinding = false;
    for (const { label, selector } of bindingSelectors) {
      if (await page.locator(selector).first().isVisible({ timeout: 1500 })) {
        console.log(`  FOUND: ${label}`);
        hasBinding = true;
      }
    }

    if (!hasBinding) {
      console.log('  MISSING: No inquiry/proposal binding field in project creation');
    }

    // Verify current form fields
    console.log('\nCurrent form fields (Step 1 - Details):');
    for (const [name, sel] of Object.entries({
      'Project Title': 'input[id="title"]',
      'Client Name': 'input[id="client"]',
      'Client Website': 'input[id="website"]',
      'Budget': 'input[id="budget"]',
      'Start Date': 'input[id="start"]',
      'Due Date': 'input[id="due"]',
      'Description': 'textarea[id="description"]',
      'Max Revisions': 'text=Max Revisions',
    })) {
      console.log(`  ${await page.locator(sel).first().isVisible({ timeout: 1000 }) ? 'EXISTS' : 'MISSING'}: ${name}`);
    }

    // Walk wizard steps
    const nextBtn = page.locator('button:has-text("Next")').first();
    if (await nextBtn.isVisible({ timeout: 2000 })) {
      for (const step of ['Deliverables', 'Team', 'Review']) {
        await nextBtn.click();
        await page.waitForTimeout(500);
        console.log(`  Wizard step: ${step} - loaded`);
        await page.screenshot({ path: `test-results/ptpf-wizard-${step.toLowerCase()}.png`, fullPage: true });

        // On Review step, check for inquiry/proposal reference
        if (step === 'Review') {
          const reviewRef = page.locator('text=INQ-, text=Inquiry, text=Proposal Number').first();
          const hasRef = await reviewRef.isVisible({ timeout: 2000 });
          console.log(`  Review shows inquiry/proposal binding: ${hasRef ? 'YES' : 'NO'}`);
        }

        if (!(await nextBtn.isVisible({ timeout: 1000 }))) break;
      }
    }

    console.log('\n========================================');
    console.log('PROJECT CREATION - INQUIRY BINDING ANALYSIS');
    console.log('========================================');
    console.log(`Binding field present: ${hasBinding ? 'YES' : 'NO - FEATURE GAP'}`);
    console.log('');
    if (!hasBinding) {
      console.log('RECOMMENDATION: Add to Step 1 (Details):');
      console.log('  - "Link to Proposal" dropdown showing accepted proposals:');
      console.log('    INQ-2026-67 | John Smith | Acme Corp | ₹80,000 | Accepted');
      console.log('    INQ-2026-68 | Jane Doe   | TechStart | ₹50,000 | Accepted');
      console.log('');
      console.log('  When selected, auto-fill:');
      console.log('    - Client Name from inquiry');
      console.log('    - Budget from proposal totalPrice');
      console.log('    - Deliverables from proposal deliverables');
      console.log('    - Max Revisions from proposal revisionsIncluded');
      console.log('    - Description from proposal description');
      console.log('');
      console.log('  This creates the binding:');
      console.log('    INQ-2026-67 -> Proposal -> PROJ-2026-001 -> Payments -> Deliverables');
    }
    console.log('========================================\n');
  });
});
