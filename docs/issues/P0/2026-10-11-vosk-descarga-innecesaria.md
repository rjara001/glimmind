# Vosk model downloads 41 MB for every visitor

**Date:** 2026-10-11
**Priority:** P0
**Status:** Not fixed

## What

`VoskModelProvider` wraps the entire application and downloads a 41.2 MB speech
model on mount, unconditionally:

- `src/App.tsx:495` — `<VoskModelProvider>` wraps `<AppContent />`
- `src/context/VoskModelContext.tsx:28-55` — `useEffect(..., [])` with no condition

Vosk is an **opt-in** engine: the default provider is `'browser'`
(`src/hooks/voice/useGameVoice.ts:145`). Roughly 99% of visitors never use it —
including every anonymous landing-page visitor — but all of them pay 41.2 MB.

## Impact

Firebase Hosting grants 10 GB/month of free data transfer. At 41.2 MB per
download that is **248 downloads per month across all users**, i.e. about **12
active users/month** before the project starts paying ($0.15/GB).

Cloud Functions are not the constraint here — the free tier allows ~2,900 users.
Bandwidth binds about 370x earlier.

| Resource | Free tier | Users that fit |
|---|---|---|
| Cloud Functions | 2M invocations/month | ~2,900 |
| Hosting transfer | 10 GB/month | **~12** |

## Evidence

```
$ ls -la dist/models/
-rw-r--r--  41185049  vosk-model-small-en-us-0.15.tar.gz   # 41.2 MB
```

```
src/App.tsx:495        <VoskModelProvider>
src/context/VoskModelContext.tsx:4   const MODEL_URL = '/models/vosk-model-small-en-us-0.15.tar.gz'
src/context/VoskModelContext.tsx:28  useEffect(() => { initVosk(); }, [])   // unconditional
```

## Fix

Load the model on demand: keep the provider mounted but expose a `load()` the
voice settings call when the user selects Vosk, and show a one-time notice that
the first activation downloads ~41 MB. Non-Vosk users then transfer ~2 MB/month
instead of ~1.2 GB, which moves the ceiling to roughly 5,000 users/month.

Also set a long `Cache-Control` on `/models/**` in `firebase.json` — Firebase
Hosting defaults to `max-age=3600`, so returning users re-download the whole
model daily.