# Glimmind — Production Launch Checklist & Implementation Guide

**Version:** 1.0  
**Date:** 2026-10-08  
**Project:** fladycard-22a3e (Glimmind)

---

## Overview

This document captures the complete production hardening process for Glimmind. Use this as a reference for future projects.

---

## 1. Firebase App Check (Critical)

### 1.1 Register App in Firebase Console

**URL:** https://console.firebase.google.com/project/fladycard-22a3e/appcheck

**Steps:**
1. Go to **App Check** (under Security in left menu)
2. Click **Add app** → **Web** (icon `</>`)
3. Fill in:
   - **App nickname:** `glimmind`
   - **Attestation provider:** **Fraud Defense (reCAPTCHA Enterprise)**
   - **reCAPTCHA secret key:** Paste **Site Key** (public key starting with `6L...`)
     - Create at: https://console.cloud.google.com/security/recaptcha
     - Type: Website
     - Domains: `fladycard-22a3e.web.app`, `localhost`, `glimmind.com`
   - **Token TTL:** `3600`
4. Click **Save**

### 1.2 Initialize App Check in Client Code

**File:** `src/firebase.ts`

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

// ... after initializeApp ...

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// App Check initialization (after initializeApp)
if (typeof window !== 'undefined' && !isDemo) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider('6LdRFb8tAAAAAK-htVwM7FLJM77j2DjegVC6Wzhq'),
    isTokenAutoRefreshEnabled: true,
  });
}

const auth = getAuth(app);
```

**Key points:**
- Must run **after** `initializeApp` but **before** any Firebase service usage
- `isTokenAutoRefreshEnabled: true` ensures tokens refresh automatically
- Wrap in `!isDemo` to skip in demo mode
- Site Key must match the one registered in Firebase Console

### 1.3 Deploy & Verify

```bash
npm run build && firebase deploy --only hosting
```

### 1.4 Monitor & Enforce

**In Firebase Console → App Check → APIs tab:**

1. Wait for **Cloud Firestore** and **Cloud Storage** to show **% Verified → 100%**
   - This can take 10-30 minutes after deploy
   - Check "Verified requests" percentage

2. Once at ~100%, click **Enforce** for:
   - ☑️ Cloud Firestore
   - ☑️ Cloud Storage
   - (Cloud Functions is enforced via code, not console)

### 1.5 Functions Protection (Backend)

**Each callable function must have `enforceAppCheck: true`:**

```javascript
// In each function definition (v2):
exports.myFunction = onRequest(
  { cors: true, enforceAppCheck: true, secrets: [...] },
  async (req, res) => { ... }
);
```

**Verify in `backend/src/functions/index.js`** that all exported functions have this option.

### 1.6 Debug Token for Local Development

**For emulator/local development:**

1. In browser console on localhost:
   ```javascript
   // Get debug token
   await firebase.appCheck().getToken(true);
   // Copy the token
   ```

2. In Firebase Console → App Check → **Debug tokens** → Add token
   - Label: `local-dev`
   - Token: [pasted token]

3. Set env var for local dev:
   ```bash
   export FIREBASE_APPCHECK_DEBUG_TOKEN=<your-debug-token>
   ```

---

## 2. Billing Alerts (GCP)

**URL:** https://console.cloud.google.com/billing/budgets

### Create Budget

1. **Create budget** → Name: `Glimmind Monthly Budget`
2. **Budget amount:** €50/month (adjust to risk tolerance)
3. **Alert thresholds:** 50%, 90%, 100%
4. **Notifications:** Your email
5. **Scope:** All services (recommended) or filter to:
   - Firebase
   - Cloud Functions
   - Vertex AI (for Chirp TTS/STT)
   - Cloud Storage

**Note:** Budget alerts only notify; they don't cut service. Hard limits are enforced via Firebase quotas (cards, AI daily limits).

---

## 3. Node.js 22 Upgrade (Required before Oct 2026)

### 3.1 Update package.json

**File:** `backend/src/functions/package.json`

```json
{
  "engines": {
    "node": "22"
  }
}
```

### 3.2 Test Locally

```bash
cd backend/src/functions
npm install
firebase emulators:start --only auth,functions,firestore
```

**Verify:**
- Output shows `✔ functions: Using node@22 from host`
- All functions load without errors

### 3.3 Deploy

```bash
firebase deploy --only functions
```

---

## 4. Remove Gemini / AI Dependencies (If Applicable)

### 4.1 Frontend
- Delete `src/services/aiService.ts`
- Delete `src/components/modals/SmartGroupModal.tsx`
- Remove AI imports from `Dashboard.tsx`, `ListEditor.tsx`, etc.

### 4.2 Backend
- Delete `backend/src/functions/src/services/aiService/`
- Delete `backend/src/functions/src/routes/aiRoutes.js`
- Remove `aiGroup` from `backend/src/functions/index.js`
- Remove `GEMINI_API_KEY` from `backend/src/functions/src/utils/constants.js`
- Delete `GEMINI_API_KEY` from Secret Manager

### 4.3 Firebase Hosting Rewrites
Remove `/api/aiGroup` rewrite from `firebase.json`

---

## 5. Stripe Integration (Payments)

### 5.1 Stripe Dashboard Setup

1. **Products → Add product:**
   - Name: `Glimmind Premium`
   - Price: €4.99 one-time (no recurring price)
   - Metadata: `tier: premium`

2. **Webhooks → Add endpoint:**
   - URL: `https://us-central1-fladycard-22a3e.cloudfunctions.net/stripeWebhook`
   - Events: `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`

