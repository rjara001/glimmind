import type { Association, AssociationList } from "../types";
import type { VocabularyResult } from "./youtube-deck";

export interface DashboardProps {
  lists: AssociationList[];
  lastPlayedId?: string;
  onCreate: (name: string, concept: string, initialAssociations: Association[]) => void;
  onCreateAndPlay: (name: string, concept: string, initialAssociations: Association[]) => void;
  onAddDeck: (name: string, concept: string, initialAssociations: Association[]) => Promise<void>;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onPlay: (id: string) => void;
  onYouTubeSuccess?: (result: VocabularyResult) => void;
  onTextImport?: () => void;
}

export interface DashboardStats {
  totalWords: number;
  totalLearned: number;
  remaining: number;
  percentage: number;
}

export interface ListProgressSummary {
  archivedCount: number;
  totalCount: number;
  achievementPercent: number;
  isComplete: boolean;
  canPlay: boolean;
}