import { test, expect } from '@playwright/test';
import { createGroup, getInviteUrl, joinGroup, addExpense, goToBalances } from './helpers.js';

test.describe('Smoke test: walk through the app', () => {
  test('landing page → create group → invite → add expense → balances → settings', async ({
    page,
    browser,
  }) => {
    // Landing page loads
    await page.goto('/');
    await expect(page.getByText('Tabby')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create a group' })).toBeVisible();

    // Create a group
    const { groupId } = await createGroup(page, {
      groupName: 'Smoke Test Trip',
      displayName: 'Alice',
    });

    // Dashboard is visible with correct elements
    await expect(page.getByText('Group Dashboard')).toBeVisible();
    await expect(page.getByText('Alice')).toBeVisible();
    await expect(page.getByText('No expenses yet')).toBeVisible();
    await expect(page.getByRole('button', { name: /add expense/i })).toBeVisible();

    // Get invite link and have Bob join
    const inviteUrl = await getInviteUrl(page, groupId);
    expect(inviteUrl).toMatch(/\/g\//);

    const bob = await joinGroup(browser, inviteUrl, 'Bob');
    await expect(bob.page).toHaveURL(/\/groups\/.+/);

    // Add an expense as Alice
    await page.goto(`/groups/${groupId}`);
    await addExpense(page, { description: 'Dinner', amount: '100' });
    await expect(page.getByText('Dinner')).toBeVisible();

    // Check balances tab
    await goToBalances(page);
    await expect(page.getByText(/\$50/).first()).toBeVisible();
    await expect(page.getByText('Settlement plan')).toBeVisible();

    // Check settings page
    await page.goto(`/groups/${groupId}/settings`);
    await expect(page.getByLabel('Group name')).toBeVisible();
    await expect(page.getByText('Invite link').first()).toBeVisible();
    await expect(page.getByText('Alice')).toBeVisible();
    await expect(page.getByText('Bob')).toBeVisible();

    await bob.context.close();
  });

  test('offline indicator appears when disconnected', async ({ page, context }) => {
    await createGroup(page, { groupName: 'Offline Test', displayName: 'Alice' });

    await context.setOffline(true);

    await expect(
      page.getByText('Offline — showing cached data', { exact: false }),
    ).toBeVisible({ timeout: 20000 });

    await expect(page.getByRole('button', { name: /add expense/i })).not.toBeVisible();
  });

  test('invalid invite code shows not found', async ({ page }) => {
    await page.goto('/g/invalidcode123');
    await expect(page.getByText('Group not found')).toBeVisible();
  });
});
