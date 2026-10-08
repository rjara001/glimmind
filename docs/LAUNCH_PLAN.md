# Glimmind — Phased Public Launch Plan

**Version:** 1.0  
**Date:** 2026-10-08  
**Status:** Planning Phase

---

## Executive Summary

This plan divides the public launch into **4 sequential phases**. Each phase must be 100% complete (code + tests + verification) before starting the next. No parallel work across phases.

**Current State:** TypeScript errors (40+), failing tests (15+), no landing page, no payment system, Gemini references in codebase, manual security steps pending.

---

## Phase 0 — Foundation (Week 1)
**Goal:** Clean codebase that compiles and tests pass.

### 0.1 Remove All Gemini References
- [ ] Search and delete all Gemini API calls from frontend (`src/services/aiService.ts`, `src/hooks/`, etc.)
- [ ] Search and delete all Gemini API calls from backend (`backend/src/functions/src/services/aiService/`, `backend/src/functions/src/routes/aiRoutes.js`)
- [ ] Remove `GEMINI_API_KEY` from Secret Manager (if exists)
- [ ] Remove `GEMINI_API_KEY` from `.env` files
- [ ] Remove `aiGroup` Cloud Function and its route (`/api/aiGroup`)
- [ ] Remove AI grouping UI (SmartGroupModal, Dashboard AI button)
- [ ] Remove `aiService` from `package.json` dependencies if unused

### 0.2 Fix TypeScript Compilation (Target: 0 errors)
- [ ] Create `src/types/index.ts` barrel file re-exporting all types
- [ ] Fix `src/utils/multivalueParser.ts` — remove `multivalues` property usage (not in `Association` interface)
- [ ] Fix `src/utils/flattenAssociations.ts` — type mismatches with `Association`
- [ ] Fix `src/components/FeedbackWidget.tsx` — add Vite `ImportMetaEnv` type declaration
- [ ] Fix `src/components/layout/Toast.tsx` — replace `NodeJS.Timeout` with `ReturnType<typeof setTimeout>`
- [ ] Fix test files — replace `@/` aliases with relative paths or configure `tsconfig.json` paths
- [ ] Remove unused imports/variables flagged by TS (see `tsc --noEmit` output)

### 0.3 Fix Failing Tests (Target: 100% pass)
- [ ] `tests/services/grouping/grouping.test.ts` — fix semantic grouping tests
- [ ] `tests/utils/quota.test.ts` — fix quota clamping tests
- [ ] `tests/components/game/CycleProgress.test.tsx` — fix mobile render test
- [ ] `tests/components/game/verification-buttons.test.tsx` — fix 9 button tests
- [ ] `tests/components/verification-toast.test.tsx` — fix 6 toast timeout tests
- [ ] `tests/hooks/useSpeechRecognition.test.ts` — fix 9 STT hook tests
- [ ] `tests/components/ReportsView.test.tsx` — fix 2 report view tests
- [ ] `tests/services/settingsService.test.ts` — fix local storage round-trip
- [ ] `tests/services/gameEngine.test.ts` — fix implicit `any` types

### 0.4 Verification Gate (Must Pass Before Phase 1)
```bash
npx tsc --noEmit          # 0 errors
npx vitest run            # all tests pass
npm run build             # successful production build
```

---

## Phase 1 — Core Product (Week 2)
**Goal:** Fully functional app without AI grouping, ready for paid users.

### 1.1 Settings & Quota System (No AI)
- [ ] Verify quota enforcement works without AI (cards limit only)
- [ ] Settings page: remove AI-related settings, keep voice/TTS/STT
- [ ] Premium tier: 5000 cards, no AI quota (since AI removed)
- [ ] Free tier: 1000 cards

### 1.2 Voice Stack (Keep & Polish)
- [ ] Browser STT (primary)
- [ ] ChipTTS STT (fallback, verify quota works)
- [ ] Chirp 3 HD TTS (verify billing alerts cover it)
- [ ] Vosk STT (offline option)
- [ ] Voice commands in game mode
- [ ] Audio recording (opt-in, user-scoped storage)

### 1.3 Game Modes
- [ ] Exam mode (type answer, fuzzy validation)
- [ ] Training mode (self-evaluate)
- [ ] 4-cycle spaced repetition (New → Seen → Recognized → Known → Learned)
- [ ] Practice mode (auto-advance with delays)

