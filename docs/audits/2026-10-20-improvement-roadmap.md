# Improvement Roadmap — unified view of the 2026-10-20 audit backlog

**Date:** 2026-10-21
**Source audits (2026-10-20):** [`2026-10-20-app-state.md`](./2026-10-20-app-state.md), [`2026-10-20-usability-gaps.md`](./2026-10-20-usability-gaps.md), [`2026-10-20-market-positioning.md`](./2026-10-20-market-positioning.md).
**Plan:** [`../plans/2026-10-21-close-audit-backlog.md`](../plans/2026-10-21-close-audit-backlog.md) (Phase C).
**Purpose:** one row per gap, so a future session sees every loose item, its status and its evidence without re-reading three audits.

---

## 1. How rows were enumerated (mechanical, re-runnable)

Selection rules — a row exists if and only if the source audit states it:

| Source | Rule | Rows |
|---|---|---|
| `usability-gaps.md` §1 register | every `| U-nn |` register line | **20** (U-01..U-20) |
| `app-state.md` | pending/blocking items in §1 "Pending" column, §8.1 and §10 that are **not** already a U-xx | **5** (AS-01..AS-05) |
| `market-positioning.md` | gap rows in §1 plus structural gaps in §4 and §6 that are **not** already a U-xx | **9** (MP-01..MP-09) |
| **Total** | | **34** |

Re-runnable counts: `grep -c "^| U-" docs/audits/2026-10-20-usability-gaps.md` → `20`; AS/MP rows cite their source section in the Source column. The plan's "20 audit gaps" (C-2) = the U register; each U gap resolves to exactly one row below, and no AS/MP row duplicates a U gap (overlapping evidence is referenced from the U row instead).

**Status vocabulary** (per plan §5 C-2): `filed` = issue file exists · `planned` = plan/roadmap section owns it · `done` = fixed *or* closed by a recorded decision (the link says which) · `open` = documented only, nothing owns it yet.

**Status distribution:** 20 filed · 9 planned · 3 open · 2 done = 34.

---

## 2. Unified gap register

