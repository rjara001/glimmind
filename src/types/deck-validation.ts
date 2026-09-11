import type { PrebuiltDeck } from './prebuilt-deck';

export type CardCategory = 'existing' | 'similar' | 'new';

export interface SimilarMatch {
  existingTerm: string;
  similarity: number;
}

export interface CategorizedCard {
  card: { term: string; definition: string; context: string };
  category: CardCategory;
  similarMatch?: SimilarMatch;
}

export interface DeckValidationResult {
  total: number;
  counts: Record<CardCategory, number>;
  categorized: CategorizedCard[];
}

export interface DeckAnalysisStatsProps {
  counts: Record<CardCategory, number>;
  total: number;
  deckCount: number;
}

export interface SimilarMatchSample {
  deckTerm: string;
  existingTerm: string;
  similarity: number;
}

export interface DeckCategorySelectorProps {
  counts: Record<CardCategory, number>;
  selected: Record<CardCategory, boolean>;
  onToggle: (category: CardCategory) => void;
  similarExamples?: SimilarMatchSample[];
}

export interface DeckValidationScreenProps {
  deck: PrebuiltDeck;
  result: DeckValidationResult;
  selectedCategories: Record<CardCategory, boolean>;
  onToggleCategory: (category: CardCategory) => void;
  onAddSelected: () => void;
  onBack: () => void;
}