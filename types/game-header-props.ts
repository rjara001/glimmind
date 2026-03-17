export interface GameHeaderProps {
  listName: string;
  currentIndex: number;
  queueLength: number;
  cycle4Count: number;
  gameMode: 'training' | 'real';
  onBack: () => void;
  onSettingsClick: () => void;
}
