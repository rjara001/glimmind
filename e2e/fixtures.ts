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
  // Guest E2E blocks Firestore on purpose; the SDK can still log this offline
  // diagnostic (it was first seen via the removed `useVoiceRecordings` hook).
  // It is an SDK message, not an app error. See docs/issues/P2 (parked finding).
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
      const backendCalls: string[] = [];
      await page.route('**/*', (route) => {
        const url = route.request().url();
        // Guests must never invoke Cloud Functions (section 31) and the E2E
        // build reports no errors (demo no-op). Any same-origin call to the
        // /api/* rewrite or the /functions/* emulator proxy is a bug;
        // external hosts with /api/ in the path (e.g. ui-avatars) are still
        // filtered by the allowlist below.
        if (isAllowedRequestUrl(url) && /^\/(api|functions)\//.test(new URL(url).pathname)) {
          backendCalls.push(url);
          return route.abort();
        }
        if (isAllowedRequestUrl(url)) {
          return route.continue();
        }
        return route.abort();
      });
      await use();
      expect(
        backendCalls,
        `Guest E2E attempted backend calls (Cloud Functions must stay off):\n${backendCalls.join('\n')}`
      ).toEqual([]);
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
