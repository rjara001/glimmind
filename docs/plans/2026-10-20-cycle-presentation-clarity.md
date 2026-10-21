# Plan: make the 4-cycle mechanism clear and simple

**Date:** 2026-10-20
**Status:** Approved for execution, phases 1-4 below. Two decisions still open (§7).
**Request:** present the 4-cycle mechanism more clearly, and with more simplicity. The 4 cycles are the product's differentiator and must be positioned above the competition.
**Positioning angle agreed:** transparency — competitors hide their review schedule in a black box; Glimmind shows four visible states and why each word is where it is.
**Related audits:** [`../audits/2026-10-20-app-state.md`](../audits/2026-10-20-app-state.md), [`../audits/2026-10-20-usability-gaps.md`](../audits/2026-10-20-usability-gaps.md), [`../audits/2026-10-20-market-positioning.md`](../audits/2026-10-20-market-positioning.md).

---

## 1. Feature map

| Feature | Root path | State | Metrics | Pending |
|---|---|---|---|---|
| Cycle presentation (in-game) | `src/components/game/CycleProgress.tsx`, `CycleMiniBar.tsx` | partial | 2 layouts, 12 noise sources | simplify |
| Session summary | `src/components/game/FinishedScreen.tsx` | broken | 3 defects | phase 1.3 |
| Cycle rule copy | `CycleProgress.tsx`, `LandingPage.tsx:42` | broken | 2 false statements | phase 1.1-1.2 |
| Cycle naming | `src/utils/cycle-colors.ts` + 6 consumers | partial | 3 competing vocabularies | phase 3 |
| "Spaced repetition" copy | 7 public + 3 internal locations | active | 10 occurrences | phase 4.1 |

---

## 2. Verified defects

### D1 — The on-screen rule contradicts the engine

`CycleProgress.tsx` renders these rules twice (mobile block and desktop block):

```
⬇ Acierto 1er ciclo → APRENDIDAS
❌ Falla → siguiente nivel
✅ Acierto → permanece
```

What the engine actually does (`src/services/gameEngine.ts:514-547`):

```ts
public processAction(action: { type: "CORRECT" | "PASS" }): GlimmindGame {
  ...
  if (action.type === "CORRECT") {
    associations[assocIndex] = {
      ...currentAssoc,
      status: "correct",
      isLearned: this.state.globalCycle === 1 ? true : currentAssoc.isLearned,
      ...
  } else if (action.type === "PASS") {
    const maxAllowedCycle = Math.min(this.state.globalCycle + 1, 4);
    const nextCycle = Math.min(currentAssoc.currentCycle + 1, maxAllowedCycle) as GameCycle;
    associations[assocIndex] = { ...currentAssoc, currentCycle: nextCycle, ... };
  }
```

| Screen says | Engine does | Verdict |
|---|---|---|
| `❌ Falla → siguiente nivel` | an **incorrect validation** never reaches this code; the incorrect path (`gameEngine.ts:~490-511`) returns `incorrectState` without touching `currentCycle` | false |
| `✅ Acierto → permanece` | in `globalCycle === 1` a correct answer sets `isLearned = true`, so the card leaves the cycle and becomes APRENDIDAS | false in cycle 1 |
| `⬇ Acierto 1er ciclo → APRENDIDAS` | matches `gameEngine.ts:530` | true |
| Landing: *"Cuando fallas, la palabra no desaparece. Entra a un ciclo."* (`LandingPage.tsx:42`) | the cycle advances on **`PASS`** (`gameEngine.ts:536-542`), not on a failed validation | misleading |

**The real rule:**

| User action | Effect |
|---|---|
| Correct in cycle 1 | → APRENDIDAS |
| Correct in cycles 2-4 | stays in its cycle, `hits` + 1 |
| Leaves the card (`PASS`) | → next cycle, capped at `globalCycle + 1` and 4 |
| Incorrect validation | stays, attempt recorded with its similarity percentage |

### D2 — The session summary shows the wrong cycle distribution

`_calculateSummary` (`gameEngine.ts:619-643`):

