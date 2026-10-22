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

  // "Regresar al panel" must return to /dashboard on mobile too (U-03
  // double-push guard); no Navbar workaround needed anymore.
  await page.getByRole('button', { name: 'Regresar al panel' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: 'Mazo Móvil' })).toBeVisible();
  await expect(page.getByText('4 / 4').first()).toBeVisible();
});
