# Glimmind — Phased Public Launch Plan

**Version:** 1.1 (revised 2026-10-21)
**Date:** 2026-10-08
**Status:** Audited 2026-10-21 — Phases 0-1 verified complete; Phase 2 mostly complete (gaps listed below); Phases 3-4 pending manual/console steps.

---

## Executive Summary

This plan divides the public launch into **4 sequential phases**. Each phase must be 100% complete (code + tests + verification) before starting the next. No parallel work across phases.

**Current State (2026-10-21):** `tsc --noEmit` = 0 errors; 977 unit + 77 backend + 13 e2e tests pass; production build green (v1.41.0 deployed 2026-10-21). The landing page, legal pages and one-time Stripe payments (live mode) exist and ship. Gemini was **kept** as the provider for metered Premium AI deck generation — only smart grouping was removed. Functions run Node 22. App Check is initialised in code; enforcement, billing alerts, metrics and store submissions remain console/manual steps.

---

## Audit — 2026-10-21

Every checklist below was reconciled against the repository (`file:line` evidence in each section).

| Phase | Verdict | Headline |
|---|---|---|
| 0 Foundation | complete (0.1 rewritten: Gemini kept by decision) | tsc 0, 977 tests, grouping-AI fully removed |
| 1 Core product | complete, 1 open gap | quotas 1000/5000 enforced; **periodic sync never mounted → `docs/issues/P1/2026-10-12-sync-config-sin-conectar.md`** |
| 2 Landing & payments | mostly complete | route/hero/pricing/legal/checkout/webhook/tier-write done; missing SEO meta, social proof, real footer links, legal links in Settings, Navbar/Dashboard premium badges; PWA claim was false |
| 3 Security | partial | Node 22 done; App Check in code; **enforcement, billing alerts, log-based metrics = console-side, unverified** |
| 4 Mobile & launch | scaffolded | Capacitor projects exist but `cap sync` never ran; store submissions and Search Console pending |

### Top contradictions found (plan vs reality)

1. **"Remove all Gemini references"** — superseded: Gemini powers Premium AI deck generation (`createDeckFromText.js`, `youtubeDeckRoutes.js` declare `secrets: ["GEMINI_API_KEY"]`). Only `aiGroup`/`SmartGroupModal`/`aiService` were removed.
2. **"Subscription billing"** (goal, Billing Portal, grace period) — superseded by the one-time €4.99 model (2026-10-11); downgrade happens via `charge.refunded`.
3. **"PWA manifest already configured"** — false: `vite-plugin-pwa` installed but unregistered (`vite.config.ts:22`) → `docs/issues/P2/2026-10-20-pwa-sin-configurar.md`.
4. **Pricing table**: audio recording is Premium-only (decided 2026-10-14, fixed in this revision); Export/Import, priority support and advanced statistics are promised by the landing but not implemented (`BUSINESS_MODEL.md` §4) — decision still open in §8.
5. **"Premium: no AI quota (since AI removed)"** — false: AI quota remains by design (`plans.json:6,11`, `aiDailyLimit` 100/1000).
6. **Test cards** only work against the Stripe emulator; production is in **live mode**.
7. **`stripe-webhook`** is actually exported as `stripeWebhook` (`stripeRoutes.js:74`).
8. **"Custom domain already configured"** — unverified from the repo; docs still reference the default `fladycard-22a3e.web.app` target.

### Console-side, unverified from the repository

- App Check registration + enforcement (Firestore, Storage, Functions) — `docs/MANUAL_STEPS_REMAINING.md` (Critical)
- Budget/billing alerts (50/90/100%)
- Secret Manager contents (`GEMINI_API_KEY`, Stripe live keys, `ADMIN_UIDS`)
- Custom domain binding for glimmind.com
- Log-based metrics, alerting policies, "Glimmind Production" dashboard
- App Store / Play Console / Search Console / Bing submissions

---

## Phase 0 — Foundation (Week 1)
**Goal:** Clean codebase that compiles and tests pass. **[VERIFIED 2026-10-21]**

### 0.1 AI grouping removal + Gemini disposition — complete as reconciled
Decision (`BUSINESS_MODEL.md` §4): AI deck generation stays as a **metered Premium feature**, so Gemini is kept. Only smart grouping was removed.

