# Usability Gaps Audit

**Date:** 2026-10-20
**Scope:** friction, trust and clarity defects in the current product. Read-only inspection; nothing was modified.
**Sibling documents:** [`2026-10-20-app-state.md`](./2026-10-20-app-state.md), [`2026-10-20-market-positioning.md`](./2026-10-20-market-positioning.md), [`2026-10-20-improvement-roadmap.md`](./2026-10-20-improvement-roadmap.md).
**Companion issues:** every gap marked *new* has a file under [`../issues/`](../issues/) — U-12, U-13 and U-17 were filed on 2026-10-21 (closeout plan Phase B). Gaps marked *tracked* already had one.

Priority follows `docs/issues/README.md`: **P0** bleeding/broken now, **P1** behavioural bugs, **P2** debt and hygiene.

---

## 1. Gap register

| # | Gap | Priority | Status | Evidence |
|---|---|---|---|---|
| U-01 | Multi-device sync does not exist: Premium sells it, nothing calls it | P1 | tracked | `docs/issues/P1/2026-10-12-sync-config-sin-conectar.md` |
| U-02 | Signing in after a guest session erases the guest's local decks | P1 | resolved (disclaimer 2026-10-22; migration declined) | `docs/issues/done/2026-10-13-guest-decks-erased-on-user-switch.md` |
| U-03 | "Regresar al panel" returns to `/game` on the first play of a session | P1 | resolved (2026-10-22, idempotent navigate guard) | `docs/issues/done/2026-10-13-regresar-al-panel-vuelve-a-game.md` |
| U-04 | `transcribeExistingAudio` can only ever answer 502 | P1 | resolved (2026-10-22, dead endpoint removed) | `docs/issues/done/2026-10-12-transcribe-existing-audio-roto.md` |
| U-05 | Mobile STT grades multi-word phrases on the first word | P1 | resolved (2026-10-22, cursor rebuild + 1200 ms silence / 3000 ms cap) | `docs/issues/done/2026-08-24-mobile-stt-premature-final.md` |
| U-06 | Recordings stored base64 in Firestore documents | P1 | resolved (2026-10-22, feature removed; Storage path untouched) | `docs/issues/done/2026-10-12-audio-base64-en-firestore.md` |
| U-07 | No cap on deck count: 10 000 one-word decks pass every limit | P1 | resolved (2026-10-22, `maxDecks` 50/200 transactional + client gate) | `docs/issues/done/2026-10-12-sin-tope-de-mazos-por-usuario.md` |
| U-08 | STT allowance bypassed by under-reporting `audioDuration` | P1 | resolved (2026-10-22, payload-derived seconds; true-up parked) | `docs/issues/done/2026-10-12-stt-audio-seconds-no-verificar.md` |
| U-09 | **Entire UI styled by `cdn.tailwindcss.com` at runtime** | **P1** | **new** | `docs/issues/P1/2026-10-20-tailwind-cdn-en-runtime-produccion.md` |
| U-10 | Quotas invisible until the user hits a 429 | P2 | tracked | `docs/issues/P2/2026-10-11-cuotas-invisibles-al-usuario.md` |
| U-11 | Raw English browser errors in a Spanish UI | P2 | tracked | `docs/issues/P2/2026-10-16-error-message-crudo-en-cliente.md` |
| U-12 | `GameView` has no deck-load error state | P2 | **new** | `docs/issues/P2/2026-10-21-gameview-sin-estado-de-error.md` |
| U-13 | Mixed-language UI (ES / AR-ES / EN) with no switcher | P1 (elevated 2026-10-22) | planned (`docs/plans/2026-10-22-i18n-plan.md`) | `docs/issues/P1/2026-10-21-ui-mezcla-tres-idiomas-sin-switcher.md` |
| U-14 | `/admin` unreachable; `/403` route does not exist | P2 | **new** | `docs/issues/P2/2026-10-20-admin-inalcanzable-por-role.md` |
| U-15 | `QuickAddModal` and `src/pages/Login.tsx` unreachable | P2 | **new** | `docs/issues/P2/2026-10-20-quickadd-y-login-muertos.md` |
| U-16 | PWA installed but not registered: no manifest, icons or service worker | P2 | **new** | `docs/issues/P2/2026-10-20-pwa-sin-configurar.md` |
| U-17 | Guest sees an empty deck store (catalogue short-circuits to `[]`) | P2 | **new** | `docs/issues/P2/2026-10-21-guest-ve-tienda-de-mazos-vacia.md` |
| U-18 | Progress lives only in the browser; clearing data loses everything | P2 | tracked | `docs/SERVICE_CATALOG.md` §7.1 |
| U-19 | Marketing copy promises features that do not exist | P2 | tracked | `docs/BUSINESS_MODEL.md:107`, §4 |
| U-20 | Deploy via GitHub Actions broken since 2026-10-07 | P2 | tracked | `docs/issues/P2/2026-10-12-deploy-de-github-actions-roto.md` |

