# Plan: validate and ship the cycle-presentation clarity work

**Date:** 2026-10-21
**Status:** Done — validated, merged (PR #7), v1.41.0 deployed 2026-10-21.
**Request:** validate every feature/fix delivered by [`2026-10-20-cycle-presentation-clarity.md`](2026-10-20-cycle-presentation-clarity.md), one item at a time, then close: commits, PR to main, minor bump to 1.41.0, deploy.
**Decisions locked (user):** commit every dirty file, organized in the commit sequence of §4; merge via PR; deploy with an explicit `1.41.0` bump (option A, never `npm run deploy`).

---

## 1. Feature map

| Feature | Root path | State | Metrics | Pending |
|---|---|---|---|---|
| Cycle rule copy (in-game + landing) | `src/utils/cycle-rules.ts`, `src/components/game/CycleProgress.tsx`, `src/components/views/LandingPage.tsx` | shipped | 23/23 plan items | none |
| Session summary | `src/components/game/FinishedScreen.tsx` | shipped | 5 tiles | none |
| Cycle vocabulary | `src/utils/activity.ts`, `src/utils/progress.ts`, `src/store/gameStore.ts`, `backend/.../validation.js` | shipped | 1 rename + 7 normalizers | none |
| Positioning docs | `docs/BUSINESS_MODEL.md`, `docs/SERVICE_CATALOG.md`, `docs/audits/2026-10-20-market-positioning.md` | shipped | 5 doc edits | none |

---

## 2. Master checklist (23 items)

Status vocabulary: `pending` → `ok` → `failed`. Evidence is pasted into §6 as each item closes.

| # | Item | Verification | Status |
|---|---|---|---|
| 1 | On-screen cycle rules match the engine | A2 + M1 | ok (A+M1) |
| 2 | Landing credits "Siguiente", not the failure | A4 + M3 | ok (A+M3) |
| 3 | `FinishedScreen` shows the 5 tiles | A2 + M2 | ok (A+M2) |
| 4 | `_calculateSummary` has the `unseen` bucket | A2 | ok (A) |
| 5 | `glimmind-engine.md` and `cycle-progression-rules.md` describe the real rule | C1 | ok (C) |
| 6 | Tests for rule rendering, summary tiles, bucket sum | A2 | ok (A) |
| 7 | `CycleProgress`: compact horizontal panel on mobile, vertical two-panel sidebar on web (web layout restored 2026-10-21 by user decision, overriding Phase 2.2) | A2 + A4 + M1 | ok (A+M1) |
| 8 | No `niv 0/1/2/3+`, no double percent, no duplicated rules | A5 + M1 | ok (A5+M1) |
| 9 | `CycleMiniBar` simplified; `isMobile` prop re-introduced on `CycleProgress` (2026-10-21) to select the web sidebar vs the mobile row | A2 + M1 | ok (A2+M1) |
| 10 | `conocidas` → `frecuentes` across 7 source files | A1 + A5 | ok (A) |
| 11 | Legacy data normalized at the 4 read boundaries | A2 + C2 | ok (A+C) |
| 12 | Backend accepts both keys (`frecuentes`, `conocidas`) | A3 | ok (A) |
| 13 | `FinishedScreen` has no `(nivel N)` | A4 + M2 | ok (A+M2) |
| 14 | `TermsOfService` uses canonical English states | A5 + M5 | ok (A5+M5) |
| 15 | Tests updated + 9 new normalization tests | A2 | ok (A) |
| 16 | Zero "spaced repetition" across 10 locations | A5 | ok (A) |
| 17 | Landing transparency argument + shared chips | A2 + M3 | ok (A+M3) |
| 18 | `audits/2026-10-20-market-positioning.md` §2 | C3 | ok (C) |
| 19 | `SERVICE_CATALOG.md` §7 row `WITHDRAWN` | C3 | ok (C) |
| 20 | `BUSINESS_MODEL.md` FSRS recorded as rejected | C3 | ok (C) |
| 21 | P-4: `CYCLE_RULE_CHIPS` shared by game and landing | A2 + A4 | ok (A) |
| 22 | P-5: E2E session spec asserts summary tiles | A4 | ok (A) |
| 23 | Issue P2 privacy/statistics filed + index updated | C4 | ok (C) |

---

## 3. Execution blocks

Blocks run in order. If a gate fails: record the incident in §6, fix, re-run the gate; do not advance.

### Block A — automated gates (fresh evidence, §34)

| Gate | Command | Expected |
|---|---|---|
| A1 | `npx tsc --noEmit` | empty output |
| A2 | `npx vitest run` | 85 files / 977 tests (973 + 4 web-sidebar tests added 2026-10-21) |
| A3 | `npm run test:backend` | 5 files / 77 tests |
| A4 | `npx playwright test` | 13 passed (cold build ~2-3 min) |
| A5 | greps: `spaced repetition\|repetición espaciad`, `niv 0..3`, `nivel `, `refrecuentes`, `any\|@ts-ignore` in the diff | no hits |

### Block B — manual review (user sign-off)

| Check | Steps | Expected |
|---|---|---|
| M1 | Start a session on desktop (≥1024px), open the cycle panel | vertical sidebar: 4 stages stacked with `▼`, total badge, APRENDIDAS, `◀/▶` toggle; expanding shows `Ciclo N · ETAPA`, one `Progreso total` %, and the shared chips; no `niv` (mobile keeps the compact horizontal row) |
| M2 | Play to the end of a session | 5 tiles `NUEVA/VISTA/RECONOCIDA/FRECUENTE/APRENDIDAS`; no `(nivel N)`; tiles sum to deck size |
| M3 | Open the landing | Section 01 with four one-line cards; "The rule, complete" block with the same shared chips; footer mentions 4 visible cycles |
| M4 | Dashboard | `GoalWidget` and `BigListCard` render the 5 states |
| M5 | `/terms`, `/privacy`, `/cookies` | no "spaced repetition"; terms show `Frequent` |
| M6 | Full session vs dashboard | one vocabulary everywhere: `NUEVA/VISTA/RECONOCIDA/FRECUENTE/APRENDIDAS` |

### Block C — documentation review

| Check | What |
|---|---|
| C1 | `glimmind-engine.md` + `docs/cycle-progression-rules.md` state the real rule (PASS advances, incorrect never does) |
| C2 | `docs/dashboard-api-trigger-analysis.md` §33 changelog row added; normalizers documented where reads happen |
| C3 | audits §2, `SERVICE_CATALOG` §7 `WITHDRAWN`, `BUSINESS_MODEL` FSRS rejected |
| C4 | `docs/issues/P2/2026-10-21-privacypolicy-promete-estadisticas-desactivadas.md` exists; `docs/issues/README.md` lists it; counts dated 2026-10-21 |

### Block D — closure

| Step | Action |
|---|---|
| D1 | Commit sequence of §4 (all dirty files; nothing left uncommitted) |
| D2 | `git push -u origin fix/cycle-presentation-clarity` |
| D3 | PR to main; merge after approval |
| D4 | `./scripts/version-bump.sh minor` → `1.41.0`; `npm run version:check`; commit `chore(release): bump version to 1.41.0` |
| D5 | `npm run build && firebase deploy --only hosting,functions` — never `npm run deploy` (its `predeploy` runs a patch bump that would ship 1.41.1) |
| D6 | Smoke: header shows `v1.41.0`; a session plays; landing renders |

---

## 4. Commit sequence

Every dirty file is committed, split by flow. No file stays uncommitted (user decision).

| # | Message | Files |
|---|---|---|
| C0 | `chore: mic Permissions-Policy, local premium grant, audit triage (1.40.7)` | `firebase.json`, `package.json`, `src/constants/version.ts`, `scripts/grant-local-premium.mjs`, `docs/audits/2026-10-20-app-state.md`, `docs/audits/2026-10-20-usability-gaps.md`, 4 issues `2026-10-20-*` |
| C1 | `fix(cycles): unify the cycle vocabulary, normalize legacy data, and restore the vertical web sidebar` | `src/types/{activity,progress,cycle-progress-props}.ts`, `src/utils/{activity,progress,ranking,cycle-colors}.ts`, `src/store/gameStore.ts`, `src/services/{activity,progress}Service.ts`, `src/components/cards/BigListCard.tsx`, `src/components/game/{CycleProgress,FinishedScreen}.tsx`, `src/components/layout/GoalWidget.tsx`, `src/components/views/GameView.tsx`, `src/components/views/game/CardStage.tsx`, `backend/src/functions/src/{utils/validation.js,services/listService/crud.js}`, `backend/src/functions/tests/utils.test.js`, 6 unit test files (incl. `CycleProgress.test.tsx`) |
| C2 | `feat(landing): show the shared cycle rule and transparency copy` | `src/components/views/{LandingPage,TermsOfService,PrivacyPolicy,CookiePolicy}.tsx`, `src/components/views/landing.css`, `tests/components/LandingPage.test.tsx`, `e2e/11-summary-tiles.spec.ts` |
| C3 | `docs(cycles): position the 4-cycle mechanism and record the FSRS decision` | `README.md`, `docs/{BUSINESS_MODEL,LAUNCH_PLAN,PLAN_NEW_LOOK_AND_FEEL,SERVICE_CATALOG,dashboard-api-trigger-analysis}.md`, `docs/audits/2026-10-20-market-positioning.md`, `docs/issues/P2/2026-10-21-privacypolicy-promete-estadisticas-desactivadas.md`, `docs/issues/P2/2026-10-21-landing-falla-atribuye-entrada-a-ciclo.md`, `docs/issues/P2/2026-10-21-playwright-reutiliza-servidor-stale-3002.md`, `docs/issues/README.md`, `docs/plans/2026-10-21-cycle-clarity-validation.md` |
| C4 | `chore(release): bump version to 1.41.0` | `package.json`, `src/constants/version.ts` — created in step D4 after the PR merge, never before |

C1 absorbs the sidebar restore because `CycleProgress`, `StateBreakdown` and the rename are interdependent: splitting them would leave an intermediate commit that fails `tsc` (§42).

C3 lands after C0 so `docs/issues/README.md` links resolve to already-committed issue files; both 2026-10-21 issue rows resolve within the same commit.

---

## 5. Definition of done

- [x] 23 checklist rows at `ok`
- [x] A1-A5 output pasted into §6
- [x] M1-M6 signed off — M1 directly by the user; M2-M6 delegated by the user to agent code inspection + fresh test evidence
- [x] C1-C4 confirmed
- [x] 5 commits pushed, PR merged to main
- [x] `npm run version:check` reports 1.41.0
- [x] Deploy done with option A; smoke passes

---

## 6. Validation log

Append evidence per gate/check here during execution.

| Date | Gate/Check | Result | Notes |
|---|---|---|---|
| 2026-10-21 | A1 `npx tsc --noEmit` | pass | empty output, exit 0 |
| 2026-10-21 | A2 `npx vitest run` | pass | 85 files / 973 tests, exit 0 (jsdom navigation warning is pre-existing, non-fatal) |
| 2026-10-21 | A3 `npm run test:backend` | pass | 5 files / 77 tests, exit 0 |
| 2026-10-21 | A4 `npx playwright test` | pass | 13 passed in 32.9s, includes `11-summary-tiles`, exit 0 |
| 2026-10-21 | A5 greps | pass | 0 hits on the 10 D5 locations, `niv [0123]`, `any`/`@ts-ignore` in diff. 2 expected hits: guard comment/regex in `e2e/11-summary-tiles.spec.ts:66-67` and the pattern list inside this plan. `docs/` mentions of the term exist only in `SERVICE_CATALOG` WITHDRAWN row, audits, and the `BUSINESS_MODEL` rejection record. Note: `rg` is not installed on this machine; gate uses `grep -E` |
| 2026-10-21 | C1 engine docs | pass | `glimmind-engine.md:121-123` PASS advances `currentCycle`; `cycle-progression-rules.md:16,39` failure does not advance, incorrect validation never changes `currentCycle` |
| 2026-10-21 | C2 §33 changelog | pass | `dashboard-api-trigger-analysis.md:171` row dated 2026-10-21: rename at read boundaries, `normalizeProgress`/activity normalizers, backend accepts both keys, flow unchanged |
| 2026-10-21 | C3 positioning docs | pass | `market-positioning.md:67` "Competitors schedule in the dark"; `SERVICE_CATALOG.md:114` `WITHDRAWN`; `BUSINESS_MODEL.md:188` FSRS rejected 2026-10-21 |
| 2026-10-21 | C4 issue + index | pass | issue file exists (1831 bytes); `docs/issues/README.md:31` counts `0 P0 · 9 P1 · 20 P2` as of 2026-10-21; row at line 84 |
| 2026-10-21 | Change: web sidebar restored (user decision) | pass | `CycleProgress` renders the vertical two-panel sidebar when `isMobile={false}` (GameView web instance) and the compact horizontal panel on mobile (CardStage). Kept: no `niv`, single `Progreso total` % over the deck total (no double count), `CYCLE_RULE_CHIPS` once, legible type floor, `aria-expanded` toggle. Files: `types/cycle-progress-props.ts`, `CycleProgress.tsx`, `GameView.tsx`, `CardStage.tsx`, `CycleProgress.test.tsx`. Evidence: `tsc` empty, vitest 85/977, playwright 13 passed |
| 2026-10-21 | M1 panel (user sign-off) | pass | 7/7 points verified by the user on the live sidebar: vertical stack, no horizontal `➜`, single `Ciclo` badge, one `Progreso total` 33% (=2/6, no double count), correct chips, and the <1024px contrast back to the horizontal row |
| 2026-10-21 | M2 summary (agent, delegated) | pass | `FinishedScreen.tsx:24-65` five tiles from `CYCLE_LABELS[1-4]` + `APRENDIDAS`, `grid-cols-5`, no `level`; e2e `11-summary-tiles` passed post-change with tiles summing to the deck and `getByText(/nivel/i)` count 0 |
| 2026-10-21 | M3 landing (agent, delegated) | pass with finding | `:23` 4-cycle tag, `:43-44` Siguiente attribution, `:105-120` four one-line stage cards, `:124-126` "La regla, completa" with the shared chips (asserted ×1 by `LandingPage.test`), `:276` "4 ciclos visibles", 0 spaced-repetition hits. Finding: pre-existing `:148` failure framing (`8aa1391`) → parked as P2 issue (user decision) |
| 2026-10-21 | M4 dashboard (agent, delegated) | pass | `GoalWidget.tsx:10-14` and `BigListCard.tsx:8-12` list all 5 states via `STATE_LABELS`; `BigListCard:16` sums the 5 buckets. No unit test mounts either widget; validated by inspection |
| 2026-10-21 | M5 legal (agent, delegated) | pass | `TermsOfService.tsx:27` `New → Seen → Recognized → Frequent → Learned`; grep for spaced repetition across Terms/Privacy/Cookie = 0 hits |
| 2026-10-21 | M6 coherence (agent, delegated) | pass | All five display names single-sourced (`cycle-colors.ts:5-21`, 27 consumers); legacy `conocidas` only inside normalizers (`utils/progress.ts:42-50`, `utils/activity.ts:44-52`); no component displays `conocidas` or `niv` |
| 2026-10-21 | A4 incident — stale e2e server | fail, then fixed | `playwright.config.ts:54` `reuseExistingServer: true` reused a `vite` process started `Sun Oct 18 20:08:32 2026` (PID 52385) on `:3002`, so earlier local runs never executed `npm run build && vite preview`. Working-tree churn from `git stash` (commit verification) made that server recompile → 7 failed / 6 passed (3.8m), all in `page.goto: Test timeout ... http://localhost:3002/`. Killed PID 52385. Finding parked: `docs/issues/P2/2026-10-21-playwright-reutiliza-servidor-stale-3002.md` |
| 2026-10-21 | A4 re-run (fresh production build) | pass | After killing the squatter: fresh `npm run build && vite preview`, `13 passed (25.4s)`, includes `11-summary-tiles`, exit 0 — first run in this validation against the real production bundle |
| 2026-10-21 | Final gates on the committed tree (§34) | pass | `npx tsc --noEmit` empty, exit 0; `npx vitest run` 85 files / 977 tests, exit 0; `npm run test:backend` 5 files / 77 tests, exit 0; `npx playwright test` 13 passed, exit 0; `git status --short` empty after C0-C3 |
| 2026-10-21 | Issue index final state | pass | `docs/issues/README.md:31` counts `0 P0 · 9 P1 · 22 P2` as of 2026-10-21 (privacy, landing and stale-server findings all listed); supersedes the 20 P2 count recorded in the C4 row above |
| 2026-10-21 | D1 commit sequence | pass | C0 `e37110f`, C1 `8ed4b33` (tsc clean on the exact staged tree via stash verify), C2 `44aa65e` (tsc clean), C3 `61f8231` (amended to include the stale-server incident docs); `git status --short` empty after C3 |
| 2026-10-21 | D2 push | pass | `git push -u origin fix/cycle-presentation-clarity`, new branch tracked on `github-personal` |
| 2026-10-21 | D3 PR + merge | pass | PR #7 created, 2 reviewer questions about `isMobile` answered in-thread (prop moved with an equivalent value, not removed); merged as `95d513a` |
| 2026-10-21 | D4 bump | pass | `./scripts/version-bump.sh minor` 1.40.7 → 1.41.0 in `package.json` and `src/constants/version.ts`; `npm run version:check` reports match; commit `65488a8` pushed to main (never `npm run deploy`) |
| 2026-10-21 | D5 deploy | pass | `npm run build` (3.32s) + `firebase deploy --only hosting,functions` → hosting release complete, functions deployed; https://fladycard-22a3e.web.app |
| 2026-10-21 | D6 smoke (production) | pass | 8/8 against https://fladycard-22a3e.web.app: landing CTA renders, guest login → `/dashboard`, header `v1.41.0` (dashboard + game), paste-import deck created, practice session starts, web sidebar shows single `Progreso total`, `¡Sesión Completada!` reached |
