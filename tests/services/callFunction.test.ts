import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callFunction } from '@/services/callFunction';
import { SYNC_CONFIG } from '@/constants/syncConfig';

vi.mock('@/firebase', () => ({
  auth: { currentUser: null },
  isUsingEmulators: false,
}));

// The Fetch spec caps keepalive request bodies at 64 KiB. Chrome rejects a
// larger body client-side with TypeError("Failed to fetch") before the
// request reaches the network — this is exactly what broke bulkCreateList
// imports of hundreds of cards in production (2026-10-16). callFunction must
// therefore only set keepalive for payloads under the shared safe limit.
describe('callFunction keepalive gating', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => '{"ok":true}',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function lastKeepalive(): unknown {
    const calls = fetchMock.mock.calls;
    const init = calls[calls.length - 1]?.[1] as RequestInit | undefined;
    return init?.keepalive;
  }

  it('keeps keepalive for payloads under the safe limit', async () => {
    await callFunction('getQuota', { userId: 'u1' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(lastKeepalive()).toBe(true);
  });

  it('disables keepalive when the UTF-8 body exceeds the safe limit', async () => {
    await callFunction('bulkCreateList', {
      associations: 'x'.repeat(SYNC_CONFIG.keepaliveSafeLimit + 1024),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(lastKeepalive()).toBe(false);
  });

  it('measures bytes, not UTF-16 code units, for accented Spanish text', async () => {
    // 'ñ' is one UTF-16 code unit but two UTF-8 bytes: a payload that fits
    // the limit by .length still exceeds it once encoded — the browser
    // enforces the encoded size, so keepalive must be off here.
    const chars = Math.ceil(SYNC_CONFIG.keepaliveSafeLimit / 2) + 1024;
    const data = { associations: 'ñ'.repeat(chars) };
    expect(JSON.stringify(data).length).toBeLessThan(SYNC_CONFIG.keepaliveSafeLimit);

    await callFunction('bulkCreateList', data);

    expect(lastKeepalive()).toBe(false);
  });

  it('propagates fieldErrors from a 400 validation response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({
          message: 'Invalid request body',
          details: { associations: ['Too big: expected array to have <=5000 items'] },
        }),
    });

    await expect(callFunction('bulkCreateList', {})).rejects.toMatchObject({
      message: 'Invalid request body',
      fieldErrors: { associations: ['Too big: expected array to have <=5000 items'] },
    });
  });
});
