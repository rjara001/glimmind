# Plan: E2E Tests as the Last Barrier Before Deploy

**Date:** 2026-10-13
**Status:** Complete 2026-10-14 — all six phases shipped (7 specs, `e2e` CI job,
`deploy` gated on `needs: [test, e2e]`); suite green twice in a row locally,
evidence in §9.
**Source of truth for features:** `docs/SERVICE_CATALOG.md`

---

## 1. Feature Map

| Feature | Root path | State | Metrics | Pending |
|---|---|---|---|---|
| E2E test infrastructure (new) | `e2e/`, `playwright.config.ts` | planned | 0 specs, 0 deps | all phases |
| Route smoke | `src/App.tsx:243-381` | active | 11 routes, `ProtectedRoute` guard | none |
| Guest identity | `src/constants/app.ts:1-2`, `src/App.tsx:49-58` | active | `GUEST_UID`, 100% local | none |
| Deck creation | `src/components/ListEditor.tsx`, `src/components/list-editor/BulkImport.tsx` | active | paste / upload / extract | none |
| Game engine | `src/services/gameEngine.ts` | active | training + real, 4 cycles | none |
| CI pipeline | `.github/workflows/ci.yml` | active | test → deploy, no e2e job | add `e2e` job |

**Goal:** Playwright E2E suite runs in CI as the last gate. If it fails on `main`,
the deploy job never runs.

---

## 2. Selected Flows (guest tier, from `docs/SERVICE_CATALOG.md`)

Priority order: entry point → deck creation → playing → resume → edit → history.

| # | Flow | Catalog rows | Why |
|---|---|---|---|
| E2E-01 | Smoke: Landing → "Empezar gratis" → "Continuar como invitado" → Dashboard loads with zero console errors | §6 Continue without registering | Real entry point (`LandingPage.tsx:10`, `Auth.tsx:127`) |
| E2E-02 | Create deck: "+ Crear Lista Personalizada" → "Nueva Lista" → name → "Pegar texto" tab → "Process Import" → ValidationScreen → "📤 Agregar tarjetas" → "💾 Guardar mazo" → list visible on Dashboard | §1 Deck from a pasted list, Review before confirming | Main acquisition flow; exercises import validation + quota |
| E2E-03 | Game mode **Real**: switch to "Real" in SettingsModal → correct and incorrect answers → "✓ Correcto" / "✗ Incorrecto" → finish cycles → FinishedScreen → "← Regresar al panel" → "X / Y" progress badge on ListCard | §2 Real mode, auto-advance, cycles, §5 deck progress | Product core; fuzzy matching is the differentiator |
| E2E-04 | Game mode **Practice**: "Revelar" → "Correcta" / "Siguiente" → summary → "📦 Archivar items aprendidos" | §2 Practice mode, reveal, mark as known, archive | Second mode; verifies cycles and archiving |
| E2E-05 | Resume: play partially → reload page → auto-navigation to `/game` | §2 Continue where I left off | `useAppBootstrap.ts:66-77`; historical regressions |
| E2E-06 | Editor: open existing deck → edit a definition → save → change reflected | §3 Edit a word | Second most common operation |
| E2E-07 | History: after playing → `/activity` shows the session | §5 See history | Closes the progress loop |

### Explicitly excluded (Tier 2, future, emulator-based)

| Excluded flow | Reason |
|---|---|
| Deck from YouTube / Gemini | `assertNotGuest` + paid AI (`youtubeDeckService.ts:7-12`) |
| Translate deck | Cloud Translation has no guest guard; billed per character |
| Cloud TTS / STT voice | Paid providers; default providers are local browser |
| Stripe checkout | Billing; guest shows guard toast (`SettingsView.tsx:136-138`) |
| Prebuilt deck catalog | CF `getPrebuiltDecks` (`DeckStoreOnboarding.tsx:42-57`) |
| Reports | Feature flag `reports: false` |
| Google sign-in | Not supported by the Firebase Auth emulator |

---

## 3. Technical Decisions

1. **No emulators, no real env.** The guest path never triggers a Cloud Function
   (verified: `prebuiltDeckService` is only called on explicit catalog click;
   quota/activity/settings short-circuit for `GUEST_UID`). The dev server boots
   with dummy `VITE_FIREBASE_*` values and `VITE_USE_EMULATORS=false`.
2. **Network guard.** Playwright aborts every request to a non-localhost origin
   except font CDNs. Guarantees zero cost and zero network flakiness.
3. **Selectors.** Exact UI text (note: `"Process Import"` is English in
   `BulkImport.tsx:282`; `"Validar"`, `"Revelar"`, `"Siguiente"`, `"Correcta"` are
   Spanish). `data-testid` only where text is ambiguous (the game answer input
   has no aria-label, `CardContent.tsx:69-76`).
4. **Console assertion.** Every spec fails on unexpected `console.error`
   (resource-load failures from blocked hosts are filtered out).
5. **`tsconfig.json` untouched** (`include: ["src","backend"]`); Playwright
   transpiles its own specs.

### 3.1 Stability considerations (required adjustments)

