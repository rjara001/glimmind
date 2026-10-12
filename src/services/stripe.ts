import { callFunction } from './callFunction';

export interface CheckoutSessionResponse {
  url: string;
}

// Premium is a one-time purchase. There is no subscription to query and no
// billing portal to open, so the tier is read from getQuota (meta.tier) instead.
export const stripeService = {
  createCheckoutSession: async (successUrl: string, cancelUrl: string): Promise<string> => {
    const response = await callFunction<{ url: string }>('createCheckoutSession', {
      successUrl,
      cancelUrl,
    });
    return response.url;
  },
};