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
   - Price: €4.99/month recurring
   - Metadata: `tier: premium`

2. **Webhooks → Add endpoint:**
   - URL: `https://us-central1-fladycard-22a3e.cloudfunctions.net/stripeWebhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

3. **Get keys:**
   - Publishable key (client)
   - Secret key (server → Secret Manager)

### 5.2 Cloud Functions for Stripe

**Required functions:**

| Function | Purpose |
|----------|---------|
| `createCheckoutSession` | Creates Stripe Checkout session, returns URL |
| `stripeWebhook` | Handles Stripe events, updates Firestore tier |
| `manageSubscription` | Creates Billing Portal session |
| `getSubscriptionStatus` | Returns current tier for UI |

**Backend structure:**
```
backend/src/functions/src/routes/stripeRoutes.js
backend/src/functions/src/services/stripeService.js
```

### 5.3 Frontend Integration

**Landing page / Settings page:**
- "Upgrade to Premium" button → calls `createCheckoutSession` → redirects to Stripe Checkout
- Success → webhook updates `users/{uid}/meta/main.tier = "premium"`

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
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Backend (Secret Manager)

| Secret | Purpose |
|--------|---------|
| `GEMINI_API_KEY` | (Removed if no AI) |
| `DEEPL_API_KEY` | Translation service |
| `ADMIN_UIDS` | Comma-separated UIDs for admin functions |
| `STRIPE_SECRET_KEY` | Stripe server-side key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |

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