| Area | Risk | Adjustment |
|---|---|---|
| State persistence (localStorage / IndexedDB) | E2E-05 (reload) and cross-spec navigation can leak state. Playwright uses a fresh `BrowserContext` per spec, but apps write to storage during a test. | `fixtures.ts` defines a `beforeEach` that explicitly clears `localStorage`, `sessionStorage` and IndexedDB before seeding guest state, unless the spec opts out (E2E-05 needs its own state mid-test; it only cleans at spec start). |
| CI server startup | Vite dev may take seconds to boot in GitHub Actions before Playwright connects. | `playwright.config.ts`: `webServer.reuseExistingServer: !process.env.CI` and `webServer.timeout: 120_000`. |
| Practice/Real timers | 5s auto-reveal / auto-advance transitions become flaky under CI CPU variance. | Specs interact fast and assert on state, never on timing. Step-level `expect(...).toBeVisible({ timeout: N })` raised for timer-dependent steps. If a spec proves timing-fragile in Phase 2, add a documented test hook to read the configured delays from `list.settings` (no `window.*` hacks in app code unless proven necessary). |

---

## 4. Files to Create / Modify

```
e2e/
├── fixtures.ts              # guestLogin fixture, storage cleanup, noConsoleErrors, network guard
├── 01-smoke.spec.ts         # E2E-01
├── 02-create-deck.spec.ts   # E2E-02
├── 03-game-real.spec.ts     # E2E-03
├── 04-game-practice.spec.ts # E2E-04
├── 05-resume.spec.ts        # E2E-05
├── 06-edit-card.spec.ts     # E2E-06
└── 07-activity.spec.ts      # E2E-07
playwright.config.ts         # webServer vite :3001, chromium only, retries: 1 on CI
.github/workflows/ci.yml     # new `e2e` job; deploy: needs: [test, e2e]
package.json                 # devDependency @playwright/test; scripts: e2e, e2e:ui
.gitignore                   # playwright-report/, test-results/
docs/plans/2026-10-13-e2e-last-barrier.md
```

App code changes are allowed only when a spec cannot be written otherwise
(e.g. `aria-label` on the answer input).

---

## 5. Execution Phases

| Phase | Content | Done when |
|---|---|---|
| 0 — Spike (0.5 day) | Install Playwright, `playwright.config.ts` with `webServer` + network guard, only E2E-01 | E2E-01 green locally with dummy env; boot confirmed with no external calls |
| 1 — Scaffolding | `fixtures.ts`: `guestLogin`, storage cleanup, `noConsoleErrors`; npm scripts | Fixture reused by all specs |
| 2 — Core flows | E2E-02, E2E-03, E2E-04 | Green locally, 2 consecutive runs without flakes |
| 3 — Closing flows | E2E-05, E2E-06, E2E-07 | Same |
| 4 — CI barrier | `e2e` job in `ci.yml`; `deploy.needs = ['test','e2e']` | Deploy blocked when e2e fails |
| 5 — Closeout | Park findings in `docs/issues/`, version bump (§30), full verification | Checklist below passes |

---

## 6. Known Risks

| Risk | Mitigation |
|---|---|
| Firebase auth SDK demands network with dummy env | Network guard + Phase 0 spike is the acceptance test for this |
| Practice auto-reveal (5s) / auto-advance flakiness | Interact fast, raise step timeouts only for timer steps; see §3.1 |
| Unstable UI copy (mixed es/en) | `getByRole` + literal text; minimal `data-testid` |
| CI slowness | Chromium only, parallel workers |

---

## 7. Findings Parked During Research (§44 — not fixed by this plan)

1. `src/services/prebuiltDeckService.ts:6-16` has no guest guard (unlike
   `youtubeDeckService`), and after a catalog load failure the onboarding leaves
   the guest stuck on "Reintentar" with no path to
   "+ Crear Lista Personalizada" (`DeckStoreOnboarding.tsx:115-130`).
   → `docs/issues/P1/`
2. `src/components/modals/SettingsModal.tsx:55` fires `logClientError` (a Cloud
   Function) with no guest guard; degrades to a local warning but violates the
   guest-offline rule. → `docs/issues/P2/`

---

## 8. Acceptance Criteria (evidence required, AGENTS §34)

```
=== TSC OUTPUT ===        npx tsc --noEmit        → empty
=== TEST OUTPUT ===       npx vitest run          → no regressions
=== E2E OUTPUT ===        npx playwright test     → green, twice in a row, no flakes
=== FILES VERIFIED ===    ls e2e/ playwright.config.ts
=== CI ===                deploy job `needs` includes 'e2e'
```

---

## 9. Verification evidence (2026-10-14)

```
=== TSC OUTPUT ===
$ npx tsc --noEmit
TSC EXIT: 0   (empty output)

=== TEST OUTPUT ===
$ npx vitest run
 Test Files  68 passed (68)
      Tests  836 passed (836)
   Duration  14.27s
VITEST EXIT: 0

=== E2E OUTPUT ===
$ npx playwright test   (run 1)
  7 passed (24.8s)
RUN1 EXIT: 0

$ npx playwright test   (run 2)
  7 passed (15.4s)
RUN2 EXIT: 0

=== FILES VERIFIED ===
playwright.config.ts
e2e/: 01-smoke.spec.ts 02-create-deck.spec.ts 03-game-real.spec.ts
      04-game-practice.spec.ts 05-resume.spec.ts 06-edit-card.spec.ts
      07-activity.spec.ts fixtures.ts helpers.ts

=== CI ===
.github/workflows/ci.yml:39   job `e2e` (installs chromium, runs `npx playwright test`)
.github/workflows/ci.yml:72   `deploy` → `needs: [test, e2e]`
```

Both findings parked during research were filed per §7:
`docs/issues/P1/2026-10-13-prebuiltdeck-sin-guard-guest.md` and
`docs/issues/P2/2026-10-13-settingsmodal-log-sin-guard-guest.md`.
