export interface SessionBarProps {
  gameMode: 'training' | 'real';
  goalProgress?: number;
  goalTarget?: number;
  sessionRepasos?: number;
  onSettingsClick: () => void;
  onRestart?: () => void;
  voiceEnabled?: boolean;
  onVoiceToggle?: () => void;
  isPresentationActive?: boolean;
  onPracticeToggle?: () => void;
}
