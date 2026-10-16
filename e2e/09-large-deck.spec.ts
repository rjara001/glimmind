import { expect, test } from './fixtures';
import { createDeckFromRows, loginAsGuest, openGame, visibleText } from './helpers';

function buildRows(count: number): string[] {
  // Neutral words: Term/Definition/Context would match the CSV header
  // keywords and silently drop the first row.
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return `Alpha${n}, Bravo ${n}, Line alpha${n} appears here`;
  });
}

const ROW_COUNT = 55;

test('guest imports a large deck and plays it', async ({ page }) => {
  await loginAsGuest(page);
  await createDeckFromRows(page, 'Mazo Grande', buildRows(ROW_COUNT));

  await expect(page.getByRole('heading', { name: 'Mazo Grande' })).toBeVisible();
  await expect(page.getByText(`${ROW_COUNT} pairs`)).toBeVisible();
  await expect(page.getByText(`0 / ${ROW_COUNT}`).first()).toBeVisible();

  await openGame(page);
  await expect(visibleText(page, `Queue 1/${ROW_COUNT}`)).toBeVisible();

  await page.getByRole('button', { name: 'Correcta' }).click();
  await expect(visibleText(page, `Queue 2/${ROW_COUNT}`)).toBeVisible();
});
