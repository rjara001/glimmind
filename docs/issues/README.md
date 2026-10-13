# Parked Issues

Work found during investigation that is **not** part of the task in progress.
It is real, it is not being fixed right now, and it is not lost.

Nothing in this folder blocks a business or pricing decision. Items that do
require a product decision are recorded here as facts only — the decision itself
belongs in [`../BUSINESS_MODEL.md`](../BUSINESS_MODEL.md).

Filed from the Stripe sandbox-to-live work and the business-model review
(2026-10-11), and from the metering review that produced
[`../SERVICE_CATALOG.md`](../SERVICE_CATALOG.md) (2026-10-12). Three more were
parked while implementing the atomic quota fix in
[`../plans/2026-10-12-cuotas-atomicas.md`](../plans/2026-10-12-cuotas-atomicas.md).

---

## Structure

Priority lives in the path. A file's folder is its state; nothing inside it
duplicates the priority in prose.

| Folder | Meaning |
|---|---|
| [`P0/`](P0/) | Bleeding money, or broken right now |
| [`P1/`](P1/) | Behavioural bugs |
| [`P2/`](P2/) | Debt, dead code, hygiene |
| [`done/`](done/) | Resolved. Kept so a fix does not silently regress |
| [`backlog/`](backlog/) | Not a defect. Specs and diagnostics that do not belong here yet |

Counts as of 2026-10-13: **2 P0 · 12 P1 · 12 P2 · 7 done · 3 backlog**.

---

## P0 — bleeding money or broken right now

| Issue | Impact |
|---|---|
| [`P0/2026-10-12-premium-sin-limite-de-tarjetas.md`](P0/2026-10-12-premium-sin-limite-de-tarjetas.md) | Premium bypasses the 5000-card ceiling through `updateList` and `splitList`. `scripts/repro-p0-curl.sh` |
| [`P0/2026-10-12-rutas-ia-sin-rate-limit.md`](P0/2026-10-12-rutas-ia-sin-rate-limit.md) | The metered routes have no rate limit; `aiGroup` is defined but unused |

## P1 — behavioural bugs

| Issue | Impact |
|---|---|
| [`P1/2026-10-11-quota-exceeded-error-sin-importar.md`](P1/2026-10-11-quota-exceeded-error-sin-importar.md) | `ReferenceError` on the quota-error path of create/edit/split list |
| [`P1/2026-10-11-log-client-error-sin-rewrite.md`](P1/2026-10-11-log-client-error-sin-rewrite.md) | Every client error is lost; one wasted request each |
| [`P1/2026-10-11-huecos-de-gating-premium.md`](P1/2026-10-11-huecos-de-gating-premium.md) | Paid features reachable from the free tier |
| [`P1/2026-10-12-sin-tope-de-mazos-por-usuario.md`](P1/2026-10-12-sin-tope-de-mazos-por-usuario.md) | Deck count is uncapped; 10000 one-word decks stay inside every limit |
| [`P1/2026-10-12-audio-base64-en-firestore.md`](P1/2026-10-12-audio-base64-en-firestore.md) | Recordings stored base64 in Firestore docs, unmetered, not deleted with the account |
| [`P1/2026-10-12-sync-config-sin-conectar.md`](P1/2026-10-12-sync-config-sin-conectar.md) | The Premium sync tier has no callers and `usePeriodicSync` is never mounted |
| [`P1/2026-08-24-mobile-stt-premature-final.md`](P1/2026-08-24-mobile-stt-premature-final.md) | Mobile STT grades multi-word phrases on the first word. Classified 2026-10-12 |
| [`P1/2026-10-12-stt-audio-seconds-no-verificar.md`](P1/2026-10-12-stt-audio-seconds-no-verificar.md) | STT charges the seconds the client declares, so the allowance can be bypassed by under-reporting `audioDuration` |
| [`P1/2026-10-12-transcribe-existing-audio-roto.md`](P1/2026-10-12-transcribe-existing-audio-roto.md) | The route calls a function that does not exist; it can only ever answer 502 |
| [`P1/2026-10-12-activity-falla-y-descarta-la-edicion.md`](P1/2026-10-12-activity-falla-y-descarta-la-edicion.md) | `appendActivity` is awaited before the list write, so its failure drops the user's edit |
| [`P1/2026-10-12-quota-fallback-free.md`](P1/2026-10-12-quota-fallback-free.md) | A failed `getQuota` falls back to tier `free`, so a Premium user is blocked at 1000 with a free-tier message |
| [`P1/2026-10-13-guest-decks-erased-on-user-switch.md`](P1/2026-10-13-guest-decks-erased-on-user-switch.md) | Signing in after a guest session erases the guest's local-only decks |

## P2 — debt, dead code, hygiene

