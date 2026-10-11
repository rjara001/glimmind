# Plan: Lifetime Payment + Configurable Plans

**Date:** 2026-10-11
**Author:** Agent
**Status:** Complete — implemented and deployed. See `2026-10-11-stripe-sandbox-to-live.md` for the deploy, the bugs found on the way out, and the switch to live mode.

---

## 1. Summary

Premium is currently sold as a €4.99/month Stripe subscription. The business
decision is to switch it to a **one-time €4.99 lifetime payment**.

This changes the payment model end to end: Stripe Checkout moves from
`mode: 'subscription'` to `mode: 'payment'`, the subscription webhooks disappear,
the Billing Portal stops applying, and the legal copy has to be rewritten.

Separately, the plan limits (`maxCards`, `aiDailyLimit`) are **hardcoded twice** —
once in the backend and once in the frontend — with no drift guard. They move to a
configurable JSON pair, per the requirement that limits must be tunable without
touching code.

---

## 2. Decisions

| Decision | Value |
|---|---|
| Payment model | One-time, no renewal |
| Price | €4.99 (EUR 499), one-time |
| Premium UI in `/settings` | Text only, no button (Billing Portal does not apply) |
| Already-premium user | No upgrade button at all; backend guard as backstop |
| Plan limits | Configurable JSON, not hardcoded |
| Premium AI daily limit | **Kept at 1000** for now; tunable later via the JSON |

### Decisions since written

- **Refunds.** Resolved: premium **is** revoked on a full refund
  (`charge.refunded`); partial refunds leave premium in place.
- **Sequencing.** Resolved: shipped in full.
- **Live mode.** Resolved: Stripe went live on 2026-10-11. See
  `2026-10-11-stripe-sandbox-to-live.md`.

---

## 3. Current state (verified)

### Stripe test mode
- Product `prod_VQC3gya9UqQXYv` "Glimmind Premium"
- Recurring price `price_1UPLfrC1GrRMJ6MV0i1TXmvw` (EUR 499/month) — to be replaced
- Two live test subscriptions: `sub_1UPQk9C1GrRMJ6MVmLVvunUu` (algae.raccoon.978),
  `sub_1UPR9QC1GrRMJ6MVwNXyHxRr` (olive.algae.719)

### Flow today
`LandingPage` → `/login?next=/settings` → `SettingsView.handlePremiumClick`
→ `createCheckoutSession` → hosted Checkout → back to `/settings?upgrade=success`
→ **single** `loadQuota()` → toast.

Tier is read from `getQuota` (which returns `meta.tier`), never from
`getSubscriptionStatus`.

### Dead code that gets removed
- `getSubscriptionStatus` — **0 production call sites.** Backend handler, rewrite,
  and TS interface all exist with no consumer.
- `createBillingPortalSession` — one call site, removed with the portal.
- `PremiumSectionCopy` in `src/types/premium.ts:3-6` — already orphaned.
- `SubscriptionStatus` interface in `src/services/stripe.ts:7-14` — already orphaned.

---

## 4. Critical gotcha

`stripeService.js:67` currently reads:

```js
if (!subscriptionId) break;      // session.subscription is null in payment mode
```

In `mode: 'payment'`, `session.subscription` is `null`, so `checkout.session.completed`
would hit that guard and **silently do nothing** — the customer pays and never gets
premium. This is the exact failure mode that was already fixed once
(see `docs/dashboard-api-trigger-analysis.md`, row 2026-10-09). It must not be
reintroduced.

---

## 5. Phases

### Phase 1 — Stripe dashboard (sandbox)

1. Create a **one-time** price: EUR 499, `type: one_time`, on `prod_VQC3gya9UqQXYv`
2. Deactivate `price_1UPLfrC1GrRMJ6MV0i1TXmvw`
3. Update `STRIPE_PRICE_ID` in `backend/src/functions/.env`
4. Cancel the two leftover test subscriptions

### Phase 2 — Configurable plans

**New** `backend/src/functions/src/config/plans.json` (canonical, ships with the
functions):

```json
{
  "tiers": {
    "free":    { "maxCards": 1000, "aiDailyLimit": 100  },
    "premium": { "maxCards": 5000, "aiDailyLimit": 1000 }
  },
  "thresholds": { "warningRatio": 0.8, "dangerRatio": 0.95, "blockRatio": 1.0 },
  "maxCardsPerList": 5000
}
```

