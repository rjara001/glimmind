export interface UserSettings {
  activityHistoryEnabled: boolean;
  audioRecordingEnabled: boolean;
  updatedAt?: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
  activityHistoryEnabled: false,
  audioRecordingEnabled: false,
};