| Issue | Impact |
|---|---|
| [`P2/2026-10-11-codigo-muerto-y-endpoints-sin-uso.md`](P2/2026-10-11-codigo-muerto-y-endpoints-sin-uso.md) | 5 unused services, 4 endpoints with no callers, 83 MB dead WASM |
| [`P2/2026-10-11-cuotas-invisibles-al-usuario.md`](P2/2026-10-11-cuotas-invisibles-al-usuario.md) | Users only learn their limits from a 429 |
| [`P2/2026-10-11-bugs-menores.md`](P2/2026-10-11-bugs-menores.md) | Quota misreported to premium, dropped deltas, reload re-pays first card |
| [`P2/2026-10-11-higiene-build-y-tests.md`](P2/2026-10-11-higiene-build-y-tests.md) | Clean build can 404 the voice model; jest hangs; outdated dependency |
| [`P2/2026-10-11-deuda-de-documentacion.md`](P2/2026-10-11-deuda-de-documentacion.md) | `LAUNCH_PLAN` and the API doc contradict the code |
| [`P2/2026-10-11-sin-instrumentacion-de-costos.md`](P2/2026-10-11-sin-instrumentacion-de-costos.md) | No per-user cost logging, so limits cannot be validated |
| [`P2/2026-10-12-lista-tts-voces-sin-auth.md`](P2/2026-10-12-lista-tts-voces-sin-auth.md) | `listTtsVoices` needs no authentication and answers any origin |
| [`P2/2026-10-12-codigo-muerto-en-zona-de-creacion.md`](P2/2026-10-12-codigo-muerto-en-zona-de-creacion.md) | 500 lines of React no user path can reach, in the deck-creation zone |
| [`P2/2026-10-12-deploy-de-github-actions-roto.md`](P2/2026-10-12-deploy-de-github-actions-roto.md) | The Actions deploy has failed on every run since 2026-10-07 |
| [`P2/2026-08-24-chirp-tts-cutoff-instrumentation.md`](P2/2026-08-24-chirp-tts-cutoff-instrumentation.md) | Chirp phrases cut short; instrumented, 4 hypotheses still undiscriminated |
| [`P2/2026-10-12-yt-ai-limits-obsoletas.md`](P2/2026-10-12-yt-ai-limits-obsoletas.md) | `YT_AI_DAILY_LIMIT_PREMIUM` says 200, `plans.json` says 1000, nothing reads it |
| [`P2/2026-10-12-create-list-campos-opcionales.md`](P2/2026-10-12-create-list-campos-opcionales.md) | The schema calls `concept`/`settings` optional; omitting either returns 500 |

## done — resolved

| Issue | Resolution |
|---|---|
| [`done/2026-10-11-constants-rotos-ia-caida.md`](done/2026-10-11-constants-rotos-ia-caida.md) | AI generation was dead; 11 exports restored to `constants.js` on 2026-10-12 |
| [`done/2026-08-25-narration-language-and-globe-fix.md`](done/2026-08-25-narration-language-and-globe-fix.md) | Narration language and voice flags |
| [`done/2026-08-27-gemini-vocabulary-extraction.md`](done/2026-08-27-gemini-vocabulary-extraction.md) | Python NLP backend replaced by Gemini |
| [`done/2026-08-24-tts-watchdog-cutoff.md`](done/2026-08-24-tts-watchdog-cutoff.md) | Browser TTS cutoff; text chunking plus watchdog shipped |
| [`done/2026-08-24-similarity-montains-typo.md`](done/2026-08-24-similarity-montains-typo.md) | Closed as **not a bug**: the stored answer was misspelled `montains` |
| [`done/2026-10-11-vosk-descarga-innecesaria.md`](done/2026-10-11-vosk-descarga-innecesaria.md) | 41.2 MB downloaded by 100% of visitors; now loaded on demand in 1.37.1 |
| [`done/2026-10-12-cuotas-no-atomicas.md`](done/2026-10-12-cuotas-no-atomicas.md) | All four meters reserve before spending and refund on failure; the realised ceiling is the quota again |

## backlog — not defects

These three are feature specs and diagnostic logs that were filed here but never
described a defect. They are kept in place until they are either turned into real
tickets or moved to [`../plans/`](../plans/). See "Not defects" below.

| File | What it is |
|---|---|
| [`backlog/2026-08-07-card-activity-history.md`](backlog/2026-08-07-card-activity-history.md) | 137-line feature spec. `Status: Approved` |
| [`backlog/2026-09-04-auto-split-deck-feature.md`](backlog/2026-09-04-auto-split-deck-feature.md) | Feature doc for deck auto-split |
| [`backlog/2026-08-11-voice-study-mode-diagnostics.md`](backlog/2026-08-11-voice-study-mode-diagnostics.md) | Diagnostic log. Contains one unfiled defect, see below |

### One unfiled defect inside the voice diagnostics log

`backlog/2026-08-11-voice-study-mode-diagnostics.md` records this, still open,
and still marked `DO NOT touch — user decision`:

> `store/gameStore.ts:683-691`: `syncToCloud` calls `listService.updateList(...)`
> when the cloud list is missing, but `updateList` requires the list to exist →
> `404 {"error":"List not found"}`. It should call `createList`.

Not filed as a ticket yet. It affects normal Study mode as well as voice mode.