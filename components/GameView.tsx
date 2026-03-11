
import React, { useState, useEffect, useRef } from 'react';
import { AssociationList, AssociationStatus } from '../types';
import { useGameEngine } from '../hooks/useGameEngine';
import { GameHeader } from './game/GameHeader';
import { GameCard } from './game/GameCard';
import { GameControls } from './game/GameControls';
import { CycleProgress } from './game/CycleProgress';
import { FinishedScreen } from './game/FinishedScreen';
import { SettingsModal } from './game/SettingsModal';

interface GameViewProps {
  list: AssociationList;
  onUpdateList: (list: AssociationList) => void;
  onBack: () => void;
  showSettings: boolean;
  setShowSettings: (val: boolean) => void;
}

export const GameView: React.FC<GameViewProps> = ({ list, onUpdateList, onBack, showSettings, setShowSettings }) => {
  const {
    gameState,
    setGameState,
    associations,
    feedback,
    stageCounts,
    currentAssoc,
    checkAnswer,
    handleCorrect,
    handleNext,
    restart,
    setAssociations,
    startCycle
  } = useGameEngine(list, onUpdateList);

  const isReversed = list.settings.flipOrder === 'reversed';
  const displayTerm = isReversed ? currentAssoc?.definition : currentAssoc?.term;
  const displayDef = isReversed ? currentAssoc?.term : currentAssoc?.definition;
  
  const conceptParts = list.concept.split('/');
  const labelTerm = isReversed ? (conceptParts[1] || 'Definición') : (conceptParts[0] || 'Término');
  const labelDef = isReversed ? (conceptParts[0] || 'Término') : (conceptParts[1] || 'Definición');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSettings || gameState.isFinished) return;
      
      if (list.settings.mode === 'real' && !gameState.revealed && feedback === 'none') {
        if (e.key === 'Enter') checkAnswer(displayDef || '');
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!gameState.revealed) {
          setGameState(p => ({ ...p, revealed: true, wasRevealed: true }));
        } else {
          handleNext();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.revealed, gameState.userInput, showSettings, gameState.isFinished, list.settings.mode, feedback, displayDef, checkAnswer, handleNext, setGameState]);

  const handleRestart = () => {
    const reset = associations.map(a => ({ ...a, status: AssociationStatus.DESCONOCIDA }));
    setAssociations(reset);
    onUpdateList({ ...list, associations: reset, resumeState: undefined });
    startCycle(1, reset);
  }

  if (gameState.isFinished) {
    return <FinishedScreen onRestart={restart} onBack={onBack} />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col min-h-[calc(100vh-80px)]">
      <GameHeader
        listName={list.name}
        currentIndex={gameState.currentIndex}
        queueLength={gameState.queue.length}
        knownCount={stageCounts.known}
        gameMode={list.settings.mode}
        onBack={onBack}
      />

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 w-full flex flex-col items-center">
          <GameCard
            displayTerm={displayTerm}
            displayDef={displayDef}
            labelTerm={labelTerm}
            labelDef={labelDef}
            revealed={gameState.revealed}
            isPracticeMode={list.settings.mode === 'training'}
            userInput={gameState.userInput}
            onUserInput={(value) => setGameState(p => ({ ...p, userInput: value }))}
            onCheckAnswer={() => checkAnswer(displayDef || '')}
            feedback={feedback}
          />
          <GameControls
            onNext={handleNext}
            onCheckAnswer={() => checkAnswer(displayDef || '')}
            onReveal={() => setGameState(p => ({...p, revealed: !p.revealed, wasRevealed: true}))}
            onCorrect={handleCorrect}
            revealed={gameState.revealed}
            wasRevealed={gameState.wasRevealed}
            gameMode={list.settings.mode}
          />
        </div>

        <CycleProgress
          stageCounts={stageCounts}
          associationsLength={associations.length}
          currentCycle={gameState.currentCycle}
        />
      </div>

      {showSettings && (
        <SettingsModal
          list={list}
          onUpdateList={onUpdateList}
          onClose={() => setShowSettings(false)}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
};
