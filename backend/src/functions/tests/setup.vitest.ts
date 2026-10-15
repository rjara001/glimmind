import { vi } from 'vitest';

// backend/src/functions/tests/utils.test.js was written against jest globals.
// Vitest ships `vi`, not `jest`; alias it so the legacy test keeps running
// without rewriting its mocks.
(globalThis as unknown as Record<string, unknown>).jest = vi;
