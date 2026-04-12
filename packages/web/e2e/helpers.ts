import { Page, Browser, BrowserContext, expect } from '@playwright/test';

/**
 * Log in as a test user via the test-only auth bypass.
 */
export async function login(
  page: Page,
  opts: { name?: string; email?: string } = {},
): Promise<void> {
  const res = await page.request.post('/api/v1/auth/test-login', {
    data: {
      name: opts.name ?? 'Test User',
      email: opts.email,
    },
  });
  expect(res.ok()).toBe(true);
}

/**
 * Create a group and return the group URL path and invite URL.
 */
export async function createGroup(
  page: Page,
  opts: { groupName?: string; displayName?: string } = {},
): Promise<{ groupUrl: string; groupId: string }> {
  const groupName = `[E2E] ${opts.groupName ?? 'Test Group'}`;
  const displayName = opts.displayName ?? 'Alice';

  await page.goto('/create');
  await page.getByLabel('Group name').fill(groupName);
  await page.getByLabel('Your name').fill(displayName);
  await page.getByRole('button', { name: 'Create group' }).click();

  await page.waitForURL(/\/groups\/.+/, { timeout: 30000 });
  const groupUrl = page.url();
  const groupId = groupUrl.split('/groups/')[1].split('/')[0];

  return { groupUrl, groupId };
}

/**
 * Get the invite URL from the settings page.
 */
export async function getInviteUrl(page: Page, groupId: string): Promise<string> {
  await page.goto(`/groups/${groupId}/settings`);
  // Wait for the invite link input to appear with a non-empty value
  const inviteInput = page.getByLabel('Invite link');
  await expect(inviteInput).toBeVisible({ timeout: 15000 });
  await expect(inviteInput).not.toHaveValue('', { timeout: 10000 });
  return inviteInput.inputValue();
}

/**
 * Join a group as a guest in a new browser context (no login required).
 */
export async function joinGroup(
  browser: Browser,
  inviteUrl: string,
  displayName: string,
): Promise<{ page: Page; context: BrowserContext }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(inviteUrl);
  await page.getByLabel('Your name').waitFor();
  await page.getByLabel('Your name').fill(displayName);
  await page.getByRole('button', { name: 'Join group' }).click();
  await page.waitForURL(/\/groups\/.+/);
  return { page, context };
}

/**
 * Add an equal-split expense from the dashboard.
 */
export async function addExpense(
  page: Page,
  opts: { description: string; amount: string },
): Promise<void> {
  await page.getByRole('button', { name: /add expense/i }).click();
  await page.getByLabel('Description').fill(opts.description);
  await page.getByLabel('Amount ($)').fill(opts.amount);
  await page.getByRole('button', { name: 'Add expense', exact: true }).click();
  await page.getByText(opts.description).waitFor();
}

/**
 * Navigate to the balances tab.
 */
export async function goToBalances(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'balances' }).click();
  await page.getByText('Net balances').waitFor();
}
