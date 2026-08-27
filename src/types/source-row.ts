import type { DeckSourceType } from './youtube-deck';

export interface SourceRow {
  sourceType?: DeckSourceType;
  sourceUrl?: string;
  videoId?: string;
  videoTitle?: string;
  rawSourceText?: string;
}