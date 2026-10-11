import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stripeService } from '@/services/stripe';
import { callFunction } from '@/services/callFunction';

vi.mock('@/services/callFunction', () => ({
  callFunction: vi.fn(),
}));

// Premium is a one-time purchase: the only Stripe call the frontend makes is
// opening Checkout. There is no billing portal (nothing to manage) and no
// subscription status endpoint (the tier comes from getQuota).
describe('stripeService', () => {
  const SUCCESS_URL = 'https://glimmind.com/settings?upgrade=success';
  const CANCEL_URL = 'https://glimmind.com/settings?upgrade=canceled';
  const CHECKOUT_URL = 'https://checkout.stripe.com/c/pay/cs_test_123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('posts both return urls and returns the checkout url', async () => {
      vi.mocked(callFunction).mockResolvedValue({ url: CHECKOUT_URL });

      const url = await stripeService.createCheckoutSession(SUCCESS_URL, CANCEL_URL);

      expect(callFunction).toHaveBeenCalledWith('createCheckoutSession', {
        successUrl: SUCCESS_URL,
        cancelUrl: CANCEL_URL,
      });
      expect(url).toBe(CHECKOUT_URL);
    });

    it('propagates the backend error instead of returning undefined', async () => {
      vi.mocked(callFunction).mockRejectedValue(new Error('Unauthorized'));

      await expect(stripeService.createCheckoutSession(SUCCESS_URL, CANCEL_URL)).rejects.toThrow(
        'Unauthorized'
      );
    });

    it('surfaces the already-premium rejection from the backend', async () => {
      const error = Object.assign(new Error('Esta cuenta ya es Premium'), {
        code: 'ALREADY_PREMIUM',
      });
      vi.mocked(callFunction).mockRejectedValue(error);

      await expect(stripeService.createCheckoutSession(SUCCESS_URL, CANCEL_URL)).rejects.toMatchObject({
        code: 'ALREADY_PREMIUM',
      });
    });
  });
});