
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AssociationList, Association, AssociationStatus, GameCycle, GameState } from '../types';
import { calculateSimilarity } from '../utils/similarity';

interface GameViewProps {
  list: AssociationList;
  onUpdateList: (list: AssociationList) => void;
  onBack: () => void;
  showSettings: boolean;
  setShowSettings: (val: boolean) => void;
}

export const GameView: React.FC<GameViewProps> = ({ list, onUpdateList, onBack, showSettings, setShowSettings }) => {
  const [gameState, setGameState] = useState<GameState>({
    listId: list.id,
    currentCycle: 1,
    currentIndex: 0,
    queue: [],
    isFinished: false,
    revealed: false,
    userInput: '',
    wasRevealed: false
  });

  const [associations, setAssociations] = useState<Association[]>(list.associations);

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
      .filter(a => a.status === filter && !a.history)
      .map(a => a.id)
      .sort(() => Math.random() - 0.5);

    if (queue.length === 0 && cycle < 4) {
      startCycle((cycle + 1) as GameCycle, currentAssocs);
      return;
    }

    setGameState(prev => ({
      ...prev,
      currentCycle: cycle,
      currentIndex: 0,
      queue,
      isFinished: queue.length === 0 && cycle === 4,
      revealed: false,
      userInput: '',
      wasRevealed: false
    }));
  }, []);

  useEffect(() => {
    startCycle(1, associations);
  }, [startCycle]);

  const currentAssoc = useMemo(() => 
    associations.find(a => a.id === gameState.queue[gameState.currentIndex]),
    [associations, gameState.queue, gameState.currentIndex]
  );

  const handleNext = () => {
    if (!currentAssoc) return;
    let nextStatus = currentAssoc.status;

    if (gameState.currentCycle === 1) nextStatus = AssociationStatus.DESCUBIERTA;
    else if (gameState.currentCycle === 2) nextStatus = AssociationStatus.RECONOCIDA;
    else if (gameState.currentCycle === 3) nextStatus = AssociationStatus.CONOCIDA;

    advance(nextStatus);
  };

  const handleCorrect = () => {
    if (!currentAssoc || gameState.wasRevealed || gameState.revealed) return;
    if (gameState.currentCycle === 1) {
      advance(AssociationStatus.APRENDIDA);
    } else {
      advance(currentAssoc.status);
    }
  };

  const advance = (nextStatus: AssociationStatus) => {
    const updated = associations.map(a => a.id === currentAssoc?.id ? { ...a, status: nextStatus } : a);
    setAssociations(updated);
    
    if (gameState.currentIndex < gameState.queue.length - 1) {
      setGameState(prev => ({ ...prev, currentIndex: prev.currentIndex + 1, revealed: false, wasRevealed: false }));
    } else {
      onUpdateList({ ...list, associations: updated });
      if (gameState.currentCycle < 4) {
        startCycle((gameState.currentCycle + 1) as GameCycle, updated);
      } else {
        setGameState(prev => ({ ...prev, isFinished: true }));
      }
    }
  };

  if (gameState.isFinished) return (
    <div className="max-w-md mx-auto mt-20 p-10 bg-white rounded-[3rem] shadow-2xl text-center border border-slate-100">
      <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
      </div>
      <h2 className="text-3xl font-black text-slate-900 mb-2">¡Completado!</h2>
      <p className="text-slate-500 mb-8">Has repasado todas las asociaciones de esta sesión.</p>
      <div className="flex flex-col gap-3">
        <button onClick={() => {
           const reset = associations.map(a => ({ ...a, status: AssociationStatus.DESCONOCIDA }));
           setAssociations(reset);
           startCycle(1, reset);
        }} className="bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-100 active:scale-95 transition">Reiniciar todo</button>
        <button onClick={onBack} className="text-slate-400 font-bold py-2 hover:text-slate-600 transition">Volver al Dashboard</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-8">
        <div className="flex gap-2 items-center">
          {[1,2,3,4].map(c => (
            <div key={c} className={`w-3 h-3 rounded-full transition-all duration-500 ${gameState.currentCycle >= c ? 'bg-indigo-600 scale-125' : 'bg-slate-200'}`}></div>
          ))}
          <span className="ml-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Etapa {gameState.currentCycle}</span>
        </div>
        <span className="bg-white px-3 py-1 rounded-full border border-slate-100 text-[10px] font-black text-indigo-600 uppercase tracking-widest shadow-sm">
          {gameState.currentIndex + 1} / {gameState.queue.length}
        </span>
      </div>

      <div className="w-full bg-white rounded-[3rem] shadow-2xl border-4 border-white p-12 text-center relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600/5"></div>
        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] block mb-2">{list.concept}</span>
        <h2 className="text-5xl font-black text-slate-900 mb-10 break-words">{currentAssoc?.term}</h2>
        
        <div className="min-h-[100px] flex items-center justify-center">
          {gameState.revealed ? (
            <div className="animate-in fade-in zoom-in slide-in-from-bottom-2 duration-300">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Asociación:</span>
              <p className="text-3xl font-black text-indigo-600 bg-indigo-50 px-8 py-3 rounded-2xl border border-indigo-100 inline-block">
                {currentAssoc?.definition}
              </p>
            </div>
          ) : (
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="w-6 h-10 bg-slate-100 rounded-lg animate-pulse border-2 border-slate-50 shadow-inner flex items-center justify-center text-slate-200 font-black text-xs">?</div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-10 left-0 right-0 px-6 flex justify-center pointer-events-none">
        <div className="max-w-2xl w-full grid grid-cols-3 gap-4 pointer-events-auto">
          <button onClick={handleNext} className="bg-white border-2 border-slate-200 text-slate-600 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition hover:bg-slate-50">Siguiente</button>
          <button onClick={() => setGameState(p => ({...p, revealed: !p.revealed, wasRevealed: true}))} className={`h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition ${gameState.revealed ? 'bg-indigo-200 text-indigo-900 border-2 border-indigo-300' : 'bg-indigo-50 text-indigo-700'}`}>
            {gameState.revealed ? 'Ocultar' : 'Revelar'}
          </button>
          <button onClick={handleCorrect} disabled={gameState.wasRevealed || gameState.revealed} className={`h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition flex items-center justify-center gap-2 ${gameState.wasRevealed || gameState.revealed ? 'bg-slate-100 text-slate-300' : 'bg-indigo-600 text-white shadow-indigo-100'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
            Correcta
          </button>
        </div>
      </div>
    </div>
  );
};
