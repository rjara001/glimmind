import { callFunction } from './callFunction';
import { UserQuota } from '../types/quota';

export const userService = {
  fetchQuota: async (userId: string): Promise<UserQuota | null> => {
    if (!userId) return null;
    try {
      return await callFunction<UserQuota>('getQuota', { userId });
    } catch (error) {
      return null;
    }
  },

  setPremium: async (userId: string): Promise<{ success: boolean; tier: string; cardQuota: number; aiQuotaDaily: number }> => {
    return await callFunction<{ success: boolean; tier: string; cardQuota: number; aiQuotaDaily: number }>('setUserPremium', { userId });
  },
};
