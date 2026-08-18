import { UserProgress } from '../types/progress';
import { callFunction } from './callFunction';

export const progressService = {
  fetchProgress: async (userId: string): Promise<UserProgress | null> => {
    if (!userId) return null;
    try {
      return await callFunction<UserProgress | null>('getProgress', { userId });
    } catch (error) {
      return null;
    }
  },

  saveProgress: async (userId: string, progress: UserProgress): Promise<void> => {
    await callFunction('updateProgress', { userId, progress });
  },
};
