export interface ExtractedKeyword {
  term: string;
  score: number;
  frequency: number;
  type: 'word' | 'phrase';
  context: string;
  alreadyInVocabulary?: boolean;
}

export interface KeywordExtractionResult {
  keywords: ExtractedKeyword[];
  originalText: string;
  language: string;
}

export interface KeywordExtractionOptions {
  maxKeywords?: number;
  minTermLength?: number;
  language?: 'es' | 'en';
  minPhraseLength?: number;
  maxPhraseLength?: number;
  existingVocabulary?: string[];
}

export type ImportTab = 'paste' | 'upload' | 'extract';