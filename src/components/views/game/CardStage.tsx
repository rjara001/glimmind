import { GameCard } from "../../game/GameCard";
import { GameControls } from "../../game/GameControls";
import { VoiceControls } from "../../game/VoiceControls";
import { PracticeModeControls } from "../../game/PracticeModeControls";
import { CycleProgress } from "../../game/CycleProgress";
import { AttemptList } from "../../game/AttemptList";
import { CountdownTimer } from "../../layout/CountdownTimer";
import { AttemptAnalysisModal } from "../../modals/AttemptAnalysisModal";
import { REVEAL_AUTO_NEXT_SECONDS } from "../../../constants/app";
import type { CardStageProps } from "../../../types/game-view";
import { RevealWarning } from "./RevealWarning";
import { EditDeckButton } from "./EditDeckButton";

export function CardStage(props: CardStageProps) {
  const {
    cycleColorName,
    cycleColorClass,
    cycleStats,
    currentAssociation,
    currentCycle,
    displayTerm,
    displayDef,
    labelTerm,
    labelDef,
    voiceTermLang,
    voiceDefLang,
    userInput,
    feedback,
    similarity,
    lastAttempt,
    attemptCount,
    isPracticeMode,
    showHints,
    revealed,
    isNearComplete,
    isTransitioning,
    isPresentationMode,
    isVoiceMode,
    isVoiceActive,
    isCountdownRunning,
    isMobile,
    showRevealWarning,
    showEditDeckButton,
    gameMode,
    list,
    detectedVoiceCommand,
    engineDisclaimer,
    engineFoundAnswers,
    attempts,
    revealedAssociations,
    associations,
    selectedAttemptId,
    gameState,
    voice,
    practice,
    inputRef,
    onUserInput,
    onStartEdit,
    onSpeakAnswer,
    onCheckAnswer,
    onPass,
    onGoBack,
    onReveal,
    onCorrect,
    onShowRevealWarning,
    onConfirmReveal,
    onToggleListening,
    onStopVoice,
    onSelectAttempt,
    onCloseAttemptModal,
    onCountdownComplete,
    onEditDeck,
    onUpdateExpectedAnswer,
  } = props;

  const selectedAttempt = selectedAttemptId
    ? attempts.find((a) => a.timestamp === selectedAttemptId) ?? null
    : null;
  const showPracticeControls = isPresentationMode && isPracticeMode;
  const showVoiceControls = !showPracticeControls && isVoiceMode;

  return (
    <>
      <div className="w-full max-w-2xl flex justify-between items-center mb-2 px-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Pending:</span>
          <span className={`text-sm font-bold ${cycleColorClass}`}>{cycleStats.pending}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Correct:</span>
          <span className="text-sm font-bold text-emerald-600">{cycleStats.correct}</span>
        </div>
      </div>
      <div className="w-full">
        <div className="relative">
          <GameCard
            displayTerm={displayTerm}
            displayDef={displayDef}
            labelTerm={labelTerm}
            labelDef={labelDef}
            revealed={revealed}
            isNearComplete={isNearComplete}
            isPracticeMode={isPracticeMode}
            userInput={userInput}
            onUserInput={onUserInput}
            feedback={feedback}
            similarity={similarity ?? null}
            lastAttempt={lastAttempt}
            cycleColorName={cycleColorName}
            showHints={showHints}
            currentCycle={currentCycle}
            associationId={currentAssociation?.id}
            onStartEdit={onStartEdit}
            attemptCount={!isPracticeMode ? attemptCount : undefined}
            inputRef={inputRef}
            voiceMode={isVoiceActive}
            voicePhase={voice.phase}
            voiceTranscript={voice.transcript}
            voiceInterim={voice.interim}
            isVoiceListening={voice.isListening}
            voiceError={voice.error}
            voiceEnabled={isVoiceActive}
            voiceTermLang={voiceTermLang}
            voiceDefLang={voiceDefLang}
            onSpeakAnswer={onSpeakAnswer}
            detectedVoiceCommand={detectedVoiceCommand}
            engineDisclaimer={engineDisclaimer}
            engineFoundAnswers={engineFoundAnswers}
          />
          {!isPresentationMode && !gameState.isNearComplete && (
            <CountdownTimer
              seconds={REVEAL_AUTO_NEXT_SECONDS}
              isRunning={isCountdownRunning}
              onComplete={onCountdownComplete}
              className="absolute bottom-14 right-4 z-40"
              ariaLabel="Auto avance a la siguiente tarjeta"
            />
          )}
          {showEditDeckButton && <EditDeckButton onClick={onEditDeck} />}
        </div>
        {showRevealWarning && (
          <RevealWarning onTry={onShowRevealWarning} onReveal={onConfirmReveal} inputRef={inputRef} />
        )}
        {showPracticeControls ? (
          <PracticeModeControls
            status={practice.status}
            phase={practice.phase}
            remainingSeconds={practice.remainingSeconds}
            canPrev={practice.canPrev}
            onPlay={practice.onPlay}
            onPause={practice.onPause}
            onStop={practice.onStop}
            onPrev={practice.onPrev}
          />
        ) : showVoiceControls ? (
          <VoiceControls
            phase={voice.phase}
            isVoiceActive={isVoiceActive}
            onStop={onStopVoice}
            onRepeat={voice.repeat}
            onToggleListening={onToggleListening}
          />
        ) : (
          <GameControls
            onNext={onPass}
            onPrev={onGoBack}
            canGoBack={gameState.currentIndex > 0}
            onCheckAnswer={onCheckAnswer}
            onReveal={onReveal}
            onCorrect={onCorrect}
            revealed={revealed}
            wasRevealed={revealed}
            gameMode={gameMode}
            isTransitioning={isTransitioning}
            attemptCount={!isPracticeMode ? attemptCount : undefined}
            showRevealWarning={showRevealWarning}
            onTryAttempt={onShowRevealWarning}
            onConfirmReveal={onConfirmReveal}
          />
        )}
        {isMobile && (
          <CycleProgress gameState={gameState} cycleColorName={cycleColorName} isMobile={isMobile} />
        )}
        <AttemptList
          attempts={attempts}
          revealedAssociations={revealedAssociations}
          associations={associations}
          selectedAttemptId={selectedAttemptId}
          onSelectAttempt={onSelectAttempt}
        />
        <AttemptAnalysisModal
          isOpen={selectedAttempt !== null}
          onClose={onCloseAttemptModal}
          attempt={selectedAttempt as never}
          list={list}
          onUpdateExpectedAnswer={onUpdateExpectedAnswer}
        />
      </div>
    </>
  );
}