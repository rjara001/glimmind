# The GitHub Actions deploy has never worked

**Date:** 2026-10-12
**Priority:** P2 — hygiene
**Status:** Not fixed

## What

`.github/workflows/deploy.yml` fails on every run. It needs a repository secret
named `FIREBASE_SERVICE_ACCOUNT` that has never existed. The project has always
been deployed by hand with `npm run deploy`, so the broken workflow went unnoticed.

## Impact

Every push to `main` creates a failed run in the Actions tab. That is cosmetic on
its own, but it hides real breakage:

- The version-bump gate in this workflow has therefore never actually gated
  anything, because the job that fails is `deploy`, not `check-version`.
- `ci.yml` carries a **second** deploy job that also runs on `main`. With two
  deploy paths and one broken, nobody knows which one is authoritative.
- A broken red badge on every merge trains people to ignore CI, which is exactly
  how the real failure (`Cannot find module 'stripe'`) survived until 2026-10-12.

## Evidence

```
$ gh secret list
API_KEY               FIREBASE_TOKEN          VITE_FIREBASE_API_KEY
VITE_FIREBASE_APP_ID  VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_PROJECT_ID  VITE_FIREBASE_STORAGE_BUCKET
VITE_FUNCTIONS_BASE
```

`FIREBASE_SERVICE_ACCOUNT` is absent. `FIREBASE_TOKEN` is present.

```
$ gh run list --workflow "Deploy with Version Check" --limit 15
failure | 2026-10-12 | 7b91bf5b
failure | 2026-10-09 | 8dc830b7
failure | 2026-10-09 | d5dd83e0
failure | 2026-10-09 | 86576142
failure | 2026-10-09 | b8d08d8b
failure | 2026-10-09 | 302daacf
failure | 2026-10-09 | 131805f1
failure | 2026-10-09 | a3033e85
failure | 2026-10-08 | 8aa13911
failure | 2026-10-07 | 9a78ff24
failure | 2026-10-07 | 7033792f
```

Zero successes in the available history.

```
Error: Input required and not supplied: firebaseServiceAccount
```

## Fix

Pick one of three, not all:

1. **Delete `deploy.yml`.** The real path is `npm run deploy`, run by hand. The
   `check-version` gate can move into `ci.yml`, where it would actually block.
2. **Point it at the token that exists.** Replace the `FirebaseExtended/action-hosting-deploy`
   step with `firebase deploy --only hosting` using `FIREBASE_TOKEN`, the way
   `ci.yml` already does. Note this only publishes hosting; the current script
   publishes `hosting,functions`.
3. **Add the service-account secret.** More setup, and it introduces a long-lived
   credential in CI for a project that deploys fine by hand.

Option 1 is the honest one unless automated deploys are actually wanted.