# Plan: Close the 2026-10-20 audit backlog (phases A, B, C)

**Date:** 2026-10-21 (reconstructed from the chat-only plan agreed on 2026-10-20)
**Status:** Approved for execution 2026-10-21 (user reviewed the document). Phases A-C below. Docs-only work on branch `docs/audit-closeout-abc`; merge directly to `main` without a PR (user decision: no PRs for non-code changes).
**Request:** Execute the three-phase closeout agreed in the session *"Auditoría y plan de mejora de Glimmind"* (2026-10-20), which never reached disk: (A) rebuild `market-positioning.md` §2/§4 from verified external research; (B) file the three usability gaps that exist only inside the audit; (C) produce the unified improvement roadmap that joins every finding with the market fronts.

**Provenance:** the original plan lived only in that conversation (`recall` confirms no file was ever written for it). This document is its materialized form, with current status verified against the repository on 2026-10-21.

---

## 1. Feature map

| Feature | Root path | State | Metrics | Pending |
|---|---|---|---|---|
| Market positioning research | `docs/audits/2026-10-20-market-positioning.md` | active | §2.6 prices + §4.1 keywords, all sourced 2026-10-21 | none |
| Usability gap filing | `docs/audits/2026-10-20-usability-gaps.md`, `docs/issues/` | active | 7 of 7 new gaps filed; 26 P2 in index | none |
| Improvement roadmap | `docs/audits/2026-10-20-improvement-roadmap.md` | active | 34 rows = 20 U + 5 AS + 9 MP; 20 filed · 9 planned · 3 open · 2 done | none |

## 2. Current status (verified 2026-10-21)

| Phase | Original scope | Status | Evidence |
|---|---|---|---|
| A | Market research → rewrite §2/§4 + FSRS issue | **done 2026-10-21** | `market-positioning.md` §2.6 (5 sourced competitor rows) + §4.1 (6 keyword families, volumes `unverified`); §2.5 FSRS line kept; A-4 disposition in §6.1 below |
| B | U-12, U-13, U-17 → `docs/issues/P2/` + index | **done 2026-10-21** | three issue files dated 2026-10-21; README counts `0 P0 · 9 P1 · 26 P2`; `usability-gaps.md` register rows and count note updated |
| C | `docs/audits/2026-10-20-improvement-roadmap.md` | **done 2026-10-21** | 34-row roadmap (20 U + 5 AS + 9 MP), all `docs/` links verified, three audit headers linked to it |

---

## 3. Phase A — Verified market research → rewrite the positioning document

Goal: §2 and §4 stop being opinion and become sourced facts.

- [x] **A-1 Research (web search).** Collect with source URL + retrieval date: official prices and plan structure of the direct competitors (Anki free + AnkiMobile/AnkiDroid pricing, Quizlet tiers, Memrise, Duolingo), headline features, app-store ratings where available, and a shortlist of target keywords (`vs/anki`, `vs/duolingo`, language-learning pricing, "spaced repetition alternative" family). Every number in A-2 must trace to a source captured here.
- [x] **A-2 Rewrite §2 "Positioning framework"** with the verified data and inline sources. Keep the 4-cycle/FSRS contrast already established (`market-positioning.md:67`, shipped with v1.41.0). Do not decide pricing for Glimmind itself (`BUSINESS_MODEL.md` owns that; §8 still open).
- [x] **A-3 Rewrite §4 "SEO baseline"** with the keyword shortlist from A-1 (current volume/difficulty where estimable, plus the planned `/vs/*` comparison routes already named at `:156`).
- [x] **A-4 FSRS gap → issue** — *re-check before opening anything*: the gap is already recorded as a **decision** in `BUSINESS_MODEL.md §7` (2026-10-21: FSRS rejected, cycles stay rule-based) and in `market-positioning.md`. Per AGENTS §44 a closed decision is not a defect; unless A-1 surfaces a contradicting fact, mark A-4 **carried over / satisfied** and open no issue. Record the reasoning in §6 of this plan.

**Phase A gate:** every claim in §2/§4 has a source URL + date; grep for prices returns only sourced rows; no Glimmind pricing decisions written.

---

## 4. Phase B — File the three gaps that live only in the audit

