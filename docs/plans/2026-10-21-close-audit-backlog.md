# Plan: Close the 2026-10-20 audit backlog (phases A, B, C)

**Date:** 2026-10-21 (reconstructed from the chat-only plan agreed on 2026-10-20)
**Status:** Approved for execution 2026-10-21 (user reviewed the document). Phases A-C below. Docs-only work on branch `docs/audit-closeout-abc`; merge directly to `main` without a PR (user decision: no PRs for non-code changes).
**Request:** Execute the three-phase closeout agreed in the session *"Auditoría y plan de mejora de Glimmind"* (2026-10-20), which never reached disk: (A) rebuild `market-positioning.md` §2/§4 from verified external research; (B) file the three usability gaps that exist only inside the audit; (C) produce the unified improvement roadmap that joins every finding with the market fronts.

**Provenance:** the original plan lived only in that conversation (`recall` confirms no file was ever written for it). This document is its materialized form, with current status verified against the repository on 2026-10-21.

---

## 1. Feature map

| Feature | Root path | State | Metrics | Pending |
|---|---|---|---|---|
| Market positioning research | `docs/audits/2026-10-20-market-positioning.md` | partial | §2/§4 lack verified prices/sources | A-1, A-2, A-3 |
| Usability gap filing | `docs/audits/2026-10-20-usability-gaps.md`, `docs/issues/` | partial | 4 of 7 new gaps filed; U-12/U-13/U-17 unpicked | B-1, B-2, B-3 |
| Improvement roadmap | `docs/audits/2026-10-20-improvement-roadmap.md` | dead (file absent) | 0 lines | C-1, C-2, C-3 |

## 2. Current status (verified 2026-10-21)

| Phase | Original scope | Status | Evidence |
|---|---|---|---|
| A | Market research → rewrite §2/§4 + FSRS issue | **~50%** | No verified prices in `market-positioning.md` (0 hits for `$24.99` / Anki price); §2 got only the cycle-era differentiation line (`:67`); FSRS recorded in `BUSINESS_MODEL.md §7` (2026-10-21) but never filed as an issue |
| B | U-12, U-13, U-17 → `docs/issues/P2/` + index | **0%** | `usability-gaps.md:38` still says *"documented in this audit only … pending a plan"*; 0 mentions of U-12/U-13/U-17 under `docs/issues/` |
| C | `docs/audits/2026-10-20-improvement-roadmap.md` | **0%** | `ls` → *No such file or directory* |

---

## 3. Phase A — Verified market research → rewrite the positioning document

Goal: §2 and §4 stop being opinion and become sourced facts.

- [ ] **A-1 Research (web search).** Collect with source URL + retrieval date: official prices and plan structure of the direct competitors (Anki free + AnkiMobile/AnkiDroid pricing, Quizlet tiers, Memrise, Duolingo), headline features, app-store ratings where available, and a shortlist of target keywords (`vs/anki`, `vs/duolingo`, language-learning pricing, "spaced repetition alternative" family). Every number in A-2 must trace to a source captured here.
- [ ] **A-2 Rewrite §2 "Positioning framework"** with the verified data and inline sources. Keep the 4-cycle/FSRS contrast already established (`market-positioning.md:67`, shipped with v1.41.0). Do not decide pricing for Glimmind itself (`BUSINESS_MODEL.md` owns that; §8 still open).
- [ ] **A-3 Rewrite §4 "SEO baseline"** with the keyword shortlist from A-1 (current volume/difficulty where estimable, plus the planned `/vs/*` comparison routes already named at `:156`).
- [ ] **A-4 FSRS gap → issue** — *re-check before opening anything*: the gap is already recorded as a **decision** in `BUSINESS_MODEL.md §7` (2026-10-21: FSRS rejected, cycles stay rule-based) and in `market-positioning.md`. Per AGENTS §44 a closed decision is not a defect; unless A-1 surfaces a contradicting fact, mark A-4 **carried over / satisfied** and open no issue. Record the reasoning in §6 of this plan.

