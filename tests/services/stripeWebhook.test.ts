import { describe, it, expect, vi, beforeEach } from 'vitest';

// The backend is CommonJS, so vi.mock cannot intercept its internal require()
// calls: the module is loaded outside Vitest's module graph. This test instead
// preloads require.cache entries for the two leaf modules the service reaches
// through require() — the stripe package that resolves from the backend's own
// node_modules, and firebase-admin.
//
// utils/helpers.js is NOT faked, so getOrCreateMeta and metaRefFor run for real
// against the fake Firestore below.

const Module = require('module') as { createRequire: (filename: string) => NodeRequire };

const BACKEND_ROOT = `${process.cwd()}/backend/src/functions`;

const backendRequire = Module.createRequire(`${BACKEND_ROOT}/index.js`);

// Resolve once from the backend root so preloading does not depend on the
// caller's directory.
const STRIPE_PATH = backendRequire.resolve('stripe');
const ADMIN_APP_PATH = backendRequire.resolve('firebase-admin/app');
const ADMIN_FIRESTORE_PATH = backendRequire.resolve('firebase-admin/firestore');
const ADMIN_AUTH_PATH = backendRequire.resolve('firebase-admin/auth');

function preloadMock(resolved: string, exports: unknown) {
  const existing = require.cache[resolved];
  if (existing) {
    existing.exports = exports;
    return;
  }
  const stub = {
    id: resolved,
    filename: resolved,
    path: BACKEND_ROOT,
    exports,
    loaded: true,
    children: [] as unknown[],
    paths: [] as string[],
    require: backendRequire,
  };
  require.cache[resolved] = stub as unknown as NodeModule;
}

const STRIPE_SECRET_KEY = 'sk_test_123';
const UID = 'user-1';
const PRICE_ID = 'price_test_123';
const SUCCESS_URL = 'https://glimmind.com/settings?upgrade=success';
const CANCEL_URL = 'https://glimmind.com/settings?upgrade=canceled';

const FREE_CARD_QUOTA = 1000;
const FREE_AI_QUOTA = 100;
const PREMIUM_CARD_QUOTA = 5000;
const PREMIUM_AI_QUOTA = 1000;

type StoredDoc = Record<string, unknown>;

interface FirestoreState {
  users: Record<string, { meta: { main?: StoredDoc } }>;
  lists: Record<string, { userId: string; associations: unknown[] }>;
}

const firestoreState: FirestoreState = { users: {}, lists: {} };

const stripeMock = {
  checkout: { sessions: { create: vi.fn() } },
  customers: { create: vi.fn(), retrieve: vi.fn() },
};

// Holds a getter rather than a snapshot: real Firestore refs stay live, so a
// ref created before getOrCreateMeta writes the doc must still see it.
class FakeDocRef {
  constructor(
    private readonly read: () => StoredDoc | undefined,
    private readonly write: (value: StoredDoc) => void
  ) {}

  async get() {
    const state = this.read();
    return { exists: state !== undefined, data: () => state };
  }

  async set(value: StoredDoc, options?: { merge?: boolean }) {
    const existing = this.read();
    if (options?.merge && existing) {
      Object.assign(existing, value);
      return;
    }
    this.write(value);
  }

  async update(value: StoredDoc) {
    const existing = this.read();
    if (!existing) {
      throw new Error('5 NOT_FOUND: no entity to update');
    }
    Object.assign(existing, value);
  }
}

