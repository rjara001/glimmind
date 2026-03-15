
import React, { useState, useEffect } from 'react';
import { Association, AssociationList, GameCycle } from '../types';
import { useGameLogic } from '../hooks/useGameLogic';
import { GameHeader } from './game/GameHeader';
import { GameCard } from './game/GameCard';
import { GameControls } from './game/GameControls';
import { CycleProgress } from './game/CycleProgress';
import { FinishedScreen } from './game/FinishedScreen';
import { SettingsModal } from './game/SettingsModal';

interface GameViewProps {
  list: AssociationList;
  onBack: () => void;
  onUpdateAssociations: (updatedAssociations: Association[]) => Promise<void>;
}

const cycleColorMap: Record<GameCycle, string> = {
  1: 'sky',
  2: 'yellow',
  3: 'rose',
  4: 'emerald',
};

export const GameView: React.FC<GameViewProps> = ({ list, onBack, onUpdateAssociations }) => {
  const [showSettings, setShowSettings] = useState(false);
  const { gameView, gameState, currentAssociation, summary, feedback, userInput, isRevealed, actions } = useGameLogic({ list });

  const handleArchiveLearnedCards = async () => {
    // If there are no learned cards to archive, just go back to the dashboard.
    if (!summary || summary.learned === 0) {
      onBack();
      return;
    }

    const learnedCardIds = gameState.associations
      .filter(a => a.isLearned)
      .map(a => a.id);

    console.log(`🗄️ Archiving ${learnedCardIds.length} learned associations...`);

    if (learnedCardIds.length > 0) {
      const updatedAssociations = list.associations.map(assoc => {
        if (learnedCardIds.includes(assoc.id)) {
          // When archiving, reset the card's state completely for future consistency.
          return { ...assoc, isArchived: true, isLearned: false, currentCycle: 1, status: 'pending' };
        }
        return assoc;
      });

      try {
        await onUpdateAssociations(updatedAssociations);
      } catch (error) {
        console.error("Error passing updated associations to parent:", error);
      }
    }
    
    // After archiving, navigate back to the dashboard.
    onBack();
  };

  const handleFullRestart = async () => {
    console.log("🔄 Resetting all associations to their initial state...");
    const resetAssociations = list.associations.map(assoc => ({
      ...assoc,
      isArchived: false,
      isLearned: false,
      currentCycle: 1,
      status: 'pending',
    }));

    try {
      await onUpdateAssociations(resetAssociations);
      // After a full reset, we start a new game session with the now-clean list.
      actions.restart();
    } catch (error) {
      console.error("Error during full restart:", error);
    }
  };

  const isReversed = list.settings.flipOrder === 'reversed';
  const isTransitioning = feedback === 'correct';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSettings || gameState.isFinished || !currentAssociation || isTransitioning) return;
      // In 'real' mode, as long as the card is not revealed, we prioritize typing.
      if (list.settings.mode === 'real' && !isRevealed) {
        if (e.key === 'Enter') { e.preventDefault(); actions.checkAnswer(); }
        // For any other key (like Space), we return to allow default typing behavior.
        return;
      }
      // For other modes, or when the card is revealed, Space and Enter are shortcuts.
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!isRevealed) { actions.reveal(); } else { actions.handlePass(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.isFinished, showSettings, list.settings.mode, feedback, isRevealed, actions, currentAssociation, isTransitioning]);

  if (gameView === 'summary') {
    // If the game ended because all cards were already archived, the main action should be a full reset.
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
  const cycle4Count = gameState.associations.filter(a => a.currentCycle === 4).length;
  const cycleStats = { pending: gameState.activeQueue.length - gameState.currentIndex, correct: gameState.currentIndex };

  const cycleColorName = cycleColorMap[gameState.globalCycle as GameCycle] || 'slate';

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col min-h-[calc(100vh-80px)]">
      <GameHeader listName={list.name} currentIndex={gameState.currentIndex} queueLength={gameState.activeQueue.length} cycle4Count={cycle4Count} gameMode={list.settings.mode} onBack={onBack} onSettingsClick={() => setShowSettings(true)} />
      <div className={`flex flex-col lg:flex-row gap-6 items-start transition-colors duration-500`}>
        <div className="flex-1 w-full flex flex-col items-center">
          <div className="w-full max-w-2xl flex justify-between items-center mb-2 px-4">
            <div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-500">Pendientes:</span><span className={`text-sm font-bold text-${cycleColorName}-600`}>{cycleStats.pending}</span></div>
            <div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-500">Correctas:</span><span className="text-sm font-bold text-emerald-600">{cycleStats.correct}</span></div>
          </div>
          <GameCard 
            key={currentAssociation.id} 
            displayTerm={displayTerm} 
            displayDef={displayDef} 
            labelTerm={labelTerm} 
            labelDef={labelDef} 
            revealed={isRevealed} 
            isPracticeMode={list.settings.mode === 'training'} 
            userInput={userInput} 
            onUserInput={actions.setUserInput} 
            onCheckAnswer={actions.checkAnswer} 
            feedback={feedback} 
            cycleColorName={cycleColorName}
          />
          <GameControls onNext={actions.handlePass} onCheckAnswer={actions.checkAnswer} onReveal={actions.reveal} onCorrect={actions.handleCorrect} revealed={isRevealed} wasRevealed={isRevealed} gameMode={list.settings.mode} isTransitioning={isTransitioning} />
        </div>
        <CycleProgress gameState={gameState} cycleColorName={cycleColorName} />
      </div>
      {showSettings && <SettingsModal list={list} onClose={() => setShowSettings(false)} onRestart={actions.restart} />}
    </div>
  );
};
