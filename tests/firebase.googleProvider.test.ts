import { describe, it, expect } from 'vitest';
import { googleProvider } from '@/firebase';

describe('googleProvider configuration', () => {
  it('forces the account chooser instead of reusing the active browser session', () => {
    expect(googleProvider.getCustomParameters()).toMatchObject({
      prompt: 'select_account',
    });
  });

  it('does not use a prompt value that would bypass the chooser', () => {
    const params = googleProvider.getCustomParameters() as Record<string, unknown>;
    expect(params.prompt).not.toBe('none');
  });
});