function fakeDb() {
  return {
    collection(name: string) {
      if (name === 'users') {
        return {
          doc: (uid: string) => {
            if (!firestoreState.users[uid]) firestoreState.users[uid] = { meta: {} };
            const user = firestoreState.users[uid];
            return {
              collection: (sub: string) => {
                if (sub !== 'meta') throw new Error(`unexpected subcollection ${sub}`);
                return {
                  doc: (docId: string) => {
                    if (docId !== 'main') throw new Error(`unexpected doc ${docId}`);
                    const holder = user.meta;
                    return new FakeDocRef(
                      () => holder.main,
                      (value) => {
                        holder.main = value;
                      }
                    );
                  },
                };
              },
            };
          },
        };
      }

      if (name === 'lists') {
        return {
          where: (field: string, _op: string, value: string) => ({
            get: async () => ({
              docs: Object.values(firestoreState.lists)
                .filter((list) => list.userId === value)
                .map((list) => ({ data: () => list })),
            }),
          }),
        };
      }

      throw new Error(`unexpected collection ${name}`);
    },
  };
}

// Premium is a one-time payment, so the webhook payloads are Checkout sessions
// and PaymentIntents. There is no subscription object anywhere in this flow.
function paidSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cs_1',
    payment_status: 'paid',
    payment_intent: 'pi_1',
    metadata: { firebaseUid: UID },
    ...overrides,
  };
}

function paidIntent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pi_1',
    metadata: { firebaseUid: UID },
    ...overrides,
  };
}

function metaDoc(uid = UID): StoredDoc {
  const doc = firestoreState.users[uid]?.meta.main;
  if (!doc) throw new Error(`meta/main missing for ${uid}`);
  return doc;
}

async function loadService() {
  // The service does `const Stripe = require('stripe')`, so the fake must be
  // callable itself, not only reachable via .default.
  const StripeFake = function StripeFake() {
    return stripeMock;
  } as unknown as { __esModule: boolean; default: unknown };
  StripeFake.__esModule = true;
  StripeFake.default = StripeFake;

  preloadMock(STRIPE_PATH, StripeFake);
  preloadMock(ADMIN_APP_PATH, { initializeApp: () => undefined });
  preloadMock(ADMIN_FIRESTORE_PATH, {
    getFirestore: () => fakeDb(),
    FieldValue: { serverTimestamp: () => '__SERVER_TS__' },
  });
  preloadMock(ADMIN_AUTH_PATH, { getAuth: () => ({ __auth: true }) });

  // The Stripe client is cached in module scope by utils/stripeConfig.js, and
  // stripeService requires it, so both must be dropped between tests to keep
  // the STRIPE_SECRET_KEY guard observable.
  delete require.cache[require.resolve('../../backend/src/functions/src/services/stripeService')];
  delete require.cache[require.resolve('../../backend/src/functions/src/utils/stripeConfig')];

  return require('../../backend/src/functions/src/services/stripeService');
}

