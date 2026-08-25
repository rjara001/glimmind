export type DeckCategory = 'Casual' | 'Pop Culture' | 'Music' | 'Travel' | 'Work';

export interface PrebuiltDeck {
  id: string;
  name: string;
  concept: string;
  category: DeckCategory;
  description: string;
  icon: string;
  order: number;
  active: boolean;
  associations: { term: string; definition: string }[];
}