- [x] Remove frontend `src/services/aiService.ts` — does not exist
- [x] Remove backend `services/aiService/` + `routes/aiRoutes.js` — do not exist
- [x] Remove `aiGroup` Cloud Function and `/api/aiGroup` rewrite — gone (the `aiGroup` rate-limit bucket name survives, reused by `createDeckFromText`/`createYouTubeDeck`)
- [x] Remove AI grouping UI (`SmartGroupModal`, Dashboard AI grouping button) — `SmartGroupModal.tsx` does not exist
- [x] Remove `aiService` from dependencies — absent from both `package.json` files
- [x] Remove `GEMINI_API_KEY` from `.env` files — 0 references across `.env*`
- [ ] `GEMINI_API_KEY` in Secret Manager — must **stay** (declared in `createDeckFromText.js:67,145`, `youtubeDeckRoutes.js:173,243`); console-side: unverified
- Note: Gemini disclosure in `PrivacyPolicy.tsx:56` and CSP `generativelanguage.googleapis.com` (`firebase.json:66`) are correct while AI decks ship.

### 0.2 Fix TypeScript Compilation (Target: 0 errors) — complete
- [x] Type barrel — implemented as `src/types.ts` (single file; `src/types/index.ts` was never created; alias `@/*` → `src/*` in `tsconfig.json:19-22`)
- [x] `multivalueParser.ts` — resolved the opposite way: `multivalues?: string[]` added to `Association` (`src/types.ts:46`), usage kept and valid
- [x] `flattenAssociations.ts` — compiles clean
- [x] `FeedbackWidget.tsx` — `ImportMetaEnv` typed in `src/vite-env.d.ts:3`
- [x] `Toast.tsx` — `ReturnType<typeof setTimeout>` (`Toast.tsx:21`)
- [x] Test files use `@/` aliases — resolved via tsconfig paths
- [x] Unused imports/variables — `npx tsc --noEmit` empty, exit 0 (2026-10-21)

### 0.3 Fix Failing Tests (Target: 100% pass) — complete
- [x] All 9 listed files exist unchanged: `grouping`, `quota`, `CycleProgress`, `verification-buttons`, `verification-toast`, `useSpeechRecognition`, `ReportsView`, `settingsService`, `gameEngine`
- [x] Full suite green 2026-10-21: 85 files / 977 tests (+ 5 files / 77 backend, + 13 e2e)

### 0.4 Verification Gate — passed 2026-10-21
```bash
npx tsc --noEmit          # 0 errors ✓
npx vitest run            # 977/977 ✓
npm run build             # successful (v1.41.0) ✓
```

---

## Phase 1 — Core Product (Week 2)
**Goal:** Fully functional app without AI grouping, ready for paid users. **[VERIFIED 2026-10-21]**

### 1.1 Settings & Quota System (No AI grouping)
- [x] Quota enforcement — both sides: `src/config/plans.json:5,10` (Free 1000 / Premium 5000 cards), backend `quotaConfig.js:21-23`, drift test `tests/config/plansDrift.test.ts`
- [x] Settings page has no AI-grouping settings (answer validation, game mode, provider, voice, voice commands only)
- [x] Premium tier: 5000 cards
- [x] Free tier: 1000 cards
- Note: "remove AI quota" is void — AI is kept and metered: `aiDailyLimit` 100 free / 1000 premium (`plans.json:6,11`), surfaced in `CreateYouTubeDeckModal.tsx:73-75`

### 1.2 Voice Stack (Keep & Polish)
- [x] Browser STT (primary) — `src/hooks/voice/stt/useBrowserSTT.ts`, `useSpeechRecognition.ts`
- [x] ChipTTS STT fallback with quota — `useChipTTSTT.ts`, backend `chipttSttService/` (a metering layer over Google STT `chirp_3`, not a separate provider)
- [x] Chirp 3 HD TTS with limits — `src/services/voice/tts/chirpTts.ts`, backend `chirpTtsService/`, gated Premium 2026-10-14
- [x] Vosk STT (offline) — `vosk-browser`, `useVoskSTT.ts`, assets via `scripts/copy-ml-assets.mjs`
- [x] Voice commands in game — `src/services/voice/stt/commands.ts`, mounted in `GameView.tsx:132`
- [x] Audio recording (opt-in, Premium-gated, user-scoped) — `useAudioRecorder.ts` + `audioService.ts` (Storage upload from voice mode, toggle `audioRecordingEnabled` in SettingsView). The old per-session "Grabar Voz"/"Historial" buttons that stored base64 in Firestore were removed 2026-10-22 (U-06)

### 1.3 Game Modes
- [x] Exam mode (type answer, fuzzy validation) — implemented as **Real mode**: `GameMode = 'training' | 'real'` (`src/types.ts:4`), Levenshtein grading (`src/utils/similarity.ts`), e2e `03-game-real.spec.ts`
- [x] Training mode (self-evaluate) — `GameModeSection.tsx`
- [x] 4-cycle progression (New → Seen → Recognized → Frequent → Learned) — `src/services/gameEngine.ts:537-542`, labels `src/utils/cycle-colors.ts`
- [x] Practice mode (auto-advance with delays) — `src/hooks/game/usePracticePlayer.ts`, delays `GameView.tsx:69-80`

