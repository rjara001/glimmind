import { callFunction } from './callFunction';

export interface CheckoutSessionResponse {
  url: string;
}

export interface SubscriptionStatus {
  tier: 'free' | 'premium';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSubscriptionStatus?: string;
  stripePriceId?: string;
  stripeCurrentPeriodEnd?: number;
}

export const stripeService = {
  createCheckoutSession: async (successUrl: string, cancelUrl: string): Promise<string> => {
    const response = await callFunction<{ url: string }>('createCheckoutSession', {
      successUrl,
      cancelUrl,
    });
    return response.url;
  },

  createBillingPortalSession: async (returnUrl: string): Promise<string> => {
    const response = await callFunction<{ url: string }>('createBillingPortalSession', {
      returnUrl,
    });
    return response.url;
  },

  getSubscriptionStatus: async (): Promise<{
    tier: 'free' | 'premium';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripeSubscriptionStatus?: string;
    stripePriceId?: string;
    stripeCurrentPeriodEnd?: number;
  }> => {
    return callFunction('getSubscriptionStatus', {});
  },
};