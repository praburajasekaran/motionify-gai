import { Page } from '@playwright/test';

export type E2EUser = {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'support' | 'team_member' | 'client';
  avatar?: string;
  timezone?: string;
  projectTeamMemberships?: Record<string, unknown>;
};

export const E2E_SUPER_ADMIN: E2EUser = {
  id: 'e2e-super-admin-001',
  name: 'E2E Super Admin',
  email: 'admin@e2e.test',
  role: 'super_admin',
  avatar: '',
  timezone: 'Asia/Kolkata',
  projectTeamMemberships: {},
};

const API = '/.netlify/functions';

export async function setupApiFallback(page: Page) {
  for (const pattern of [`**${API}/**`, '**/api/**']) {
    await page.route(pattern, async (route) => {
      if (route.request().method() === 'GET') {
        if (new URL(route.request().url()).pathname.endsWith('/users-list')) {
          await route.fulfill({ json: { success: true, users: [] } });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
  }
}

export async function setupAuthSession(page: Page, user: E2EUser = E2E_SUPER_ADMIN) {
  await setupApiFallback(page);

  await page.route(`**${API}/auth-me*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, user }),
    });
  });

  await page.route(`**${API}/users-settings`, route => route.fulfill({ json: {
    account: { email: user.email, name: user.name, role: user.role, organizationName: 'Motionify', timezone: user.timezone || null },
  } }));

  await page.addInitScript((userData) => {
    window.localStorage.setItem('auth_user', JSON.stringify(userData));
    window.localStorage.setItem('auth_expires', new Date(Date.now() + 86400000).toISOString());
  }, user);
}