```ts
if (assoc.isLearned) summary.learned++;
else switch (assoc.currentCycle) {
  case 4: case 5: summary.known++;       break;   // FRECUENTE
  case 3:         summary.recognized++;  break;   // RECONOCIDA
  case 2:         summary.seen++;        break;   // VISTA
}
// cycle 1 and cycle 5-fallthrough other than 4/5: no bucket
```

`FinishedScreen.tsx:25-66` maps them as:

| Tile | Value rendered | Correct value |
|---|---|---|
| `NUEVA` (nivel 0) | `summary.seen` → cycle 2 | cycle 1 has **no bucket at all** |
| `VISTA` (nivel 1) | `summary.recognized` → cycle 3 | `summary.seen` |
| `RECONOCIDA` | **tile does not exist** | `summary.recognized` |
| `FRECUENTE` (nivel 3+) | `summary.known` → cycle 4 | correct |
| `✅ APRENDIDAS` (1er ciclo) | `summary.learned` | correct |

**Three defects:** two tiles are mislabelled by one full cycle, one tile is missing, and cards still sitting in cycle 1 are counted nowhere, so the four tiles plus APRENDIDAS need not add up to the deck size.

Worked example — deck of 6: one card learned, one in cycle 2, one in cycle 3, two in cycle 4, one stuck failing in cycle 1.

| Tile | Renders | Truth |
|---|---|---|
| NUEVA | 1 (the cycle-2 card) | 1 (the stuck card) — coincidentally equal, semantically wrong |
| VISTA | 1 (the cycle-3 card) | 1 (the cycle-2 card) |
| RECONOCIDA | — missing | 1 (the cycle-3 card) |
| FRECUENTE | 2 | 2 |
| APRENDIDAS | 1 | 1 |
| **Total shown** | **5** | **6** — one card silently unaccounted for |

### D3 — The presentation is dense, not simple

Evidence in `CycleProgress.tsx`:

| Source of noise | Evidence |
|---|---|
| Two unrelated layouts | `if (isMobile)` at ~line 100 forks the entire component; desktop and mobile count and label differently |
| `direction: rtl` layout trick | desktop root `style={{ direction: 'rtl' }}` with per-child `ltr` resets |
| Expand/collapse on both platforms | `isExpanded` state, `▶ ◀ ▼` controls |
| ~15 distinct emoji | `📊 🔄 ⏳ ✅ 📦 ⬇ ❌ 🔁 📌 ▶ ◀ ➜ ▼ ✨` |
| The same rules rendered twice | rules appear inside the expanded panel and again in the desktop footer row |
| Jargon with no explanation | `niv 0`, `niv 1`, `niv 2`, `niv 3+` |
| Sub-legible type | `text-[0.4rem]`, `text-[0.45rem]`, `text-[0.5rem]` |
| A second percentage competing with the counts | `progressPercentage` = learned/total, displayed as "Progreso real" next to per-cycle counts that use a different denominator |
| Five colour palettes for four states | `CYCLE_COLORS` (4) + `APRENDIDA_OVERRIDES` |

### D4 — Three competing vocabularies for the same four states

| Source | Names used |
|---|---|
| `src/utils/cycle-colors.ts:1-6` | `NUEVA · VISTA · RECONOCIDA · FRECUENTE` |
| `src/utils/progress.ts:40-52` | bucket keys `nuevas · vistas · reconocidas · conocidas · aprendidas` |
| `src/components/layout/GoalWidget.tsx:9-12` | `Nuevas · Vistas · Reconocidas` — **no 4th state** |
| `src/components/cards/BigListCard.tsx:7-10` | `Nuevas · Vistas · Reconocidas` — **no 4th state** |
| `src/components/game/FinishedScreen.tsx:25-66` | `NUEVA · VISTA · FRECUENTE · APRENDIDAS` — **no 3rd state** |
| `src/components/views/TermsOfService.tsx:27` | `New → Seen → Recognized → Known → Learned` (English, 5 stages) |
| `src/components/views/LandingPage.tsx:102-117` | `NUEVA · VISTA · RECONOCIDA · FRECUENTE` (matches the source of truth) |