### 1.4 Data & Sync
- [x] Local-first (localStorage) — `gameStore.ts:37,44`
- [x] Firebase sync (authenticated) — `flushSync` `gameStore.ts:1137` (guests short-circuit per §31)
- [x] Delta-based sync with conflict resolution — `syncDelta.ts`, 409 retry `gameStore.ts:1220-1250`
- [x] Offline queue + retry — `pendingDeltas` + `retryBootstrapPart`
- [ ] **Open gap:** periodic sync is never mounted (`usePeriodicSync` has zero importers) → `docs/issues/P1/2026-10-12-sync-config-sin-conectar.md`; progress-upload gaps documented in `docs/SERVICE_CATALOG.md`

### 1.5 Verification Gate — passed 2026-10-21
```bash
npx tsc --noEmit          # ✓
npx vitest run            # ✓
npm run build             # ✓
# Manual: full game flow verified by e2e (create list → play → complete) ✓
```

---

## Phase 2 — Landing Page & Payments (Week 3)
**Goal:** Public-facing marketing + one-time payment billing (subscription model abandoned 2026-10-11).

### 2.1 Landing Page (`/`)
**Route:** `/` — public, outside `ProtectedRoute` (`src/App.tsx:229-234`) [x]

**Sections:**
- [x] **Hero** — tagline, primary CTA "Empezar gratis", secondary CTA "Ver demo" (`LandingPage.tsx:24-31`)
- [x] **Features** — 4-cycle mechanism (`:37-134`), two modes (`:164-172`), fuzzy matching (`:136-146`), voice (`:181-188`), cross-platform (`:189-196`), local-first + sync (`:197-204`)
- [x] **Pricing Table** — Free €0 / Premium €4.99 one-time (`:208-260`)
- [ ] **Social Proof** — testimonials/user count: not implemented (0 hits)
- [x] **Footer** — Privacy + Terms live (`:306-308`, `:319-321`)
- [ ] Footer **Contact** — placeholder `/placeholder` (`:300`)
- [ ] Footer **GitHub** — generic `https://github.com`, not the repo (`:280`)

**Technical:**
- [x] Route before `ProtectedRoute` (`App.tsx:229`)
- [x] Static page, no Firebase calls on load
- [ ] **SEO meta tags, Open Graph, Twitter cards** — `src/index.html` has none (`docs/audits/2026-10-20-market-positioning.md:15`)
- [x] Responsive (own CSS + media queries, `landing.css:1436,1440,1460`) — caveat: Tailwind ships from CDN at runtime → `docs/issues/P1/2026-10-20-tailwind-cdn-en-runtime-produccion.md`
- [ ] **PWA manifest** — was **never** configured: `vite-plugin-pwa` installed (`package.json:57`) but not registered (`vite.config.ts:22`) → `docs/issues/P2/2026-10-20-pwa-sin-configurar.md`

### 2.2 Pricing & Payment Mechanism
**Provider:** Stripe, **live mode** since 2026-10-12 (`docs/plans/2026-10-11-stripe-sandbox-to-live.md`).
**Model:** one-time €4.99, not a subscription.

**Plans:**
| Feature | Free | Premium (€4.99 one-time) |
|---------|------|------------------------------|
| Active cards | 1,000 | 5,000 |
| Lists | Unlimited | Unlimited |
| Voice study | ✅ | ✅ |
| Cloud sync | ✅ | ✅ |
| Audio recording | ❌ (Premium-only, decided 2026-10-14) | ✅ |
| Export/Import | ⚠ see note | ⚠ see note |
| Priority support | ❌ | ⚠ see note |

> ⚠ Rows marked ⚠ await the open decision in [`BUSINESS_MODEL.md`](BUSINESS_MODEL.md) §8 ("What is actually in Premium?"): the landing promises **Export**, **priority support** and **advanced statistics** as Premium, none are implemented (`SERVICE_CATALOG.md`), and §4 of the same document lists cards as *Unlimited* while the code enforces 1,000/5,000. Do not edit these rows until §8 is closed.

