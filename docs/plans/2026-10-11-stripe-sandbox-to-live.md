# Stripe: Sandbox to Live

**Date:** 2026-10-11
**Author:** Agent
**Status:** Complete — Stripe is in **live mode**, Premium is a one-time €4.99 purchase
**Version deployed:** 1.36.7

Companion doc: `2026-10-11-lifetime-payment.md` (the subscription → one-time change).
This document covers everything after that: deploying, the bug chain found on the
way out, and switching to live mode.

---

## 1. Current state

| Item | Value |
|---|---|
| Payment model | One-time €4.99, no subscription, no renewal |
| Stripe mode | **LIVE** — real charges |
| Secret key | `sk_live_51NQxidC…` in GCP Secret Manager |
| Price id | `price_1UPTTHCCE67J3dcORO2Z1VYw` (live, one_time, EUR 499) |
| Webhook endpoint | `we_1UPTmjCCE67J3dcOOOaxqsGb` → `https://us-central1-fladycard-22a3e.cloudfunctions.net/stripeWebhook` |
| Webhook events | `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded` |
| Hosting | https://fladycard-22a3e.web.app |

Sandbox counterparts, kept for local testing:

| Item | Value |
|---|---|
| Secret key | `sk_test_51T18EXC…` |
| Price id | `price_1UPS2JC1GrRMJ6MVYML6HIAf` (test, one_time, EUR 499) |
| Test webhook endpoint | `we_1UPTEsC1GrRMJ6MVop6Qys40` |

A price id only exists in the account that created it. Test and live prices are
not interchangeable, and Stripe says "No such price" when they are mixed.

---

## 2. The bug chain

This is the part worth remembering. Five separate defects hid behind one
symptom — "the user pays and the app still says Plan gratuito".

### 2.1 The emulator was writing to another project's database

`backend/src/functions/src/utils/firebase.js` forced
`FIRESTORE_EMULATOR_HOST = localhost:8080`, a value left over from the 2026-10-02
port migration that moved glimmind to 9080. It overrode the correct value from
`firebase.json`, so **every function wrote into tabito-revamped's Firestore
emulator**. No error, because port 8080 existed and answered.

Found by adding a temporary `console.log` and reading `firebase-debug.log`, which
showed the real value at runtime:

```
[stripeWebhook] DEBUG type= customer.subscription.updated uid= TAmVwlUm...
[firebase.js] FIRESTORE_EMULATOR_HOST = localhost:8080   ← here
```

### 2.2 A live key was silently charging real money

`firebase-tools` resolves secrets declared in `onRequest({ secrets: [...] })`
from GCP Secret Manager — and only falls back to `.env` for keys absent from
`.secret.local`. The project had a live key in Secret Manager, so the local
emulator authenticated against production. Every local test checkout was a real
charge.

### 2.3 `mode: 'payment'` would have silently broken the webhook

`stripeService.js` read `session.subscription`, which is `null` in payment mode.
The existing `if (!subscriptionId) break;` guard would have swallowed the event:
customer pays, never becomes premium. This is the same failure mode that was
already fixed once earlier that day.

### 2.4 The success toast was a lie

`SettingsView` called `loadQuota()` once on return from Stripe and immediately
showed "Tu cuenta ya es Premium". Stripe redirects back *before* the webhook
writes `meta.tier`, so the single read races the webhook and almost always
returns `free`. The toast claimed success regardless of the outcome.

Now polls every 1.5s until the tier flips (15s cap) and only confirms on success.

### 2.5 Switching accounts left every customer id dangling

Stripe scopes customer ids per account. After moving to sandbox keys, every
`stripeCustomerId` already stored in Firestore pointed at the live account and
checkout returned `500 No such customer`. `getOrCreateStripeCustomer` returned
the stored id without checking it.

It now retrieves the customer first and, only on `resource_missing`, discards it
and creates a new one. Auth/network failures still propagate, so a bad API key
cannot silently rotate stored ids.

---

## 3. Traps

Each of these cost real debugging time. They are all still true.

