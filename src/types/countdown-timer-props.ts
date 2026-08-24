export interface CountdownTimerProps {
  seconds: number;
  isRunning: boolean;
  onComplete?: () => void;
  className?: string;
  ariaLabel?: string;
}
