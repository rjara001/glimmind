import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Association, AssociationList, Attempt, GameCycle } from '../../types';
import { useGameLogic } from '../../hooks/game/useGameLogic';
import { useGameStore } from '../../store/gameStore';
import { useToast } from '../layout/Toast';
import { GameHeader } from '../game/GameHeader';
import { GameCard } from '../game/GameCard';
import { GameControls } from '../game/GameControls';
import { VoiceControls } from '../game/VoiceControls';
import { CycleProgress } from '../game/CycleProgress';
import { FinishedScreen } from '../game/FinishedScreen';
import { SettingsModal } from '../../components/modals/SettingsModal';
import { EditCardModal } from '../../components/modals/EditCardModal';
import { AttemptList } from '../game/AttemptList';
import { AttemptAnalysisModal } from '../modals/AttemptAnalysisModal';
import { useImmersiveHeader } from '../../hooks/ui/useImmersiveHeader';
import { useGameVoice } from '../../hooks/voice/useGameVoice';
import { useSpeechSynthesis } from '../../hooks/voice/tts/useSpeechSynthesis';
import { VoiceCommandId } from '../../types';
import { COMMAND_TOAST_MS } from '../../constants/voice';
import { REVEAL_AUTO_NEXT_SECONDS, PRACTICE_REVEAL_DELAY_SECONDS, PRACTICE_AUTO_ADVANCE_SECONDS } from '../../constants/app';
import { CountdownTimer } from '../layout/CountdownTimer';
import { VoiceRecordingsModal } from '../../components/modals/VoiceRecordingsModal';
import { useVoiceRecordings } from '../../hooks/voice/useVoiceRecordings';
import { PracticeModeControls } from '../game/PracticeModeControls';
import { usePracticePlayer } from '../../hooks/game/usePracticePlayer';
import { joinDefinitions, parseDefinitions } from '../../utils/normalizeAssociation';

interface GameViewProps {
  list: AssociationList;
  onBack: (updatedAssociations?: Association[]) => void;
  onUpdateAssociations: (updatedAssociations: Association[]) => Promise<void>;
  onUpdateList?: (updatedList: AssociationList) => Promise<void>;
  onViewList?: (associationId?: string) => void;
  voiceMode?: boolean;
}

const cycleColorMap: Record<GameCycle, string> = {
  1: 'sky',
  2: 'yellow',
  3: 'rose',
  4: 'emerald',
};

