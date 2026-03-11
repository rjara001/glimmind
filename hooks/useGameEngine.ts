
import { useState, useEffect, useMemo, useCallback } from 'react';
import { AssociationList, Association, AssociationStatus, GameCycle, GameState, StageCounts } from '../types';
import { calculateSimilarity } from '../utils/similarity';

export const useGameEngine = (list: AssociationList, onUpdateList: (list: AssociationList) => void) => {
  const [gameState, setGameState] = useState<GameState>({
    listId: list.id,
    currentCycle: list.resumeState?.cycle || 1,
    currentIndex: list.resumeState?.index || 0,
    queue: list.resumeState?.queue || [],
    isFinished: false,
    revealed: false,
    userInput: '',
    wasRevealed: false
  });

  const [associations, setAssociations] = useState<Association[]>(list.associations);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');

  const stageCounts: StageCounts = useMemo(() => {
    return {
      unknown: associations.filter(a => a.status === AssociationStatus.DESCONOCIDA).length,
      discovered: associations.filter(a => a.status === AssociationStatus.DESCUBIERTA).length,
      recognized: associations.filter(a => a.status === AssociationStatus.RECONOCIDA).length,
      known: associations.filter(a => a.status === AssociationStatus.CONOCIDA).length
    };
  }, [associations]);

  const startCycle = useCallback((cycle: GameCycle, currentAssocs: Association[]) => {
    let filter: AssociationStatus;
    switch(cycle) {
      case 1: filter = AssociationStatus.DESCONOCIDA; break;
      case 2: filter = AssociationStatus.DESCUBIERTA; break;
      case 3: filter = AssociationStatus.RECONOCIDA; break;
      case 4: filter = AssociationStatus.CONOCIDA; break;
      default: filter = AssociationStatus.DESCONOCIDA;
    }

    const queue = currentAssocs
      .filter(a => a.status === filter)
      .map(a => a.id)
      .sort(() => Math.random() - 0.5);

    if (queue.length === 0 && cycle < 4) {
      startCycle((cycle + 1) as GameCycle, currentAssocs);
      return;
    }

    const newState = {
      ...gameState,
      currentCycle: cycle,
      currentIndex: 0,
      queue,
      isFinished: queue.length === 0 && cycle === 4,
      revealed: false,
      wasRevealed: false,
      userInput: ''
    };

    setGameState(newState);
    setFeedback('none');
    
    onUpdateList({
      ...list,
      associations: currentAssocs,
      resumeState: { cycle, queue, index: 0 }
    });
  }, [onUpdateList, list, gameState]);

  useEffect(() => {
    if (list.resumeState && list.resumeState.queue.length > 0) {
      setGameState(prev => ({
        ...prev,
        currentCycle: list.resumeState!.cycle,
        queue: list.resumeState!.queue,
        currentIndex: list.resumeState!.index
      }));
    } else {
      startCycle(1, associations);
    }
  }, []);

  const currentAssoc = useMemo(() => 
    associations.find(a => a.id === gameState.queue[gameState.currentIndex]),
    [associations, gameState.queue, gameState.currentIndex]
  );

  const advance = (nextStatus: AssociationStatus) => {
    if (!currentAssoc) return;
    
    const updatedAssocs = associations.map(a => a.id === currentAssoc.id ? { ...a, status: nextStatus } : a);
    setAssociations(updatedAssocs);
    
    if (gameState.currentIndex < gameState.queue.length - 1) {
      const nextIndex = gameState.currentIndex + 1;
      setGameState(prev => ({ 
        ...prev, 
        currentIndex: nextIndex, 
        revealed: false, 
        wasRevealed: false,
        userInput: ''
      }));
      setFeedback('none');

      onUpdateList({
        ...list,
        associations: updatedAssocs,
        resumeState: {
          cycle: gameState.currentCycle,
          queue: gameState.queue,
          index: nextIndex
        }
      });
    } else {
      if (gameState.currentCycle < 4) {
        startCycle((gameState.currentCycle + 1) as GameCycle, updatedAssocs);
      } else {
        setGameState(prev => ({ ...prev, isFinished: true }));
        onUpdateList({
          ...list,
          associations: updatedAssocs,
          resumeState: undefined
        });
      }
    }
  };

  const checkAnswer = (displayDef: string) => {
    if (!displayDef || !gameState.userInput) return;
    
    const similarity = calculateSimilarity(gameState.userInput, displayDef);
    const isCorrect = similarity >= (list.settings.threshold || 0.9);
    
    if (isCorrect) {
      setFeedback('correct');
      setTimeout(() => handleNext(), 600);
    } else {
      setFeedback('incorrect');
      setGameState(p => ({ ...p, revealed: true, wasRevealed: true }));
    }
  };

  const handleCorrect = () => {
    if (!currentAssoc) return;
    advance(gameState.currentCycle === 1 ? AssociationStatus.CONOCIDA : currentAssoc.status);
  };

  const handleNext = () => {
    if (!currentAssoc) return;
    let nextStatus = currentAssoc.status;
    if (gameState.currentCycle === 1) nextStatus = AssociationStatus.DESCUBIERTA;
    else if (gameState.currentCycle === 2) nextStatus = AssociationStatus.RECONOCIDA;
    else if (gameState.currentCycle === 3) nextStatus = AssociationStatus.CONOCIDA;
    advance(nextStatus);
  };

  const restart = () => {
    const reset = associations.map(a => ({ ...a, status: AssociationStatus.DESCONOCIDA }));
    setAssociations(reset);
    startCycle(1, reset);
  }

  return {
    gameState,
    setGameState,
    associations,
    feedback,
    setFeedback,
    stageCounts,
    currentAssoc,
    advance,
    checkAnswer,
    handleCorrect,
    handleNext,
    restart,
    startCycle,
    setAssociations
  };
};