**Implementation:**
- [x] Stripe account (live mode) — `docs/plans/2026-10-11-stripe-sandbox-to-live.md`
- [x] `stripeWebhook` Cloud Function (plan text said `stripe-webhook`) handling `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded` (`stripeService.js:124-167`)
- [x] `createCheckoutSession` callable (`stripeRoutes.js:36-71`)
- [x] No billing portal and no `getSubscriptionStatus`: premium is a one-time purchase, so there is nothing to manage or query
- [ ] Premium badge in **Settings** done (`SettingsView.tsx:192-228`) — missing in **Navbar** (0 hits) and **Dashboard** (tier used only for gating)
- [x] Upgrade flow: Settings → "Actualizar a Premium" → Stripe Checkout → webhook writes `users/{uid}/meta/main.tier = "premium"` (`stripeService.js:94-108,136,150`)
- [x] Downgrade/refund: `charge.refunded` → free tier (`stripeService.js:154-166`) — replaces the abandoned Billing Portal item
- [x] ~~Grace period after failed payment~~ — N/A: one-time payment, no recurring charge
- [x] Test cards: documented, but **only valid against the Stripe emulator**; live mode rejects `4242…` (`docs/plans/2026-10-11-stripe-sandbox-to-live.md:101`)

### 2.3 Legal Pages (New Routes)
- [x] `/privacy` — `App.tsx:363`
- [x] `/terms` — `App.tsx:364`
- [x] `/cookies` — `App.tsx:365`
- [x] Links in landing footer (`LandingPage.tsx:304-310,318-322`) + `Auth.tsx:141-142`
- [ ] Links in Settings page (0 hits in `SettingsView.tsx`)

### 2.4 Verification Gate
```bash
npx tsc --noEmit          # ✓ 2026-10-21
npx vitest run            # ✓ 2026-10-21
npm run build             # ✓ 2026-10-21 (v1.41.0)
# Manual: landing loads ✓; checkout/webhook/tier-write code verified ✓ (live payment history in the Stripe plans)
```

---

## Phase 3 — Security & Production Hardening (Week 4)
**Goal:** Production-ready security posture. **Console steps tracked in [`MANUAL_STEPS_REMAINING.md`](MANUAL_STEPS_REMAINING.md).**

### 3.1 Firebase App Check (Mandatory)
- [x] Site key + init in code — `src/firebase.ts:55-61` (`ReCaptchaEnterpriseProvider`, auto-refresh; skipped in demo/emulator)
- [ ] Register app + **enable enforcement** (Firestore, Storage, Functions) — console-side, unverified; listed Critical in `MANUAL_STEPS_REMAINING.md`
- [ ] Verify `X-Firebase-AppCheck` header on live requests — console-side

### 3.2 Billing Alerts (GCP Console)
- [ ] Budget + alerts (50/90/100%) — console-side, no record of configuration (`MANUAL_STEPS_REMAINING.md:70-77`)

### 3.3 Node.js 22 Upgrade — **done** (ahead of the Oct 2026 deadline)
- [x] `backend/src/functions/package.json` → `"engines": { "node": "22" }` (commit `f469f58`, 2026-10-08); CI on 22 (`.github/workflows/ci.yml:23,53,85`)
- [x] Deployed — functions shipped with v1.41.0 on 2026-10-21
- Note: `MANUAL_STEPS_REMAINING.md:95-96` still says "Current: Node 20" — stale.

### 3.4 GCP Logging & Monitoring (No Sentry)
- [x] `logClientError` function + rewrite (`loggingRoutes.js:19-40`, `firebase.json:216-218`)
- [ ] Structured logging across all functions — only `loggingRoutes.js:31-37` emits parseable JSON; the rest are prefixed strings (no shared logger)
- [ ] Log-based metrics, alerting policies, dashboard — console-side, unverified

### 3.5 Secrets Audit
- [x] `.env.local` ignored (`.gitignore:34`), `.emulator-data` ignored (`.gitignore:44`), `.secret.local` untracked, never committed (full-history scan empty)
- [ ] Rotate/verify Secret Manager contents — console-side
- [ ] Tracked env artifacts to clean up: `.env.local.backup` (real Firebase web config, commit `cb50750`), `.env.backup` (12,979-line wordlist misnamed as env), `backend/src/functions/debug-env.js` (stray debug script) → `docs/issues/P2/2026-10-21-env-backups-trackeados-y-debug-env.md`

### 3.6 Verification Gate
```text
[ ] App Check enforced in Firebase Console
[ ] Billing alerts test email received
[x] Node 22 functions deployed
[ ] Monitoring dashboard shows green
[ ] No CSP violations in production console
```

---

## Phase 4 — Mobile & Launch (Week 5)
**Goal:** App Store / Play Store release + web launch.

### 4.1 iOS Build (Capacitor)
- [x] `npm run ios:build` script + `ios/` project scaffolded (`capacitor.config.ts`, icons present)
- [ ] Web bundle synced into `ios/App/App/public` — `cap sync` never ran
- [ ] Privacy Manifest (`PrivacyInfo.xcprivacy`) — missing
- [ ] App Store Connect assets / TestFlight / submission — console-side, pending

