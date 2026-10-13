import { expect, test } from './fixtures';
import {
  createDeckFromPaste,
  loginAsGuest,
  openGame,
  visibleText,
} from './helpers';

test('reload restores the guest session and the last played game', async ({ page }) => {
  await loginAsGuest(page);
  await createDeckFromPaste(page, 'Mazo Reanudar');
  await openGame(page);

  await expect(visibleText(page, 'Queue 1/4')).toBeVisible();

  await page.reload();

  // The guest session is restored from localStorage (AuthContext) and the
  // bootstrap auto-navigates back to the last played deck.
  await expect(page).toHaveURL(/\/game/);
  await expect(visibleText(page, 'Queue 1/4')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mazo Reanudar' })).toBeVisible();
});
