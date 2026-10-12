# Vosk model downloads 41 MB for every visitor

**Date:** 2026-10-11
**Priority:** P0
**Status:** Resolved in 1.37.1, deployed 2026-10-12

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

## Resolution — 2026-10-12 (1.37.0)

The unconditional `useEffect(..., [])` is gone. `VoskModelContext` now exposes
a `load()` that is only called from two places:

- `src/components/modals/SettingsModal.tsx` — when the user picks Vosk in the
  STT provider selector.
- `src/hooks/voice/stt/useVoskWordMatch.ts:78` — on `start()`, because a user
  who already has `sttProvider: 'vosk'` saved never opens Settings and would
  otherwise hit a dead end.

`load()` is idempotent while in flight and clears its promise on failure so a
retry is possible. `firebase.json` now serves `/models/**/*.tar.gz` with
`Cache-Control: public, max-age=31536000, immutable`.

`VoiceSection.tsx:147` previously passed `disabled={!isVoskReady &&
sttProvider === 'vosk'}` to the provider toggle, which froze all three buttons
for the whole download. That would have trapped the user in a provider they
could not leave, so the prop was removed.

Covered by `tests/hooks/voskModelContext.test.tsx` (6 tests), including one that
asserts `createModel` is not called on mount.

Two corrections to the evidence above: the provider is mounted at
`src/App.tsx:430`, not `:495`; and the served file is
`src/public/models/…`, because `vite.config.ts` sets `root: 'src'`.

Verified in production after deploying, on the project's own hosting domain:

```
$ curl -sI https://fladycard-22a3e.web.app/models/vosk-model-small-en-us-0.15.tar.gz
content-length: 41185049
content-type: application/gzip
cache-control: public, max-age=31536000, immutable
```