**Test card `4242…` does not work in live mode.** There is no way to test the
live flow without a real €4.99 charge. Refunding from the dashboard triggers
`charge.refunded`, which revokes premium automatically — a complete round trip.

**`stripe listen` is required for every local webhook test.** Stripe cannot
reach `localhost`. Without it the payment succeeds and no webhook arrives, so
the account stays on the free plan. This caused the same confusion three times.
Run `npm run stripe:listen` in a second terminal before testing.

**Port 9001, not 5001.** 5001 belongs to tabito-revamped after the port
migration. See `docs/emulator-port-migration.md`.

**Stop the emulator with Ctrl+C, not `npm run emulators:kill`.** The kill script
uses `kill -9`, which skips `--export-on-exit` and wipes all local Firestore data.

**Stripe CLI 1.53+ requires `--events`.** `stripe listen` refuses to start
without it.

**Never put the Stripe secrets in `backend/src/functions/.env`.** firebase-tools
injects that file as *plain* env vars on deploy, and a plain var colliding with a
declared secret fails the whole deploy with "Secret environment variable overlaps
non secret environment variable".

---

## 4. Where the credentials live

Stripe credentials live **only** in GCP Secret Manager:

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_PRICE_ID
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

The Functions emulator reads declared secrets from Secret Manager too, so local
and production resolve the same values. That is why the secrets are not duplicated
in `.env` — doing so breaks the deploy.

The backend `.env` no longer holds any credentials: Stripe keys are declared
secrets in Secret Manager, and `DEEPL_API_KEY` was removed with DeepL on
2026-10-11.

---

## 5. The safety net

`utils/stripeConfig.js` refuses, in order:

| Check | Why |
|---|---|
| `sk_test_`/`sk_live_` prefix | catches a pasted key from the wrong place |
| **live key + `FUNCTIONS_EMULATOR=true`** | the emulator reads live secrets from Secret Manager; a real card typed at localhost would charge real money |
| live key + a price listed in `STRIPE_TEST_PRICE_IDS` | prices are per-account; this fails at checkout with a cryptic "No such price" |
| `whsec_` prefix / placeholder rejection | a stale `stripe listen` secret silently breaks every webhook |

To deliberately rehearse a live flow locally:
`STRIPE_ALLOW_LIVE_IN_EMULATOR=true npm run emulators`.

---

## 6. Testing a purchase locally

```bash
npm run emulators          # terminal 1
npm run stripe:listen      # terminal 2 — leave it running
npm run dev                # terminal 3
```

With production on live keys, the emulator is **blocked** (see §5). To test
locally you must point the emulator at sandbox keys first:

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY      # paste sk_test_…
firebase functions:secrets:set STRIPE_PRICE_ID         # paste price_1UPS2JC1…
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET   # sandbox endpoint secret
npm run deploy                                          # functions pick it up
```

Remember to switch back afterwards, or production stops charging.

---

## 7. Going back to sandbox

Same command set, with the three sandbox values from §1. Redeploy afterwards.

---

## 8. Open items

- **Premium AI limit is 1000 points/day** (`config/plans.json`). Chosen before
  any real users existed. With paying customers this is the main cost exposure:
  every premium user can consume up to 1000 points of paid API calls (Gemini,
  DeepL, Chirp) every day forever, for a one-off €4.99. Tune it in
  `backend/src/functions/src/config/plans.json` and the `src/config/` mirror; the
  `plansDrift` test fails if they diverge.
- **`getSubscriptionStatus` and `createBillingPortalSession` were deleted**, along
  with their rewrites. There is no self-serve way for a customer to get a
  receipt. If that becomes a support burden, add a receipts-only Billing Portal
  configuration rather than restoring the full subscription flow.
- **Refunds are the downgrade path.** `charge.refunded` only downgrades on a
  *fully* refunded charge; partial refunds leave premium in place. That was a
  deliberate choice.
- **Old versioned secrets remain in Secret Manager.** `STRIPE_SECRET_KEY` has a
  version 1 holding the original live key. Rotate or delete it if the exposure
  matters.