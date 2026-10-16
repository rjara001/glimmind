import { expect, test } from './fixtures';
import { DECK_ROWS, loginAsGuest } from './helpers';

test('malformed paste shows an error state and the guest can recover', async ({ page }) => {
  await loginAsGuest(page);

  await page.getByRole('button', { name: /Crear Lista Personalizada/ }).click();
  await page.getByRole('button', { name: 'Nueva Lista' }).click();
  await expect(page).toHaveURL(/\/editor/);

  await page.locator('#list-name').fill('Mazo Recuperación');
  await page.getByRole('button', { name: /Importar/ }).click();
  await page.getByRole('button', { name: 'Pegar texto' }).click();

  // Delimiters only: every cell parses empty and gets filtered out.
  const textarea = page.getByPlaceholder(/Abandon,Abandonar/);
  await textarea.fill(',,\n,,');

  await expect(page.getByText('No se detectaron datos válidos')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Process Import' })).toBeDisabled();

  // Recovery: clear the bad paste and import a valid deck.
  await page.getByRole('button', { name: /Limpiar/ }).click();
  await textarea.fill(DECK_ROWS.join('\n'));

  await expect(page.getByText(/filas detectadas/)).toBeVisible();
  await page.getByRole('button', { name: 'Process Import' }).click();

  await expect(page.getByText(/Validar importación/)).toBeVisible();
  await page.getByRole('button', { name: /Agregar tarjetas/ }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: 'Mazo Recuperación' })).toBeVisible();
  await expect(page.getByText('4 pairs')).toBeVisible();
});
