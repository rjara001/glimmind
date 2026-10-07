# Google Cloud Logging Instrumentation Plan

## Goal
Capture `ReferenceError: QuotaExceededError is not defined` (and all client errors) with full stack traces, user context, and device info on mobile production.

---

## Architecture

```
┌─────────────────────┐     HTTPS Callable      ┌─────────────────────┐
│   React Client      │ ──────────────────────► │  Cloud Function     │
│  (mobile browser)   │   logClientError        │  (Node.js 20)       │
└─────────────────────┘                         └─────────────────────┘
                                                     │
                                                     ▼
                                            ┌─────────────────────┐
                                            │  Cloud Logging      │
                                            │  (Log Explorer)     │
                                            └─────────────────────┘
```

---

## Implementation Steps

### 1. Backend: Simplified Logging Route (No External SDK)

**File:** `backend/src/functions/package.json`
```json
// No new dependencies needed - uses console.error structured logging
// Cloud Functions v2 automatically sends JSON console.error to Cloud Logging
```

**File:** `backend/src/functions/src/utils/helpers.js` - Add helper
```javascript
// Add to existing helpers.js
function getOptionalAuthUid(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;
  
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.uid || null;
  } catch {
    return null;
  }
}

module.exports = { ..., getOptionalAuthUid };
```

**File:** `backend/src/functions/src/routes/loggingRoutes.js` (NEW)
```javascript
const { onRequest } = require("firebase-functions/v2/https");
const { getOptionalAuthUid } = require("../utils/helpers");
const { z } = require("zod");

const LogClientErrorSchema = z.object({
  severity: z.enum(['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']).optional(),
  payload: z.object({
    message: z.string(),
    stack: z.string().optional(),
    ua: z.string().optional(),
    url: z.string().optional(),
    timestamp: z.number().optional(),
    flow: z.string().optional(),
    extra: z.record(z.unknown()).optional()
  }),
  labels: z.record(z.string()).optional()
});

exports.logClientError = onRequest({ cors: true }, async (req, res) => {
  // Extract UID if token exists, but don't block if anonymous/expired
  const uid = await getOptionalAuthUid(req) || 'anonymous';

  const result = LogClientErrorSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Invalid request", details: result.error.flatten() });
  }

  const { severity = 'ERROR', payload, labels } = result.data;
  
  // Cloud Functions v2: JSON console.error auto-parsed by Cloud Logging
  console.error(JSON.stringify({
    severity,
    message: `[Client Error] ${payload.message}`,
    serviceContext: { service: 'glimmind-web' },
    clientPayload: { ...payload, uid, timestamp: payload.timestamp || Date.now() },
    labels: { ...labels, uid }
  }));

  res.json({ success: true });
});
```

**File:** `backend/src/functions/index.js` - Register route
```javascript
const loggingRoutes = require("./src/routes/loggingRoutes");
loadRoutes(loggingRoutes); // add to loadRoutes calls
```

---

### 2. Frontend: Error Capture & Reporting (Deduplicated)

**File:** `src/services/errorReporting.ts` (NEW)
```typescript
import { callFunction } from './callFunction';

interface ErrorReportPayload {
  message: string;
  stack?: string;
  ua: string;
  url: string;
  timestamp: number;
  flow?: string;
  extra?: Record<string, unknown>;
}

interface ErrorReportLabels {
  flow?: string;
  [key: string]: string;
}

// Track reported errors to avoid duplicates
const reportedErrors = new WeakSet<Error>();

export async function reportError(
  error: Error | unknown,
  context: { flow?: string; labels?: ErrorReportLabels; extra?: Record<string, unknown> } = {}
): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error));
  
  // Deduplication: skip if already reported this error instance
  if (reportedErrors.has(err)) return;
  reportedErrors.add(err);

  // Sanitize PII from extra
  const sanitizedExtra = sanitizePII(context.extra);

  const payload: ErrorReportPayload = {
    message: err.message,
    stack: err.stack,
    ua: navigator.userAgent,
    url: window.location.href,
    timestamp: Date.now(),
    flow: context.flow,
    extra: sanitizedExtra
  };

  const labels: ErrorReportLabels = {
    platform: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    ...context.labels
  };

  try {
    await callFunction('logClientError', {
      severity: 'ERROR',
      payload,
      labels
    });
  } catch (reportingError) {
    console.error('[reportError] Failed to send to Cloud Logging:', reportingError);
    queueForRetry({ payload, labels });
  }
}

function sanitizePII(extra?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!extra) return undefined;
  const sanitized = { ...extra };
  const piiKeys = ['password', 'token', 'authorization', 'email', 'phone', 'creditCard', 'ssn'];
  for (const key of Object.keys(sanitized)) {
    if (piiKeys.some(pii => key.toLowerCase().includes(pii))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
}

// Global error handler - captures ALL unhandled errors
export function installGlobalErrorHandler(): void {
  window.addEventListener('error', (event) => {
    // Avoid loop if error comes from our own logging call
    if (event.filename?.includes('loggingRoutes')) return;

    reportError(event.error || new Error(event.message), {
      flow: 'global-error-handler',
      labels: { source: 'window.onerror' },
      extra: { filename: event.filename, lineno: event.lineno, colno: event.colno }
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    reportError(error, {
      flow: 'unhandled-rejection',
      labels: { source: 'unhandledrejection' }
    });
  });
}

// Settings flow specific wrapper
export async function reportSettingsError(error: Error | unknown, extra?: Record<string, unknown>): Promise<void> {
  await reportError(error, {
    flow: 'settings-accept-close',
    labels: { source: 'settings-modal' },
    extra
  });
}

// Retry queue (simple localStorage)
function queueForRetry(data: { payload: ErrorReportPayload; labels: ErrorReportLabels }): void {
  try {
    const queue = JSON.parse(localStorage.getItem('glimmind_error_queue') || '[]');
    queue.push(data);
    localStorage.setItem('glimmind_error_queue', JSON.stringify(queue.slice(-50)));
  } catch {}
}

export async function flushErrorQueue(): Promise<void> {
  try {
    const queue = JSON.parse(localStorage.getItem('glimmind_error_queue') || '[]');
    for (const item of queue) {
      await callFunction('logClientError', { severity: 'ERROR', ...item });
    }
    localStorage.removeItem('glimmind_error_queue');
  } catch {}
}
```

