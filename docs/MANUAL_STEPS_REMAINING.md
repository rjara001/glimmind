# Glimmind Security Hardening — Manual Steps & Pending Items

## Overview
All automated/code changes are deployed. These items require **manual action in Firebase/GCP Console**.

---

## 🔴 Critical — Must Do Before Launch

### 1. Register App Check (Firebase Console)
**URL:** https://console.firebase.google.com/project/fladycard-22a3e/appcheck

**Steps:**
1. Open direct registration URL (bypasses grayed-out list):
   ```
   https://console.firebase.google.com/project/fladycard-22a3e/appcheck/apps/web/create
   ```
2. Fill modal:
   - **App nickname:** `glimmind`
   - **Attestation provider:** **Fraud Defense (reCAPTCHA Enterprise)**
   - **reCAPTCHA secret key:** Paste **Site Key** (public key `6L...` from reCAPTCHA Enterprise)
   - **Token TTL:** `3600`
3. Click **Save**

**Then enable enforcement:**
4. In App Check list → click **3-dot menu (⋮)** on glimmind → **Enforce**
5. Check all three:
   - ☑️ Cloud Firestore
   - ☑️ Cloud Storage
   - ☑️ Cloud Functions
6. Click **Enforce**

**Note:** Requires **Owner** or **Editor** role on Firebase project.

---

### 2. Add Site Key to Frontend & Redeploy
**File:** `src/firebase.ts` — add **before** `initializeApp`:

```typescript
// App Check - add BEFORE initializeApp
if (typeof window !== 'undefined') {
  (window as any).FIREBASE_APPCHECK_SITE_KEY = 'YOUR_SITE_KEY_HERE';
}
```

**Redeploy:**
```bash
npm run build && firebase deploy --only hosting
```

**Verify:** DevTools → Network → any Firestore request → check header `X-Firebase-AppCheck: <token>`

---

### 3. reCAPTCHA Enterprise Settings (Google Cloud Console)
**URL:** https://console.cloud.google.com/security/recaptcha

**Settings to verify:**
| Setting | Value |
|---------|-------|
| Verify origin of reCAPTCHA solutions | ✅ **Enabled** (default) |
| Allow AMP pages | ❌ **Disabled** |
| Send alerts to owners | ✅ **Enabled** |

Click **Save** if changed.

---

### 4. Billing Alerts (GCP Console)
**URL:** https://console.cloud.google.com/billing/budgets

**Create budget:**
1. **Budget amount:** $20-50/month (adjust to your risk tolerance)
2. **Alert thresholds:** 50%, 90%, 100%
3. **Notifications:** Email to your address
4. **Scope:** All services (or filter to Firebase, Cloud Functions, Vertex AI)

---

## 🟡 High — Do Soon

### 5. Rotate Secrets if Exposed in Git History
**Check:**
```bash
git log --all --full-history --oneline --source -- '**/*.env*' '**/secrets*' '**/*secret*' '**/*key*'
```

**If any real keys found:**
1. Rotate in Secret Manager (create new version)
2. Redeploy functions: `firebase deploy --only functions`

---

### 6. Upgrade Node.js Runtime (Before Oct 2026)
**Current:** Node 20 (deprecated 2026-04-30, decommissioned 2026-10-30)

**When ready:**
```bash
cd backend/src/functions
# Edit package.json: "engines": { "node": "22" }
# Test locally: firebase emulators:start
# Deploy: firebase deploy --only functions
```

---

## 🟢 Medium — Nice to Have

### 7. CSP Violation Check
After App Check + hosting redeploy:
1. Open app in browser
2. DevTools → Console → filter "Content-Security-Policy"
3. If any legitimate resource blocked, add to `firebase.json` → hosting → headers → CSP → redeploy hosting

### 8. Custom Domain (Optional)
If using custom domain (e.g., `glimmind.com`):
1. Firebase Console → Hosting → Add custom domain
2. Update reCAPTCHA Enterprise domains to include custom domain
3. Update CSP `connect-src`/`script-src` if needed

### 9. Monitoring Dashboards (Optional)
**GCP Console → Monitoring → Dashboards:**
- Create dashboard for: Function invocations, Firestore reads/writes, AI API calls, Error rates
- Set alerting on anomalies

---

## ✅ Already Done (Code/Config Deployed)

| Item | Status |
|------|--------|
| npm audit fixes | ✅ 42 → 8 vulns (remaining: sharp native, capacitor dev deps) |
| Firestore Rules audit | ✅ User isolation verified, no open rules |
| Storage Rules audit | ✅ User-scoped paths, root denied |
| Secrets in bundle check | ✅ Only Firebase public config (expected) |
| Zod input validation | ✅ All Cloud Functions validated |
| Rate limiting | ✅ Per-function limits (AI: 10/min, TTS: 30/min, etc.) |
| CSP + Security headers | ✅ HSTS, X-Frame-Options, CSP, Permissions-Policy deployed |
| Secret Manager | ✅ GEMINI_API_KEY, DEEPL_API_KEY, ADMIN_UIDS in Secret Manager |
| Firestore Rules tests | ✅ 8/8 passing (user isolation, auth, anon) |
| Function unit tests | ✅ 19/19 passing (validation, rate limiting) |
| GDPR delete/export | ✅ `/api/deleteUserAccount` & `/api/exportUserData` deployed |
| Clean API URLs | ✅ `/api/*` rewrites via Firebase Hosting |

---

## 📋 Verification Checklist (Post-Launch)

After completing manual steps above:

- [ ] App Check shows "Active" / "Enforced" for Firestore, Storage, Functions
- [ ] `X-Firebase-AppCheck` header present on live requests
- [ ] Billing alerts configured and test email received
- [ ] No CSP violations in production console
- [ ] GDPR endpoints tested: `/api/exportUserData`, `/api/deleteUserAccount`
- [ ] reCAPTCHA Enterprise alerts enabled
- [ ] Node 22 upgrade scheduled before Oct 2026

---

## 🔗 Quick Links

| Console | URL |
|---------|-----|
| Firebase App Check | https://console.firebase.google.com/project/fladycard-22a3e/appcheck |
| App Check Direct Register | https://console.firebase.google.com/project/fladycard-22a3e/appcheck/apps/web/create |
| reCAPTCHA Enterprise | https://console.cloud.google.com/security/recaptcha |
| GCP Billing Budgets | https://console.cloud.google.com/billing/budgets |
| Secret Manager | https://console.cloud.google.com/security/secret-manager |
| Firebase Hosting | https://console.firebase.google.com/project/fladycard-22a3e/hosting |

---

## 📞 If Blocked

| Issue | Solution |
|-------|----------|
| Can't register App Check (grayed inputs) | Use direct URL above; need Owner/Editor role |
| No Owner/Editor role | Ask project Owner to register or grant role |
| reCAPTCHA Enterprise not showing | Ensure billing enabled on GCP project |
| CSP breaks app | Check Console → Network → CSP violations → adjust `firebase.json` |

---

**Last Updated:** $(date)
**Plan Status:** Code complete — awaiting manual console steps