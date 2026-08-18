export interface UserSettings {
  activityHistoryEnabled: boolean;
  audioRecordingEnabled: boolean;
  voiceSttFallback: boolean;
  updatedAt?: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
  activityHistoryEnabled: false,
  audioRecordingEnabled: false,
  voiceSttFallback: false,
};
