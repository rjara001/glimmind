const { onRequest } = require("firebase-functions/v2/https");
const { getDb, getAuth } = require("../utils/firebase");
const { requireAuth } = require("../utils/helpers");
const stripeService = require("../services/stripeService");
const { rateLimit } = require("../utils/rateLimit");
const Stripe = require('stripe');

function applyRateLimit(fnName, handler) {
  const limiter = rateLimit(fnName);
  return async (req, res) => {
    await new Promise((resolve, reject) => {
      limiter(req, res, (err) => { if (err) reject(err); else resolve(); });
    });
    return handler(req, res);
  };
}

const PRICE_ID = 'price_1UOKzMCCE67J3dcOBzkWLf18';

// 1. Create Checkout Session (callable via /api/createCheckoutSession)
exports.createCheckoutSession = onRequest({ cors: true, secrets: ['STRIPE_SECRET_KEY'] }, 
  applyRateLimit('createCheckoutSession', async (req, res) => {
    const uid = await requireAuth(req, res);
    if (!uid) return;

    try {
      const { successUrl, cancelUrl } = req.body;
      if (!successUrl || !cancelUrl) {
        return res.status(400).json({ error: 'successUrl and cancelUrl required' });
      }

      const db = require('../utils/firebase').getDb();
      const auth = require('../utils/firebase').getAuth();
      const token = await getAuth().verifyIdToken(req.headers.authorization.slice(7));
      const email = token.email;

      const url = await stripeService.createCheckoutSession(
        require('../utils/firebase').getDb(),
        uid,
        email,
        PRICE_ID,
        successUrl,
        cancelUrl
      );

      res.json({ url });
    } catch (error) {
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
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
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

// 3. Billing Portal (for manage subscription)
exports.createBillingPortalSession = onRequest({ cors: true, secrets: ['STRIPE_SECRET_KEY'] }, 
  applyRateLimit('billingPortal', async (req, res) => {
    const uid = await requireAuth(req, res);
    if (!uid) return;

    const { returnUrl } = req.body;
    if (!returnUrl) return res.status(400).json({ error: 'returnUrl required' });

    try {
      const url = await stripeService.createBillingPortalSession(
        require('../utils/firebase').getDb(),
        uid,
        returnUrl
      );
      res.json({ url });
    } catch (error) {
      console.error('[createBillingPortalSession] Error:', error);
      res.status(500).json({ error: error.message });
    }
  }));

// 4. Get Subscription Status (for UI)
exports.getSubscriptionStatus = onRequest({ cors: true }, async (req, res) => {
  const uid = await requireAuth(req, res);
  if (!uid) return;

  const db = require('../utils/firebase').getDb();
  const metaRef = require('../utils/helpers').metaRefFor(db, uid);
  const snap = await metaRef.get();
  
  if (!snap.exists) return res.json({ tier: 'free' });
  
  const meta = snap.data();
  res.json({
    tier: meta.tier || 'free',
    stripeCustomerId: meta.stripeCustomerId,
    stripeSubscriptionId: meta.stripeSubscriptionId,
    stripeSubscriptionStatus: meta.stripeSubscriptionStatus,
    stripePriceId: meta.stripePriceId,
    stripeCurrentPeriodEnd: meta.stripeCurrentPeriodEnd,
  });
});