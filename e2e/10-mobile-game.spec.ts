import { expect, test } from './fixtures';
import { createDeckFromPaste, loginAsGuest, openGame, visibleText } from './helpers';

test('mobile guest creates a deck and finishes a practice session', async ({ page }) => {
  await loginAsGuest(page);
  await createDeckFromPaste(page, 'Mazo Móvil');
  await openGame(page);

  await expect(visibleText(page, 'Queue 1/4')).toBeVisible();

  for (let i = 0; i < 4; i += 1) {
    await page.getByRole('button', { name: 'Correcta' }).click();
  }
  await expect(page.getByText('¡Sesión Completada!')).toBeVisible();

  // The desktop Navbar tabs are hidden below md; the logo Link to /dashboard
  // stays visible and performs SPA navigation, dodging the known double-push
  // history bug that traps page.goBack() on /game.
  await page.locator('a[href="/dashboard"]').click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: 'Mazo Móvil' })).toBeVisible();
  await expect(page.getByText('4 / 4').first()).toBeVisible();
});