| ID | Source | Priority | Impact | Effort | Status | Issue / plan link |
|---|---|---|---|---|---|---|
| U-01 | usability-gaps §1/§2 | P1 | Premium sync has no callers; progress is localStorage-only | large | filed | `docs/issues/P1/2026-10-12-sync-config-sin-conectar.md` |
| U-02 | usability-gaps §1/§2 | P1 | Sign-in after a guest session erases the guest's local decks | large | done | `docs/issues/done/2026-10-13-guest-decks-erased-on-user-switch.md` (resolved 2026-10-22 via disclosed disclaimer; migration declined) |
| U-03 | usability-gaps §1 | P1 | "Regresar al panel" returns to `/game` on first play | small | filed | `docs/issues/P1/2026-10-13-regresar-al-panel-vuelve-a-game.md` |
| U-04 | usability-gaps §1 | P1 | `transcribeExistingAudio` can only ever answer 502 | small | filed | `docs/issues/P1/2026-10-12-transcribe-existing-audio-roto.md` |
| U-05 | usability-gaps §1 | P1 | Mobile STT grades multi-word phrases on the first word | medium | filed | `docs/issues/P1/2026-08-24-mobile-stt-premature-final.md` |
| U-06 | usability-gaps §1 | P1 | Recordings stored base64 in Firestore documents | large | filed | `docs/issues/P1/2026-10-12-audio-base64-en-firestore.md` |
| U-07 | usability-gaps §1 | P1 | Deck count uncapped: 10 000 one-word decks pass every limit | medium | filed | `docs/issues/P1/2026-10-12-sin-tope-de-mazos-por-usuario.md` |
| U-08 | usability-gaps §1 | P1 | STT allowance bypassed by under-reporting `audioDuration` | medium | filed | `docs/issues/P1/2026-10-12-stt-audio-seconds-no-verificar.md` |
| U-09 | usability-gaps §1/§7 · app-state §8.1 | P1 | Whole UI styled by `cdn.tailwindcss.com` at runtime; global availability risk | medium | filed | `docs/issues/P1/2026-10-20-tailwind-cdn-en-runtime-produccion.md` (covers AS-01: `esm.sh` importmap + `next` dead dep) |
| U-10 | usability-gaps §1/§6 | P2 | Quotas invisible until the user hits a 429 | medium | filed | `docs/issues/P2/2026-10-11-cuotas-invisibles-al-usuario.md` |
| U-11 | usability-gaps §1 | P2 | Raw English browser errors in a Spanish UI | medium | filed | `docs/issues/P2/2026-10-16-error-message-crudo-en-cliente.md` |
| U-12 | usability-gaps §1/§3 | P2 | `GameView` renders the same spinner for loading/empty/failed deck loads | medium | filed | `docs/issues/P2/2026-10-21-gameview-sin-estado-de-error.md` |
| U-13 | usability-gaps §1/§4 · app-state §6 | P2 | Three languages on one screen, no switcher, `lang` hard-coded — blocks every locale | large | filed | `docs/issues/P2/2026-10-21-ui-mezcla-tres-idiomas-sin-switcher.md` |
| U-14 | usability-gaps §1 · app-state §7 | P2 | `role` never assigned; `/admin` bounces through a nonexistent `/403` | small | filed | `docs/issues/P2/2026-10-20-admin-inalcanzable-por-role.md` |
| U-15 | usability-gaps §1 · app-state §3.5 | P2 | `QuickAddModal` and `src/pages/Login.tsx` unreachable | small | filed | `docs/issues/P2/2026-10-20-quickadd-y-login-muertos.md` |
| U-16 | usability-gaps §1 · app-state §8 | P2 | PWA not registered (no manifest/icons/SW) and `cap sync` never run | medium | filed | `docs/issues/P2/2026-10-20-pwa-sin-configurar.md` |
| U-17 | usability-gaps §1/§5 | P2 | Guests see an empty deck store and no quota — the lowest-friction entry shows an empty product | medium | filed | `docs/issues/P2/2026-10-21-guest-ve-tienda-de-mazos-vacia.md` |
| U-18 | usability-gaps §1 | P2 | Progress lives only in the browser; clearing data loses everything | large | open | evidence only: `docs/SERVICE_CATALOG.md` §7.1 |
| U-19 | usability-gaps §1/§2 · market §7 | P2 | Marketing copy promises features that do not exist (refund/chargeback risk) | small | planned | `docs/audits/2026-10-20-market-positioning.md` §7 (Phase 1, order 3) |
| U-20 | usability-gaps §1 · app-state §11 | P2 | GitHub Actions deploy broken on every run since 2026-10-07 | medium | filed | `docs/issues/P2/2026-10-12-deploy-de-github-actions-roto.md` |
| AS-01 | app-state §8.1 | P1 | Production HTML resolves modules via `esm.sh` at runtime; `next` is a dead dependency | small | filed | folded into `docs/issues/P1/2026-10-20-tailwind-cdn-en-runtime-produccion.md` (fix step 4) |
| AS-02 | app-state §10 | P2 | `README.md` and `LAUNCH_CHECKLIST.md` contradict the code (Gemini claims, 604-test gate vs 83 test files) | small | open | evidence: `app-state.md` §10. `LAUNCH_PLAN.md` itself already fixed (v1.1, PR #8, 2026-10-21) |
| AS-03 | app-state §1/§4 | P2 | No email/password registration UI; entry is Google or guest only | medium | open | documented in `app-state.md` §4.6; product-scope decision pending |
| AS-04 | app-state §1/§5.2 · market §5 I-8 | P2 | Pricing displayed in EUR only; no per-market localization | medium | planned | `docs/audits/2026-10-20-market-positioning.md` §5 I-8; decision owner `docs/BUSINESS_MODEL.md` §8 |
| AS-05 | app-state §1 | P2 | Engine has no spaced-repetition intervals ("real SRS" pending) | — | done | closed by decision 2026-10-21: FSRS rejected, cycles stay rule-based — `docs/BUSINESS_MODEL.md` §7 |
| MP-01 | market §1/§4 | P2 | Zero SEO surface: no meta/OG/Twitter/canonical/JSON-LD/favicon/robots/sitemap/hreflang/per-route titles — blocks organic growth | medium | planned | `docs/audits/2026-10-20-market-positioning.md` §4 + §8 Phase 3 |
| MP-02 | market §1/§6.1 | P2 | 0 of 7 funnel events recorded; instrumentation is errors-only — content output cannot be judged | medium | planned | `docs/instrumentation-plan.md` + market §8 Phase 4 |
| MP-03 | market §5 | P2 | No i18n system (0 files, 0 libraries) — blocks every non-Spanish locale | large | planned | market §8 Phase 2 (I-1..I-9) |
| MP-04 | market §1 | P2 | No content surface (blog, guides, changelog) — nothing to rank beyond the landing | large | planned | market §8 Phase 4 |
| MP-05 | market §1/§2.6 | P2 | No proof: 0 testimonials, 0 users, 0 reviews while competitors carry 166K–51.2M reviews | medium | planned | market §8 Phase 6 |
| MP-06 | market §6/§4.1 | P2 | `/vs/anki`, `/vs/duolingo`, `/vs/quizlet` do not exist (`grep "vs/" src/App.tsx` → 0) | medium | planned | market §8 Phase 4; query evidence in market §4.1 |
| MP-07 | market §4 | P2 | Legal pages exist twice (React views + `public/*.html`) → competing indexable pages | small | planned | market §8 Phase 3 |
| MP-08 | market §4 | P2 | `dist/` ships 83 MB unused `onnx/`; hurts load metrics and crawl-budget story | small | filed | `docs/issues/P2/2026-10-11-codigo-muerto-y-endpoints-sin-uso.md` |
| MP-09 | market §1 | P2 | Positioning statement was one line; competitive analysis absent | small | done | resolved by the audit itself: `market-positioning.md` §2.4–§2.6 rewritten 2026-10-21 (closeout Phase A) |

---

## 3. Reading the table

- **P1/P2 vocabulary** follows `docs/issues/README.md`: P1 = behavioural bugs, P2 = debt/hygiene. No P0 is open; every P1 row already has an issue file.
- **Launch-blocking items are not P1** by that vocabulary but gate the international launch anyway: U-13/MP-03 (i18n), MP-01 (SEO), U-09 (styling availability), U-01/U-02 (data trust). The market audit's Phase 0–6 order (`market-positioning.md` §8) and the usability order of attack (`usability-gaps.md` §8) remain the execution sequences.
- **Gaps resolved by this closeout:** AS-05 (decision), MP-09 (audit rewrite), `LAUNCH_PLAN.md` v1.1 (PR #8) — recorded so the next session does not reopen them.
- **Nothing in this roadmap authorises a fix.** Each fix becomes its own plan/issue per `AGENTS.md` §12/§44; pricing and tier decisions stay in `docs/BUSINESS_MODEL.md`.

## 4. Maintenance rule

When an issue is filed, moved to `done/`, or a plan section is created: update the row's Status and link **and** the source audit that lists the gap. The three audits and this roadmap are kept in sync the same way `docs/issues/README.md` is.
