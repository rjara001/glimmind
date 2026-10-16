import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface HostingRewrite {
  source: string;
  function?: string;
  destination?: string;
}

interface FirebaseConfig {
  hosting?: {
    rewrites?: HostingRewrite[];
  };
}

// Regression lock: /api/logClientError had no rewrite, so the request fell
// through to the SPA catch-all and every client error report was lost
// (P0, 2026-10-11 / incident 2026-10-16).
describe('firebase.json rewrites', () => {
  const config: FirebaseConfig = JSON.parse(
    readFileSync(resolve(__dirname, '../../firebase.json'), 'utf8')
  );
  const rewrites = config.hosting?.rewrites ?? [];

  it('routes /api/logClientError to the logClientError function', () => {
    const rewrite = rewrites.find((r) => r.source === '/api/logClientError');
    expect(rewrite).toBeDefined();
    expect(rewrite?.function).toBe('logClientError');
  });

  it('keeps the SPA catch-all as the last rewrite', () => {
    const last = rewrites[rewrites.length - 1];
    expect(last?.source).toBe('**');
    expect(last?.destination).toBe('/index.html');
  });
});