**Count:** 8 tracked P1 · 1 new P1 · 5 tracked P2 · 6 new P2.
All 7 new findings now have a standalone issue file under `docs/issues/` (`U-09`, `U-14`, `U-15`, `U-16` filed 2026-10-20; `U-12`, `U-13`, `U-17` filed 2026-10-21 by the closeout plan `docs/plans/2026-10-21-close-audit-backlog.md` Phase B).

---

## 2. The three gaps that most damage trust

### U-01 — Sync that does not sync

The user is told their progress follows them. It does not.

```
grep -rn "usePeriodicSync" src/  → only the definition file
grep -rn "progressService" src/  → only the definition file
backend endpoints getProgress / updateProgress / getSessions / getDashboardData → 0 frontend callers
```

Everything lives in `localStorage` (`src/store/gameStore.ts:965-1010`). Clearing browser data, switching device or switching browser means total loss. The Premium tier advertises prioritised sync (`docs/SERVICE_CATALOG.md` §7.3) for a path that has no callers.

**Why it ranks first:** a learner who loses a month of vocabulary stops trusting the product, and no SEO work recovers that.

### U-02 — Guest data destroyed on sign-in

`src/context/AuthContext.tsx:55` removes the guest key on successful Google sign-in. The guest's decks, which only existed in `localStorage`, are then loaded for a different uid and dropped. A first-time visitor who tries the product, likes it, and then registers, loses what they built.

**Why it ranks second:** it punishes exactly the conversion the landing is trying to produce.

### U-19 — Copy that over-promises

| Landing / marketing claim | Reality | Source |
|---|---|---|
| "Estadísticas avanzadas" (Premium) | `featureFlags.reports = false`; `/reports` redirects | `src/components/views/LandingPage.tsx:236` |
| "Exporta todos tus datos" | no exporter wired; `/api/exportUserData` has 0 callers | `src/components/views/LandingPage.tsx:237` |
| "Soporte prioritario" | no support channel exists | `src/components/views/LandingPage.tsx:238` |
| Spaced repetition (engine docs) | cycles are plain repetition, no intervals | `glimmind-engine.md` |
| Exam mode | not implemented | `docs/SERVICE_CATALOG.md` §7 |
| Multi-device sync (Premium) | not implemented | U-01 |

**Why it ranks third:** selling Premium on features that do not exist is a refund and chargeback risk once Stripe volume starts, and it is the fastest way to destroy reviews.

---

## 3. U-12 — `GameView` cannot fail out loud

```
src/App.tsx:314-323      no currentList     → spinner "Loading deck..."
src/components/views/GameView.tsx:287-293   no currentAssociation → plain "Loading..."
```

Three distinct situations render identically: deck still loading, deck empty, deck failed to load. A user with a corrupted or oversized deck stares at an infinite "Loading..." with no retry, no error, no exit other than the navbar.

**Fix:** add a `deckStatus: 'idle' | 'loading' | 'error' | 'ready'` slice to `gameStore`, render an error state with `Retry` and `Back to dashboard`, and keep the spinner for `loading` only.

---

## 4. U-13 — Three languages in one screen

