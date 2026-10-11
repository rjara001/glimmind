const stripeConfig = require("../src/utils/stripeConfig");

const TEST_SECRET = "sk_test_51T18EXC1GrRMJ6MVtest";
const LIVE_SECRET = "sk_live_51T18EXC1GrRMJ6MVlive";
const RESTRICTED_LIVE_SECRET = "rk_live_51T18EXC1GrRMJ6MVlive";

describe("stripeConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    stripeConfig.resetStripeClient();
  });

  afterAll(() => {
    process.env = originalEnv;
    stripeConfig.resetStripeClient();
  });

  describe("getStripeSecretKey", () => {
    test("returns the key when it is a test key", () => {
      process.env.STRIPE_SECRET_KEY = TEST_SECRET;
      expect(stripeConfig.getStripeSecretKey()).toBe(TEST_SECRET);
    });

    test("throws when STRIPE_SECRET_KEY is missing", () => {
      delete process.env.STRIPE_SECRET_KEY;
      expect(() => stripeConfig.getStripeSecretKey()).toThrow("STRIPE_SECRET_KEY not set");
    });

    test("accepts a live secret key in production now that live mode is in effect", () => {
      process.env.STRIPE_SECRET_KEY = LIVE_SECRET;
      delete process.env.FUNCTIONS_EMULATOR;
      expect(stripeConfig.getStripeSecretKey()).toBe(LIVE_SECRET);
    });

    test("accepts a restricted live secret key", () => {
      process.env.STRIPE_SECRET_KEY = RESTRICTED_LIVE_SECRET;
      delete process.env.FUNCTIONS_EMULATOR;
      expect(stripeConfig.getStripeSecretKey()).toBe(RESTRICTED_LIVE_SECRET);
    });

    // The Functions emulator resolves declared secrets from Secret Manager, so
    // after switching the project to live credentials a local run picks up the
    // real key. A real card typed at localhost would then charge real money.
    test("refuses a live secret key inside the Functions emulator", () => {
      process.env.STRIPE_SECRET_KEY = LIVE_SECRET;
      process.env.FUNCTIONS_EMULATOR = "true";
      expect(() => stripeConfig.getStripeSecretKey()).toThrow(/charges real money/i);
    });

    test("allows a live key in the emulator only when explicitly overridden", () => {
      process.env.STRIPE_SECRET_KEY = LIVE_SECRET;
      process.env.FUNCTIONS_EMULATOR = "true";
      process.env.STRIPE_ALLOW_LIVE_IN_EMULATOR = "true";
      expect(stripeConfig.getStripeSecretKey()).toBe(LIVE_SECRET);
    });

    test("allows a test key inside the emulator", () => {
      process.env.STRIPE_SECRET_KEY = TEST_SECRET;
      process.env.FUNCTIONS_EMULATOR = "true";
      expect(stripeConfig.getStripeSecretKey()).toBe(TEST_SECRET);
    });

    test("rejects a key with an unknown prefix", () => {
      process.env.STRIPE_SECRET_KEY = "not_a_stripe_key";
      expect(() => stripeConfig.getStripeSecretKey()).toThrow(/must start with sk_test_ or sk_live_/);
    });
  });

  describe("isTestMode", () => {
    test("is true for a test key", () => {
      process.env.STRIPE_SECRET_KEY = TEST_SECRET;
      expect(stripeConfig.isTestMode()).toBe(true);
    });

    test("is false for a live key", () => {
      process.env.STRIPE_SECRET_KEY = LIVE_SECRET;
      delete process.env.FUNCTIONS_EMULATOR;
      expect(stripeConfig.isTestMode()).toBe(false);
    });

    test("is true for a test key inside the emulator", () => {
      process.env.STRIPE_SECRET_KEY = TEST_SECRET;
      process.env.FUNCTIONS_EMULATOR = "true";
      expect(stripeConfig.isTestMode()).toBe(true);
    });
  });

  describe("getWebhookSecret", () => {
    test("returns the secret when it is a whsec value", () => {
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_abc123";
      expect(stripeConfig.getWebhookSecret()).toBe("whsec_abc123");
    });

    test("throws when STRIPE_WEBHOOK_SECRET is missing", () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      expect(() => stripeConfig.getWebhookSecret()).toThrow("STRIPE_WEBHOOK_SECRET not set");
    });

    test("throws a setup error while the placeholder is in place", () => {
      process.env.STRIPE_WEBHOOK_SECRET = stripeConfig.WEBHOOK_SECRET_PLACEHOLDER;
      expect(() => stripeConfig.getWebhookSecret()).toThrow(/stripe listen/i);
    });

    test("throws when the secret has no whsec prefix", () => {
      process.env.STRIPE_WEBHOOK_SECRET = "abc123";
      expect(() => stripeConfig.getWebhookSecret()).toThrow(/must start with whsec_/);
    });
  });

  describe("getPriceId", () => {
    test("returns the price id when set", () => {
      process.env.STRIPE_SECRET_KEY = TEST_SECRET;
      process.env.STRIPE_PRICE_ID = "price_1T18EXC1GrRMJ6MVtest";
      expect(stripeConfig.getPriceId()).toBe("price_1T18EXC1GrRMJ6MVtest");
    });

    test("throws when STRIPE_PRICE_ID is missing", () => {
      process.env.STRIPE_SECRET_KEY = TEST_SECRET;
      delete process.env.STRIPE_PRICE_ID;
      expect(() => stripeConfig.getPriceId()).toThrow("STRIPE_PRICE_ID not set");
    });

    test("throws when the price id has an unexpected prefix", () => {
      process.env.STRIPE_SECRET_KEY = TEST_SECRET;
      process.env.STRIPE_PRICE_ID = "prod_123";
      expect(() => stripeConfig.getPriceId()).toThrow(/must start with price_/);
    });
  });

  describe("getStripe", () => {
    test("builds a client with the pinned api version", () => {
      process.env.STRIPE_SECRET_KEY = TEST_SECRET;
      const stripe = stripeConfig.getStripe();
      expect(stripe.getApiField("version")).toBe(stripeConfig.STRIPE_API_VERSION);
    });

    test("caches one client instance", () => {
      process.env.STRIPE_SECRET_KEY = TEST_SECRET;
      expect(stripeConfig.getStripe()).toBe(stripeConfig.getStripe());
    });

    test("builds a client from a live key", () => {
      process.env.STRIPE_SECRET_KEY = LIVE_SECRET;
      delete process.env.FUNCTIONS_EMULATOR;
      expect(stripeConfig.getStripe().getApiField("version")).toBe(stripeConfig.STRIPE_API_VERSION);
    });

    test("rejects a test price paired with a live key", () => {
      process.env.STRIPE_SECRET_KEY = LIVE_SECRET;
      delete process.env.FUNCTIONS_EMULATOR;
      process.env.STRIPE_PRICE_ID = "price_test_only_123";
      process.env.STRIPE_TEST_PRICE_IDS = "price_test_only_123";
      expect(() => stripeConfig.getPriceId()).toThrow(/Prices are per-account/);
    });

    test("allows a live price paired with a live key", () => {
      process.env.STRIPE_SECRET_KEY = LIVE_SECRET;
      delete process.env.FUNCTIONS_EMULATOR;
      process.env.STRIPE_PRICE_ID = "price_live_123";
      process.env.STRIPE_TEST_PRICE_IDS = "price_test_only_123";
      expect(stripeConfig.getPriceId()).toBe("price_live_123");
    });
  });
});