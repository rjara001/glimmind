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

Counts as of 2026-10-21: **0 P0 · 9 P1 · 23 P2 · 24 done · 3 backlog**.

Four were filed on 2026-10-20 from the state, usability and market-positioning
audits under [`../audits/`](../audits/). Three further findings from the same
audits (`GameView` deck-load error state, mixed-language UI, empty deck store
for guests) are documented in [`../audits/2026-10-20-usability-gaps.md`](../audits/2026-10-20-usability-gaps.md)
rather than as issue files, pending a plan under [`../plans/`](../plans/).

---

## P0 — bleeding money or broken right now

| Issue | Impact |
|---|---|
| _(none open)_ | The last P0 (`log-client-error-sin-rewrite`) was resolved 2026-10-16 in v1.40.4 |

## P1 — behavioural bugs

| Issue | Impact |
|---|---|
| [`P1/2026-10-12-sin-tope-de-mazos-por-usuario.md`](P1/2026-10-12-sin-tope-de-mazos-por-usuario.md) | Deck count is uncapped; 10000 one-word decks stay inside every limit |
| [`P1/2026-10-12-audio-base64-en-firestore.md`](P1/2026-10-12-audio-base64-en-firestore.md) | Recordings stored base64 in Firestore docs, unmetered, not deleted with the account |
| [`P1/2026-10-12-sync-config-sin-conectar.md`](P1/2026-10-12-sync-config-sin-conectar.md) | The Premium sync tier has no callers and `usePeriodicSync` is never mounted |
| [`P1/2026-08-24-mobile-stt-premature-final.md`](P1/2026-08-24-mobile-stt-premature-final.md) | Mobile STT grades multi-word phrases on the first word. Classified 2026-10-12 |
| [`P1/2026-10-12-stt-audio-seconds-no-verificar.md`](P1/2026-10-12-stt-audio-seconds-no-verificar.md) | STT charges the seconds the client declares, so the allowance can be bypassed by under-reporting `audioDuration` |
| [`P1/2026-10-12-transcribe-existing-audio-roto.md`](P1/2026-10-12-transcribe-existing-audio-roto.md) | The route calls a function that does not exist; it can only ever answer 502 |
| [`P1/2026-10-13-guest-decks-erased-on-user-switch.md`](P1/2026-10-13-guest-decks-erased-on-user-switch.md) | Signing in after a guest session erases the guest's local-only decks |
| [`P1/2026-10-13-regresar-al-panel-vuelve-a-game.md`](P1/2026-10-13-regresar-al-panel-vuelve-a-game.md) | "Regresar al panel" returns to /game on the first play of a session |
| [`P1/2026-10-20-tailwind-cdn-en-runtime-produccion.md`](P1/2026-10-20-tailwind-cdn-en-runtime-produccion.md) | Production styling comes from `cdn.tailwindcss.com`; Tailwind is not in the build at all |

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
| [`P2/2026-10-13-rate-limit-por-instancia.md`](P2/2026-10-13-rate-limit-por-instancia.md) | Counters live in a per-instance Map, so every declared tier undercounts under concurrency |
| [`P2/2026-10-14-voice-stt-fallback-dead-toggle.md`](P2/2026-10-14-voice-stt-fallback-dead-toggle.md) | The STT fallback toggle is written but no code reads it |
| [`P2/2026-10-16-callfunction-debug-console-log.md`](P2/2026-10-16-callfunction-debug-console-log.md) | `callFunction.ts:53` ships a debug `console.log` (incl. `tokenPresent=`) to every production session |
| [`P2/2026-10-16-error-message-crudo-en-cliente.md`](P2/2026-10-16-error-message-crudo-en-cliente.md) | Toasts show raw English browser errors ("Failed to fetch") in the Spanish UI |
| [`P2/2026-10-20-admin-inalcanzable-por-role.md`](P2/2026-10-20-admin-inalcanzable-por-role.md) | `role` is never assigned, so `/admin` bounces through a `/403` route that does not exist |
| [`P2/2026-10-20-quickadd-y-login-muertos.md`](P2/2026-10-20-quickadd-y-login-muertos.md) | `QuickAddModal` never opens and `src/pages/Login.tsx` has no importer |
| [`P2/2026-10-20-pwa-sin-configurar.md`](P2/2026-10-20-pwa-sin-configurar.md) | `vite-plugin-pwa` installed but unregistered; no manifest, icons, favicon, or `cap sync` |
| [`P2/2026-10-21-privacypolicy-promete-estadisticas-desactivadas.md`](P2/2026-10-21-privacypolicy-promete-estadisticas-desactivadas.md) | Privacy and cookie policies promise statistics while `FEATURE_FLAGS.reports` keeps them unreachable |
| [`P2/2026-10-21-landing-falla-atribuye-entrada-a-ciclo.md`](P2/2026-10-21-landing-falla-atribuye-entrada-a-ciclo.md) | Landing comparison card says failing "enters a cycle"; the cycle only advances on Siguiente |
| [`P2/2026-10-21-playwright-reutiliza-servidor-stale-3002.md`](P2/2026-10-21-playwright-reutiliza-servidor-stale-3002.md) | Playwright reuses any process on port 3002, so local e2e can test a stale server instead of the production bundle |
| [`P2/2026-10-21-env-backups-trackeados-y-debug-env.md`](P2/2026-10-21-env-backups-trackeados-y-debug-env.md) | `.env.local.backup` (real Firebase config) and a misnamed 12,979-line `.env.backup` are tracked in git alongside a stray `debug-env.js` |