### 4.2 Android Build (Capacitor)
- [x] `npm run android:build` + `npm run cap:sync` scripts; `android/` scaffolded
- [ ] Web bundle synced (`android/app/src/main/assets` does not exist)
- [ ] Play Console listing / internal track / target API 34 / submission — console-side, pending

### 4.3 Web Launch
- [ ] Custom domain (`glimmind.com`) "already configured" — **unverified**; hosting target docs still say `fladycard-22a3e.web.app`; binding is console-side
- [x] Firebase Hosting deploys (`firebase.json:12-13`, SPA rewrite, deployed with v1.41.0 2026-10-21)
- [x] HTTPS/HSTS (`firebase.json:45-47`) + CSP (`firebase.json:65-66`)
- [ ] Search engines (Search Console, Bing) — no `robots.txt`, no `sitemap.xml`

### 4.4 Post-Launch Monitoring (First 2 Weeks)
- [ ] Daily error rates, billing, signups — routine, no artifacts in repo

### 4.5 Verification Gate
```text
[ ] iOS: TestFlight build installs, works on device
[ ] Android: Internal track build installs, works on device
[ ] Web: glimmind.com loads, auth works, payment works
[ ] All: no critical errors in GCP Logging
```

---

## Dependencies & Blockers

| Phase | Blocks | Blocked By |
|-------|--------|------------|
| 0 | 1, 2, 3, 4 | — |
| 1 | 2, 3, 4 | 0 |
| 2 | 3, 4 | 0, 1 |
| 3 | 4 | 0, 1 |
| 4 | — | 0, 1, 2, 3 |

---

## Resource Requirements

| Role | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|------|---------|---------|---------|---------|---------|
| Frontend Dev | 100% | 50% | 100% | 20% | 50% |
| Backend/Cloud | 50% | 50% | 100% | 100% | 50% |
| DevOps | 0% | 0% | 20% | 100% | 50% |
| Design | 0% | 0% | 100% | 0% | 50% |

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| ~~Gemini removal breaks smart grouping~~ resolved 2026-10-21: grouping removed, Gemini kept for AI decks | — | — | Metered AI decks + `aiGroup` rate limit |
| Gemini quota/policy change breaks AI deck generation | Medium | Medium | Quota enforcement + `SERVICE_CATALOG` metering; open question in `BUSINESS_MODEL` §8 (are we on the free tier?) |
| Stripe webhook fails silently | Medium | High | Idempotency keys, retry logic, dead-letter queue in Firestore |
| App Check breaks existing users | Low | High | Test in staging first, gradual rollout |
| iOS/Android review rejection | Medium | Medium | Pre-submission checklist, appeal process ready |
| Billing spike from abuse | Low | Critical | Rate limits + App Check + budget alerts + quota enforcement |

---

## Success Criteria (Definition of Done)

**Phase 0:** ✅ verified 2026-10-21 — `tsc` = 0, `vitest` all pass, build succeeds
**Phase 1:** ✅ verified 2026-10-21 — full game flow works (e2e); no AI-grouping features (periodic-sync gap open, P1)
**Phase 2:** Landing live ✅; one-time payment → tier write in Firestore ✅ (code); remaining: SEO, badges, Settings links, social proof, PWA
**Phase 3:** App Check enforced ⬜, billing alerts ⬜, monitoring ⬜ (console); Node 22 ✅
**Phase 4:** iOS/Android/Web all accessible to public ⬜, first paying user onboarded ⬜

---

## Out of Scope (Post-Launch)

- AI-powered smart grouping (removed in Phase 0)
- Native mobile push notifications
- Collaborative/shared decks
- Public deck catalog/marketplace
- Advanced analytics dashboard
- Team/organization accounts
- Offline-first PWA enhancements (beyond current)

---

## Appendix: Gemini inventory — superseded 2026-10-21

The original removal inventory below described deleting AI **grouping**. Those files are gone (`aiService.ts`, `SmartGroupModal.tsx`, `services/aiService/`, `aiRoutes.js`, `aiGroup` export, `/api/aiGroup` rewrite, `aiService` dependency). **Gemini itself stays**: `GEMINI_API_KEY` is declared by `createDeckFromText.js` and `youtubeDeckRoutes.js`, `@google/genai` powers `vocabularyExtractionService`, and `VOCABULARY_GEMINI_MODELS` lives in `utils/constants.js:12`. Treat this appendix as a record of what was removed, not as remaining work.
