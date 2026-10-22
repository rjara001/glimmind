import { expect, test } from './fixtures';
import {
  createDeckFromPaste,
  loginAsGuest,
  openGame,
  visibleText,
} from './helpers';

test('practice mode run, restart without archiving and back to the panel', async ({ page }) => {
  await loginAsGuest(page);
  await createDeckFromPaste(page, 'Mazo Práctica');
  await openGame(page);

  await expect(visibleText(page, 'Modo Práctica')).toBeVisible();
  await expect(visibleText(page, 'Queue 1/4')).toBeVisible();

  for (let i = 0; i < 4; i += 1) {
    await page.getByRole('button', { name: 'Correcta' }).click();
  }

  await expect(page.getByText('¡Sesión Completada!')).toBeVisible();
  await expect(page.getByText(/Has aprendido 4 items/)).toBeVisible();

  await page.getByRole('button', { name: /Reiniciar sin archivar/ }).click();
  await expect(visibleText(page, 'Queue 1/4')).toBeVisible();

  // "Regresar al panel" must return to /dashboard even on the first play of a
  // session (U-03 double-push guard).
  await page.getByRole('button', { name: 'Regresar al panel' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: 'Mazo Práctica' })).toBeVisible();
  await expect(page.getByText('4 pairs')).toBeVisible();
});
