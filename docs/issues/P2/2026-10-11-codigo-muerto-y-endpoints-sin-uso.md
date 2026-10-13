# Dead code and endpoints with no callers

**Date:** 2026-10-11
**Priority:** P2
**Status:** Not fixed

## What

A substantial amount of the backend and frontend is unreachable.

**Backend services, 0 references outside themselves:** `chipttSttService/`,
`transcribeSpeechService.js`, `transcribeExistingAudioService.js`,
`synthesizeSpeechService.js`, `listTtsVoicesService.js`. `sttRoutes.js` uses
`sttService`, not `chipttSttService`, and the live Chirp 3 path goes through
`sttService/api.js`.

**Endpoints with no frontend call site:** `getProgress`, `updateProgress`,
`getSessions`, `getDashboardData`. `progressService.ts` exists but nothing
imports it; progress is loaded from localStorage only.

**Frontend, never mounted:** `usePeriodicSync` (so `SYNC_CONFIG.periodicIntervalMs`
is never applied), `useVoskModelContext.tsx`, `useChipTTSTT_streaming.ts`,
`useSttProviderSwitch.ts`, `semanticGrouping` (no call site, so its ONNX
embeddings never load).

## Impact

- **83 MB of ONNX WASM** ships in `dist/onnx` for a module that never runs.
- `docs/dashboard-api-trigger-analysis.md` describes a dashboard bootstrap that no
  longer exists (`getProgress`/`updateProgress` are gone from the frontend), which
  breaks AGENTS.md §33 compliance — that document is required to reflect reality.
- The `getDashboardData` endpoint described as an optimisation in that same
  document was never connected.
- Dead services invite edits to code that does not run.

## Evidence

```
$ for f in chipttSttService transcribeSpeechService transcribeExistingAudioService \
           synthesizeSpeechService listTtsVoicesService; do ...; done
  chipttSttService: 0 referencias
  transcribeSpeechService: 0 referencias
  transcribeExistingAudioService: 0 referencias
  synthesizeSpeechService: 0 referencias
  listTtsVoicesService: 0 referencias

$ du -sh dist/onnx
83M	dist/onnx

$ grep -rn "usePeriodicSync" src/ | grep -v "usePeriodicSync.ts:"
(no results)
```

## Fix

Delete the five services and the unmounted hooks, then remove the ONNX copy step
or make `semanticGrouping` reachable. Update
`docs/dashboard-api-trigger-analysis.md` to match the calls that actually happen,
or delete the `getProgress`/`updateProgress`/`getSessions`/`getDashboardData`
routes and their rewrites.

Note (2026-10-13): the dashboard-analysis document was corrected to describe the
real bootstrap (`loadInitialData` only; no `getProgress`; no `loadDashboardData`).
The dead services, endpoints and hooks above are still open.

Note: `vitest` includes only `src/**` and `tests/**`, so deleting these will not
break the frontend suite. The backend Jest suite does not cover them either.