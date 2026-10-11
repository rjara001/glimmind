const { getDb, getAuth, FieldValue } = require('../utils/firebase');
const { metaRefFor, getOrCreateMeta } = require('../utils/helpers');
const { getStripe } = require('../utils/stripeConfig');
const { getMaxCards, getAiDailyLimit } = require('../utils/quotaConfig');

// Premium is a ONE-TIME purchase, not a subscription. There is no renewal and
// no downgrade, so the only path into premium is a paid Checkout session and the
// only path out is a refund. Anything subscription-shaped below is deliberate.

const PREMIUM_TIER = 'premium';
const FREE_TIER = 'free';

async function getOrCreateStripeCustomer(db, uid, email) {
  const metaRef = metaRefFor(db, uid);
  const snap = await metaRef.get();
  const meta = snap.exists ? snap.data() : {};

  if (meta.stripeCustomerId) {
    return meta.stripeCustomerId;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    metadata: { firebaseUid: uid }
  });

  // getOrCreateMeta, not metaRefFor: update() throws NOT_FOUND when the meta doc
  // does not exist yet, and a bare set() would create it without the tier and
  // quota defaults that getOrCreateMeta writes.
  const { ref } = await getOrCreateMeta(db, uid);
  await ref.update({ stripeCustomerId: customer.id });
  return customer.id;
}

async function isPremium(db, uid) {
  const metaRef = metaRefFor(db, uid);
  const snap = await metaRef.get();
  return snap.exists && snap.data().tier === PREMIUM_TIER;
}

async function createCheckoutSession(db, uid, email, priceId, successUrl, cancelUrl) {
  // Lifetime means one purchase, forever. Refuse before touching Stripe so an
  // already-premium user cannot be charged twice by a stale page or a retry.
  if (await isPremium(db, uid)) {
    const error = new Error('Esta cuenta ya es Premium');
    error.code = 'ALREADY_PREMIUM';
    throw error;
  }

  const customerId = await getOrCreateStripeCustomer(db, uid, email);

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    // session.metadata is the primary path back to the uid. payment_intent_data
    // duplicates it onto the PaymentIntent so payment_intent.succeeded can still
    // identify the buyer if the session is ever retrieved without metadata.
    metadata: { firebaseUid: uid },
    payment_intent_data: {
      metadata: { firebaseUid: uid }
    },
    billing_address_collection: 'auto',
  });

  return session.url;
}

async function activatePremium(db, uid, details = {}) {
  // getOrCreateMeta guarantees the doc exists, so update() cannot fail with
  // NOT_FOUND for a user who pays before ever loading their quota.
  const { ref } = await getOrCreateMeta(db, uid);

  await ref.update({
    tier: PREMIUM_TIER,
    // Keep the stored quotas in sync with the tier. Without this, getQuota
    // returns { tier: 'premium', cardQuota: <free value> }.
    cardQuota: getMaxCards(PREMIUM_TIER),
    aiQuotaDaily: getAiDailyLimit(PREMIUM_TIER),
    premiumActivatedAt: FieldValue.serverTimestamp(),
    ...(details.paymentIntentId ? { stripePaymentIntentId: details.paymentIntentId } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

async function revokePremium(db, uid, details = {}) {
  const { ref } = await getOrCreateMeta(db, uid);

  await ref.update({
    tier: FREE_TIER,
    cardQuota: getMaxCards(FREE_TIER),
    aiQuotaDaily: getAiDailyLimit(FREE_TIER),
    premiumRevokedAt: FieldValue.serverTimestamp(),
    ...(details.reason ? { premiumRevokedReason: details.reason } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

async function handleStripeWebhook(db, event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;

      // Only a completed, paid session grants premium. payment_status can still
      // be 'unpaid' for delayed payment methods.
      if (session.payment_status !== 'paid') break;

      const uid = session.metadata?.firebaseUid;
      if (!uid) break;

      await activatePremium(db, uid, {
        paymentIntentId: session.payment_intent?.id || session.payment_intent,
      });
      break;
    }

    case 'payment_intent.succeeded': {
      // Redundant with checkout.session.completed on purpose: that event can be
      // missed (the CLI tunnel was not running, a listener dropped it). This one
      // fires independently and carries the same firebaseUid.
      const intent = event.data.object;
      const uid = intent.metadata?.firebaseUid;
      if (!uid) break;

      await activatePremium(db, uid, { paymentIntentId: intent.id });
      break;
    }

    case 'charge.refunded': {
      // Premium is a lifetime purchase, so a full refund gives it back. A
      // partial refund leaves premium in place; only fully refunded charges
      // downgrade. Without this, refunding is free premium.
      const charge = event.data.object;
      if (!charge.refunded) break;

      const uid = await resolveUidForCharge(db, charge);
      if (!uid) break;

      await revokePremium(db, uid, { reason: 'refunded' });
      break;
    }
  }
}

// Charges carry no firebaseUid, so walk back through the customer to find it.
async function resolveUidForCharge(db, charge) {
  if (charge.metadata?.firebaseUid) return charge.metadata.firebaseUid;

  const customerId = typeof charge.customer === 'object' ? charge.customer?.id : charge.customer;
  if (!customerId) return null;

  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);
  return customer?.deleted ? null : customer?.metadata?.firebaseUid || null;
}

module.exports = {
  createCheckoutSession,
  handleStripeWebhook,
  activatePremium,
  revokePremium,
  isPremium,
  getOrCreateStripeCustomer,
};