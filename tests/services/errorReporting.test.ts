import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logEvent, flushEventQueue } from '@/services/errorReporting';
import { GUEST_UID } from '@/constants/app';

const { callFunctionMock, authMock } = vi.hoisted(() => ({
  callFunctionMock: vi.fn(),
  authMock: { currentUser: null as { uid: string } | null },
}));

vi.mock('@/services/callFunction', () => ({
  callFunction: callFunctionMock,
}));

vi.mock('@/firebase', () => ({
  auth: authMock,
}));

const QUEUE_KEY = 'glimmind_event_queue';

describe('errorReporting guest guard', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('skips callFunction and queueing for guests', async () => {
    authMock.currentUser = { uid: GUEST_UID };
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await logEvent('sync.error', { message: 'guest failure' });

    expect(callFunctionMock).not.toHaveBeenCalled();
    expect(localStorage.getItem(QUEUE_KEY)).toBeNull();
  });

  it('no-ops flushEventQueue for guests', async () => {
    authMock.currentUser = { uid: GUEST_UID };
    localStorage.setItem(QUEUE_KEY, JSON.stringify([{ payload: { message: 'stale' } }]));

    await flushEventQueue();

    expect(callFunctionMock).not.toHaveBeenCalled();
  });
});

describe('errorReporting authenticated user', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    authMock.currentUser = { uid: 'user-123' };
  });

  it('calls logClientError through callFunction', async () => {
    callFunctionMock.mockResolvedValue(undefined);

    await logEvent('import.bulk_create_error', {
      message: 'Failed to fetch',
      error: new TypeError('Failed to fetch'),
    });

    expect(callFunctionMock).toHaveBeenCalledTimes(1);
    expect(callFunctionMock.mock.calls[0][0]).toBe('logClientError');
    expect(callFunctionMock.mock.calls[0][1]).toMatchObject({
      severity: 'ERROR',
      payload: { message: 'Failed to fetch', eventType: 'import.bulk_create_error' },
    });
  });

  it('queues the event in localStorage when callFunction rejects (cap 50)', async () => {
    callFunctionMock.mockRejectedValue(new Error('network down'));

    await logEvent('sync.error', { message: 'boom', error: new Error('boom') });

    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ severity: 'ERROR' });
  });

  it('caps the retry queue at 50 events', async () => {
    callFunctionMock.mockRejectedValue(new Error('network down'));

    for (let i = 0; i < 55; i++) {
      // Fresh Error each call: the WeakSet dedup only applies per error object.
      await logEvent('sync.error', { message: `boom ${i}`, error: new Error(`e${i}`) });
    }

    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    expect(queue).toHaveLength(50);
  });

  it('flushEventQueue drains the queue and clears localStorage', async () => {
    localStorage.setItem(
      QUEUE_KEY,
      JSON.stringify([
        { payload: { message: 'one' }, labels: {}, severity: 'ERROR' },
        { payload: { message: 'two' }, labels: {}, severity: 'INFO' },
      ])
    );
    callFunctionMock.mockResolvedValue(undefined);

    await flushEventQueue();

    expect(callFunctionMock).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem(QUEUE_KEY)).toBeNull();
  });
});