| Language | Where | Example |
|---|---|---|
| Neutral Spanish | most of the UI | "Cargando mazos…" |
| Argentine Spanish | onboarding micro-copy | "Preferís", "Creá", "Explorá" (`docs/ONBOARDING-UX-DESIGN.md`) |
| English | loading, navbar, guest banner, auth, raw errors | `Loading...`, `Dashboard`, `History`, `Settings`, `GuestBanner` |

For a Spanish speaker outside Argentina the regionalism reads as imported copy; for an English visitor nothing is legible. There is no language switcher and `lang` is hard-coded to `es` (`src/index.html:2`), so screen readers and search engines are told one thing only.

**Fix path:** see the i18n phase of `2026-10-20-market-positioning.md` §5. Short-term, before any i18n library lands, normalise everything to neutral Spanish and delete the English strings.

---

## 5. U-17 — The guest lands on an empty product

```
src/services/prebuiltDeckService.ts:12-15  if (isGuest) return [];
src/services/quotaService.ts:78            if (isGuest) return null;
```

A visitor who chooses "Continue as guest" — the lowest-friction path the landing offers — gets a dashboard with no catalogue, no quota display and no YouTube import. The value proposition ("start free, in seconds") is most at risk precisely where the friction was removed.

**Fix:** serve a static, bundled subset of prebuilt decks to guests (no Cloud Function call, honouring Rule 0), or make the guest banner state clearly what is unavailable and why.

---

## 6. U-10 — Quota only announced by failure

There is no persistent quota meter. The user discovers the limit through a 429 or a disabled button. `QuotaAlert` exists but only renders when `bootstrapStatus` is in a particular shape, and `Dashboard.tsx:111` silently disables creation.

**Fix:** always-visible remaining-count next to every creation action, plus a settings panel that shows today's AI allowance.

---

## 7. U-09 — Runtime CDN dependency (new P1)

```
$ grep -n "tailwind\|postcss" package.json   → no results
$ ls tailwind.config* postcss.config*        → no matches
$ grep -o 'src="[^"]*"' dist/index.html
  src="https://cdn.tailwindcss.com"
  src="/assets/index-DwT9CeQm.js"
```

No Tailwind is compiled at build time, so every utility class in the application is resolved by a script fetched from a third party on every page load. Consequences:

1. **Availability** — CDN outage, regional block, corporate proxy or an ad-blocker rule removes all styling for all users. No build step detects it.
2. **Rendering** — styles apply only after the CDN script downloads and executes, producing layout shift on first paint and on every cold load.
3. **Policy** — Tailwind documents the CDN build as development-only, unsupported for production.
4. **Content Security Policy** — the app must keep `cdn.tailwindcss.com` allow-listed forever.

**Fix:** add `tailwindcss` + `@tailwindcss/vite` (or PostCSS), compile utilities into `assets/*.css`, delete the `<script>` tag, then verify with `grep -c 'cdn.tailwindcss.com' dist/index.html` → `0`.

Related and already filed separately: the `esm.sh` importmap in the same file, and `next` in `dependencies` with zero imports.

---

## 8. Recommended order of attack

| Order | Item | Rationale |
|---|---|---|
| 1 | U-02 (guest decks erased) | destroys the primary conversion path |
| 2 | U-01 (sync) or, if out of scope, remove the sync claim from Premium copy | stops an active false promise |
| 3 | U-19 (copy vs reality) | cheapest credibility fix: edit `LandingPage.tsx:236-238` |
| 4 | U-09 (Tailwind CDN) | single change removes a global availability risk |
| 5 | U-11 + U-13 (language consistency) | prerequisite for any i18n work |
| 6 | U-10 (quota visibility) | removes a recurring support-style failure |
| 7 | U-12 (GameView error state) | closes the last silent-failure path |
| 8 | U-14, U-15, U-16 (dead routes, PWA) | hygiene, no user impact today |
| 9 | U-04, U-05, U-06, U-07, U-08 | existing P1 queue, independent work streams |

---

## 9. Out of scope for this document

No code was changed. Each *new* gap above has a companion issue in `docs/issues/`; fixes require their own plan under `docs/plans/` per `AGENTS.md` §12 and §32.
