import { useCallback, useState } from "react";
import type { Attempt, VoiceCommandId } from "../../types";

export interface UseGameViewStateArgs {
  voiceMode: boolean;
}

export interface GameViewState {
  showSettings: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  isEditingCard: boolean;
  startEditingCard: () => void;
  stopEditingCard: () => void;
  showRevealWarning: boolean;
  showRevealWarningBanner: () => void;
  dismissRevealWarningBanner: () => void;
  showVoiceRecordings: boolean;
  openVoiceRecordings: () => void;
  closeVoiceRecordings: () => void;
  isRecording: boolean;
  toggleRecording: () => void;
  isEditingName: boolean;
  startEditingName: () => void;
  stopEditingName: () => void;
  isVoiceActive: boolean;
  toggleVoiceActive: () => void;
  setVoiceActive: (active: boolean) => void;
  isVoiceMode: boolean;
  setIsVoiceMode: (active: boolean) => void;
  isPresentationMode: boolean;
  setPresentationMode: (active: boolean) => void;
  togglePresentationMode: () => void;
  isCountdownRunning: boolean;
  setIsCountdownRunning: (running: boolean) => void;
  selectedAttempt: Attempt | null;
  setSelectedAttempt: (attempt: Attempt | null) => void;
  detectedVoiceCommand: VoiceCommandId | undefined;
  setDetectedVoiceCommand: (command: VoiceCommandId | undefined) => void;
}

export function useGameViewState({ voiceMode }: UseGameViewStateArgs): GameViewState {
  const [showSettings, setShowSettings] = useState(false);
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [showRevealWarning, setShowRevealWarning] = useState(false);
  const [showVoiceRecordings, setShowVoiceRecordings] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(() => voiceMode === true);
  const [isVoiceMode, setIsVoiceMode] = useState(() => voiceMode === true);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isCountdownRunning, setIsCountdownRunning] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const [detectedVoiceCommand, setDetectedVoiceCommand] = useState<VoiceCommandId | undefined>();

  const toggleVoiceActive = useCallback(() => {
    setIsVoiceActive((prev) => !prev);
  }, []);
  const toggleRecording = useCallback(() => {
    setIsRecording((prev) => !prev);
  }, []);
  const togglePresentationMode = useCallback(() => {
    setIsPresentationMode((prev) => !prev);
  }, []);

  return {
    showSettings,
    openSettings: () => setShowSettings(true),
    closeSettings: () => setShowSettings(false),
    isEditingCard,
    startEditingCard: () => setIsEditingCard(true),
    stopEditingCard: () => setIsEditingCard(false),
    showRevealWarning,
    showRevealWarningBanner: () => setShowRevealWarning(true),
    dismissRevealWarningBanner: () => setShowRevealWarning(false),
    showVoiceRecordings,
    openVoiceRecordings: () => setShowVoiceRecordings(true),
    closeVoiceRecordings: () => setShowVoiceRecordings(false),
    isRecording,
    toggleRecording,
    isEditingName,
    startEditingName: () => setIsEditingName(true),
    stopEditingName: () => setIsEditingName(false),
    isVoiceActive,
    toggleVoiceActive,
    setVoiceActive: setIsVoiceActive,
    isVoiceMode,
    setIsVoiceMode,
    isPresentationMode,
    setPresentationMode: setIsPresentationMode,
    togglePresentationMode,
    isCountdownRunning,
    setIsCountdownRunning,
    selectedAttempt,
    setSelectedAttempt,
    detectedVoiceCommand,
    setDetectedVoiceCommand,
  };
}