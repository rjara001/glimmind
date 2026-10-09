export type DemoFeedback = 'none' | 'correct' | 'incorrect';

export interface DemoCard {
  id: string;
  term: string;
  definition: string;
  cycle: number;
}

export interface LandingDemoStats {
  correctCount: number;
  attemptCount: number;
  accuracy: number;
}

export interface LandingDemoProps {
  deckName?: string;
}