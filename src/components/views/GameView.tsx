import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Association, AssociationList, GameCycle } from '../../types';
import { useGameLogic } from '../../hooks/game/useGameLogic';
import { useGameStore } from '../../store/gameStore';
import { useToast } from '../layout/Toast';
import { GameHeader } from '../game/GameHeader';
import { GameCard } from '../game/GameCard';
import { GameControls } from '../game/GameControls';
import { CycleProgress } from '../game/CycleProgress';
import { FinishedScreen } from '../game/FinishedScreen';
import { SettingsModal } from '../../components/modals/SettingsModal';
import { AttemptList } from '../game/AttemptList';
import { useImmersiveHeader } from '../../hooks/ui/useImmersiveHeader';
import { useGameVoice } from '../../hooks/voice/useGameVoice';
import { useSpeechSynthesis } from '../../hooks/voice/tts/useSpeechSynthesis';
import { VoiceCommandId } from '../../types';

interface GameViewProps {
  list: AssociationList;
  onBack: (updatedAssociations?: Association[]) => void;
  onUpdateAssociations: (updatedAssociations: Association[]) => Promise<void>;
  onUpdateList?: (updatedList: AssociationList) => Promise<void>;
  autoStart?: boolean;
  voiceMode?: boolean;
}

const cycleColorMap: Record<GameCycle, string> = {
  1: 'sky',
  2: 'yellow',
  3: 'rose',
  4: 'emerald',
};