**File:** `src/index.tsx` - Initialize early
```typescript
import { installGlobalErrorHandler } from './services/errorReporting';

// Install BEFORE React mounts
installGlobalErrorHandler();

// ... rest of existing code
```

**File:** `src/components/modals/SettingsModal.tsx` - Wrap handleAccept (REPORT ONLY, NO RE-THROW)
```typescript
import { reportSettingsError } from '../../services/errorReporting';

const handleAccept = async () => {
  try {
    const finalSettings = normalizeVoiceSettings(draft);
    const updated = { ...list, settings: finalSettings as typeof list.settings };
    await onUpdateList(updated);
    onClose();
  } catch (error) {
    await reportSettingsError(error, { 
      listId: list.id, 
      settingsKeys: Object.keys(draft) 
    });
    // NO re-throw - let existing toast handling catch it naturally
    // The error will propagate to useAppHandlers catch block
  }
};
```

**File:** `src/hooks/app/useAppHandlers.ts` - Wrap handleUpdateList (NO DUPLICATE REPORT)
```typescript
// Remove the duplicate reportError call here - let the global handler or SettingsModal report
// The error will be caught by the existing catch block for toast display
// If you want flow-specific context, add it via error property:
const handleUpdateList = useCallback(
  async (list: AssociationList) => {
    if (!user) return;
    try {
      const listWithTimestamp = { ...list, updatedAt: Date.now() };
      await listService.updateList({
        id: listWithTimestamp.id,
        name: listWithTimestamp.name,
        concept: listWithTimestamp.concept,
        associations: listWithTimestamp.associations,
        settings: listWithTimestamp.settings,
      });
      const currentLists = useGameStore.getState().lists;
      useGameStore.getState().setLists(
        currentLists.map((l) => (l.id === listWithTimestamp.id ? listWithTimestamp : l)),
      );
      showToast("Lista guardada", "success");
    } catch (error) {
      // Attach context for global handler to pick up
      if (error instanceof Error) {
        (error as any).__flowContext = { 
          flow: 'settings-accept-close', 
          source: 'useAppHandlers.handleUpdateList',
          listId: list.id 
        };
      }
      showToast(
        error instanceof Error ? error.message : "Error al guardar",
        "error",
      );
    }
  },
  [user, showToast],
);
```

---

### 3. Deployment & Verification

```bash
# 1. No new dependency install needed (uses built-in console.error)

# 2. Deploy functions (after adding getOptionalAuthUid to helpers.js)
cd backend/src/functions && npm run deploy

# 3. Deploy frontend
cd /Users/rodrigo.jara/dev-personal/glimmind && npm run build && firebase deploy --only hosting
```

---

### 4. Querying in Cloud Console

```
Log Explorer query:
resource.type="cloud_function"
resource.labels.function_name="logClientError"
jsonPayload.clientPayload.message=~"QuotaExceededError"
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **HTTPS onRequest** (not callable) | Works with existing `callFunction`, supports optional auth via header |
| **Optional auth** | Allows logging pre-login/expired-token errors (uid='anonymous') |
| **console.error JSON** | Cloud Functions v2 auto-parses to Cloud Logging; no `@google-cloud/logging` dependency |
| **Zod validation** | Consistent with existing routes |
| **LocalStorage retry queue** | Survives page reload, flushes on next session |
| **Early global handler in index.tsx** | Catches errors before React ErrorBoundary |
| **WeakSet deduplication** | Prevents double-reporting from SettingsModal + useAppHandlers + global handler |
| **PII sanitization** | Redacts sensitive fields client-side before sending |
| **Flow-specific labels** | Easy filtering in Log Explorer |

---

## Answers to Open Questions

1. **Auth for logging**: Optional. Allows anonymous reports (uid='anonymous') for pre-login/expired-token crashes.
2. **PII filtering**: Client-side sanitization in `sanitizePII()` redacts keys containing password, token, authorization, email, phone, creditCard, ssn.
3. **Sampling**: 100% for ERROR/CRITICAL (including QuotaExceededError). 10% for DEBUG/INFO if added later.
4. **Alerting**: Enable **Cloud Error Reporting** in GCP Console. It auto-groups by `serviceContext.service` + `severity: ERROR` and sends email alerts.

---

## Estimated Effort
- **Backend**: ~20 min (helper + route + deploy)
- **Frontend**: ~25 min (new service + 2 integration points + deduplication)
- **Testing**: ~15 min (verify in emulator + prod)

**Total**: ~1 hour