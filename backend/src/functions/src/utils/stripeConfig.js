const Stripe = require("stripe");

// Stripe issues test and live credentials under different prefixes. Live mode is
// in effect as of 2026-10-11, so both are accepted in production.
//
// The emulator is the opposite: it must NEVER talk to live. The Functions
// emulator resolves declared secrets from Secret Manager, so after the switch to
// live credentials a local run picked up the real key automatically. A test card
// cannot charge real money, but a real card typed at localhost would, and
// nothing would have stopped it. This guard is that brake.
//
// Opt out with STRIPE_ALLOW_LIVE_IN_EMULATOR=true when you deliberately want to
// rehearse a live flow locally, and say why in the commit that removes it.
const STRIPE_TEST_SECRET_PREFIX = "sk_test_";
const STRIPE_LIVE_SECRET_PREFIXES = ["sk_live_", "rk_live_"];
const STRIPE_WEBHOOK_SECRET_PREFIX = "whsec_";
const STRIPE_API_VERSION = "2024-06-20";

// Placeholder written by setup until `stripe listen` prints a real value.
const WEBHOOK_SECRET_PLACEHOLDER = "whsec_replace_with_stripe_cli_value";

function isLiveKey(key) {
  return STRIPE_LIVE_SECRET_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function assertLiveNotInEmulator(key) {
  if (!isLiveKey(key)) return;
  if (process.env.FUNCTIONS_EMULATOR !== "true") return;
  if (process.env.STRIPE_ALLOW_LIVE_IN_EMULATOR === "true") return;

  throw new Error(
    "STRIPE_SECRET_KEY is a live key and this is the Functions emulator. " +
      "Testing against live Stripe charges real money. Either point the emulator at " +
      "test keys, or set STRIPE_ALLOW_LIVE_IN_EMULATOR=true if you really mean it."
  );
}

function getStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error("STRIPE_SECRET_KEY not set");
  }

  const isTest = key.startsWith(STRIPE_TEST_SECRET_PREFIX);

  if (!isTest && !isLiveKey(key)) {
    throw new Error("STRIPE_SECRET_KEY must start with sk_test_ or sk_live_");
  }

  assertLiveNotInEmulator(key);

  return key;
}

// A price id only exists in the account that created it. Pairing a live key with
// a test price fails at checkout with "No such price", so catch it here instead.
function assertPriceMatchesAccount(priceId) {
  const key = getStripeSecretKey();
  if (!isLiveKey(key)) return;

  const testPriceIds = process.env.STRIPE_TEST_PRICE_IDS;
  if (testPriceIds && testPriceIds.split(",").map((p) => p.trim()).includes(priceId)) {
    throw new Error(
      "STRIPE_PRICE_ID is a test price but STRIPE_SECRET_KEY is live. Prices are per-account."
    );
  }
}

function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET not set");
  }

  if (secret === WEBHOOK_SECRET_PLACEHOLDER) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is still the placeholder. Run `stripe listen` and copy the whsec_ value it prints."
    );
  }

  if (!secret.startsWith(STRIPE_WEBHOOK_SECRET_PREFIX)) {
    throw new Error("STRIPE_WEBHOOK_SECRET must start with whsec_");
  }

  return secret;
}

function getPriceId() {
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!priceId) {
    throw new Error(
      "STRIPE_PRICE_ID not set. Use the price ID of the one-time premium price for the account the secret key belongs to."
    );
  }

  if (!priceId.startsWith("price_")) {
    throw new Error("STRIPE_PRICE_ID must start with price_");
  }

  assertPriceMatchesAccount(priceId);

  return priceId;
}

let stripeClient = null;

function getStripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeSecretKey(), { apiVersion: STRIPE_API_VERSION });
  }

  return stripeClient;
}

function isTestMode() {
  return getStripeSecretKey().startsWith(STRIPE_TEST_SECRET_PREFIX);
}

// The cached client is built once per cold start. Tests reassign
// process.env between cases, so they need to drop it explicitly.
function resetStripeClient() {
  stripeClient = null;
}

module.exports = {
  STRIPE_TEST_SECRET_PREFIX,
  STRIPE_LIVE_SECRET_PREFIXES,
  STRIPE_WEBHOOK_SECRET_PREFIX,
  STRIPE_API_VERSION,
  WEBHOOK_SECRET_PLACEHOLDER,
  getStripe,
  getStripeSecretKey,
  getWebhookSecret,
  getPriceId,
  isTestMode,
  resetStripeClient,
};