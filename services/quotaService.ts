import { callFunction } from './callFunction';
import { UserQuota } from '../types/quota';

export const quotaService = {
  fetchQuota: async (userId: string): Promise<UserQuota | null> => {
    if (!userId) return null;
    try {
      return await callFunction<UserQuota>('getQuota', { userId });
    } catch (error) {
      console.error("Error fetching quota:", error);
      return null;
    }
  },
};