### 1.4 Data & Sync
- [ ] Local-first (localStorage)
- [ ] Firebase sync (authenticated users)
- [ ] Delta-based sync with conflict resolution
- [ ] Offline queue + retry

### 1.5 Verification Gate
```bash
npx tsc --noEmit
npx vitest run
npm run build
# Manual: full game flow (create list → play → complete → sync)
```

---

## Phase 2 — Landing Page & Payments (Week 3)
**Goal:** Public-facing marketing + subscription billing.

### 2.1 Landing Page (`/`)
**Route:** `/` (separate from `/dashboard` which requires auth)

**Sections:**
1. **Hero** — Tagline, primary CTA ("Start Free"), secondary CTA ("Watch Demo")
2. **Features** — 4-cycle SRS, Two modes, Fuzzy matching, Voice study, Cross-platform, Local-first + sync
3. **Pricing Table** — Free vs Premium (see 2.2)
4. **Social Proof** — Testimonials placeholder, user count (from analytics)
5. **Footer** — Links: Privacy, Terms, Contact, GitHub, Privacy Policy

**Technical:**
- New route in `App.tsx` before `ProtectedRoute`
- Static page (no auth, no Firebase calls)
- SEO meta tags, Open Graph, Twitter cards
- Responsive, Tailwind CSS
- PWA manifest already configured

### 2.2 Pricing & Payment Mechanism
**Provider:** Stripe (recommended) or Paddle (handles EU VAT)

**Plans:**
| Feature | Free | Premium (€4.99/mo or €49/yr) |
|---------|------|------------------------------|
| Active cards | 1,000 | 5,000 |
| Lists | Unlimited | Unlimited |
| Voice study | ✅ | ✅ |
| Cloud sync | ✅ | ✅ |
| Audio recording | ✅ | ✅ |
| Export/Import | ✅ | ✅ |
| Priority support | ❌ | ✅ |

**Implementation:**
- [ ] Stripe account setup (test mode)
- [ ] `stripe-webhook` Cloud Function for `checkout.session.completed`, `customer.subscription.updated/deleted`
- [ ] `createCheckoutSession` callable function (client → function → Stripe → return session URL)
- [ ] `manageSubscription` callable function (billing portal)
- [ ] `getSubscriptionStatus` callable function
- [ ] Premium badge in UI (Navbar, Settings, Dashboard)
- [ ] Upgrade flow: Settings → "Upgrade to Premium" → Stripe Checkout → webhook updates Firestore `users/{uid}/meta/main.tier = "premium"`
- [ ] Downgrade/cancel: Stripe Billing Portal
- [ ] Grace period: 7 days after failed payment before downgrade
- [ ] Test cards: 4242 4242 4242 4242 (success), 4000 0000 0000 0002 (decline)

### 2.3 Legal Pages (New Routes)
- [ ] `/privacy` — Privacy Policy (data collected, Firebase, voice recordings, analytics, retention, GDPR rights)
- [ ] `/terms` — Terms of Service
- [ ] `/cookies` — Cookie Policy (if using analytics cookies)
- [ ] Links in landing page footer + Settings page

### 2.4 Verification Gate
```bash
npx tsc --noEmit
npx vitest run
npm run build
# Manual: landing page loads, pricing clicks → Stripe Checkout (test), webhook → premium tier in Firestore
# Manual: cancel subscription → downgrade after grace period
```

---

## Phase 3 — Security & Production Hardening (Week 4)
**Goal:** Production-ready security posture.

### 3.1 Firebase App Check (Mandatory)
- [ ] Register app in Firebase Console → App Check → reCAPTCHA Enterprise
- [ ] Add site key to `src/firebase.ts` BEFORE `initializeApp`
- [ ] Enable enforcement: Firestore, Storage, Functions
- [ ] Verify `X-Firebase-AppCheck` header on live requests

### 3.2 Billing Alerts (GCP Console)
- [ ] Budget: $50/month
- [ ] Alerts: 50%, 90%, 100% → email
- [ ] Scope: All services (Functions, Firestore, Storage, Vertex AI for TTS/STT)

### 3.3 Node.js 22 Upgrade (Before Oct 2026 Deadline)
- [ ] `backend/src/functions/package.json` → `"engines": { "node": "22" }`
- [ ] Test locally: `firebase emulators:start`
- [ ] Deploy: `firebase deploy --only functions`

