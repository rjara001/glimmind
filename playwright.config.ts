import { defineConfig, devices } from '@playwright/test';

// Dedicated E2E port so the suite never reuses a developer dev server that was
// started with different env vars (.env.local would break determinism).
const PORT = 3002;
const BASE_URL = `http://localhost:${PORT}`;

// Dummy Firebase config forces `isDemo = true` in src/firebase.ts:
// - App Check is skipped (no reCAPTCHA network call)
// - emulator endpoints are wired but the guest path never calls them
// Behaviour is identical locally and in CI regardless of .env.local.
const DEMO_ENV = {
  VITE_FIREBASE_API_KEY: 'fake-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo-glimmind.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'demo-glimmind',
  VITE_FIREBASE_STORAGE_BUCKET: 'demo-glimmind.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  VITE_FIREBASE_APP_ID: '1:123456789:web:abcdef',
  VITE_USE_EMULATORS: 'false',
  VITE_ENABLE_WIDGET: 'false',
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      // Mobile smoke: the desktop Navbar is hidden below md, so this project
      // runs the landing flow plus the dedicated mobile spec only.
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
      testMatch: /(01-smoke|10-mobile-game)\.spec\.ts/,
    },
  ],
  webServer: {
    // Build the production bundle and serve it with `vite preview`, so the
    // suite gates what actually ships (minified bundle, env substitution)
    // instead of the dev server. DEMO_ENV below is inlined at build time.
    command: 'npm run build && npm run preview -- --port 3002 --strictPort',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: DEMO_ENV,
  },
});
