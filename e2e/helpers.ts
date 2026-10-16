import { expect, type Page } from '@playwright/test';

export const DECK_ROWS = [
  'Apple,Manzana,I ate an apple for breakfast',
  'Banana,Plátano,The monkey peeled a banana',
  'Cherry,Cereza,She baked a cherry pie',
  'Grape,Uva,He made grape juice',
];

export const DEFINITIONS_BY_TERM: Record<string, string> = {
  Apple: 'Manzana',
  Banana: 'Plátano',
  Cherry: 'Cereza',
  Grape: 'Uva',
};

export async function loginAsGuest(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Empezar gratis' }).first().click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByRole('button', { name: 'Continuar como invitado' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Creates a deck from the first-run dashboard through the paste import flow. */
export async function createDeckFromRows(
  page: Page,
  deckName: string,
  rows: string[]
): Promise<void> {
  const createCustom = page.getByRole('button', { name: /Crear Lista Personalizada/ });
  await expect(createCustom).toBeVisible();
  await createCustom.click();

  await page.getByRole('button', { name: 'Nueva Lista' }).click();
  await expect(page).toHaveURL(/\/editor/);

  await page.locator('#list-name').fill(deckName);
  await page.getByRole('button', { name: /Importar/ }).click();
  await page.getByRole('button', { name: 'Pegar texto' }).click();
  await page.getByPlaceholder(/Abandon,Abandonar/).fill(rows.join('\n'));
  await expect(page.getByText(/filas detectadas/)).toBeVisible();
  await page.getByRole('button', { name: 'Process Import' }).click();

  await expect(page.getByText(/Validar importación/)).toBeVisible();
  await page.getByRole('button', { name: /Agregar tarjetas/ }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('button', { name: 'Study', exact: true })).toBeVisible();
}

export async function createDeckFromPaste(page: Page, deckName: string): Promise<void> {
  await createDeckFromRows(page, deckName, DECK_ROWS);
}

export async function openGame(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Study', exact: true }).click();
  await expect(page).toHaveURL(/\/game/);
}

export async function switchGameModeToReal(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Ajustes de partida' }).click();
  await page.getByRole('button', { name: 'Real', exact: true }).click();
  await page.getByRole('button', { name: 'Accept & Close' }).click();
  await expect(page.getByText('Modo Real').filter({ visible: true })).toBeVisible();
}

/** SessionBar renders twice (mobile + desktop); only one copy is visible. */
export function visibleText(page: Page, text: string) {
  return page.getByText(text).filter({ visible: true });
}

export async function currentCardTerm(page: Page): Promise<string> {
  const term = page.locator('h2').filter({ hasText: /^(Apple|Banana|Cherry|Grape)$/ });
  await expect(term).toBeVisible();
  return (await term.innerText()).trim();
}
