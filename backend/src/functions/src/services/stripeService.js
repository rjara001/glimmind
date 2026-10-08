const Stripe = require('stripe');
const { getDb, getAuth } = require('../utils/firebase');
const { metaRefFor } = require('../utils/helpers');

let stripe = null;
function getStripe() {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not set');
    stripe = new Stripe(key, { apiVersion: '2024-06-20' });
  }
  return stripe;
}

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
  
  await metaRef.update({ stripeCustomerId: customer.id });
  return customer.id;
}

async function createCheckoutSession(db, uid, email, priceId, successUrl, cancelUrl) {
  const customerId = await getOrCreateStripeCustomer(db, uid, email);
  
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: { firebaseUid: uid }
    },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  });
  
  return session.url;
}

async function handleStripeWebhook(db, event) {
  const stripe = getStripe();
  
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const uid = session.metadata?.firebaseUid;
      if (!uid) return;
      
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      await updateSubscriptionStatus(db, uid, subscription);
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const uid = subscription.metadata?.firebaseUid;
      if (!uid) return;
      
      await updateSubscriptionStatus(db, uid, subscription);
      break;
    }
    case 'invoice.payment_failed': {
      // Opcional: notificar al usuario
      break;
    }
  }
}

async function updateSubscriptionStatus(db, uid, subscription) {
  const metaRef = metaRefFor(db, uid);
  const status = subscription.status; // active, trialing, past_due, canceled, incomplete, incomplete_expired, past_due, unpaid
  const isActive = ['active', 'trialing'].includes(status);
  
  await metaRef.update({
    stripeSubscriptionId: subscription.id,
    stripeSubscriptionStatus: status,
    stripePriceId: subscription.items.data[0]?.price.id,
    stripeCurrentPeriodEnd: subscription.current_period_end * 1000, // ms
    tier: isActive ? 'premium' : 'free',
    updatedAt: require('../utils/firebase').FieldValue.serverTimestamp(),
  });
}

async function createBillingPortalSession(db, uid, returnUrl) {
  const metaRef = metaRefFor(db, uid);
  const snap = await metaRef.get();
  const meta = snap.data();
  
  if (!meta.stripeCustomerId) throw new Error('No Stripe customer');
  
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: meta.stripeCustomerId,
    return_url: returnUrl,
  });
  
  return session.url;
}

module.exports = {
  createCheckoutSession,
  handleStripeWebhook,
  createBillingPortalSession,
  getOrCreateStripeCustomer,
};