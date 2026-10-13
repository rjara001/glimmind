import { test as base, expect, type Page } from '@playwright/test';

/**
 * Shared E2E fixtures.
 *
 * Every spec gets:
 *  - `networkGuard`: aborts any request leaving the machine except the static
 *    CDNs the app needs to render (Tailwind CDN, Google Fonts). Guarantees the
 *    suite never spends money or depends on external availability.
 *  - `cleanStart`: boots the app once and clears localStorage / sessionStorage /
 *    IndexedDB so the spec begins from a from-scratch state. Specs that need
 *    persistence (e.g. resume after reload) keep it mid-test; Playwright also
 *    gives each spec a fresh BrowserContext.
 *  - `consoleGuard`: collects console errors and page errors, and fails the
 *    spec at teardown if any unexpected one appeared.
 */

const ALLOWED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
]);

const IGNORED_CONSOLE_PATTERNS = [
  /Failed to load resource/, // resource blocked by networkGuard or dead emulator port
  /net::ERR_/,
  // Guest E2E blocks Firestore on purpose; `useVoiceRecordings` queries it in
  // the background and the SDK logs this offline diagnostic after 10 s. It is
  // an SDK message, not an app error. See docs/issues/P2 (parked finding).
  /Could not reach Cloud Firestore backend/,
];

export function isAllowedRequestUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'data:' || parsed.protocol === 'blob:') return true;
    return ALLOWED_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

async function clearBrowserStorage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    const databases =
      typeof indexedDB.databases === 'function' ? await indexedDB.databases() : [];
    for (const database of databases) {
      if (database.name) {
        indexedDB.deleteDatabase(database.name);
      }
    }
  });
}

interface E2EFixtures {
  networkGuard: void;
  consoleGuard: void;
  cleanStart: void;
}

export const test = base.extend<E2EFixtures>({
  networkGuard: [
    async ({ page }, use) => {
      await page.route('**/*', (route) => {
        if (isAllowedRequestUrl(route.request().url())) {
          return route.continue();
        }
        return route.abort();
      });
      await use();
    },
    { auto: true },
  ],

  consoleGuard: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (IGNORED_CONSOLE_PATTERNS.some((pattern) => pattern.test(text))) return;
        errors.push(text);
      });
      page.on('pageerror', (error) => {
        errors.push(`Uncaught page error: ${error.message}`);
      });

      await use();

      expect(errors, `Unexpected console errors:\n${errors.join('\n')}`).toEqual([]);
    },
    { auto: true },
  ],

  cleanStart: [
    async ({ page, networkGuard, consoleGuard }, use) => {
      await page.goto('/');
      await clearBrowserStorage(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
