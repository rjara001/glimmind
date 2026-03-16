
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
    actions 
  } = useGameLogic({ list });

  const handleArchiveLearnedCards = async () => {
    if (!summary || summary.learned === 0) {
      onBack();
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
      try {
        await onUpdateAssociations(updatedAssociations);
      } catch (error) {
        console.error("Error passing updated associations to parent:", error);
      }
    }
    onBack();
  };

  const handleFullRestart = async () => {
    const resetAssociations = list.associations.map(assoc => ({ ...assoc, isArchived: false, isLearned: false, currentCycle: 1, status: 'pending' as const }));
    try {
      await onUpdateAssociations(resetAssociations);
      actions.restart();
    } catch (error) {
      console.error("Error during full restart:", error);
    }
  };

  const isReversed = list.settings.flipOrder === 'reversed';
  const isTransitioning = feedback === 'correct';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ignorar atajos si el modal de configuración está abierto o el juego terminó o no hay tarjeta
      if (showSettings || gameState.isFinished || !currentAssociation) return;

      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // 2. Manejo cuando hay un mensaje de transición en pantalla (correcto/incorrecto)
      if (feedback !== 'none') {
        // En un intento correcto, Enter sirve para avanzar a la siguiente tarjeta inmediatamente
        if (e.key === 'Enter' && feedback === 'correct') {
          e.preventDefault();
          actions.handleCorrect();
        }
        return; // Durante feedback, bloqueamos las demás teclas
      }

      // 3. Flujo normal (sin feedback en pantalla)
      if (!isTyping) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          // Modos de juego
          if (list.settings.mode === 'training') {
             // En Training: Enter/Espacio siempre revela o pasa.
             if (!isRevealed) actions.reveal();
             else actions.handlePass();
          } else {
             // En Examen (Real mode):
             // Si la tarjeta no está revelada y NO estamos escribiendo (foco en otro lado),
             // no hacemos validación automática con Espacio/Enter para evitar pasar/revelar sin querer;
             // a menos que esté revelada.
             if (isRevealed) {
                actions.handlePass();
             }
          }
        }
        return;
      }

      // 4. Escribiendo (foco en el Input de GameCard en modo Real)
      if (isTyping && e.key === 'Enter') {
        e.preventDefault();
        actions.checkAnswer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.isFinished, showSettings, list.settings.mode, isRevealed, actions, currentAssociation, feedback]);

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
  const cycleStats = { pending: gameState.activeQueue.length - gameState.currentIndex, correct: gameState.currentIndex };
  const cycleColorName = cycleColorMap[gameState.globalCycle as GameCycle] || 'slate';
  const cycle4Count = gameState.associations.filter(a => a.currentCycle === 4).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col min-h-[calc(100vh-80px)]">
      <GameHeader listName={list.name} currentIndex={gameState.currentIndex} queueLength={gameState.activeQueue.length} cycle4Count={cycle4Count} gameMode={list.settings.mode} onBack={onBack} onSettingsClick={() => setShowSettings(true)} />
      <div className={`flex flex-col lg:flex-row gap-6 items-start transition-colors duration-500`}>
        <div className="flex-1 w-full flex flex-col items-center">
          <div className="w-full max-w-2xl flex justify-between items-center mb-2 px-4">
            <div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-500">Pendientes:</span><span className={`text-sm font-bold text-${cycleColorName}-600`}>{cycleStats.pending}</span></div>
            <div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-500">Correctas:</span><span className={`text-sm font-bold text-emerald-600`}>{cycleStats.correct}</span></div>
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
            feedback={feedback} 
            cycleColorName={cycleColorName}
            similarity={similarity}
            lastAttempt={lastAttempt}
            onNextCard={actions.handleCorrect}
          />
          <GameControls onNext={actions.handlePass} onCheckAnswer={actions.checkAnswer} onReveal={actions.reveal} onCorrect={actions.handleCorrect} revealed={isRevealed} wasRevealed={isRevealed} gameMode={list.settings.mode} isTransitioning={isTransitioning} />
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