- [x] **B-1** Create three issues under `docs/issues/P2/` (format per AGENTS §44: What / Impact / Evidence / Fix — concise, no execution plan), sourced from the audit sections:
  - `U-12` `GameView` has no deck-load error state → from `usability-gaps.md` §3 → `docs/issues/P2/2026-10-21-gameview-sin-estado-de-error.md`
  - `U-13` Mixed-language UI (ES / AR-ES / EN) with no switcher → from §4 (prerequisite for i18n, see the same file's priority table `:158`) → `docs/issues/P1/2026-10-21-ui-mezcla-tres-idiomas-sin-switcher.md` (filed in `P2/` on 2026-10-21, elevated to P1 on 2026-10-22)
  - `U-17` Guest sees an empty deck store (catalogue short-circuits to `[]`) → from §5 → `docs/issues/P2/2026-10-21-guest-ve-tienda-de-mazos-vacia.md`
- [x] **B-2** Update `docs/issues/README.md`: three new rows + counts line (`0 P0 · 9 P1 · 23 P2` → `26 P2`).
- [x] **B-3** Update `usability-gaps.md:38` so the audit no longer claims the three gaps are unpicked (point at the new issue files). Keeps §44 index and evidence in sync.

**Phase B gate:** `ls docs/issues/P2/2026-10-2*` shows the three files; README counts match reality; the audit note links to them.

---

## 5. Phase C — The unified improvement roadmap

- [x] **C-1** Create `docs/audits/2026-10-20-improvement-roadmap.md`: one prioritized table that joins **every** gap from the three audits (`app-state`, `usability-gaps`, `market-positioning`) with the market fronts, columns: `ID | Source document | Priority | Impact | Effort | Status | Issue/plan link`. Rows must reference existing evidence (`file:line` or issue path) — no invented items, no items missing from the source audits.
- [x] **C-2** Traceability: each of the 20 audit gaps resolves to exactly one row whose Status column says *filed* (issue path), *planned* (plan path), *done* (issue in `docs/issues/done/`), or *open* (nothing yet). The matrix is how a future session knows what is still loose.
- [x] **C-3** Refresh the headers of the three audit reports: add the roadmap as a sibling link and update any status line the filing in Phase B invalidated.

**Phase C gate:** gap count in the roadmap = gap count in the three audits (counted mechanically, not by eye); every Status that claims *filed* resolves to an existing file.

---

## 6. Execution rules

- Order: **A → B → C** (C's traceability needs B's issues to exist).
- Docs-only change set: no `src/`, no `backend/`. Still run `npx tsc --noEmit` and `npx vitest run` before declaring done (AGENTS §34) and paste both outputs.
- Commit split (only when the user asks): one commit per phase — `docs: verify competitor data in market-positioning (A)`, `docs: file U-12/U-13/U-17 as P2 issues (B)`, `docs: add the2026-10-20 improvement roadmap (C)`.
- The working tree currently holds **unrelated paused changes** (`docs/LAUNCH_PLAN.md` v1.1, `docs/issues/P2/2026-10-21-env-backups-trackeados-y-debug-env.md`, `docs/issues/README.md`) from the LAUNCH_PLAN audit the user put on hold. This plan must not stage them; resolve that pause separately before any commit.
- Live external facts (prices, ratings) are captured with URL + date; anything unverifiable is marked *unverified* in §2 of the roadmap, not guessed.

### 6.1 Disposition and gate log

**Phase A — 2026-10-21 (gate passed):**
- A-1 sources captured: Anki (apps.ankiweb.net, App Store id373493387, opentherank 2026-10-14, AppBrain 2026-10-17), Quizlet (`quizlet.com/upgrade` + Play Store), Memrise (`app.memrise.com/payment/plans/en` + Play Store), Duolingo (Play Store + onlinecourseing 2026-09-27 + mindomax 2026-10-13; nibble 2026-06-20 for Max, marked *unverified*), Glimmind price from code (`LandingPage.tsx:239`, `stripeService.js:76`). All rows in the rewritten `market-positioning.md` §2.6 carry URL + retrieval date (2026-10-21); §4.1 marks every volume `unverified` (no keyword tool access).
- Glimmind's €4.99 row is stated as a **shipped fact read from code**, not a pricing decision; the row points to `BUSINESS_MODEL.md` §8 for any future pricing decision.
- Phase A gate: grep for prices returns only sourced rows; no Glimmind pricing decision written; 4-cycle/FSRS contrast at `market-positioning.md` §2.5 (:67 base) kept intact.

**A-4 disposition — carried over / satisfied, no issue opened.** Reasoning: the FSRS gap is already closed as a *decision*, not a defect — `BUSINESS_MODEL.md` §7 (2026-10-21) records FSRS rejected with rule-based cycles, and `market-positioning.md` §2.2/§2.5 states the honest framing ("cycles have no intervals; calling it spaced repetition would be false"). AGENTS §44 forbids filing non-defects (a resolved product decision) as issues. A-1 surfaced no contradicting fact: competitors' use of FSRS/SM-2 (Anki FSRS 6, app-store apps advertising FSRS) strengthens the §2.5 differentiation but creates no defect in Glimmind — algorithm choice stays owned by `BUSINESS_MODEL.md` §7.

**Phase B — 2026-10-21 (gate passed):**
- `ls docs/issues/P2/2026-10-2*` → 10 files including the three new: `2026-10-21-gameview-sin-estado-de-error.md`, `2026-10-21-ui-mezcla-tres-idiomas-sin-switcher.md`, `2026-10-21-guest-ve-tienda-de-mazos-vacia.md`.
- `ls docs/issues/P2 | wc -l` → `26`; unique `[\`P2/…\`]` rows in `docs/issues/README.md` → `26`; every P2 file has a row (loop over files: 0 missing). Counts line now `0 P0 · 9 P1 · 26 P2 · 24 done · 3 backlog` (done/backlog verified mechanically: 24/3).
- `usability-gaps.md` register: the three new rows now carry issue paths as evidence; the §1 count note and the header companion line were rewritten; evidence for the cited code (`App.tsx:314-323`, `GameView.tsx:287-293`, `prebuiltDeckService.ts:12-15`, `quotaService.ts:78`, `index.html:3`) re-verified with `sed`/`grep` before filing.

**Phase C — 2026-10-21 (gate passed):**
- Gap counts, mechanical: `grep -c "^| U-" usability-gaps.md` → `20` = the 20 U rows; roadmap rows `grep -cE '^\| (U|AS|MP)-[0-9]+'` → `34` (20 U + 5 AS + 9 MP per the selection rules in roadmap §1); duplicate-ID check → none.
- Status distribution in roadmap: `filed` 20 · `planned` 9 · `open` 3 · `done` 2 = 34. Link-existence loop over every `docs/…md` reference in the roadmap → 0 missing.
- Three audit headers link the roadmap as sibling; `usability-gaps.md` companion line and `market-positioning.md` "Updated" line reflect the Phase A/B changes.

**Verification gates (AGENTS §34):** `npx tsc --noEmit` and `npx vitest run` outputs pasted in §8 when executed.

## 7. Out of scope

- Executing any fix from the roadmap (each fix becomes its own plan/issue later, per §44).
- Glimmind pricing/tier decisions (`BUSINESS_MODEL.md` §8 owns them).
- The P1 queue (9 open behavioural bugs) — separate track.
- The P1 queue (9 open behavioural bugs) — separate track.
- ~~The paused LAUNCH_PLAN audit deliverable~~ — already resolved on 2026-10-21 (PR #8, merged to `main` as v1.1).

---

## 8. Definition of done

- [x] A-1..A-3 done, sources present, Phase A gate passed
- [x] A-4 disposition recorded (satisfied or issued) with reasoning
- [x] B-1..B-3 done, Phase B gate passed
- [x] C-1..C-3 done, Phase C gate passed
- [x] `npx tsc --noEmit` empty; `npx vitest run` green (outputs pasted here)

```
=== TSC OUTPUT ===
$ npx tsc --noEmit
(empty output)
EXIT=0

=== TEST OUTPUT (tail) ===
$ npx vitest run
 Test Files  85 passed (85)
      Tests  977 passed (977)
   Duration  23.21s
EXIT=0
(the jsdom "Not implemented: navigation" line is pre-existing environment noise, not a failure)
```

- [x] User confirms the closeout in this document's §6 log — confirmed 2026-10-21 when the user approved the commit + direct merge to `main` ("dale con el commit")