**New** `backend/src/functions/src/utils/plans.js` — loads the JSON and exposes
`getMaxCards(tier)` / `getAiDailyLimit(tier)` with the **same synchronous
signatures** `quotaConfig.js` has today. This is deliberate: ~12 call sites across
the backend use these synchronously, and keeping the signature avoids a refactor
that would otherwise be needed.

**Mirror** `src/config/plans.json` for the frontend.

> **Why a mirror instead of one file:** `vite.config.ts:9` sets `root: 'src'`, so
> Vite cannot reliably import a file from `backend/`. Firebase also only deploys
> `backend/src/functions/`, so the backend cannot read from the repo root. A
> drift test (§7) keeps the two copies honest.

**New** drift test fails if the two JSONs diverge.

### Phase 3 — Backend

**`services/stripeService.js`**

| Line | Change |
|---|---|
| 32-48 | `mode: 'subscription'` → `'payment'` |
| 43-45 | remove `subscription_data` (does not exist in payment mode) |
| 46 | remove `allow_promotion_codes` (subscription-only parameter) |
| 47 | keep `billing_address_collection` |
| — | **add** `payment_intent_data: { metadata: { firebaseUid: uid } }` as a redundant path to recover the uid |
| 57-75 | `checkout.session.completed` reads `session.metadata.firebaseUid`, no subscription lookup |
| 76-85 | **delete** all three `customer.subscription.*` cases — they will never fire |
| 86-89 | `invoice.payment_failed` — already a no-op, delete |
| 93-114 | `updateSubscriptionStatus` → `activatePremium(db, uid, session)` |
| 103-106 | write `tier: 'premium'`, `cardQuota`, `aiQuotaDaily`, `premiumActivatedAt`; drop the four `stripeSubscription*` / `stripeCurrentPeriodEnd` fields |
| 116-132 | **delete** `createBillingPortalSession` |
| new | guard: if `meta.tier === 'premium'`, throw before touching Stripe (prevents double purchase) |

**`routes/stripeRoutes.js`**

- Delete `createBillingPortalSession` (`:102-122`) and `getSubscriptionStatus` (`:125-144`)
- Keep `createCheckoutSession` (`:33-63`) and `stripeWebhook` (`:66-100`)
- Keep the `:18-30` comment explaining why `secrets: [...]` must not be declared

**`firebase.json`** — remove rewrites for `/api/billingPortal` (`:210-213`) and
`/api/getSubscriptionStatus` (`:214-216`)

**`utils/stripeConfig.js:61`** — update the `getPriceId()` error message, which
currently says "test-mode **recurring** price"

### Phase 4 — Frontend

**`src/components/views/SettingsView.tsx`**

- `:104-113` — delete the `isPremium` branch that calls the billing portal
- `:177` — remove the "Gestionar suscripción" button; premium users see text only
- **`:62-78` — fix the race.** This is required for the feature to look correct:

  ```ts
  loadQuota();                                  // runs BEFORE the webhook lands
  showToast('Tu cuenta ya es Premium.');         // promises something unverified
  ```

  Replace with a poll: call `loadQuota()` every ~1.5s until `quota.tier === 'premium'`,
  capped at ~15s. Show the success toast **only once confirmed**; on timeout show an
  informational toast instead. Clear the interval on unmount (AGENTS.md §5).

  Without this, even a perfectly working webhook still renders "Plan gratuito"
  because the refresh races it — which is exactly the confusing symptom that
  prompted this investigation.

**`src/services/stripe.ts`** — delete `createBillingPortalSession` (`:25`),
`getSubscriptionStatus` (`:32`) and the orphaned `SubscriptionStatus` interface (`:7-14`)

**`src/constants/premium.ts`** — delete `PREMIUM_BILLING_PORTAL_RETURN_URL` (`:7`)
and `PREMIUM_TOAST_PORTAL_ERROR` (`:12`)

**`src/components/views/LandingPage.tsx:223-229`** — `€4,99 /mes` → one-time price;
the Free plan at `:204-209` must stop saying `/mes`

**`src/components/views/TermsOfService.tsx:46-55`** — rewrite section 4. Removes
"Cancel anytime; access continues until period ends" (`:51`). Also `:90` caps
liability at "the amount you paid in the preceding 12 months", which does not
apply to a one-time purchase.

**`src/types/premium.ts:3-6`** — delete the orphaned `PremiumSectionCopy`

`CookiePolicy.tsx:76` stays valid as written.

### Phase 5 — Docs and version

