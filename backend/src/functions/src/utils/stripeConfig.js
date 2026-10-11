const Stripe = require("stripe");

// Stripe issues test and live credentials under different prefixes. Every
// helper below refuses anything that is not test mode, so a stray production
// key cannot reach the Stripe API through these functions.
const STRIPE_TEST_SECRET_PREFIX = "sk_test_";
const STRIPE_LIVE_SECRET_PREFIXES = ["sk_live_", "rk_live_"];
const STRIPE_WEBHOOK_SECRET_PREFIX = "whsec_";
const STRIPE_API_VERSION = "2024-06-20";

// Placeholder written by setup until `stripe listen` prints a real value.
const WEBHOOK_SECRET_PLACEHOLDER = "whsec_replace_with_stripe_cli_value";

let stripeClient = null;

function getStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error("STRIPE_SECRET_KEY not set");
  }

  if (STRIPE_LIVE_SECRET_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    throw new Error(
      "STRIPE_SECRET_KEY is a live key. This project runs in Stripe test mode only."
    );
  }

  if (!key.startsWith(STRIPE_TEST_SECRET_PREFIX)) {
    throw new Error("STRIPE_SECRET_KEY must start with sk_test_ (test mode only)");
  }

  return key;
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
      "STRIPE_PRICE_ID not set. Use the price ID of the one-time premium price (Stripe test dashboard)."
    );
  }

  if (!priceId.startsWith("price_")) {
    throw new Error("STRIPE_PRICE_ID must start with price_");
  }

  return priceId;
}

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