import { callFunction } from './callFunction';
import type { AssociationList } from '../types';
import type { UserProgress } from '../types/progress';
import type { UserQuota } from '../types/quota';
import type { UserSettings } from '../types/settings';

export interface DashboardData {
  lists: AssociationList[];
  progress: UserProgress | null;
  quota: UserQuota | null;
  settings: UserSettings | null;
}

export const dashboardService = {
  fetchDashboardData: async (userId: string): Promise<DashboardData> => {
    if (!userId) return { lists: [], progress: null, quota: null, settings: null };
    return callFunction<DashboardData>('getDashboardData', { userId });
  },
};
