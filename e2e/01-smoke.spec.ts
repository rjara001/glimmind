import { expect, test } from './fixtures';

test('guest session reaches the dashboard from the landing page', async ({ page }) => {
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole('button', { name: 'Empezar gratis' }).first().click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByRole('button', { name: 'Continuar como invitado' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await expect(
    page.getByRole('button', { name: /Crear Lista Personalizada/ }),
  ).toBeVisible();
});
