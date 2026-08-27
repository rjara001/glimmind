export interface TranslationCard {
  term: string;
  context?: string;
}

export interface TranslationRequest {
  cards: TranslationCard[];
  targetLang?: string;
  sourceLang?: string;
}

export interface TranslationItem {
  original: string;
  translated: string;
}

export interface TranslationResponse {
  translations: TranslationItem[];
  consumedChars: number;
  userRemainingChars: number;
  quotaExceeded: boolean;
}
