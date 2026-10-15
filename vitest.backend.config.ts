import { defineConfig } from 'vitest/config';

// Backend (Cloud Functions) tests. They are CommonJS with jest-style globals,
// so they need `globals: true` and a node environment.
//
// Run with:  npx vitest run -c vitest.backend.config.ts
//
// firestore.rules.test.js is excluded because it boots a Firestore emulator
// instance through @firebase/rules-unit-testing; run it separately with the
// emulators up.
export default defineConfig({
  test: {
    root: '.',
    globals: true,
    environment: 'node',
    include: ['backend/src/functions/tests/**/*.test.js'],
    exclude: ['backend/src/functions/tests/firestore.rules.test.js'],
    setupFiles: ['backend/src/functions/tests/setup.vitest.ts'],
  },
});