export const GameView: React.FC<GameViewProps> = ({ list, onBack, onUpdateAssociations, onUpdateList, onViewList, voiceMode = false }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [showRevealWarning, setShowRevealWarning] = useState(false);
  const [showVoiceRecordings, setShowVoiceRecordings] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const userId = useGameStore(state => state.user?.uid);
  const [isVoiceActive, setIsVoiceActive] = useState(() => voiceMode === true);
  const [isVoiceMode, setIsVoiceMode] = useState(() => voiceMode === true);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const isPracticeMode = list.settings.mode === 'training';

  const {
    recordings,
    isLoading,
    error,
    deleteRecording,
    downloadRecording,
    refresh,
  } = useVoiceRecordings({
    userId: userId || '',
    listId: list.id,
    enabled: isRecording,
  });
  const [detectedVoiceCommand, setDetectedVoiceCommand] = useState<VoiceCommandId | undefined>();
  const [isCountdownRunning, setIsCountdownRunning] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const { supported: speechSupported, speak: speakAnswer } = useSpeechSynthesis(list.settings.ttsProvider || 'browser');
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
    actions 
  } = useGameLogic({ list });

  const practicePlayer = usePracticePlayer({
    revealSeconds: list.settings.practiceRevealDelay ?? PRACTICE_REVEAL_DELAY_SECONDS,
    advanceSeconds: PRACTICE_AUTO_ADVANCE_SECONDS,
    onReveal: actions.reveal,
    onAdvance: actions.handlePass,
    onPrev: actions.goBack,
    isGameFinished: gameState.isFinished,
  });

  useEffect(() => {
    if (list.settings.mode === 'training' || isPresentationMode || !currentAssociation) return;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [currentAssociation?.id, list.settings.mode, isPresentationMode]);

  useEffect(() => {
    if (gameView === 'summary') {
      setIsPresentationMode(false);
    }
  }, [gameView]);

  const goalProgress = useGameStore(state => state.progress?.goalProgress ?? 0);
  const goalTarget = useGameStore(state => state.progress?.goalTarget ?? 0);
  const quota = useGameStore(state => state.quota);
  const isPremium = quota?.tier === 'premium';

  const immersive = useImmersiveHeader();

  const handleSpeakAnswer = useCallback((text: string, lang: string) => {
    if (!speechSupported || !text) return;
    void speakAnswer(text, lang);
  }, [speechSupported, speakAnswer]);

  const voiceRef = useRef<ReturnType<typeof useGameVoice>>(null);

  const handleVoiceCommand = useCallback((command: VoiceCommandId) => {
    setDetectedVoiceCommand(command);
    if (command === 'reveal') {
      actions.reveal();
      void voiceRef.current?.speakAnswer();
    } else if (command === 'pass') {
      voiceRef.current?.queuePassAcknowledgement();
      actions.handlePass();
    } else if (command === 'stop') {
      void voiceRef.current?.announceStop().then(() => {
        setIsVoiceActive(false);
        setIsVoiceMode(false);
      });
    }
  }, [actions, setDetectedVoiceCommand]);

  const handleCountdownComplete = useCallback(() => {
    setIsCountdownRunning(false);
    if (isVoiceActive) {
      handleVoiceCommand('pass');
    } else {
      actions.handlePass();
    }
  }, [isVoiceActive, handleVoiceCommand, actions]);

  useEffect(() => {
    setIsCountdownRunning(Boolean(currentAssociation) && isRevealed && !gameState.isFinished && !isEditingCard);
  }, [isRevealed, gameState.isFinished, currentAssociation, isEditingCard]);

  useEffect(() => {
    if (!detectedVoiceCommand) return;
    const timer = setTimeout(() => setDetectedVoiceCommand(undefined), COMMAND_TOAST_MS);
    return () => clearTimeout(timer);
  }, [detectedVoiceCommand]);

  const voice = useGameVoice({
    list,
    enabled: isVoiceActive && !isEditingCard,
    currentAssociation,
    feedback,
    evaluationCount: attempts.length,
    similarity,
    onSubmitVoice: (text: string) => {
      actions.submitVoice(text);
    },
    onAdvance: actions.handleCorrect,
    commands: list.settings.voiceCommands,
    onCommand: handleVoiceCommand,
    revealed: isRevealed,
    audioRecordingEnabled: useGameStore.getState().settings.audioRecordingEnabled,
  });

  voiceRef.current = voice;

  const handleToggleListening = useCallback(() => {
    setIsVoiceActive(prev => !prev);
  }, []);

  const handleStopVoice = useCallback(() => {
    voice.stop();
    setIsVoiceActive(false);
    setIsVoiceMode(false);
  }, [voice]);

  const isReversed = list.settings.flipOrder === 'reversed';
  const remainingCount = gameState.remainingCount ?? 0;
  const isTransitioning = feedback === 'correct' && remainingCount <= 0 && !isEditingCard;

  const handleCheckAnswer = useCallback(() => {
    actions.checkAnswer();
  }, [actions]);

  useEffect(() => {
    if (feedback !== 'correct' || remainingCount > 0 || gameState.isFinished || isVoiceActive || isEditingCard) return;
    const timer = setTimeout(() => actions.handleCorrect(), 600);
    return () => clearTimeout(timer);
  }, [feedback, remainingCount, gameState.isFinished, isVoiceActive, isEditingCard, actions]);

  useEffect(() => {
    if (!currentAssociation) return;
    const thresholdPercent = Math.round(list.settings.threshold * 100);
    const lastAttemptObj = attempts[attempts.length - 1];
    const expectedAnswer = lastAttemptObj?.expectedAnswer ?? (isReversed ? currentAssociation.term : joinDefinitions(currentAssociation.definition));

    if (feedback === 'correct') {
      showToast(`Correct! ${lastAttempt} → ${expectedAnswer} (${similarity}% similarity, needed ${thresholdPercent}%)`, 'success');
    } else if (feedback === 'incorrect') {
      showToast(`Incorrect. You wrote: "${lastAttempt}" | Similarity: ${similarity}% | Needed: ${thresholdPercent}%`, 'error');
    }
  }, [feedback, currentAssociation, showToast, list.settings.threshold, list.settings.flipOrder, lastAttempt, similarity, attempts, isReversed]);
  
  // Sync game state to parent when associations change
  useEffect(() => {
    if (onUpdateAssociations && gameState.associations) {
      onUpdateAssociations(gameState.associations);
    }
  }, [gameState.associations, onUpdateAssociations]);

   // Auto-save is disabled - only save on back navigation to avoid stale data issues
  // const handleAutoSave = () => { ... } - removed

  const handleStartEdit = useCallback(() => {
    if (isPresentationMode) {
      practicePlayer.pause();
    }
    setIsEditingCard(true);
  }, [isPresentationMode, practicePlayer.pause]);

  const handleStartEditName = useCallback(() => {
    setEditingName(list.name);
    setIsEditingName(true);
    requestAnimationFrame(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    });
  }, [list.name]);

  const handleSaveName = useCallback(async () => {
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== list.name && onUpdateList) {
      await onUpdateList({ ...list, name: trimmed });
    }
    setIsEditingName(false);
  }, [editingName, list, onUpdateList]);

  const handleCancelEditName = useCallback(() => {
    setIsEditingName(false);
    setEditingName('');
  }, []);

  const handleCloseEdit = useCallback(() => {
    setIsEditingCard(false);
    if (isPresentationMode) {
      practicePlayer.resume();
    }
  }, [isPresentationMode, practicePlayer.resume]);

  const handleSaveEdit = useCallback(async (term: string, definition: string) => {
    const trimmedTerm = term.trim();
    const updatedAssociations = gameState.associations.map(a =>
      a.id === currentAssociation?.id
        ? { ...a, term: trimmedTerm, definition: [definition.trim()], updatedAt: Date.now() }
        : a
    );

    await onUpdateAssociations(updatedAssociations);
    actions.updateCurrentAssociation(trimmedTerm, [definition.trim()]);
    setIsEditingCard(false);
    if (isPresentationMode) {
      practicePlayer.resume();
    }
  }, [currentAssociation?.id, gameState.associations, onUpdateAssociations, isPresentationMode, practicePlayer.resume]);

  const handleDeleteCurrentCard = useCallback(() => {
    const associationId = currentAssociation?.id;
    if (!associationId) return;
    if (!confirm('Delete this card from the list?')) return;
    actions.deleteAssociation(associationId);
    setIsEditingCard(false);
    if (isPresentationMode) {
      practicePlayer.resume();
    }
  }, [currentAssociation?.id, actions, isPresentationMode, practicePlayer.resume]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSettings || isEditingCard || gameState.isFinished || !currentAssociation) return;

      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isTyping = isInput;

      if (feedback !== 'none') {
        if (e.key === 'Enter' && feedback === 'correct' && remainingCount <= 0) {
          e.preventDefault();
          actions.handleCorrect();
        }
        return;
      }

      if (list.settings.mode === 'training') {
        if (!isTyping && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          if (!isRevealed) {
            actions.reveal();
          } else {
            actions.handlePass();
          }
        }
        return;
      }

      if (isTyping) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleCheckAnswer();
        }
      } else {
        if (e.key === ' ' && isRevealed) {
          e.preventDefault();
          actions.handlePass();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSettings, isEditingCard, gameState.isFinished, currentAssociation, feedback, list.settings.mode, isRevealed, actions, userInput, handleCheckAnswer, remainingCount]);

  const handleArchiveLearnedCards = async () => {
    if (!summary || summary.learned === 0) {
      actions.restart();
      return;
    }
    const learnedCardIds = gameState.associations.filter(a => a.isLearned).map(a => a.id);
    if (learnedCardIds.length > 0) {
      const updatedAssociations = list.associations.map(assoc => {
        if (learnedCardIds.includes(assoc.id)) {
          return { ...assoc, isArchived: true, isLearned: false, currentCycle: 1, status: 'pending' as const };
        }
        return assoc;
      });
      const updatedList = { ...list, associations: updatedAssociations };
      try {
        await onUpdateAssociations(updatedAssociations);
        const remainingToPlay = updatedAssociations.filter(a => !a.isArchived).length;
        if (remainingToPlay === 0) {
          onBack(updatedAssociations);
        } else {
          actions.restart(updatedList);
        }
      } catch (error) {
        console.error("Error passing updated associations to parent:", error);
      }
    } else {
      actions.restart();
    }
  };

  const handleFullRestart = async () => {
    const resetAssociations = list.associations.map(assoc => ({ ...assoc, isArchived: false, isLearned: false, currentCycle: 1, status: 'pending' as const }));
    const updatedList = { ...list, associations: resetAssociations };
    try {
      await onUpdateAssociations(resetAssociations);
      actions.restart(updatedList);
    } catch (error) {
      console.error("Error during full restart:", error);
    }
  };

  const handleHeaderRestart = () => {
    if (confirm('Reset all progress for this list?')) {
      handleFullRestart();
    }
  };

  const handleSelectAttempt = useCallback((attempt: Attempt) => {
    setSelectedAttempt(attempt);
  }, []);

  const handleCloseAttemptModal = useCallback(() => {
    setSelectedAttempt(null);
  }, []);

  const handleUpdateExpectedAnswer = useCallback(async (associationId: string, field: 'term' | 'definition', value: string) => {
    const nextValue = field === 'definition' ? parseDefinitions(value) : value;
    const updatedAssociations = gameState.associations.map((a) => {
      if (a.id === associationId) {
        return { ...a, [field]: nextValue, updatedAt: Date.now() };
      }
      return a;
    });
    await onUpdateAssociations(updatedAssociations);
  }, [gameState.associations, onUpdateAssociations]);

  if (gameView === 'summary') {
    const restartAction = (gameState.associations.length === 0) ? handleFullRestart : () => actions.restart(list);
    return <FinishedScreen summary={summary} onRestart={restartAction} onBack={onBack} onArchive={handleArchiveLearnedCards} />;
  }

  if (!currentAssociation) {
    return <div className="w-full h-full flex items-center justify-center"><div className="text-slate-500">Loading...</div></div>;
  }

  const displayTerm = isReversed ? joinDefinitions(currentAssociation.definition) : currentAssociation.term;
  const displayDef = isReversed ? currentAssociation.term : joinDefinitions(currentAssociation.definition);
  const conceptParts = list.concept.split('/');
  const labelTerm = isReversed ? (conceptParts[1] || 'Definición') : (conceptParts[0] || 'Término');
  const labelDef = isReversed ? (conceptParts[0] || 'Término') : (conceptParts[1] || 'Definición');
  const voiceTermLang = isReversed ? list.settings.voiceDefLang : list.settings.voiceTermLang;
  const voiceDefLang = isReversed ? list.settings.voiceTermLang : list.settings.voiceDefLang;

  
  // Calculate correct count from associations (status === 'correct' or isLearned === true)
  const correctCount = gameState.associations.filter((a: any) => a.status === 'correct' || a.isLearned === true).length;
  const cycleStats = { pending: gameState.activeQueue.length - gameState.currentIndex, correct: correctCount };
  const cycleColorName = cycleColorMap[gameState.globalCycle as GameCycle] || 'slate';
  const cycleColorClass = cycleColorName === 'sky' ? 'text-sky-600' : cycleColorName === 'yellow' ? 'text-yellow-600' : cycleColorName === 'rose' ? 'text-rose-600' : cycleColorName === 'emerald' ? 'text-emerald-600' : 'text-slate-600';
  const cycle4Count = gameState.associations.filter(a => a.currentCycle === 4).length;
  const attemptCount = attempts.filter(a => a.associationId === currentAssociation?.id).length;

  const foundAnswers = gameState.foundAnswers ?? [];
  const expectedCount = gameState.expectedCount ?? 0;
  const engineDisclaimer =
    expectedCount > 0
      ? `${foundAnswers.length} / ${expectedCount} expected answers`
      : undefined;
  const engineFoundAnswers = foundAnswers.length > 0 ? foundAnswers : undefined;

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col min-h-[calc(100vh-80px)]">
      <div className="sm:hidden">
        <div
          className="transition-all duration-300 ease-out overflow-hidden"
          style={{
            maxHeight: immersive.isVisible ? '200px' : '0px',
            opacity: immersive.isVisible ? 1 : 0,
            marginBottom: immersive.isVisible ? '12px' : '0px',
          }}
        >
          <GameHeader listName={list.name} currentIndex={gameState.currentIndex} queueLength={gameState.activeQueue.length} cycle4Count={cycle4Count} gameMode={list.settings.mode} goalProgress={goalProgress} goalTarget={goalTarget} sessionRepasos={sessionRepasos} onBack={onBack} onSettingsClick={() => setShowSettings(true)} onRestart={handleHeaderRestart} voiceEnabled={isVoiceActive} onVoiceToggle={() => setIsVoiceActive((prev) => !prev)} isPremium={isPremium} isRecording={isRecording} onRecordToggle={() => setIsRecording((prev) => !prev)} onViewRecordings={() => setShowVoiceRecordings(true)} isPresentationActive={isPresentationMode} onPracticeToggle={() => {
              if (isPresentationMode) {
                practicePlayer.stop();
                setIsPresentationMode(false);
              } else {
                setIsPresentationMode(true);
                practicePlayer.start();
              }
            }} />
        </div>
        <div className="flex items-center justify-center gap-2 mb-2 px-1">
          {isEditingName ? (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-xl border border-indigo-200 shadow-sm">
              <input
                ref={nameInputRef}
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') handleCancelEditName();
                }}
                onBlur={handleSaveName}
                className="text-xs font-bold text-slate-700 bg-transparent border-none outline-none w-[140px] truncate"
                maxLength={50}
              />
              <button
                onClick={handleSaveName}
                className="p-1 text-indigo-600 hover:text-indigo-700"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={handleCancelEditName}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                if (e.detail === 2) {
                  handleStartEditName();
                } else {
                  immersive.toggle();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-slate-100 shadow-sm active:bg-slate-50 transition-colors"
            >
              <span className="text-xs font-bold text-slate-500 truncate max-w-[180px]">{list.name}</span>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${immersive.isVisible ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setIsVoiceActive((prev) => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
              isVoiceActive
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-500 border border-slate-100'
            }`}
            aria-label={isVoiceActive ? 'Disable voice' : 'Enable voice'}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              {isVoiceActive ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              )}
            </svg>
            <span className="hidden sm:inline">{isVoiceActive ? 'Voice ON' : 'Voice'}</span>
          </button>
        </div>
      </div>
      <div className="hidden sm:block">
        <GameHeader listName={list.name} currentIndex={gameState.currentIndex} queueLength={gameState.activeQueue.length} cycle4Count={cycle4Count} gameMode={list.settings.mode} goalProgress={goalProgress} goalTarget={goalTarget} sessionRepasos={sessionRepasos} onBack={onBack} onSettingsClick={() => setShowSettings(true)} onRestart={handleHeaderRestart} voiceEnabled={isVoiceActive} onVoiceToggle={() => setIsVoiceActive((prev) => !prev)} isPremium={isPremium} isRecording={isRecording} onRecordToggle={() => setIsRecording((prev) => !prev)} onViewRecordings={() => setShowVoiceRecordings(true)} isPresentationActive={isPresentationMode} onPracticeToggle={() => {
              if (isPresentationMode) {
                practicePlayer.stop();
                setIsPresentationMode(false);
              } else {
                setIsPresentationMode(true);
                practicePlayer.start();
              }
            }} />
      </div>
      {isVoiceActive && useGameStore.getState().settings.audioRecordingEnabled && (
        <div className="w-full max-w-2xl mb-3 px-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
            <p className="text-[10px] font-bold text-amber-800 leading-tight">Grabación temporal activa: los audios se suben a la nube y se eliminan automáticamente.</p>
          </div>
        </div>
      )}
      <div className={`flex flex-col lg:flex-row gap-6 items-start ${immersive.isVisible ? 'mt-2' : ''}`}>
        <div className="flex-1 w-full flex flex-col items-center">
          <div className="w-full max-w-2xl flex justify-between items-center mb-2 px-4">
            <div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-500">Pending:</span><span className={`text-sm font-bold ${cycleColorClass}`}>{cycleStats.pending}</span></div>
            <div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-500">Correct:</span><span className="text-sm font-bold text-emerald-600">{cycleStats.correct}</span></div>
          </div>
          <div className="w-full">
            <div className="relative">
            <GameCard 
              displayTerm={displayTerm} 
              displayDef={displayDef} 
              labelTerm={labelTerm} 
              labelDef={labelDef} 
              revealed={isRevealed} 
              isPracticeMode={list.settings.mode === 'training'} 
              userInput={userInput} 
              onUserInput={actions.setUserInput} 
              feedback={feedback} 
              similarity={similarity}
              lastAttempt={lastAttempt}
              cycleColorName={cycleColorName}
               showHints={list.settings.showHints !== false && !isPresentationMode}
              currentCycle={currentAssociation?.currentCycle ?? 1}
              associationId={currentAssociation?.id}
              onStartEdit={handleStartEdit}
               attemptCount={list.settings.mode !== 'training' ? attemptCount : undefined}
               inputRef={inputRef}
               voiceMode={isVoiceActive}
               voicePhase={voice.phase}
               voiceTranscript={voice.transcript}
               voiceInterim={voice.interim}
               isVoiceListening={voice.isListening}
               voiceError={voice.error}
               voiceEnabled={list.settings.voiceEnabled === true}
               voiceTermLang={voiceTermLang}
               voiceDefLang={voiceDefLang}
onSpeakAnswer={handleSpeakAnswer}
                 detectedVoiceCommand={detectedVoiceCommand}
                 engineDisclaimer={engineDisclaimer}
                 engineFoundAnswers={engineFoundAnswers}
            />
              {!isPresentationMode && (
                <CountdownTimer
                  seconds={REVEAL_AUTO_NEXT_SECONDS}
                  isRunning={isCountdownRunning}
                  onComplete={handleCountdownComplete}
                  className="absolute bottom-14 right-4 z-40"
                  ariaLabel="Auto avance a la siguiente tarjeta"
                />
              )}
              {onViewList && (
                <button
                  onClick={() => {
                    useGameStore.getState().saveResumeState(list.id, {
                      state: gameState,
                      sessionRepasos,
                    });
                    onViewList(currentAssociation?.id);
                  }}
                  className="absolute top-3 left-3 z-40 flex items-center justify-center w-9 h-9 bg-white text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-slate-200 shadow-sm transition-all"
                  aria-label="Edit deck"
                  title="Edit deck"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                </button>
              )}
            </div>
             {showRevealWarning && (
               <div className="mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between gap-3">
                   <p className="text-xs font-bold text-amber-800">You haven't made any attempts.</p>
                 <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowRevealWarning(false);
                        requestAnimationFrame(() => {
                          inputRef.current?.focus();
                        });
                      }}
                      className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition"
                    >
                       Try
                     </button>
                    <button
                      onClick={() => {
                        setShowRevealWarning(false);
                        actions.reveal();
                      }}
                      className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-50 transition"
                    >
                      Reveal
                   </button>
                 </div>
               </div>
             )}
              {isPresentationMode && isPracticeMode ? (
                <PracticeModeControls
                  status={practicePlayer.status}
                  phase={practicePlayer.phase}
                  remainingSeconds={practicePlayer.remainingSeconds}
                  canPrev={gameState.currentIndex > 0}
                  onPlay={practicePlayer.start}
                  onPause={practicePlayer.pause}
                  onStop={() => {
                    practicePlayer.stop();
                  }}
                  onPrev={actions.goBack}
                />
             ) : isVoiceMode ? (
               <VoiceControls
                 phase={voice.phase}
                 isVoiceActive={isVoiceActive}
                 onStop={handleStopVoice}
                 onRepeat={voice.repeat}
                 onToggleListening={handleToggleListening}
               />
             ) : (
               <GameControls onNext={actions.handlePass} onPrev={actions.goBack} canGoBack={gameState.currentIndex > 0} onCheckAnswer={handleCheckAnswer} onReveal={actions.reveal} onCorrect={actions.handleCorrect} revealed={isRevealed} wasRevealed={isRevealed} gameMode={list.settings.mode} isTransitioning={isTransitioning} attemptCount={list.settings.mode !== 'training' ? attemptCount : undefined} showRevealWarning={showRevealWarning} onTryAttempt={() => setShowRevealWarning(true)} onConfirmReveal={() => { setShowRevealWarning(false); actions.reveal(); }} />
             )}
             <AttemptList attempts={attempts} revealedAssociations={gameState.revealedAssociations} associations={gameState.associations} selectedAttemptId={selectedAttempt?.timestamp} onSelectAttempt={handleSelectAttempt} />
             <AttemptAnalysisModal isOpen={selectedAttempt !== null} onClose={handleCloseAttemptModal} attempt={selectedAttempt!} list={list} onUpdateExpectedAnswer={handleUpdateExpectedAnswer} />
          </div>
        </div>
        <CycleProgress gameState={gameState} cycleColorName={cycleColorName} />
      </div>
      {isEditingCard && currentAssociation && (
        <EditCardModal
          labelTerm={labelTerm}
          labelDef={labelDef}
          initialTerm={displayTerm || ''}
          initialDef={displayDef || ''}
          voiceTermLang={voiceTermLang}
          voiceDefLang={voiceDefLang}
          onSave={handleSaveEdit}
          onDelete={handleDeleteCurrentCard}
          onClose={handleCloseEdit}
        />
      )}
      {showSettings && <SettingsModal 
        list={list} 
        onUpdateList={async (updatedList) => {
          console.log("Updated list:", updatedList);  
          
          if (onUpdateList) {
            await onUpdateList(updatedList);
          } else {
            await onUpdateAssociations(updatedList.associations);
          }
        }} 
        onClose={() => setShowSettings(false)} 
      />}
      {showVoiceRecordings && userId && (
        <VoiceRecordingsModal
          isOpen={showVoiceRecordings}
          onClose={() => setShowVoiceRecordings(false)}
          recordings={recordings}
          isLoading={isLoading}
          error={error}
          onDelete={deleteRecording}
          onDownload={downloadRecording}
          onRefresh={refresh}
        />
      )}
    </div>
  );
};
