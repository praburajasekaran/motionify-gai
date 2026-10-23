import { expect, test } from '@playwright/test';
import { setupAuthSession } from './helpers/auth';

test('Super Admin can find a client request and open it in Inquiries', async ({ page }) => {
  await setupAuthSession(page);
  await page.route('**/.netlify/functions/client-project-request', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: [{
        id: '2a6a45f3-e7cf-4a5a-93cf-49a8391a94a8',
        request_number: 'REQ-2026-001',
        title: 'Payment Activation Verification Test',
        description: 'Verify activation after the advance payment.',
        tentative_deadline: '2026-10-30',
        status: 'pending',
        client_name: 'Ekalaivan',
        client_email: 'ekalaivan+client@gmail.com',
        inquiry_id: null,
        inquiry_number: null,
        created_at: '2026-10-23T10:00:00Z',
      }] });
      return;
    }
    await route.fulfill({ json: { inquiryId: 'ea1a65ec-b41f-4f79-8a39-b983bdb65db3', inquiryNumber: 'INQ-2026-025' } });
  });

  await page.goto('/portal/admin/inquiries');
  await expect(page.getByRole('heading', { name: 'Client requests (1)' })).toBeVisible();
  await expect(page.getByText('REQ-2026-001')).toBeVisible();
  await expect(page.getByText('ekalaivan+client@gmail.com')).toBeVisible();
  await page.getByRole('button', { name: 'Move to Inquiries' }).click();
  await expect(page).toHaveURL(/\/portal\/admin\/inquiries\/ea1a65ec-b41f-4f79-8a39-b983bdb65db3$/);
});