A user who reads the dashboard, then the game, then the summary sees different names and a different number of states each time.

### D5 — Ten "spaced repetition" claims the engine does not support

Public:

| Location | Text |
|---|---|
| `src/components/views/LandingPage.tsx:264` | "Flashcards con repetición espaciada para aprender idiomas." |
| `src/components/views/TermsOfService.tsx:25` | "Glimmind is a spaced repetition flashcard application" |
| `src/components/views/TermsOfService.tsx:27` | "4-cycle spaced repetition (New → Seen → Recognized → Known → Learned)" |
| `src/components/views/TermsOfService.tsx:83` | "Spaced repetition algorithms are educational aids..." |
| `src/components/views/PrivacyPolicy.tsx:23` | "Spaced repetition state, cycles, review history, statistics" |
| `src/components/views/PrivacyPolicy.tsx:32` | "(sync, spaced repetition, voice study)" |
| `src/components/views/CookiePolicy.tsx:63` | "spaced repetition state" |

Internal: `README.md:13`, `docs/LAUNCH_PLAN.md:78`, `docs/PLAN_NEW_LOOK_AND_FEEL.md:166`.

`docs/SERVICE_CATALOG.md:114` already records the truth: *"Spaced repetition | Marketing copy | NOT IMPLEMENTED — cycles 1 to 4 are plain repeats, with no review intervals or due dates."*

Two of these are wrong twice over: `PrivacyPolicy.tsx:32` also promises **sync** (broken, `docs/issues/P1/2026-10-12-sync-config-sin-conectar.md`) and `PrivacyPolicy.tsx:23` promises **statistics** (`featureFlags.reports = false`).

---

## 3. Scope

**In scope**

1. Make the on-screen rule match the engine (D1).
2. Fix the session summary mapping and the missing cycle-1 bucket (D2).
3. Simplify `CycleProgress` to one legible component (D3).
4. One vocabulary for the four states across the app (D4).
5. Replace every "spaced repetition" claim with the real mechanism, positioned on transparency (D5).
6. Explain the mechanism on the landing and in the existing demo.

**Out of scope**

- Any spaced-repetition algorithm, including FSRS. Decision recorded in §7: **not adopted.**
- SEO comparison pages naming competitors.
- Pricing changes. Any change to EUR 4.99 belongs to `docs/BUSINESS_MODEL.md` alone (§44).
- Fixes to the 8 open P1 issues listed in `docs/issues/README.md`.

---

## 4. Phases

### Phase 1 — Make the mechanism truthful

| # | File | Change |
|---|---|---|
| 1.1 | `src/components/game/CycleProgress.tsx` | replace the three rule chips with the real rule, stated **once** per layout |
| 1.2 | `src/components/views/LandingPage.tsx:42` | reword so advancing is attributed to leaving the card, not to failing |
| 1.3 | `src/components/game/FinishedScreen.tsx` | add the `RECONOCIDA` tile, relabel `NUEVA`/`VISTA`, add the cycle-1 bucket (see §7.2) |
| 1.4 | `src/services/gameEngine.ts` | extend `_calculateSummary` with a `new` bucket so the totals reconcile |
| 1.5 | `glimmind-engine.md` | document the real rule in the "Session Termination and Cycle Progression Logic" section |
| 1.6 | `tests/services/gameEngine.test.ts` | assert the summary buckets reconcile to the deck size |
| 1.7 | `tests/components/game/CycleProgress.test.tsx` | assert the rendered rule text matches the engine |

**Gate:** `npx tsc --noEmit` empty, `npx vitest run tests/services/gameEngine.test.ts tests/components/game/CycleProgress.test.tsx`.

### Phase 2 — Simplicity

| # | File | Change |
|---|---|---|
| 2.1 | `src/components/game/CycleProgress.tsx` | one row of four stages plus APRENDIDAS; delete `niv 0/1/2/3+`, the duplicate rules, the second percentage, and the excess emoji |
| 2.2 | same | collapse the `isMobile` fork into one layout that adapts, instead of two that disagree |
| 2.3 | same | raise the smallest type to a legible floor (today `0.4rem`) |
| 2.4 | `src/components/game/CycleMiniBar.tsx` | keep only pending/correct and the stage name; drop decorative borders and shadows if they survive 2.1 |
| 2.5 | `tests/components/game/CycleProgress.test.tsx` | update to the simplified structure |

