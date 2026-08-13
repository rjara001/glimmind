import { UserProgress } from './progress';

export interface GoalWidgetProps {
  progress: UserProgress;
  onSetTarget: (target: number) => void;
}
