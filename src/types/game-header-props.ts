export interface GameHeaderProps {
  listName: string;
  currentIndex: number;
  queueLength: number;
  cycle4Count: number;
  gameMode: 'training' | 'real';
  goalProgress?: number;
  goalTarget?: number;
  sessionRepasos?: number;
  onBack: () => void;
  onSettingsClick: () => void;
  onRestart?: () => void;
  voiceEnabled?: boolean;
  onVoiceToggle?: () => void;
}
