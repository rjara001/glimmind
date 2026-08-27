import type { SourceRow } from './source-row';

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  url: string;
}

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface FlashcardMetadata {
  difficulty: 'basic' | 'intermediate' | 'advanced';
  frequencyRank: number;
  audioTimestamp?: number;
  tags: string[];
}

export interface VocabularyItem {
  term: string;
  type: 'phrase' | 'word';
  frequency: number;
  example: string;
  context: string;
  start: number;
  score: number;
  translation?: string;
  metadata?: FlashcardMetadata;
}

export interface DeckQuotaInfo {
  usedPoints: number;
  limit: number;
  remainingPoints: number;
  usedTodayPercent: number;
  remainingPercent: number;
}

export type DeckSourceType = 'youtube_auto' | 'youtube_manual_transcript' | 'raw_text';

export interface VocabularyResult {
  video?: YouTubeVideoInfo;
  source: DeckSourceType;
  sourceType?: DeckSourceType;
  items: VocabularyItem[];
  wasTruncated?: boolean;
  quota?: DeckQuotaInfo;
  rawSourceText?: string;
  sourceUrl?: string;
  sourceRow?: SourceRow;
}

export interface VideoSource {
  url: string;
  videoId: string;
}

export type DeckSizeTier = 'express' | 'standard' | 'extended' | 'massive';

export interface DeckSizeOption {
  tier: DeckSizeTier;
  label: string;
  terms: number;
  costPercent: number;
  description?: string;
}

export type VocabularyLevel = 'b1' | 'b2c1';

export interface YouTubeDeckConfig {
  maxTerms: number;
  targetLanguage: string;
  level: VocabularyLevel;
}

export interface FromTextConfig extends YouTubeDeckConfig {
  videoUrl?: string;
}
