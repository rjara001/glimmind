
import React, { useState, useEffect } from 'react';
import { AssociationList } from '../types';
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
  // For simplicity, we assume the parent now controls the list state if needed,
  // so onUpdateList is removed as the engine is self-contained.
}

export const GameView: React.FC<GameViewProps> = ({ list, onBack }) => {
  const [showSettings, setShowSettings] = useState(false);
  const {
    gameView,
    gameState,
    currentAssociation,
    summary,
    feedback,
    userInput,
    isRevealed,
    actions,
  } = useGameLogic({ list });

  const isReversed = list.settings.flipOrder === 'reversed';
  const isTransitioning = feedback === 'correct';

  const displayTerm = isReversed ? currentAssociation?.definition : currentAssociation?.term;
  const displayDef = isReversed ? currentAssociation?.term : currentAssociation?.definition;
  
  const conceptParts = list.concept.split('/');
  const labelTerm = isReversed ? (conceptParts[1] || 'Definición') : (conceptParts[0] || 'Término');
  const labelDef = isReversed ? (conceptParts[0] || 'Término') : (conceptParts[1] || 'Definición');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSettings || gameState.isFinished || !currentAssociation || isTransitioning) return;
      
      // In 'real' mode, Enter checks the answer if not revealed
      if (list.settings.mode === 'real' && !isRevealed && feedback === 'none') {
        if (e.key === 'Enter') {
          e.preventDefault();
          actions.checkAnswer();
        }
        return;
      }

      // In 'training' mode, or after revealing in 'real' mode
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!isRevealed) {
          actions.reveal();
        } else {
          actions.handlePass();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.isFinished, showSettings, list.settings.mode, feedback, isRevealed, actions, currentAssociation, isTransitioning]);

  if (gameView === 'summary' || !currentAssociation) {
    return <FinishedScreen summary={summary} onRestart={actions.restart} onBack={onBack} />;
  }
  
  const cycle4Count = gameState.associations.filter(a => a.currentCycle === 4).length;
  const cycleStats = {
      pending: gameState.activeQueue.length - gameState.currentIndex,
      correct: gameState.currentIndex
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col min-h-[calc(100vh-80px)]">
      <GameHeader
        listName={list.name}
        currentIndex={gameState.currentIndex}
        queueLength={gameState.activeQueue.length}
        cycle4Count={cycle4Count}
        gameMode={list.settings.mode}
        onBack={onBack}
        onSettingsClick={() => setShowSettings(true)}
      />

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 w-full flex flex-col items-center">
          <div className="w-full max-w-2xl flex justify-between items-center mb-2 px-4">
              <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Pendientes:</span>
                  <span className="text-sm font-bold text-indigo-600">{cycleStats.pending}</span>
              </div>
              <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Correctas:</span>
                  <span className="text-sm font-bold text-emerald-600">{cycleStats.correct}</span>
              </div>
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
          />
          <GameControls
            onNext={actions.handlePass} // 'Next' in the UI is a 'Pass' action
            onCheckAnswer={actions.checkAnswer}
            onReveal={actions.reveal}
            onCorrect={actions.handleCorrect}
            revealed={isRevealed}
            wasRevealed={isRevealed} // wasRevealed can be mapped to isRevealed now
            gameMode={list.settings.mode}
            isTransitioning={isTransitioning}
          />
        </div>

        <CycleProgress gameState={gameState} />
      </div>

      {showSettings && (
        <SettingsModal
          // The settings modal might need its own state management or simplified props
          // For now, passing what's available and relevant.
          list={list}
          // onUpdateList might be needed if settings can change the list directly
          onClose={() => setShowSettings(false)}
          onRestart={actions.restart}
        />
      )}
    </div>
  );
};
