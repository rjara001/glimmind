import { expect, test } from './fixtures';
import { createDeckFromPaste, loginAsGuest, openGame } from './helpers';

test('activity history records answers once enabled in settings', async ({ page }) => {
  await loginAsGuest(page);

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page).toHaveURL(/\/settings/);

  const historySwitch = page.getByRole('switch', { name: 'Registro de historial' });
  await expect(historySwitch).toHaveAttribute('aria-checked', 'false');
  await historySwitch.click();
  await expect(historySwitch).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await createDeckFromPaste(page, 'Mazo Historial');
  await openGame(page);

  for (let i = 0; i < 4; i += 1) {
    await page.getByRole('button', { name: 'Correcta' }).click();
  }
  await expect(page.getByText('¡Sesión Completada!')).toBeVisible();

  // recordActivity buffers events for ACTIVITY_SAVE_DEBOUNCE_MS before
  // writing to localStorage; SPA navigation does not flush via beforeunload.
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('glimmind_activity');
    if (!raw) return false;
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.some(
        (event) => (event as { type?: string }).type === 'card_answered',
      );
    } catch {
      return false;
    }
  });

  // Known bug (parked in docs/issues/P1): "Regresar al panel" navigates back to
  // /game on the first play of a session. Use the Navbar instead.
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole('button', { name: 'History', exact: true }).click();
  await expect(page).toHaveURL(/\/activity/);
  await expect(page.getByRole('heading', { name: 'Actividad', exact: true })).toBeVisible();
  await expect(page.getByText(/Correcta: /).first()).toBeVisible();
});
