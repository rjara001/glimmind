import React, { useCallback, useEffect, useRef } from "react";
import { useGameLogic } from "../../hooks/game/useGameLogic";
import { useGameStore } from "../../store/gameStore";
import { useToast } from "../layout/Toast";
import { FinishedScreen } from "../game/FinishedScreen";
import { CycleProgress } from "../game/CycleProgress";
import { EditCardModal } from "../modals/EditCardModal";
import { SettingsModal } from "../modals/SettingsModal";
import { VoiceRecordingsModal } from "../modals/VoiceRecordingsModal";
import { useImmersiveHeader } from "../../hooks/ui/useImmersiveHeader";
import { useOrientation } from "../../hooks/ui/useOrientation";
import { useGameVoice } from "../../hooks/voice/useGameVoice";
import { useSpeechSynthesis } from "../../hooks/voice/tts/useSpeechSynthesis";
import { useVoiceRecordings } from "../../hooks/voice/useVoiceRecordings";
import { usePracticePlayer } from "../../hooks/game/usePracticePlayer";
import { PRACTICE_REVEAL_DELAY_SECONDS, PRACTICE_AUTO_ADVANCE_SECONDS } from "../../constants/app";
import type { GameViewProps } from "../../types/game-view";
import type { VoiceCommandId } from "../../types";
import { useGameViewState } from "../../hooks/game/useGameViewState";
import { useGameViewEffects } from "../../hooks/game/useGameViewEffects";
import { useGameViewGameplay } from "../../hooks/game/useGameViewGameplay";
import { useGameViewActions } from "../../hooks/game/useGameViewActions";
import { useNameEditor } from "../../hooks/game/useNameEditor";
import { GameHeaderBar } from "./game/GameHeaderBar";
import { GameHeaderMobileToggle } from "./game/GameHeaderMobileToggle";
import { CardStage } from "./game/CardStage";
import { RecordingWarningBanner } from "./game/RecordingWarningBanner";

type GameVoice = ReturnType<typeof useGameVoice>;

function useGameVoiceRef(voice: GameVoice) {
  const voiceRef = useRef<GameVoice | null>(null);
  voiceRef.current = voice;
  return voiceRef;
}