describe('stripeService (backend)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = STRIPE_SECRET_KEY;
    firestoreState.users = {};
    firestoreState.lists = {};
    stripeMock.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/cs_1' });
    stripeMock.customers.create.mockResolvedValue({ id: 'cus_123' });
    stripeMock.customers.retrieve.mockResolvedValue({ id: 'cus_123', metadata: { firebaseUid: UID } });
  });

  describe('createCheckoutSession', () => {
    it('creates a one-time payment session carrying firebaseUid twice', async () => {
      const service = await loadService();
      firestoreState.users[UID] = { meta: { main: { stripeCustomerId: 'cus_existing' } } };

      await service.createCheckoutSession(fakeDb(), UID, 'a@b.com', PRICE_ID, SUCCESS_URL, CANCEL_URL);

      const args = stripeMock.checkout.sessions.create.mock.calls[0][0];
      expect(args.mode).toBe('payment');
      expect(args.metadata).toEqual({ firebaseUid: UID });
      // Duplicated onto the PaymentIntent so payment_intent.succeeded can still
      // identify the buyer if it arrives without the session.
      expect(args.payment_intent_data.metadata).toEqual({ firebaseUid: UID });
    });

    it('never sends subscription-only parameters', async () => {
      const service = await loadService();
      firestoreState.users[UID] = { meta: { main: { stripeCustomerId: 'cus_existing' } } };

      await service.createCheckoutSession(fakeDb(), UID, 'a@b.com', PRICE_ID, SUCCESS_URL, CANCEL_URL);

      const args = stripeMock.checkout.sessions.create.mock.calls[0][0];
      expect(args.subscription_data).toBeUndefined();
      expect(args.allow_promotion_codes).toBeUndefined();
    });

    it('reuses an existing Stripe customer', async () => {
      const service = await loadService();
      firestoreState.users[UID] = { meta: { main: { stripeCustomerId: 'cus_existing' } } };

      await service.createCheckoutSession(fakeDb(), UID, 'a@b.com', PRICE_ID, SUCCESS_URL, CANCEL_URL);

      expect(stripeMock.customers.create).not.toHaveBeenCalled();
      expect(stripeMock.checkout.sessions.create.mock.calls[0][0].customer).toBe('cus_existing');
    });

    it('creates the meta doc before persisting stripeCustomerId', async () => {
      const service = await loadService();
      // No meta doc yet: getOrCreateMeta must seed it with the free defaults,
      // otherwise update() would throw NOT_FOUND.
      firestoreState.users[UID] = { meta: {} };

      await service.createCheckoutSession(fakeDb(), UID, 'a@b.com', PRICE_ID, SUCCESS_URL, CANCEL_URL);

      const doc = metaDoc();
      expect(doc.stripeCustomerId).toBe('cus_123');
      expect(doc.tier).toBe('free');
      expect(doc.cardQuota).toBe(FREE_CARD_QUOTA);
    });

    it('refuses to sell premium again to an existing premium user', async () => {
      const service = await loadService();
      firestoreState.users[UID] = { meta: { main: { tier: 'premium', cardQuota: PREMIUM_CARD_QUOTA } } };

      await expect(
        service.createCheckoutSession(fakeDb(), UID, 'a@b.com', PRICE_ID, SUCCESS_URL, CANCEL_URL)
      ).rejects.toMatchObject({ code: 'ALREADY_PREMIUM' });

      // The guard must fire before Stripe sees anything, so nobody is charged.
      expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
    });
  });


  describe('handleStripeWebhook', () => {
    it('grants premium on a paid checkout.session.completed', async () => {
      const service = await loadService();

      await service.handleStripeWebhook(fakeDb(), {
        type: 'checkout.session.completed',
        data: { object: paidSession() },
      });

      expect(metaDoc().tier).toBe('premium');
      expect(metaDoc().stripePaymentIntentId).toBe('pi_1');
    });

    it('ignores an unpaid checkout session', async () => {
      const service = await loadService();

      // Delayed payment methods land here first. Crediting premium before the
      // money arrives would hand out a free lifetime plan.
      await service.handleStripeWebhook(fakeDb(), {
        type: 'checkout.session.completed',
        data: { object: paidSession({ payment_status: 'unpaid' }) },
      });

      expect(firestoreState.users[UID]?.meta.main).toBeUndefined();
    });

    it('does nothing when the session carries no firebaseUid', async () => {
      const service = await loadService();

      // An orphan session: writing tier here would credit an unknown account.
      await service.handleStripeWebhook(fakeDb(), {
        type: 'checkout.session.completed',
        data: { object: paidSession({ metadata: {} }) },
      });

      expect(firestoreState.users[UID]?.meta.main).toBeUndefined();
    });

    it('grants premium on payment_intent.succeeded', async () => {
      const service = await loadService();

      await service.handleStripeWebhook(fakeDb(), {
        type: 'payment_intent.succeeded',
        data: { object: paidIntent() },
      });

      expect(metaDoc().tier).toBe('premium');
      expect(metaDoc().stripePaymentIntentId).toBe('pi_1');
    });

    it('ignores unrelated event types', async () => {
      const service = await loadService();

      await service.handleStripeWebhook(fakeDb(), {
        type: 'payment_intent.payment_failed',
        data: { object: paidIntent() },
      });

      expect(firestoreState.users[UID]?.meta.main).toBeUndefined();
    });

    it('downgrades to free when the charge is refunded', async () => {
      const service = await loadService();
      firestoreState.users[UID] = {
        meta: { main: { tier: 'premium', cardQuota: PREMIUM_CARD_QUOTA, aiQuotaDaily: PREMIUM_AI_QUOTA } },
      };

      await service.handleStripeWebhook(fakeDb(), {
        type: 'charge.refunded',
        data: { object: { id: 'ch_1', refunded: true, customer: 'cus_123' } },
      });

      expect(metaDoc().tier).toBe('free');
      expect(metaDoc().cardQuota).toBe(FREE_CARD_QUOTA);
      expect(metaDoc().aiQuotaDaily).toBe(FREE_AI_QUOTA);
      expect(metaDoc().premiumRevokedReason).toBe('refunded');
    });

    it('resolves the uid through the customer when the charge has none', async () => {
      const service = await loadService();
      firestoreState.users[UID] = { meta: { main: { tier: 'premium' } } };

      await service.handleStripeWebhook(fakeDb(), {
        type: 'charge.refunded',
        data: { object: { id: 'ch_1', refunded: true, customer: 'cus_123', metadata: {} } },
      });

      expect(stripeMock.customers.retrieve).toHaveBeenCalledWith('cus_123');
      expect(metaDoc().tier).toBe('free');
    });

    it('keeps premium on a partial refund', async () => {
      const service = await loadService();
      firestoreState.users[UID] = { meta: { main: { tier: 'premium', cardQuota: PREMIUM_CARD_QUOTA } } };

      await service.handleStripeWebhook(fakeDb(), {
        type: 'charge.refunded',
        data: { object: { id: 'ch_1', refunded: false, customer: 'cus_123' } },
      });

      expect(metaDoc().tier).toBe('premium');
    });
  });

  describe('activatePremium quota sync', () => {
    it('writes the premium quotas, not the free ones', async () => {
      const service = await loadService();

      await service.handleStripeWebhook(fakeDb(), {
        type: 'checkout.session.completed',
        data: { object: paidSession() },
      });

      expect(metaDoc().tier).toBe('premium');
      expect(metaDoc().cardQuota).toBe(PREMIUM_CARD_QUOTA);
      expect(metaDoc().aiQuotaDaily).toBe(PREMIUM_AI_QUOTA);
    });

    it('never writes subscription-only fields', async () => {
      const service = await loadService();

      await service.handleStripeWebhook(fakeDb(), {
        type: 'checkout.session.completed',
        data: { object: paidSession() },
      });

      expect(metaDoc().stripeSubscriptionId).toBeUndefined();
      expect(metaDoc().stripeSubscriptionStatus).toBeUndefined();
      expect(metaDoc().stripeCurrentPeriodEnd).toBeUndefined();
    });

    it('is idempotent when both events arrive', async () => {
      const service = await loadService();

      await service.handleStripeWebhook(fakeDb(), {
        type: 'checkout.session.completed',
        data: { object: paidSession() },
      });
      await service.handleStripeWebhook(fakeDb(), {
        type: 'payment_intent.succeeded',
        data: { object: paidIntent() },
      });

      expect(metaDoc().tier).toBe('premium');
      expect(metaDoc().cardQuota).toBe(PREMIUM_CARD_QUOTA);
    });
  });

  describe('STRIPE_SECRET_KEY guard', () => {
    it('fails loudly when the secret is missing', async () => {
      delete process.env.STRIPE_SECRET_KEY;
      const service = await loadService();
      firestoreState.users[UID] = { meta: { main: { stripeCustomerId: 'cus_existing' } } };

      await expect(
        service.createCheckoutSession(fakeDb(), UID, 'a@b.com', PRICE_ID, SUCCESS_URL, CANCEL_URL)
      ).rejects.toThrow('STRIPE_SECRET_KEY not set');
    });
  });
});