export const GameView: React.FC<GameViewProps> = ({ list, onBack, onUpdateAssociations, onUpdateList, autoStart = false, voiceMode = false }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [showRevealWarning, setShowRevealWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const [isVoiceActive, setIsVoiceActive] = useState(() => voiceMode || list.settings.voiceEnabled === true);
  const [detectedVoiceCommand, setDetectedVoiceCommand] = useState<string | undefined>();
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
  } = useGameLogic({ list, autoStart });

  const goalProgress = useGameStore(state => state.progress?.goalProgress ?? 0);
  const goalTarget = useGameStore(state => state.progress?.goalTarget ?? 0);

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
      actions.handlePass();
    } else if (command === 'stop') {
      setIsVoiceActive(false);
    }
  }, [actions, setDetectedVoiceCommand]);

  const voice = useGameVoice({
    list,
    enabled: isVoiceActive,
    currentAssociation,
    feedback,
    evaluationCount: attempts.length,
    onSubmitVoice: actions.submitVoice,
    onAdvance: actions.handleCorrect,
    commands: list.settings.voiceCommands,
    onCommand: handleVoiceCommand,
    revealed: isRevealed,
    audioRecordingEnabled: useGameStore.getState().settings.audioRecordingEnabled,
  });

  voiceRef.current = voice;

  useEffect(() => {
    if (!currentAssociation) return;
    const isReversed = list.settings.flipOrder === 'reversed';
    const expectedAnswer = isReversed ? currentAssociation.term : currentAssociation.definition;
    
    if (feedback === 'correct') {
      const thresholdPercent = Math.round(list.settings.threshold * 100);
      showToast(`Correct! ${lastAttempt} → ${expectedAnswer} (100% similarity, needed ${thresholdPercent}%)`, 'success');
      if (!isVoiceActive) {
        actions.handleCorrect();
      }
    } else if (feedback === 'incorrect') {
      const thresholdPercent = Math.round(list.settings.threshold * 100);
      showToast(`Incorrect. You wrote: "${lastAttempt}" | Similarity: ${similarity}% | Needed: ${thresholdPercent}%`, 'error');
    }
  }, [feedback, currentAssociation, showToast, list.settings.threshold, lastAttempt, similarity, list.settings.flipOrder, actions]);
  
  // Sync game state to parent when associations change
  useEffect(() => {
    if (onUpdateAssociations && gameState.associations) {
      onUpdateAssociations(gameState.associations);
    }
  }, [gameState.associations, onUpdateAssociations]);

   // Auto-save is disabled - only save on back navigation to avoid stale data issues
  // const handleAutoSave = () => { ... } - removed

  const handleStartEdit = useCallback(() => {
    setIsEditingCard(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditingCard(false);
  }, []);

  const handleEditCard = useCallback(async (term: string, definition: string) => {
    const updatedAssociations = gameState.associations.map(a => {
      if (a.id === currentAssociation?.id) {
        return { ...a, term: term.trim(), definition: definition.trim(), updatedAt: Date.now() };
      }
      return a;
    });

    await onUpdateAssociations(updatedAssociations);
    setIsEditingCard(false);
  }, [currentAssociation?.id, gameState.associations, onUpdateAssociations]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSettings || gameState.isFinished || !currentAssociation) return;

      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isTyping = isInput;

      if (feedback !== 'none') {
        if (e.key === 'Enter' && feedback === 'correct') {
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
          actions.checkAnswer();
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
  }, [showSettings, gameState.isFinished, currentAssociation, feedback, list.settings.mode, isRevealed, actions, userInput]);

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
    if (confirm('¿Reiniciar todo el progreso de esta lista?')) {
      handleFullRestart();
    }
  };

  const isReversed = list.settings.flipOrder === 'reversed';
  const isTransitioning = feedback === 'correct';

  if (gameView === 'summary') {
    const restartAction = (gameState.associations.length === 0) ? handleFullRestart : actions.restart;
    return <FinishedScreen summary={summary} onRestart={restartAction} onBack={onBack} onArchive={handleArchiveLearnedCards} />;
  }

  if (!currentAssociation) {
    return <div className="w-full h-full flex items-center justify-center"><div className="text-slate-500">Cargando...</div></div>;
  }

  const displayTerm = isReversed ? currentAssociation.definition : currentAssociation.term;
  const displayDef = isReversed ? currentAssociation.term : currentAssociation.definition;
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

  const handleReveal = useCallback(() => {
    if (attemptCount === 0) {
      setShowRevealWarning(true);
    } else {
      actions.reveal();
    }
  }, [attemptCount, actions]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col min-h-[calc(100vh-80px)]">
      <div
        className="sm:hidden"
        onTouchStart={immersive.handleTouchStart}
        onTouchMove={immersive.handleTouchMove}
        onTouchEnd={immersive.handleTouchEnd}
      >
        <div
          className="transition-all duration-300 ease-out overflow-hidden"
          style={{
            maxHeight: immersive.isVisible ? '200px' : '0px',
            opacity: immersive.isVisible ? 1 : 0,
            marginBottom: immersive.isVisible ? '12px' : '0px',
          }}
        >
          <GameHeader listName={list.name} currentIndex={gameState.currentIndex} queueLength={gameState.activeQueue.length} cycle4Count={cycle4Count} gameMode={list.settings.mode} goalProgress={goalProgress} goalTarget={goalTarget} sessionRepasos={sessionRepasos} onBack={onBack} onSettingsClick={() => setShowSettings(true)} onRestart={handleHeaderRestart} voiceEnabled={isVoiceActive} onVoiceToggle={() => setIsVoiceActive((prev) => !prev)} isVoiceProcessing={voice.isProcessing} />
        </div>
        {!immersive.isVisible && (
          <div className="flex justify-center mb-2">
            <div className="w-12 h-1 bg-slate-300 rounded-full" />
          </div>
        )}
      </div>
      <div className="hidden sm:block">
        <GameHeader listName={list.name} currentIndex={gameState.currentIndex} queueLength={gameState.activeQueue.length} cycle4Count={cycle4Count} gameMode={list.settings.mode} goalProgress={goalProgress} goalTarget={goalTarget} sessionRepasos={sessionRepasos} onBack={onBack} onSettingsClick={() => setShowSettings(true)} onRestart={handleHeaderRestart} voiceEnabled={isVoiceActive} onVoiceToggle={() => setIsVoiceActive((prev) => !prev)} isVoiceProcessing={voice.isProcessing} />
      </div>
      {!immersive.isVisible && (
        <div className="sm:hidden flex justify-between items-center mb-2 px-1">
          <button onClick={onBack} className="text-slate-400 hover:text-indigo-600 transition-all p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7"/></svg>
          </button>
          <span className="text-xs font-bold text-slate-500 truncate mx-2">{list.name}</span>
          <div className="w-9"></div>
        </div>
      )}
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
            <div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-500">Pendientes:</span><span className={`text-sm font-bold ${cycleColorClass}`}>{cycleStats.pending}</span></div>
            <div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-500">Correctas:</span><span className="text-sm font-bold text-emerald-600">{cycleStats.correct}</span></div>
          </div>
          <div className="w-full">
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
              showHints={list.settings.showHints !== false}
              currentCycle={currentAssociation?.currentCycle ?? 1}
              associationId={currentAssociation?.id}
              onEditCard={handleEditCard}
              isEditing={isEditingCard}
              onStartEdit={handleStartEdit}
              onCancelEdit={handleCancelEdit}
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
            />
             {showRevealWarning && (
               <div className="mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between gap-3">
                 <p className="text-xs font-bold text-amber-800">Veo que no has hecho intentos.</p>
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
                      Intentar
                    </button>
                   <button
                     onClick={() => {
                       setShowRevealWarning(false);
                       actions.reveal();
                     }}
                     className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-50 transition"
                   >
                     Revelar
                   </button>
                 </div>
               </div>
             )}
            <GameControls onNext={actions.handlePass} onCheckAnswer={actions.checkAnswer} onReveal={actions.reveal} onCorrect={actions.handleCorrect} revealed={isRevealed} wasRevealed={isRevealed} gameMode={list.settings.mode} isTransitioning={isTransitioning} attemptCount={list.settings.mode !== 'training' ? attemptCount : undefined} showRevealWarning={showRevealWarning} onTryAttempt={() => setShowRevealWarning(true)} onConfirmReveal={() => { setShowRevealWarning(false); actions.reveal(); }} />
            <AttemptList attempts={attempts} revealedAssociations={gameState.revealedAssociations} associations={gameState.associations} />
          </div>
        </div>
        <CycleProgress gameState={gameState} cycleColorName={cycleColorName} />
      </div>
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
    </div>
  );
};
