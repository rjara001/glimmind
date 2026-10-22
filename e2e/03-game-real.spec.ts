import { expect, test } from './fixtures';
import {
  DEFINITIONS_BY_TERM,
  createDeckFromPaste,
  currentCardTerm,
  loginAsGuest,
  openGame,
  switchGameModeToReal,
  visibleText,
} from './helpers';
import type { Page } from '@playwright/test';

async function submitAnswer(page: Page, answer: string): Promise<void> {
  await page.getByLabel('Tu respuesta').fill(answer);
  await page.getByRole('button', { name: 'Validar' }).click();
}

test('real mode grades typed answers and finishes the session', async ({ page }) => {
  await loginAsGuest(page);
  await createDeckFromPaste(page, 'Mazo Real');
  await openGame(page);

  await expect(visibleText(page, 'Modo Práctica')).toBeVisible();
  await switchGameModeToReal(page);

  // First card: wrong answer is graded as incorrect
  await submitAnswer(page, 'zzz incorrecta');
  await expect(page.getByText('✗ Incorrecto')).toBeVisible();
  await expect(page.getByText(/Similitud:/)).toBeVisible();

  // Then the correct answer is accepted (auto-advances after 600 ms)
  const firstTerm = await currentCardTerm(page);
  await submitAnswer(page, DEFINITIONS_BY_TERM[firstTerm]);
  await expect(page.getByText('✓ Correcto')).toBeVisible();

  // Remaining three cards: wait for the queue to advance before answering so
  // the 600 ms auto-advance transition never races the next interaction.
  for (let i = 0; i < 3; i += 1) {
    await expect(visibleText(page, `Queue ${i + 2}/4`)).toBeVisible();
    const term = await currentCardTerm(page);
    await submitAnswer(page, DEFINITIONS_BY_TERM[term]);
    await expect(page.getByText('✓ Correcto')).toBeVisible();
  }

  await expect(page.getByText('¡Sesión Completada!')).toBeVisible();
  await expect(page.getByText(/Has aprendido 4 items/)).toBeVisible();

  // "Regresar al panel" must return to /dashboard even on the first play of a
  // session (U-03 double-push guard).
  await page.getByRole('button', { name: 'Regresar al panel' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText('4 / 4').first()).toBeVisible();
  await expect(page.getByText('logro 100%').first()).toBeVisible();
});