## done — resolved

| Issue | Resolution |
|---|---|
| [`done/2026-10-15-import-premium-3000-corta-en-2000.md`](done/2026-10-15-import-premium-3000-corta-en-2000.md) | Premium import stopped at 2000: the client-side `createList` loop hit the 20/min rate limit; one atomic `bulkCreateList` request replaces it |
| [`done/2026-10-11-quota-exceeded-error-sin-importar.md`](done/2026-10-11-quota-exceeded-error-sin-importar.md) | `QuotaExceededError` is imported in `listRoutes.js`, so quota rejections answer 400 with the friendly message instead of an unhandled 500 |
| [`done/2026-10-15-splitlist-borra-mazo-original.md`](done/2026-10-15-splitlist-borra-mazo-original.md) | `splitList` deleted the original deck and lost group 1; the original is now replaced in place by `groups[0]` |
| [`done/2026-10-15-cardcount-cero-con-associations-malformado.md`](done/2026-10-15-cardcount-cero-con-associations-malformado.md) | `cardCount` rebuild now counts map-shaped decks through `normalizeAssociationsToList` |
| [`done/2026-10-15-updatelist-silencia-error-en-nube.md`](done/2026-10-15-updatelist-silencia-error-en-nube.md) | `firestoreService.updateList` propagates write failures again; callers already handle them |
| [`done/2026-10-15-updateListFields-corrompe-associations.md`](done/2026-10-15-updateListFields-corrompe-associations.md) | `updateListFields` turned `associations` into a map and destroyed term/definition; fixed in v1.39.2 (full-array write + client guards) |
| [`done/2026-10-11-constants-rotos-ia-caida.md`](done/2026-10-11-constants-rotos-ia-caida.md) | AI generation was dead; 11 exports restored to `constants.js` on 2026-10-12 |
| [`done/2026-08-25-narration-language-and-globe-fix.md`](done/2026-08-25-narration-language-and-globe-fix.md) | Narration language and voice flags |
| [`done/2026-08-27-gemini-vocabulary-extraction.md`](done/2026-08-27-gemini-vocabulary-extraction.md) | Python NLP backend replaced by Gemini |
| [`done/2026-08-24-tts-watchdog-cutoff.md`](done/2026-08-24-tts-watchdog-cutoff.md) | Browser TTS cutoff; text chunking plus watchdog shipped |
| [`done/2026-08-24-similarity-montains-typo.md`](done/2026-08-24-similarity-montains-typo.md) | Closed as **not a bug**: the stored answer was misspelled `montains` |
| [`done/2026-10-11-vosk-descarga-innecesaria.md`](done/2026-10-11-vosk-descarga-innecesaria.md) | 41.2 MB downloaded by 100% of visitors; now loaded on demand in 1.37.1 |
| [`done/2026-10-12-cuotas-no-atomicas.md`](done/2026-10-12-cuotas-no-atomicas.md) | All four meters reserve before spending and refund on failure; the realised ceiling is the quota again |
| [`done/2026-10-12-premium-sin-limite-de-tarjetas.md`](done/2026-10-12-premium-sin-limite-de-tarjetas.md) | `updateList` and `splitList` now assert the card ceiling inside their transactions; `scripts/repro-p0-curl.sh` exits 0 |
| [`done/2026-10-12-rutas-ia-sin-rate-limit.md`](done/2026-10-12-rutas-ia-sin-rate-limit.md) | Both AI deck routes now run under `aiGroup` (10/min); `scripts/repro-p0-ai-rate-limit.sh` exits 0 |
| [`done/2026-10-11-huecos-de-gating-premium.md`](done/2026-10-11-huecos-de-gating-premium.md) | Chirp/Chiptt hidden, coerced to browser and rejected with `TIER_REQUIRED` (403) for free; recording toggle gated on premium (plan `2026-10-14-premium-voice-gating.md`) |
| [`done/2026-10-13-updatelistfields-400-invalid-body.md`](done/2026-10-13-updatelistfields-400-invalid-body.md) | Pending deltas are sanitised against the server schema before every send; 400s now log the failing zod field instead of looping forever |
| [`done/2026-10-16-import-mayor-al-limite-falla-completo.md`](done/2026-10-16-import-mayor-al-limite-falla-completo.md) | Oversized bulk imports now truncate to the remaining quota instead of failing entirely; `ValidationScreen` shows the amber notice and "Se importarán Y de X" subtitle (v1.40.3) |
| [`done/2026-10-13-settingsmodal-log-sin-guard-guest.md`](done/2026-10-13-settingsmodal-log-sin-guard-guest.md) | Guest guard now lives inside `logEvent`/`flushEventQueue`, covering SettingsModal and every other call site (shipped with the P0 client-error observability fix) |
| [`done/2026-10-12-activity-falla-y-descarta-la-edicion.md`](done/2026-10-12-activity-falla-y-descarta-la-edicion.md) | The list write now happens before the activity record; a failed `appendActivity` can no longer veto the edit. Failures report `activity.record_error` via `logEvent` instead of being swallowed |
| [`done/2026-10-13-prebuiltdeck-sin-guard-guest.md`](done/2026-10-13-prebuiltdeck-sin-guard-guest.md) | `prebuiltDeckService.fetchDecks` short-circuits to `[]` for guests (§31), and the onboarding error state offers "Crear lista personalizada" so a failed fetch never traps the user |
| [`done/2026-10-12-quota-fallback-free.md`](done/2026-10-12-quota-fallback-free.md) | The four client quota gates no longer manufacture a free tier when `getQuota` failed for a signed-in user; they block with a connectivity message instead (`resolveTierForGate`) |
| [`done/2026-10-11-log-client-error-sin-rewrite.md`](done/2026-10-11-log-client-error-sin-rewrite.md) | Client error reporting pipeline repaired in v1.40.4: hosting rewrite added, retry queue drained on start, six swallowed UI catches now report via `logEvent`, guests short-circuit (§31; the guard was hardened 2026-10-16 to also detect local guests via `localStorage` and to no-op entirely on demo builds). Probe answered `{"success":true}` |
| [`done/2026-10-15-dist-no-se-limpia-en-cada-build.md`](done/2026-10-15-dist-no-se-limpia-en-cada-build.md) | Resolved 2026-10-16: `emptyOutDir: true` added to `vite.config.ts` (required by the E2E-against-production-build change) |

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