3. **Get keys:**
   - Publishable key (client)
   - Secret key (server → Secret Manager)

### 5.2 Cloud Functions for Stripe

**Required functions:**

| Function | Purpose |
|----------|---------|
| `createCheckoutSession` | Creates a one-time Stripe Checkout session, returns URL |
| `stripeWebhook` | Handles `checkout.session.completed`, `payment_intent.succeeded` and `charge.refunded`, updates Firestore tier |

Removed: `manageSubscription` and `getSubscriptionStatus`. Premium is a
one-time purchase, so there is no billing portal to open and the tier comes from
`getQuota` (both were dead code with zero production call sites).

**Backend structure:**
```
backend/src/functions/src/routes/stripeRoutes.js
backend/src/functions/src/services/stripeService.js
```

### 5.3 Frontend Integration

**Landing page / Settings page:**
- "Actualizar a Premium" button → calls `createCheckoutSession` → redirects to Stripe Checkout
- Success → webhook updates `users/{uid}/meta/main.tier = "premium"`
- Premium users see no purchase CTA: the plan is lifetime, nothing to manage or renew
- On return the client polls `getQuota` every 1.5s (15s cap) until the tier flips, because
  Stripe redirects back before the webhook lands. The success toast is shown only once
  confirmed; on timeout it says the plan is still being activated

---

## 6. Legal Pages

### 6.1 Routes (Public, No Auth)

```typescript
// App.tsx
<Route path="/privacy" element={<PrivacyPolicy />} />
<Route path="/terms" element={<TermsOfService />} />
<Route path="/cookies" element={<CookiePolicy />} />
```

### 6.2 Content Requirements

| Page | Key Sections |
|------|--------------|
| **Privacy Policy** | Data collected, usage, storage, third parties, GDPR rights, retention, contact |
| **Terms of Service** | Service description, accounts, subscriptions, acceptable use, IP, disclaimers, liability, termination, governing law |
| **Cookie Policy** | What cookies, essential vs optional, third-party, management, consent |

---

## 7. Mobile Builds (iOS / Android)

### 7.1 iOS (Capacitor)

```bash
npm run ios:build
# Opens Xcode → Archive → TestFlight → App Store Connect
```

**Requirements:**
- Privacy Manifest (iOS 17+): `NSPrivacyTracking = false`
- App Store screenshots, description, keywords
- Privacy Policy URL in App Store Connect

### 7.2 Android (Capacitor)

```bash
npm run android:build
# Generates signed AAB → Play Console → Internal Testing
```

**Requirements:**
- Target API 34
- Data safety form in Play Console
- Privacy Policy URL

---

## 8. Final Deploy Checklist

### Pre-Deploy Verification

```bash
# All must pass
npx tsc --noEmit           # 0 errors
npx vitest run             # 604 tests passing
npm run build              # Successful build
```

### Deploy Commands

```bash
# 1. Hosting (after App Check client deploy)
npm run build && firebase deploy --only hosting

# 2. Functions (after Node 22 test)
firebase deploy --only functions

# 3. Full deploy (hosting + functions + firestore rules + storage rules)
firebase deploy
```

### Post-Deploy Verification

- [ ] App Check header `X-Firebase-AppCheck` present on live requests
- [ ] Firestore/Storage show 100% verified in App Check
- [ ] Enforce enabled on Firestore & Storage
- [ ] Billing alert test email received
- [ ] No CSP violations in production console
- [ ] GDPR endpoints work: `/api/exportUserData`, `/api/deleteUserAccount`
- [ ] reCAPTCHA Enterprise alerts enabled
- [ ] Node 22 functions deployed

---

## 9. Environment Variables Reference

### Frontend (`.env.local`)

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FUNCTIONS_BASE=https://us-central1-fladycard-22a3e.cloudfunctions.net
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Backend (Secret Manager)

