import { callFunction } from './callFunction';
import { auth, isConfigured } from '../firebase';
import { GUEST_UID } from '../constants/app';
import { safeGetItem } from '../utils/localStorage';

export type EventType =
  | 'settings.modal_opened'
  | 'settings.save_initiated'
  | 'settings.save_success'
  | 'settings.save_error'
  | 'settings.modal_cancelled'
  | 'settings.tts_unavailable'
  | 'global.unhandled_error'
  | 'global.unhandled_rejection'
  | 'game.start'
  | 'game.complete'
  | 'sync.success'
  | 'sync.error'
  | 'auth.login'
  | 'auth.logout'
  | string;

export interface EventLabels {
  source?: string;
  action?: string;
  platform?: string;
  correlationId?: string;
  sessionId?: string;
  [key: string]: string | undefined;
}

interface EventPayload {
  message: string;
  stack?: string;
  ua: string;
  url: string;
  timestamp: number;
  eventType: EventType;
  correlationId?: string;
  sessionId?: string;
  extra?: Record<string, unknown>;
}

const reportedErrors = new WeakSet<object>();

// AGENTS.md §31: guests operate strictly offline; they must never invoke
// Cloud Functions. Client error reporting is therefore a no-op for them.
// Guests never authenticate with Firebase Auth, so `auth.currentUser` is null
// for them; the local session marker in localStorage is the reliable signal.
function isGuestSession(): boolean {
  if (auth.currentUser?.uid === GUEST_UID) return true;
  const savedGuest = safeGetItem('glimmind_guest_user');
  if (!savedGuest) return false;
  try {
    const guest = JSON.parse(savedGuest) as { uid?: string } | null;
    return guest?.uid === GUEST_UID;
  } catch {
    return false;
  }
}

let currentCorrelationId: string | null = null;
let currentSessionId: string | null = null;

export function startCorrelation(customCorrelationId?: string, sessionId?: string): string {
  currentCorrelationId = customCorrelationId || `corr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  if (sessionId) {
    currentSessionId = sessionId;
  } else if (!currentSessionId) {
    currentSessionId = `session-${Date.now()}`;
  }
  return currentCorrelationId;
}

export function getCorrelationId(): string | null {
  return currentCorrelationId;
}

export function getSessionId(): string | null {
  return currentSessionId;
}

export function clearCorrelation(): void {
  currentCorrelationId = null;
}

export async function logEvent(
  eventType: EventType,
  context: {
    message: string;
    error?: Error | unknown;
    labels?: EventLabels;
    extra?: Record<string, unknown>;
  }
): Promise<void> {
  // Demo builds (fake API key, incl. the E2E suite) must never touch the
  // reporting pipeline: no network, no console noise, no retry queue.
  if (!isConfigured) return;

  const errObject = context.error instanceof Error ? context.error : null;

  if (errObject && reportedErrors.has(errObject)) return;
  if (errObject) reportedErrors.add(errObject);

  if (isGuestSession()) {
    console.warn('[logEvent] Guest session: skipping remote error report', eventType);
    return;
  }

  const sanitizedExtra = sanitizePII(context.extra);

  const correlationId = currentCorrelationId ?? undefined;
  const sessionId = currentSessionId ?? undefined;

  const payload: EventPayload = {
    message: context.message,
    stack: errObject?.stack,
    ua: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR',
    url: typeof window !== 'undefined' ? window.location.href : '',
    timestamp: Date.now(),
    eventType,
    correlationId,
    sessionId,
    extra: sanitizedExtra,
  };

  const labels: EventLabels = {
    platform: typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    correlationId,
    sessionId,
    ...context.labels,
  };

  const severity = context.error ? 'ERROR' : 'INFO';

  try {
    await callFunction('logClientError', {
      severity,
      payload,
      labels,
    });
  } catch (reportingError) {
    console.warn('[logEvent] Failed to deliver trace to Cloud Logging:', reportingError);
    queueForRetry({ payload, labels, severity });
  }
}

function sanitizePII(extra?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!extra) return undefined;
  const sanitized = { ...extra };
  const piiKeys = ['password', 'token', 'authorization', 'email', 'phone', 'creditCard', 'ssn'];
  for (const key of Object.keys(sanitized)) {
    if (piiKeys.some((pii) => key.toLowerCase().includes(pii))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
}

export function installGlobalEventHandlers(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    if (event.filename?.includes('loggingRoutes')) return;

    const err = event.error || new Error(event.message);
    const flowContext = (err as any)?.__flowContext;

    logEvent('global.unhandled_error', {
      message: event.message,
      error: err,
      labels: {
        source: flowContext?.source || 'window.onerror',
        ...(flowContext?.labels || {}),
      },
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        ...(flowContext?.extra || {}),
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    const flowContext = (error as any)?.__flowContext;

    logEvent('global.unhandled_rejection', {
      message: String(event.reason),
      error,
      labels: {
        source: flowContext?.source || 'unhandledrejection',
        ...(flowContext?.labels || {}),
      },
      extra: flowContext?.extra,
    });
  });
}

export async function logSettingsError(
  error: Error | unknown,
  extra?: Record<string, unknown>
): Promise<void> {
  await logEvent('settings.save_error', {
    message: error instanceof Error ? error.message : String(error),
    error,
    labels: { source: 'settings-modal', action: 'save_error' },
    extra,
  });
}

function queueForRetry(data: { payload: EventPayload; labels: EventLabels; severity: string }): void {
  try {
    const queue = JSON.parse(localStorage.getItem('glimmind_event_queue') || '[]');
    queue.push(data);
    localStorage.setItem('glimmind_event_queue', JSON.stringify(queue.slice(-50)));
  } catch {}
}

export async function flushEventQueue(): Promise<void> {
  if (!isConfigured) return;
  if (isGuestSession()) return;
  try {
    const queue = JSON.parse(localStorage.getItem('glimmind_event_queue') || '[]');
    for (const item of queue) {
      await callFunction('logClientError', item);
    }
    localStorage.removeItem('glimmind_event_queue');
  } catch {}
}