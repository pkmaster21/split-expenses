import { test, expect } from '@playwright/test';

test.describe('Happy path: create group → share → join → add expense → verify balances', () => {
  test('full flow', async ({ page, browser }) => {
    await page.goto('/');
    await expect(page.getByText('Tabby')).toBeVisible();

    await page.getByRole('link', { name: 'Create a group' }).click();
    await page.getByLabel('Group name').fill('E2E Test Trip');
    await page.getByLabel('Your name').fill('Alice');
    await page.getByRole('button', { name: 'Create group' }).click();

    await expect(page).toHaveURL(/\/groups\/.+/);

    const settingsLink = page.getByRole('link', { name: /settings/i });
    await settingsLink.click();

    const inviteInput = page.getByLabel('Invite link');
    const inviteUrl = await inviteInput.inputValue();
    expect(inviteUrl).toMatch(/\/g\//);

    const bobContext = await browser.newContext();
    const bobPage = await bobContext.newPage();
    await bobPage.goto(inviteUrl);

    await expect(bobPage.getByText('E2E Test Trip')).toBeVisible();
    await bobPage.getByLabel('Your name').fill('Bob');
    await bobPage.getByRole('button', { name: 'Join group' }).click();

    await expect(bobPage).toHaveURL(/\/groups\/.+/);

    await page.goto(page.url().replace('/settings', ''));
    await page.getByRole('button', { name: /add expense/i }).click();

    await page.getByLabel('Description').fill('Dinner');
    await page.getByLabel('Amount').fill('100');
    await page.getByRole('button', { name: 'Add expense' }).click();

    await expect(page.getByText('Dinner')).toBeVisible();

    await page.getByRole('button', { name: 'balances' }).click();
    await expect(page.getByText(/\$50/)).toBeVisible();

    await bobContext.close();
  });
});

test.describe('Offline behavior', () => {
  test('shows cached balances with indicator when offline, blocks add expense', async ({ page, context }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Create a group' }).click();
    await page.getByLabel('Group name').fill('Offline Test');
    await page.getByLabel('Your name').fill('Alice');
    await page.getByRole('button', { name: 'Create group' }).click();
    await expect(page).toHaveURL(/\/groups\/.+/);

    await context.setOffline(true);

    await expect(page.getByText(/offline/i)).toBeVisible({ timeout: 20000 });

    await expect(page.getByRole('button', { name: /add expense/i })).not.toBeVisible();
  });
});