**Gate:** same as phase 1 plus `npx playwright test` (the game spec exercises this screen).

### Phase 3 — One vocabulary

| # | File | Change |
|---|---|---|
| 3.1 | `src/utils/cycle-colors.ts` | keep `CYCLE_LABELS` as the single source of truth for the four names |
| 3.2 | `src/utils/progress.ts` | rename bucket keys to match, keeping `StateBreakdown` callers correct |
| 3.3 | `src/components/layout/GoalWidget.tsx` | add the missing 4th state |
| 3.4 | `src/components/cards/BigListCard.tsx` | add the missing 4th state |
| 3.5 | `src/components/game/FinishedScreen.tsx` | use `CYCLE_LABELS` instead of hard-coded strings |
| 3.6 | `src/components/views/TermsOfService.tsx` | align with the chosen names |

Every rename must be followed by `grep -r "<oldName>" src/` (§36) and a full `tsc` run.

**Gate:** `npx tsc --noEmit` empty, `npx vitest run`.

### Phase 4 — Position the mechanism

| # | File | Change |
|---|---|---|
| 4.1 | the 7 public + 3 internal locations in D5 | remove "spaced repetition" / "repetición espaciada"; describe the four visible states |
| 4.2 | `src/components/views/LandingPage.tsx` | expand the cycle section with the transparency argument: you can see where every word is and why |
| 4.3 | `docs/audits/2026-10-20-market-positioning.md` §2 | make the 4-cycle mechanism the lead differentiator; record competitors' hidden scheduling |
| 4.4 | `docs/SERVICE_CATALOG.md` §7 | mark the spaced-repetition row as withdrawn rather than "not implemented" |
| 4.5 | `docs/BUSINESS_MODEL.md` | record that FSRS/SRS was evaluated and rejected, with the positioning consequence |

**Gate:** `grep -rni "spaced repetition\|repetición espaciad" src/` returns only `docs/` references, never user-facing strings.

---

## 5. Test obligations

| Area | Suite |
|---|---|
| Engine summary buckets | `tests/services/gameEngine.test.ts` |
| Cycle panel rendering | `tests/components/game/CycleProgress.test.tsx` |
| Landing cycle copy | `tests/components/LandingDemo.test.tsx` |
| Keyboard sequences if `PASS` is renamed | `tests/services/gameEngine.test.ts`, `tests/services/practiceMode.test.ts` |

Per §37, assertions must be updated to the new labels; no assertion may be weakened to make a suite pass.

---

## 6. Release

Per §30 every commit to `main` bumps the version in **both** `src/constants/version.ts` (`APP_VERSION`) and `package.json`. Phases 1-3 are fixes → patch. Phase 4 changes public copy and landing content → minor. Run `npm run version:bump` before deploy; never reuse a version.

---

## 7. Open decisions

### 7.1 How to label the action that advances a cycle

The engine advances a card on `PASS`. Today the buttons read "Pass / Next" and "Reveal / Correct".

| Option | Effect |
|---|---|
| Keep `PASS`, describe it as "lo dejas pasar" | no code or test churn; the rule line must explain the term |
| Rename to "No lo sé" / "Skip" | clearer rule, but touches `glimmind-engine.md`, the Tab-sequence spec and keyboard tests |

Not decided. Affects phase 1.1 and 1.5.

### 7.2 What to do with cycle-1 cards that are neither learned nor advanced

Today they are counted nowhere in `_calculateSummary`.

| Option | Effect |
|---|---|
| Add a `new` bucket and a `NUEVA` tile | totals reconcile to the deck size; one more tile on screen |
| Fold them into APRENDIDAS | simpler screen, but overstates mastery |
| Leave them out and show a "sin resolver" count | honest, but adds a fifth tile |