| Secret | Purpose |
|--------|---------|
| `GEMINI_API_KEY` | (Removed if no AI) |
| `DEEPL_API_KEY` | Translation service |
| `ADMIN_UIDS` | Comma-separated UIDs for admin functions |
| `STRIPE_SECRET_KEY` | Stripe server-side key (test mode, `sk_test_`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification (`whsec_`) |
| `STRIPE_PRICE_ID` | Test-mode one-time price (`price_...`). No fallback literal |

---

## 9.1 Stripe Sandbox (test mode only)

This integration is pinned to Stripe **test mode**. `stripeConfig.js` throws on
any `sk_live_` / `rk_live_` secret, so the production API cannot be reached
through these functions even by accident.

### Local setup

1. Copy the templates:
   - `cp .env.example .env.local` (frontend)
   - `cp backend/src/functions/.env.example backend/src/functions/.env` (backend)

> **`.env` del backend es el único lugar con las claves de Stripe.** Las
> funciones Stripe no declaran `secrets: [...]` a propósito: un secreto
> declarado hace que el Functions emulator lo busque en GCP Secret Manager
> (donde el proyecto tiene una clave **live**) e ignore el `.env`. Sin la
> declaración, el emulator nunca toca GCP.
> Coste: una función desplegada ya no recibe estos valores de Secret Manager.
> Si el billing pasa a live, hay que redeclarar los secretos **y** agregar
> `.secret.local` para el desarrollo local, en el mismo cambio.

2. Get the test keys from <https://dashboard.stripe.com/test/apikeys> and set
   `STRIPE_SECRET_KEY=sk_test_...` plus `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...`.

3. Create a **test-mode** one-time price
   (dashboard > Products > Pricing) and set `STRIPE_PRICE_ID=price_...`.
   There is no hardcoded fallback: a literal price ID cannot be verified as
   test mode, so a missing secret fails loudly instead of charging a real price.

4. Get the webhook signing secret from the Stripe CLI. Start the emulators
   first (`npm run emulators`), then in a **second terminal**:

   ```bash
   npm run stripe:listen
   ```

   That script already carries the right port (9001 — 5001 belongs to another
   project) and the right event list. Do not retype it by hand.

   Port **9001**, not 5001: the 2026-10-02 port migration moved glimmind's
   Functions emulator to 9000-9099 and 5001 now belongs to another project.
   Stripe CLI 1.53+ also requires `--events` or it refuses to start.

   Keep this running for the whole test. Without it Stripe cannot reach
   localhost, no webhook arrives, and the user pays without ever becoming
   premium. This is the single most common reason a working purchase still shows
   Plan gratuito, and it has happened three times on this project. The success toast is **not** proof of payment — `SettingsView` shows
   it based on the `?upgrade=success` URL parameter, which Stripe redirects to
   as soon as checkout completes, before the webhook lands. Always confirm with
   `firebase functions:log` or by checking `users/{uid}/meta/main.tier`.

   Copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`. Until you do, the
   endpoint returns 500 with a message telling you to run `stripe listen`.

5. Pay with the test card `4242 4242 4242 4242`, any future expiry, any CVC.

### Deploying secrets

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
firebase functions:secrets:set STRIPE_PRICE_ID
```

### If you later need live mode

There is intentionally no `STRIPE_ALLOW_LIVEMODE` flag (AGENTS.md §32 forbids
parallel modes). Going live is a deliberate change: rotate the keys to `sk_live_`,
update the webhook endpoint signing secret, and remove the guards in
`stripeConfig.js` as part of that same change.

---

## 10. Firebase Security Rules

### Firestore (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Storage (`storage.rules`)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /audio/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 11. Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| App Check "0% verified" | Wait 10-30 min after deploy; ensure hosting deployed with updated client |
| Functions fail to load | Check `index.js` for deleted route imports (e.g., `aiRoutes`) |
| Emulator ports in use | `lsof -ti :9000 :9001 :9080 :9099 :4400 :4500 \| xargs kill -9` |
| Node version mismatch | Ensure `engines.node` in package.json matches deployed version |
| App Check debug token | Add token in Console → App Check → Debug tokens |

---

## 12. Useful URLs

| Console | URL |
|---------|-----|
| Firebase App Check | https://console.firebase.google.com/project/fladycard-22a3e/appcheck |
| reCAPTCHA Enterprise | https://console.cloud.google.com/security/recaptcha |
| GCP Billing Budgets | https://console.cloud.google.com/billing/budgets |
| Secret Manager | https://console.cloud.google.com/security/secret-manager |
| Firebase Hosting | https://console.firebase.google.com/project/fladycard-22a3e/hosting |
| Stripe Dashboard | https://dashboard.stripe.com |

---

## 13. Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-10-08 | 1.0 | Initial documentation |

---

**Last Updated:** 2026-10-08  
**Maintainer:** Glimmind Team