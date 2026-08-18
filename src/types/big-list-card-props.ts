import { AssociationList } from '../types';
import { StateBreakdown } from './progress';

export interface BigListCardProps {
  list: AssociationList;
  breakdown: StateBreakdown;
  milestones: number[];
  onPlay: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}
