import type {
  Association,
  AssociationList,
  Attempt,
  GameState,
  VoiceCommandId,
} from "../types";
import type { PlayerPhase, PlayerStatus } from "../types/player-controls";
import type { useGameVoice } from "../hooks/voice/useGameVoice";

export type GameVoice = ReturnType<typeof useGameVoice>;

export interface GameViewProps {
  list: AssociationList;
  onBack: (updatedAssociations?: Association[]) => void;
  onUpdateAssociations: (updatedAssociations: Association[]) => Promise<void>;
  onUpdateList?: (updatedList: AssociationList) => Promise<void>;
  onViewList?: (associationId?: string) => void;
  voiceMode?: boolean;
}

export interface GameHeaderBarProps {
  isMobile: boolean;
  immersive: { isVisible: boolean; toggle: () => void };
  list: AssociationList;
  currentIndex: number;
  queueLength: number;
  cycle4Count: number;
  goalProgress: number;
  goalTarget: number;
  sessionRepasos: number;
  isVoiceActive: boolean;
  isRecording: boolean;
  isPremium: boolean;
  isPresentationMode: boolean;
  onBack: (updatedAssociations?: Association[]) => void;
  onSettings: () => void;
  onRestart: () => void;
  onToggleVoice: () => void;
  onToggleRecord: () => void;
  onViewRecordings: () => void;
  onTogglePractice: () => void;
}

export interface NameEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export interface GameHeaderMobileToggleProps {
  list: AssociationList;
  isVoiceActive: boolean;
  immersive: { isVisible: boolean; toggle: () => void };
  isEditingName: boolean;
  onStartEdit: () => void;
  onToggleVoice: () => void;
  nameEditor?: NameEditorProps;
}

export interface CardStageCounters {
  pending: number;
  correct: number;
}

export interface PracticeControllerSnapshot {
  status: PlayerStatus;
  phase: PlayerPhase;
  remainingSeconds: number;
  canPrev: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onPrev: () => void;
}

export interface CardStageProps {
  cycleColorName: string;
  cycleColorClass: string;
  cycleStats: CardStageCounters;
  currentAssociation: Association;
  currentCycle: number;
  displayTerm: string;
  displayDef: string;
  labelTerm: string;
  labelDef: string;
  voiceTermLang?: string;
  voiceDefLang?: string;
  userInput: string;
  feedback: "none" | "correct" | "incorrect";
  similarity: number | null | undefined;
  lastAttempt: string;
  attemptCount: number | undefined;
  isPracticeMode: boolean;
  showHints: boolean;
  revealed: boolean;
  isNearComplete: boolean;
  isTransitioning: boolean;
  isPresentationMode: boolean;
  isVoiceMode: boolean;
  isVoiceActive: boolean;
  isCountdownRunning: boolean;
  isMobile: boolean;
  showRevealWarning: boolean;
  showEditDeckButton: boolean;
  gameMode: "training" | "real";
  list: AssociationList;
  detectedVoiceCommand: VoiceCommandId | undefined;
  engineDisclaimer: string | undefined;
  engineFoundAnswers: string[] | undefined;
  attempts: Attempt[];
  revealedAssociations: string[];
  associations: Association[];
  selectedAttemptId: number | undefined;
  gameState: GameState;
  voice: GameVoice;
  practice: PracticeControllerSnapshot;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onUserInput: (value: string) => void;
  onStartEdit: () => void;
  onSpeakAnswer: (text: string, lang: string) => void;
  onCheckAnswer: () => void;
  onPass: () => void;
  onGoBack: () => void;
  onReveal: () => void;
  onCorrect: () => void;
  onShowRevealWarning: () => void;
  onConfirmReveal: () => void;
  onToggleListening: () => void;
  onStopVoice: () => void;
  onSelectAttempt: (attempt: Attempt) => void;
  onCloseAttemptModal: () => void;
  onCountdownComplete: () => void;
  onEditDeck: () => void;
  onUpdateExpectedAnswer: (
    associationId: string,
    field: "term" | "definition",
    value: string,
  ) => Promise<void>;
}