### 3.4 GCP Logging & Monitoring (No Sentry)
- [ ] Structured logging in all Cloud Functions (already using `console.log` with JSON)
- [ ] Log-based metrics: function errors, latency, AI/TTS/STT costs
- [ ] Alerting policies:
  - Function error rate > 5% for 5 min
  - Daily AI/TTS/STT cost > $10
  - Firestore read/write spike > 10x baseline
- [ ] Dashboard: "Glimmind Production" with key metrics

### 3.5 Secrets Audit
- [ ] `git log --all --full-history --oneline -- '**/*.env*' '**/secrets*' '**/*secret*' '**/*key*'`
- [ ] Rotate any exposed keys in Secret Manager
- [ ] Verify `.env.local` in `.gitignore`

### 3.6 Verification Gate
```bash
# App Check enforced in Firebase Console
# Billing alerts test email received
# Node 22 functions deployed
# Monitoring dashboard shows green
# No CSP violations in production console
```

---

## Phase 4 — Mobile & Launch (Week 5)
**Goal:** App Store / Play Store release + web launch.

### 4.1 iOS Build (Capacitor)
- [ ] `npm run ios:build` → Xcode archive
- [ ] Privacy Manifest (iOS 17+): `NSPrivacyTracking` = false, `NSPrivacyCollectedDataTypes` = minimal
- [ ] App Store Connect: screenshots, description, keywords, privacy policy URL
- [ ] TestFlight beta → internal testing
- [ ] Submit for review

### 4.2 Android Build (Capacitor)
- [ ] `npm run android:build` → signed AAB
- [ ] Play Console: store listing, privacy policy, target API 34
- [ ] Internal testing track
- [ ] Submit for review

### 4.3 Web Launch
- [ ] Custom domain (`glimmind.com`) already configured
- [ ] Firebase Hosting: `firebase deploy --only hosting`
- [ ] Verify HTTPS, HSTS, CSP headers
- [ ] Submit to search engines (Google Search Console, Bing)

### 4.4 Post-Launch Monitoring (First 2 Weeks)
- [ ] Daily: check error rates, billing, user signups
- [ ] Weekly: review support emails, app store reviews
- [ ] Iterate: hotfixes via patch versions

### 4.5 Verification Gate
```bash
# iOS: TestFlight build installs, works on device
# Android: Internal track build installs, works on device
# Web: glimmind.com loads, auth works, payment works
# All: no critical errors in GCP Logging
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
| Gemini removal breaks smart grouping | High | Medium | Accept: remove feature, keep manual grouping only |
| Stripe webhook fails silently | Medium | High | Idempotency keys, retry logic, dead-letter queue in Firestore |
| App Check breaks existing users | Low | High | Test in staging first, gradual rollout |
| iOS/Android review rejection | Medium | Medium | Pre-submission checklist, appeal process ready |
| Billing spike from abuse | Low | Critical | Rate limits + App Check + budget alerts + quota enforcement |

---

## Success Criteria (Definition of Done)

**Phase 0:** `tsc --noEmit` = 0, `vitest run` = all pass, `npm run build` = success  
**Phase 1:** Full game flow works offline + online, no AI features  
**Phase 2:** Landing page live, Stripe test payment → premium tier in Firestore  
**Phase 3:** App Check enforced, billing alerts firing, Node 22 deployed, monitoring green  
**Phase 4:** iOS/Android/Web all accessible to public, first paying user onboarded  

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

## Appendix: File Inventory for Gemini Removal

**Frontend:**
- `src/services/aiService.ts` → DELETE
- `src/hooks/dashboard/useDeckValidation.ts` → remove AI validation
- `src/components/modals/SmartGroupModal.tsx` → DELETE
- `src/components/onboarding/DeckStoreOnboarding.tsx` → remove AI deck button
- `src/components/views/Dashboard.tsx` → remove AI grouping import/button

**Backend:**
- `backend/src/functions/src/services/aiService/` → DELETE entire folder
- `backend/src/functions/src/routes/aiRoutes.js` → DELETE
- `backend/src/functions/src/index.js` → remove `aiGroup` export
- `backend/src/functions/src/utils/constants.js` → remove Gemini config
- `firebase.json` → remove `/api/aiGroup` rewrite

**Secrets:**
- `GEMINI_API_KEY` in Secret Manager → DELETE