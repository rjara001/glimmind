import { expect, test } from './fixtures';
import { createDeckFromPaste, loginAsGuest } from './helpers';

test('guest creates a deck by pasting text and sees it on the dashboard', async ({ page }) => {
  await loginAsGuest(page);
  await createDeckFromPaste(page, 'Mazo E2E');

  await expect(page.getByRole('heading', { name: 'Mazo E2E' })).toBeVisible();
  await expect(page.getByText('4 pairs')).toBeVisible();
  await expect(page.getByText('0 / 4').first()).toBeVisible();
  await expect(page.getByText('logro 0%').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Study', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
});
