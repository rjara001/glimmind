export interface UserSettings {
  activityHistoryEnabled: boolean;
  audioRecordingEnabled: boolean;
  voiceSttFallback: boolean;
  maxCardsPerDeck: number;
  updatedAt?: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
  activityHistoryEnabled: false,
  audioRecordingEnabled: false,
  voiceSttFallback: false,
  maxCardsPerDeck: 150,
};
