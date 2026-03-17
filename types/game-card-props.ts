export interface GameCardProps {
  displayTerm: string | undefined;
  displayDef: string | undefined;
  labelTerm: string;
  labelDef: string;
  revealed: boolean;
  isPracticeMode: boolean;
  userInput: string;
  onUserInput: (value: string) => void;
  feedback: 'none' | 'correct' | 'incorrect';
  cycleColorName?: string;
  similarity: number | null;
  lastAttempt: string;
  onNextCard?: () => void;
}
