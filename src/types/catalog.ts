import type { DeckCategory as PrebuiltDeckCategory } from './prebuilt-deck';

export type ModerationLevel = 'approved' | 'review' | 'rejected';

export interface ModerationFlag {
  index: number;
  reason: string;
}

export interface ModerationResult {
  approved: number;
  review: number;
  rejected: number;
  flaggedItems: ModerationFlag[];
  level: ModerationLevel;
}

export type PublishDeckCategory =
  | PrebuiltDeckCategory
  | 'Languages'
  | 'Science'
  | 'History'
  | 'Art'
  | 'Technology'
  | 'Other';

export const PUBLISH_DECK_CATEGORIES: PublishDeckCategory[] = [
  'Languages',
  'Science',
  'History',
  'Art',
  'Technology',
  'Casual',
  'Pop Culture',
  'Music',
  'Travel',
  'Work',
  'Other',
];

export interface PublishValidationState {
  completedAt: boolean;
  cardCountOk: boolean;
  moderationPending: boolean;
  moderationDone: boolean;
  termsAccepted: boolean;
  hasDuplicate: boolean;
}

export interface PublishDeckRequest {
  listId: string;
  name: string;
  category: string;
  description?: string;
  tags?: string[];
}

export interface PublishDeckResponse {
  ok: boolean;
  deckId: string;
  moderation: ModerationResult;
  collection: 'prebuiltDecks' | 'pendingSubmissions';
}
