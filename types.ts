
export type GameMode = 'training' | 'real';
export type GameCycle = 1 | 2 | 3 | 4;
export type GameFeedback = 'none' | 'correct' | 'incorrect';
export type HintMode = 'masked' | 'firstLetter' | 'firstLast' | 'firstLast2';
export type VoiceLanguage = 'es' | 'en' | 'fr' | 'de' | 'it' | 'pt';
export type VoiceProvider = 'browser' | 'chirp';
export type SttProvider = 'browser' | 'chiptt';
export type VoiceCommandId = 'reveal' | 'pass' | 'continue' | 'stop';
export type VoiceCommandsConfig = Record<VoiceCommandId, string[]>;

export interface ChirpVoice {
  id: string;
  languageCode: string;
  label: string;
  lang: VoiceLanguage;
}

export interface Association {
  id: string;
  term: string;
  definition: string;
  currentCycle: number;
  status: 'pending' | 'correct';
  isLearned: boolean;
  isArchived: boolean;
  hits?: number;
  misses?: number;
  timesPlayed?: number;
  lastPlayedAt?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface AssociationList {
  id: string;
  userId: string;
  name: string;
  concept: string;
  associations: Association[];
  isArchived: boolean;
  settings: {
    mode: GameMode;
    flipOrder: 'normal' | 'reversed';
    threshold: number;
    ignoreArticles?: boolean;
    showHints?: boolean;
    hintMode?: HintMode | false;
    voiceEnabled?: boolean;
    ttsProvider?: VoiceProvider;
    sttProvider?: SttProvider;
    voiceTermLang?: VoiceLanguage;
    voiceDefLang?: VoiceLanguage;
    voiceTermId?: string;
    voiceDefId?: string;
    voiceRate?: number;
    voicePitch?: number;
    voiceCommands?: VoiceCommandsConfig;
  };
  createdAt?: any;
  updatedAt?: any;
}

export interface GameSummary {
  learned: number;
  known: number;
  recognized: number;
  seen: number;
}

export interface Attempt {
  userInput: string;
  similarity: number;
  threshold: number;
  expectedAnswer: string;
  timestamp: number;
  associationId: string;
}

export interface GameState {
  listId: string;
  globalCycle: GameCycle;
  associations: Association[];
  activeQueue: string[];
  currentIndex: number;
  isFinished: boolean;
  summary: GameSummary | null;
  revealed: boolean;
  userInput: string;
  feedback: GameFeedback;
  similarity: number | null;
  lastAttempt: string;
  attempts: Attempt[];
  revealedAssociations: string[];
}