- `docs/LAUNCH_CHECKLIST.md` — Stripe section (§5, §9.1) describes a subscription
- `docs/LAUNCH_PLAN.md:121` — `Premium (€4.99/mo or €49/yr)`
- `docs/dashboard-api-trigger-analysis.md` — new row in **Registro de Cambios**
  (AGENTS.md §33)
- Version bump **1.35.0 → 1.36.0** in `src/constants/version.ts` and `package.json`
  (AGENTS.md §30 — feature change, not a patch)

---

## 6. What does NOT change

Worth stating explicitly, since it bounds the blast radius:

- **The daily AI limit is independent of Stripe.** It resets lazily by comparing a
  local date key (`utils/helpers.js:8-14`), not by subscription period. Survives intact.
- **`getQuota` remains the single source of tier** for the UI. `meta.tier` keeps
  being written only by the webhook.
- `isAiBlocked` is a card-count state (`quotaConfig.js:57`), unrelated to AI usage.
- `setUserPremium` (manual admin grant, `userRoutes.js:111-137`) is untouched.
- The `secrets: [...]` restriction stays in force — see the comment at
  `stripeRoutes.js:18-30`.

---

## 7. Tests

| File | Change |
|---|---|
| `tests/services/stripeWebhook.test.ts` | **Large rewrite.** Payment mode; drop subscription event cases; assert premium + quota sync |
| `tests/services/stripe.test.ts` | Remove portal (`:45-60`) and `getSubscriptionStatus` (`:62-85`) suites |
| `tests/components/SettingsView.test.tsx` | Premium shows no button (`:135`); `?upgrade=success` test (`:191-205`) must use fake timers to drive the poll; it currently asserts `loadQuota` called exactly once |
| `tests/config/plansDrift.test.ts` | **New.** Fails if the two JSONs differ |
| `backend/src/functions/tests/stripeConfig.test.js` | Update the `getPriceId` message assertion |

---

## 8. Verification

```bash
npx tsc --noEmit
npx vitest run

stripe listen \
  --forward-to localhost:9001/fladycard-22a3e/us-central1/stripeWebhook \
  --events checkout.session.completed,payment_intent.succeeded
```

Manual: new user → `/settings` → "Actualizar a Premium" → card
`4242 4242 4242 4242` → returns to `/settings` and the plan switches to Premium
**without a manual reload**. Then verify `users/{uid}/meta/main` has
`tier: premium`, `cardQuota: 5000`, and no lingering subscription fields.

Note the emulator port is **9001**, not the Stripe-CLI default 5001, which belongs
to another project (see `docs/emulator-port-migration.md`).

---

## 9. Files touched

| File | Change |
|---|---|
| `backend/src/functions/src/config/plans.json` | **new** (canonical) |
| `backend/src/functions/src/utils/plans.js` | **new** |
| `src/config/plans.json` | **new** (mirror) |
| `backend/src/functions/src/services/stripeService.js` | payment mode, webhook, drop portal, double-buy guard |
| `backend/src/functions/src/routes/stripeRoutes.js` | delete 2 handlers |
| `backend/src/functions/src/utils/quotaConfig.js` | delegate to `plans.js` |
| `backend/src/functions/src/utils/stripeConfig.js` | error message |
| `firebase.json` | remove 2 rewrites |
| `src/components/views/SettingsView.tsx` | drop portal button, fix refresh race |
| `src/services/stripe.ts` | drop 2 methods + orphan type |
| `src/constants/premium.ts` | drop 2 constants |
| `src/types/premium.ts` | drop orphan type |
| `src/components/views/LandingPage.tsx` | price copy |
| `src/components/views/TermsOfService.tsx` | rewrite billing section |
| `tests/services/stripeWebhook.test.ts` | rewrite |
| `tests/services/stripe.test.ts` | remove 2 suites |
| `tests/components/SettingsView.test.tsx` | update |
| `tests/config/plansDrift.test.ts` | **new** |
| `backend/src/functions/.env` | `STRIPE_PRICE_ID` (local, gitignored) |
| `docs/LAUNCH_CHECKLIST.md`, `docs/LAUNCH_PLAN.md` | update |
| `docs/dashboard-api-trigger-analysis.md` | changelog row |
| `src/constants/version.ts`, `package.json` | 1.36.0 |

---

## 10. Follow-up (not in this plan)

Once the AI limit needs real tuning, migrate the JSON to Firestore or Firebase
Remote Config so limits change without a deploy. That is a larger refactor —
`getMaxCards`/`getAiDailyLimit` would need to become async or cache-backed —
and is not warranted before the current limit is validated against real usage.