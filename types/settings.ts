export interface UserSettings {
  activityHistoryEnabled: boolean;
  updatedAt?: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
  activityHistoryEnabled: false,
};
