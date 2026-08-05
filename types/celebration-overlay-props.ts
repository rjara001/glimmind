import { CelebrationEvent } from './progress';

export interface CelebrationOverlayProps {
  celebration: CelebrationEvent;
  onClose: () => void;
}