export const GameView: React.FC<GameViewProps> = ({
  list,
  onBack,
  onUpdateAssociations,
  onUpdateList,
  onViewList,
  voiceMode = false,
}) => {
  const { showToast } = useToast();
  const immersive = useImmersiveHeader();
  const { isMobile } = useOrientation();

  const state = useGameViewState({ voiceMode });
  const nameEditor = useNameEditor({ list, onUpdateList });

  const {
    gameView,
    gameState,
    currentAssociation,
    summary,
    feedback,
    userInput,
    isRevealed,
    similarity,
    lastAttempt,
    attempts,
    sessionRepasos,
    actions,
  } = useGameLogic({ list });

  const isPracticeMode = list.settings.mode === "training";

  const practicePlayer = usePracticePlayer({
    revealSeconds: list.settings.practiceRevealDelay ?? PRACTICE_REVEAL_DELAY_SECONDS,
    advanceSeconds: PRACTICE_AUTO_ADVANCE_SECONDS,
    onReveal: actions.reveal,
    onAdvance: actions.handlePass,
    onPrev: actions.goBack,
    isGameFinished: gameState.isFinished,
  });

  const gameplay = useGameViewGameplay({
    list,
    gameState,
    currentAssociation,
    feedback,
    attempts,
    isEditingCard: state.isEditingCard,
    isPracticeMode,
    actions,
    onUpdateAssociations,
  });

  const handleVoiceCommand = useCallback(
    (command: VoiceCommandId) => {
      state.setDetectedVoiceCommand(command);
      if (command === "reveal") {
        actions.reveal();
        voiceRef.current?.speakAnswer();
      } else if (command === "pass") {
        voiceRef.current?.queuePassAcknowledgement();
        actions.handlePass();
      } else if (command === "stop") {
        void voiceRef.current?.announceStop().then(() => {
          state.setVoiceActive(false);
          state.setIsVoiceMode(false);
        });
      }
    },
    [actions, state],
  );

  const voice = useGameVoice({
    list,
    enabled: state.isVoiceActive && !state.isEditingCard,
    currentAssociation,
    feedback,
    evaluationCount: attempts.length,
    similarity,
    advanceDelay: gameState.isNearComplete ? 10000 : undefined,
    onSubmitVoice: (text: string) => {
      actions.submitVoice(text);
    },
    onAdvance: actions.handleCorrect,
    commands: list.settings.voiceCommands,
    onCommand: handleVoiceCommand,
    revealed: isRevealed,
    audioRecordingEnabled: useGameStore.getState().settings.audioRecordingEnabled,
  });
  const voiceRef = useGameVoiceRef(voice);

  const goalProgress = useGameStore((s) => s.progress?.goalProgress ?? 0);
  const goalTarget = useGameStore((s) => s.progress?.goalTarget ?? 0);
  const quota = useGameStore((s) => s.quota);
  const userId = useGameStore((s) => s.user?.uid);
  const isPremium = quota?.tier === "premium";

  const { speak: speakAnswer, supported: speechSupported } = useSpeechSynthesis(
    list.settings.ttsProvider || "browser",
  );

  const handleSpeakAnswer = useCallback(
    (text: string, lang: string) => {
      if (!speechSupported || !text) return;
      void speakAnswer(text, lang);
    },
    [speechSupported, speakAnswer],
  );

  const { inputRef } = useGameViewEffects({
    list,
    gameState,
    gameView,
    currentAssociationId: currentAssociation?.id,
    currentAssociationForToast: currentAssociation,
    isEditingCard: state.isEditingCard,
    isPresentationMode: state.isPresentationMode,
    showSettings: state.showSettings,
    feedback,
    revealed: isRevealed,
    userInput,
    remainingCount: gameState.remainingCount ?? 0,
    isFinished: gameState.isFinished,
    attempts,
    lastAttempt,
    similarity,
    isReversed: gameplay.isReversed,
    detectedVoiceCommand: state.detectedVoiceCommand,
    onUpdateAssociations,
    onCountdownRunningChange: state.setIsCountdownRunning,
    onPresentationModeChange: state.setPresentationMode,
    onAttemptToast: showToast,
    setDetectedVoiceCommand: state.setDetectedVoiceCommand,
    checkAnswer: actions.checkAnswer,
    handleCorrect: actions.handleCorrect,
    handlePass: actions.handlePass,
    reveal: actions.reveal,
  });

  const {
    recordings,
    isLoading: recordingsLoading,
    error: recordingsError,
    deleteRecording,
    downloadRecording,
    refresh: refreshRecordings,
  } = useVoiceRecordings({
    userId: userId || "",
    listId: list.id,
    enabled: state.isRecording,
  });

  const handlers = useGameViewActions({
    list,
    gameState,
    currentAssociation,
    summary,
    sessionRepasos,
    actions,
    practicePlayer,
    voice,
    state,
    onBack,
    onUpdateAssociations,
    onViewList,
  });

  const handleCountdownComplete = useCallback(() => {
    state.setIsCountdownRunning(false);
    if (state.isVoiceActive) {
      handleVoiceCommand("pass");
    } else {
      actions.handlePass();
    }
  }, [state, handleVoiceCommand, actions]);

  useEffect(() => {
    if (
      feedback !== "correct" ||
      (gameState.remainingCount ?? 0) > 0 ||
      gameState.isFinished ||
      state.isVoiceActive ||
      state.isEditingCard
    ) {
      return;
    }
    const timer = setTimeout(() => actions.handleCorrect(), 600);
    return () => clearTimeout(timer);
  }, [feedback, gameState.remainingCount, gameState.isFinished, state.isVoiceActive, state.isEditingCard, actions]);

  if (gameView === "summary") {
    const restartAction =
      gameState.associations.length === 0
        ? () => {
            void handlers.handleFullRestart();
          }
        : () => actions.restart(list);
    return (
      <FinishedScreen
        summary={summary}
        onRestart={restartAction}
        onBack={onBack}
        onArchive={() => {
          void handlers.handleArchiveLearnedCards();
        }}
      />
    );
  }

  if (!currentAssociation) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  const headerProps = {
    list,
    currentIndex: gameState.currentIndex,
    queueLength: gameState.activeQueue.length,
    cycle4Count: gameplay.cycle4Count,
    goalProgress,
    goalTarget,
    sessionRepasos,
    isVoiceActive: state.isVoiceActive,
    isRecording: state.isRecording,
    isPremium,
    isPresentationMode: state.isPresentationMode,
    onBack,
    onSettings: state.openSettings,
    onRestart: handlers.handleHeaderRestart,
    onToggleVoice: state.toggleVoiceActive,
    onToggleRecord: state.toggleRecording,
    onViewRecordings: state.openVoiceRecordings,
    onTogglePractice: handlers.handleTogglePractice,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col min-h-[calc(100vh-80px)]">
      <div className="sm:hidden">
        <div
          className="transition-all duration-300 ease-out overflow-hidden"
          style={{
            maxHeight: immersive.isVisible ? "200px" : "0px",
            opacity: immersive.isVisible ? 1 : 0,
            marginBottom: immersive.isVisible ? "12px" : "0px",
          }}
        >
          <GameHeaderBar isMobile immersive={immersive} {...headerProps} />
        </div>
        <GameHeaderMobileToggle
          list={list}
          isVoiceActive={state.isVoiceActive}
          immersive={immersive}
          isEditingName={nameEditor.isEditing}
          onStartEdit={nameEditor.start}
          onToggleVoice={state.toggleVoiceActive}
          nameEditor={{
            value: nameEditor.value,
            onChange: nameEditor.onChange,
            onSave: () => {
              void nameEditor.save();
            },
            onCancel: nameEditor.cancel,
            inputRef: nameEditor.inputRef,
          }}
        />
      </div>
      <div className="hidden sm:block">
        <GameHeaderBar isMobile={false} immersive={immersive} {...headerProps} />
      </div>
      {state.isVoiceActive && useGameStore.getState().settings.audioRecordingEnabled && (
        <RecordingWarningBanner />
      )}
      <div className={`flex flex-col lg:flex-row gap-6 items-start ${immersive.isVisible ? "mt-2" : ""}`}>
        <div className="flex-1 w-full flex flex-col items-center">
          <CardStage
            cycleColorName={gameplay.cycleColorName}
            cycleColorClass={gameplay.cycleColorClass}
            cycleStats={gameplay.cycleStats}
            currentAssociation={currentAssociation}
            currentCycle={currentAssociation?.currentCycle ?? 1}
            displayTerm={gameplay.displayTerm}
            displayDef={gameplay.displayDef}
            labelTerm={gameplay.labelTerm}
            labelDef={gameplay.labelDef}
            voiceTermLang={gameplay.voiceTermLang}
            voiceDefLang={gameplay.voiceDefLang}
            userInput={userInput}
            feedback={feedback}
            similarity={similarity}
            lastAttempt={lastAttempt}
            attemptCount={gameplay.attemptCount}
            isPracticeMode={isPracticeMode}
            showHints={list.settings.showHints !== false && !state.isPresentationMode}
            revealed={isRevealed}
            isNearComplete={gameplay.isNearComplete}
            isTransitioning={gameplay.isTransitioning}
            isPresentationMode={state.isPresentationMode}
            isVoiceMode={state.isVoiceMode}
            isVoiceActive={state.isVoiceActive}
            isCountdownRunning={state.isCountdownRunning}
            isMobile={isMobile}
            showRevealWarning={state.showRevealWarning}
            showEditDeckButton={Boolean(onViewList)}
            gameMode={list.settings.mode}
            list={list}
            detectedVoiceCommand={state.detectedVoiceCommand}
            engineDisclaimer={gameplay.engineDisclaimer}
            engineFoundAnswers={gameplay.engineFoundAnswers}
            attempts={attempts}
            revealedAssociations={gameState.revealedAssociations}
            associations={gameState.associations}
            selectedAttemptId={state.selectedAttempt?.timestamp}
            gameState={gameState}
            voice={voice}
            practice={{
              status: practicePlayer.status,
              phase: practicePlayer.phase,
              remainingSeconds: practicePlayer.remainingSeconds,
              canPrev: gameState.currentIndex > 0,
              onPlay: practicePlayer.start,
              onPause: practicePlayer.pause,
              onStop: practicePlayer.stop,
              onPrev: actions.goBack,
            }}
            inputRef={inputRef}
            onUserInput={actions.setUserInput}
            onStartEdit={handlers.handleStartEdit}
            onSpeakAnswer={handleSpeakAnswer}
            onCheckAnswer={gameplay.handleCheckAnswer}
            onPass={actions.handlePass}
            onGoBack={actions.goBack}
            onReveal={actions.reveal}
            onCorrect={actions.handleCorrect}
            onShowRevealWarning={state.showRevealWarningBanner}
            onConfirmReveal={() => {
              state.dismissRevealWarningBanner();
              actions.reveal();
            }}
            onToggleListening={handlers.handleToggleListening}
            onStopVoice={handlers.handleStopVoice}
            onSelectAttempt={handlers.handleSelectAttempt}
            onCloseAttemptModal={handlers.handleCloseAttemptModal}
            onCountdownComplete={handleCountdownComplete}
            onEditDeck={handlers.handleEditDeck}
            onUpdateExpectedAnswer={gameplay.handleUpdateExpectedAnswer}
          />
        </div>
        {!isMobile && (
          <CycleProgress gameState={gameState} cycleColorName={gameplay.cycleColorName} isMobile={isMobile} />
        )}
      </div>
      {state.isEditingCard && currentAssociation && (
        <EditCardModal
          labelTerm={gameplay.labelTerm}
          labelDef={gameplay.labelDef}
          initialTerm={gameplay.displayTerm || ""}
          initialDef={gameplay.displayDef || ""}
          voiceTermLang={gameplay.voiceTermLang}
          voiceDefLang={gameplay.voiceDefLang}
          onSave={(term, def) => {
            void handlers.handleSaveEdit(term, def);
          }}
          onDelete={handlers.handleDeleteCurrentCard}
          onClose={handlers.handleCloseEdit}
        />
      )}
      {state.showSettings && (
        <SettingsModal
          list={list}
          onUpdateList={async (updatedList) => {
            console.log("Updated list:", updatedList);
            if (onUpdateList) {
              await onUpdateList(updatedList);
            } else {
              await onUpdateAssociations(updatedList.associations);
            }
          }}
          onClose={state.closeSettings}
        />
      )}
      {state.showVoiceRecordings && userId && (
        <VoiceRecordingsModal
          isOpen={state.showVoiceRecordings}
          onClose={state.closeVoiceRecordings}
          recordings={recordings}
          isLoading={recordingsLoading}
          error={recordingsError}
          onDelete={deleteRecording}
          onDownload={downloadRecording}
          onRefresh={refreshRecordings}
        />
      )}
    </div>
  );
};