import { expect, test } from './fixtures';
import { createDeckFromPaste, loginAsGuest } from './helpers';

test('guest edits a card definition and the change persists', async ({ page }) => {
  await loginAsGuest(page);
  await createDeckFromPaste(page, 'Mazo Edición');

  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page).toHaveURL(/\/editor/);

  await page.getByPlaceholder('Enter definition...').first().fill('Manzana modificada');
  await page.getByRole('button', { name: /Guardar mazo/ }).click();
  await expect(page.getByText('Lista guardada').first()).toBeVisible();

  await page.getByRole('button', { name: /Volver al dashboard/ }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page).toHaveURL(/\/editor/);
  await expect(page.locator('input[value="Manzana modificada"]')).toBeVisible();
});