Not decided. Affects phase 1.3 and 1.4.

---

## 8. Why none of this was caught

### 8.1 Why a human never saw it

| Cause | Evidence |
|---|---|
| **The false rule text is hidden by default** | `CycleProgress.tsx:54` `const [isExpanded, setIsExpanded] = useState(false)`. Mobile rules (232-242) sit inside the wrapper at line 174 (`max-h-0 opacity-0`); desktop rules (325-347) sit inside the wrapper at line 254 (`max-w-0 opacity-0`). Both are invisible until the user taps "Toca para ver detalles". The default view shows counts only. |
| **The wrong numbers look plausible** | `FinishedScreen` shifts each label one cycle forward. A cycle-2 card labelled `NUEVA` still displays a small believable number. Nothing is flagged unless the tiles are summed against the deck size, which the screen never does. |
| **The vocabulary changes between screens** | The dashboard (`GoalWidget`, `BigListCard`) names 3 states, the game names 4, the summary names 4 misaligned, the terms name 5 in English. A user looks at one screen per session, so the mismatch only appears when two are compared deliberately. |
| **The false rule sounds right** | "Falla → siguiente nivel" is exactly what a spaced-repetition system is expected to do. It is only wrong because Glimmind advances on `PASS`. Nobody reads `gameEngine.ts` while playing. |
| **The summary appears once, at the moment attention is lowest** | It renders only at session end, on the "finished" screen. |

### 8.2 Why no test caught it

| Suite | What it asserts | What it misses |
|---|---|---|
| `tests/components/game/CycleProgress.test.tsx` (88 lines) | structural only: `train` not null, arrow present, `"Toca para ver detalles"` exists, `"📊 Tú progreso por ciclo"` present/absent, className contains `min-h-[320px]`, toggle present | **0 assertions on rule text, cycle labels or counts.** The rule text could be changed to any string and the suite stays green. |
| `FinishedScreen` | **no test file exists** — `grep -rn "FinishedScreen" tests/` returns nothing | the entire label→value mapping |
| `tests/services/gameEngine.test.ts` | progression, gating, and one assertion on `summary.learned` (line 999) | the other three buckets and whether they reconcile to the deck size |
| Playwright (10 specs) | `grep` for `NUEVA\|RECONOCIDA\|APRENDIDAS\|summary` in `e2e/` returns nothing; `03-game-real.spec.ts` is 55 lines and never reaches session end | the summary screen and the cycle panel content are never exercised end to end |
| `tests/components/LandingDemo.test.tsx:130` | asserts `FRECUENTE` — on the landing demo only | does not cover the in-game or summary screens |

**Root cause:** the suites protect *behaviour* (engine progression, gating) and *structure* (component renders), but there is no contract between the copy and the engine. The rule text lives in a component; the rule lives in `gameEngine.ts`; nothing asserts they agree.

### 8.3 Preventive obligations added to this plan

| # | Obligation |
|---|---|
| P-1 | Assert the rendered rule text in `CycleProgress.test.tsx` — a string that must match the engine behaviour, not merely exist. |
| P-2 | Create `tests/components/game/FinishedScreen.test.tsx` asserting label→value mapping for all five states. |
| P-3 | Assert in `tests/services/gameEngine.test.ts` that the summary buckets sum to the non-archived deck size. |
| P-4 | Extract the cycle rule into one exported constant consumed by both `CycleProgress` and the landing, so a single edit changes both and a test can assert the constant instead of a duplicated literal. |
| P-5 | One Playwright spec that plays a session to completion and asserts the summary tiles. |

---

## 9. Verification checklist

```
1. npx tsc --noEmit                     -> empty
2. npx vitest run                       -> all pass, counts pasted
3. npx playwright test                  -> game specs pass
4. grep -rni "spaced repetition" src/   -> no user-facing hits
5. grep -rni "niv 0\|niv 1\|niv 2\|niv 3" src/ -> no hits
6. ls <new/changed file>                -> exists
7. git diff                             -> only in-scope files
8. version bumped in both files         -> yes
```

Until every line holds, this task is not done (§43).
