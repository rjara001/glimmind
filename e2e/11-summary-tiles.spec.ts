import { expect, test } from './fixtures';
import {
  DECK_ROWS,
  DEFINITIONS_BY_TERM,
  createDeckFromPaste,
  currentCardTerm,
  loginAsGuest,
  openGame,
  switchGameModeToReal,
  visibleText,
} from './helpers';
import { CYCLE_LABELS } from '../src/utils/cycle-colors';
import type { Page } from '@playwright/test';

const DECK_SIZE = DECK_ROWS.length;
const LEARNED_TILE = '✅ APRENDIDAS';

async function submitAnswer(page: Page, answer: string): Promise<void> {
  await page.getByLabel('Tu respuesta').fill(answer);
  await page.getByRole('button', { name: 'Validar' }).click();
}

/**
 * P-5 of docs/plans/2026-10-20-cycle-presentation-clarity.md: one spec that
 * plays a session to completion and asserts the summary tiles, so the
 * label-to-bucket mapping is covered end to end and not only in unit tests.
 */
test('a finished session shows one tile per cycle state with values that reconcile', async ({
  page,
}) => {
  await loginAsGuest(page);
  await createDeckFromPaste(page, 'Mazo Resumen');
  await openGame(page);

  await expect(visibleText(page, 'Modo Práctica')).toBeVisible();
  await switchGameModeToReal(page);

  for (let i = 0; i < DECK_SIZE; i += 1) {
    if (i > 0) {
      await expect(visibleText(page, `Queue ${i + 1}/${DECK_SIZE}`)).toBeVisible();
    }
    const term = await currentCardTerm(page);
    await submitAnswer(page, DEFINITIONS_BY_TERM[term]);
    await expect(page.getByText('✓ Correcto')).toBeVisible();
  }

  await expect(page.getByText('¡Sesión Completada!')).toBeVisible();

  // Every card was answered correctly on cycle 1, so all of them are learned
  // and the other four buckets must be empty.
  const tiles = [
    { label: CYCLE_LABELS[1], value: '0' },
    { label: CYCLE_LABELS[2], value: '0' },
    { label: CYCLE_LABELS[3], value: '0' },
    { label: CYCLE_LABELS[4], value: '0' },
    { label: LEARNED_TILE, value: String(DECK_SIZE) },
  ];

  for (const tile of tiles) {
    const label = page.getByText(tile.label, { exact: true });
    await expect(label).toBeVisible();
    const value = label.locator('xpath=..').locator('div').first();
    await expect(value).toHaveText(tile.value);
  }

  // The retired "(nivel N)" wording must never come back to the summary.
  await expect(page.getByText(/nivel/i)).toHaveCount(0);
});