**Phase A gate:** every claim in §2/§4 has a source URL + date; grep for prices returns only sourced rows; no Glimmind pricing decisions written.

---

## 4. Phase B — File the three gaps that live only in the audit

- [ ] **B-1** Create three issues under `docs/issues/P2/` (format per AGENTS §44: What / Impact / Evidence / Fix — concise, no execution plan), sourced from the audit sections:
  - `U-12` `GameView` has no deck-load error state → from `usability-gaps.md` §3
  - `U-13` Mixed-language UI (ES / AR-ES / EN) with no switcher → from §4 (prerequisite for i18n, see the same file's priority table `:158`)
  - `U-17` Guest sees an empty deck store (catalogue short-circuits to `[]`) → from §5
- [ ] **B-2** Update `docs/issues/README.md`: three new rows + counts line (`0 P0 · 9 P1 · 23 P2` → `26 P2`).
- [ ] **B-3** Update `usability-gaps.md:38` so the audit no longer claims the three gaps are unpicked (point at the new issue files). Keeps §44 index and evidence in sync.

**Phase B gate:** `ls docs/issues/P2/2026-10-2*` shows the three files; README counts match reality; the audit note links to them.

---

## 5. Phase C — The unified improvement roadmap

- [ ] **C-1** Create `docs/audits/2026-10-20-improvement-roadmap.md`: one prioritized table that joins **every** gap from the three audits (`app-state`, `usability-gaps`, `market-positioning`) with the market fronts, columns: `ID | Source document | Priority | Impact | Effort | Status | Issue/plan link`. Rows must reference existing evidence (`file:line` or issue path) — no invented items, no items missing from the source audits.
- [ ] **C-2** Traceability: each of the 20 audit gaps resolves to exactly one row whose Status column says *filed* (issue path), *planned* (plan path), *done* (issue in `docs/issues/done/`), or *open* (nothing yet). The matrix is how a future session knows what is still loose.
- [ ] **C-3** Refresh the headers of the three audit reports: add the roadmap as a sibling link and update any status line the filing in Phase B invalidated.

**Phase C gate:** gap count in the roadmap = gap count in the three audits (counted mechanically, not by eye); every Status that claims *filed* resolves to an existing file.

---

## 6. Execution rules

- Order: **A → B → C** (C's traceability needs B's issues to exist).
- Docs-only change set: no `src/`, no `backend/`. Still run `npx tsc --noEmit` and `npx vitest run` before declaring done (AGENTS §34) and paste both outputs.
- Commit split (only when the user asks): one commit per phase — `docs: verify competitor data in market-positioning (A)`, `docs: file U-12/U-13/U-17 as P2 issues (B)`, `docs: add the2026-10-20 improvement roadmap (C)`.
- The working tree currently holds **unrelated paused changes** (`docs/LAUNCH_PLAN.md` v1.1, `docs/issues/P2/2026-10-21-env-backups-trackeados-y-debug-env.md`, `docs/issues/README.md`) from the LAUNCH_PLAN audit the user put on hold. This plan must not stage them; resolve that pause separately before any commit.
- Live external facts (prices, ratings) are captured with URL + date; anything unverifiable is marked *unverified* in §2 of the roadmap, not guessed.

## 7. Out of scope

- Executing any fix from the roadmap (each fix becomes its own plan/issue later, per §44).
- Glimmind pricing/tier decisions (`BUSINESS_MODEL.md` §8 owns them).
- The P1 queue (9 open behavioural bugs) — separate track.
- The paused LAUNCH_PLAN audit deliverable.

---

## 8. Definition of done

- [ ] A-1..A-3 done, sources present, Phase A gate passed
- [ ] A-4 disposition recorded (satisfied or issued) with reasoning
- [ ] B-1..B-3 done, Phase B gate passed
- [ ] C-1..C-3 done, Phase C gate passed
- [ ] `npx tsc --noEmit` empty; `npx vitest run` green (outputs pasted here)
- [ ] User confirms the closeout in this document's §6 log
