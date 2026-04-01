import React, { useState, useEffect } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Association, AssociationList, GameCycle } from '../types';
import { useGameLogic } from '../hooks/useGameLogic';
import { useToast } from './Toast';
import { GameHeader } from './game/GameHeader';
import { GameCard } from './game/GameCard';
import { GameControls } from './game/GameControls';
import { CycleProgress } from './game/CycleProgress';
import { FinishedScreen } from './game/FinishedScreen';
import { SettingsModal } from './game/SettingsModal';
import { AttemptList } from './game/AttemptList';

interface GameViewProps {
  list: AssociationList;
  onBack: (updatedAssociations?: Association[]) => void;
  onUpdateAssociations: (updatedAssociations: Association[]) => Promise<void>;
  onUpdateList?: (updatedList: AssociationList) => Promise<void>;
}

const cycleColorMap: Record<GameCycle, string> = {
  1: 'sky',
  2: 'yellow',
  3: 'rose',
  4: 'emerald',
};

export const GameView: React.FC<GameViewProps> = ({ list, onBack, onUpdateAssociations, onUpdateList }) => {
  const [showSettings, setShowSettings] = useState(false);
  const { showToast } = useToast();
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
    actions 
  } = useGameLogic({ list });

  useEffect(() => {
    if (!currentAssociation) return;
    const isReversed = list.settings.flipOrder === 'reversed';
    const expectedAnswer = isReversed ? currentAssociation.term : currentAssociation.definition;
    
    if (feedback === 'correct') {
      const thresholdPercent = Math.round(list.settings.threshold * 100);
      showToast(`Correct! ${lastAttempt} → ${expectedAnswer} (100% similarity, needed ${thresholdPercent}%)`, 'success');

      // Haptic feedback for success
      Haptics.notification({ type: NotificationType.Success }).catch(() => {});

      actions.handleCorrect();
    } else if (feedback === 'incorrect') {
      const thresholdPercent = Math.round(list.settings.threshold * 100);
      showToast(`Incorrect. You wrote: "${lastAttempt}" | Similarity: ${similarity}% | Needed: ${thresholdPercent}%`, 'error');

      // Haptic feedback for error
      Haptics.notification({ type: NotificationType.Error }).catch(() => {});
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
  
  // Calculate correct count from associations (status === 'correct' or isLearned === true)
  const correctCount = gameState.associations.filter((a: any) => a.status === 'correct' || a.isLearned === true).length;
  const cycleStats = { pending: gameState.activeQueue.length - gameState.currentIndex, correct: correctCount };
  const cycleColorName = cycleColorMap[gameState.globalCycle as GameCycle] || 'slate';
  const cycleColorClass = cycleColorName === 'sky' ? 'text-sky-600' : cycleColorName === 'yellow' ? 'text-yellow-600' : cycleColorName === 'rose' ? 'text-rose-600' : cycleColorName === 'emerald' ? 'text-emerald-600' : 'text-slate-600';
  const cycle4Count = gameState.associations.filter(a => a.currentCycle === 4).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col min-h-[calc(100vh-80px)]">
      <GameHeader listName={list.name} currentIndex={gameState.currentIndex} queueLength={gameState.activeQueue.length} cycle4Count={cycle4Count} gameMode={list.settings.mode} onBack={onBack} onSettingsClick={() => setShowSettings(true)} />
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 w-full flex flex-col items-center">
          <div className="w-full max-w-2xl flex justify-between items-center mb-2 px-4">
            <div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-500">Pendientes:</span><span className={`text-sm font-bold ${cycleColorClass}`}>{cycleStats.pending}</span></div>
            <div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-500">Correctas:</span><span className="text-sm font-bold text-emerald-600">{cycleStats.correct}</span></div>
          </div>
          <div>
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
            />
            <GameControls onNext={actions.handlePass} onCheckAnswer={actions.checkAnswer} onReveal={actions.reveal} onCorrect={actions.handleCorrect} revealed={isRevealed} wasRevealed={isRevealed} gameMode={list.settings.mode} isTransitioning={isTransitioning} />
            <AttemptList attempts={attempts} revealedAssociations={gameState.revealedAssociations} />
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
        onRestart={actions.restart} 
      />}
    </div>
  );
};
