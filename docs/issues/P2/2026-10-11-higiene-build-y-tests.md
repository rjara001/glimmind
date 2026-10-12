# Build can 404 the voice model; jest hangs; outdated dependency

**Date:** 2026-10-11
**Priority:** P2
**Status:** Not fixed

## What

Three hygiene items, no user-facing behaviour today.

1. **The voice model exists in two places with different formats.**
   `public/models/` holds a `.zip` (41,205,931 B). `dist/models/` holds a `.tar.gz`
   (41,185,049 B). The code requests the `.tar.gz`. `scripts/copy-ml-assets.mjs`
   does not mention models at all.
2. **`npx jest` never exits.** `rateLimit.js` starts an unref'd
   `setInterval(cleanupMemoryStore, 60000)` at module load, so the event loop
   stays alive. It must be run with `--forceExit`.
3. **`firebase-functions` is outdated.** Every deploy prints a breaking-changes
   warning.

## Impact

**1 is the risky one.** Vite copies `public/` into `dist/` and empties `outDir`
by default. A build where `public/` wins leaves only the `.zip`, and the
`/models/vosk-model-small-en-us-0.15.tar.gz` request 404s — silent speech
recognition failure for every user, with no build-time error. Worth confirming
against the next clean build before deploying.

**2** wastes time on every backend test run and hides real output behind a
mandatory flag.

**3** is not urgent; upgrading `firebase-functions` v5 across the routes is
untouched work.

## Evidence

```
$ ls public/models/ dist/models/
public/models/: vosk-model-small-en-us-0.15.zip
dist/models/   : vosk-model-small-en-us-0.15.tar.gz

src/context/VoskModelContext.tsx:4   const MODEL_URL = '/models/vosk-model-small-en-us-0.15.tar.gz'
scripts/copy-ml-assets.mjs           (no reference to models)

src/utils/rateLimit.js:72            setInterval(cleanupMemoryStore, 60000)
```

## Fix

1. Delete the stale `.zip` from `public/models/`, keep only the `.tar.gz`, and
   add it to `copy-ml-assets.mjs` if it must survive the `outDir` wipe.
2. `.unref()` the interval in `rateLimit.js`, or add `forceExit: true` to the
   backend Jest config.
3. Upgrade `firebase-functions` in `backend/src/functions/package.json` as
   standalone work, reading the migration notes first.