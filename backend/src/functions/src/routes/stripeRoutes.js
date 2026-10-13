const { onRequest } = require("firebase-functions/v2/https");
const { getDb, getAuth } = require("../utils/firebase");
const { requireAuth } = require("../utils/helpers");
const stripeService = require("../services/stripeService");
const { rateLimit } = require("../utils/rateLimit");
const { getStripe, getWebhookSecret, getPriceId } = require("../utils/stripeConfig");

function applyRateLimit(fnName, handler) {
  const limiter = rateLimit(fnName);
  return async (req, res) => {
    await new Promise((resolve, reject) => {
      limiter(req, res, (err) => { if (err) reject(err); else resolve(); });
    });
    return handler(req, res);
  };
}

// SECRETS AND SANDBOX — read before changing any key.
//
// These Stripe values are declared secrets so the deployed functions receive
// them from Secret Manager, exactly like GEMINI_API_KEY and ADMIN_UIDS do in
// the other routes. Locally, the Functions emulator reads .secret.local first
// (this directory); if a key is present there it never queries Secret Manager.
// Production always reads Secret Manager.
//
// Secret Manager currently holds LIVE credentials (sk_live_). The emulator
// guard in utils/stripeConfig.js blocks live keys unless
// STRIPE_ALLOW_LIVE_IN_EMULATOR=true, so a real card typed at localhost is
// refused by default.
//
// Going live means rotating all three in Secret Manager and creating a one-time
// price in the live account. Do not "fix" this by deleting the declarations —
// that is what makes the emulator silently diverge from production.

// 1. Create Checkout Session (callable via /api/createCheckoutSession)
exports.createCheckoutSession = onRequest({ cors: true, secrets: ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_ID'] },
  applyRateLimit('createCheckoutSession', async (req, res) => {
    const uid = await requireAuth(req, res);
    if (!uid) return;

    try {
      const { successUrl, cancelUrl } = req.body;
      if (!successUrl || !cancelUrl) {
        return res.status(400).json({ error: 'successUrl and cancelUrl required' });
      }

      const priceId = getPriceId();
      // requireAuth already verified this token, so the uid is authoritative.
      const token = await getAuth().verifyIdToken(req.headers.authorization.slice(7));
      const email = token.email;

      const url = await stripeService.createCheckoutSession(
        getDb(),
        uid,
        email,
        priceId,
        successUrl,
        cancelUrl
      );

      res.json({ url });
    } catch (error) {
      // Already premium is a client-state problem, not a server fault: 400 keeps
      // it out of error reporting and lets the UI show a real message.
      if (error.code === 'ALREADY_PREMIUM') {
        return res.status(400).json({ error: error.message, code: 'ALREADY_PREMIUM' });
      }
      console.error('[createCheckoutSession] Error:', error);
      res.status(500).json({ error: error.message });
    }
  }));

// 2. Stripe Webhook (raw body required)
exports.stripeWebhook = onRequest({ 
  cors: true, 
  secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
  timeoutSeconds: 60,
  memory: '256MiB'
}, async (req, res) => {
  // Misconfiguration (missing secret, live key, placeholder whsec_) is a 500,
  // not a 400: the request itself is well formed, our credentials are not.
  let stripe;
  let webhookSecret;
  try {
    stripe = getStripe();
    webhookSecret = getWebhookSecret();
  } catch (err) {
    console.error('[stripeWebhook] Configuration error:', err.message);
    return res.status(500).json({ error: err.message });
  }

  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[stripeWebhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    await stripeService.handleStripeWebhook(require('../utils/firebase').getDb(), event);
    res.json({ received: true });
  } catch (error) {
    console.error('[stripeWebhook] Handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});