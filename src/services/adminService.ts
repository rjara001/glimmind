import { callFunction } from './callFunction';
import { auth } from '../firebase';

export interface ServiceUsage {
  used: number;
  calls: number;
  limit: number;
}

export interface UserUsage {
  email: string;
  uid: string;
  tier: string;
  translation: ServiceUsage;
  tts: ServiceUsage;
  stt: ServiceUsage;
  ai: ServiceUsage;
}

export interface AdminUsageReport {
  month: string;
  translation: { global: ServiceUsage };
  tts: { global: ServiceUsage };
  stt: { global: ServiceUsage };
  ai: { global: ServiceUsage };
  users: UserUsage[];
}

export const adminService = {
  async getUsage(month?: string): Promise<AdminUsageReport> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');
    return callFunction<AdminUsageReport>('getAdminUsage', { userId, month });
  },
};
