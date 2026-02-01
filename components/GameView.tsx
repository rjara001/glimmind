
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AssociationList, Association, AssociationStatus, GameCycle, GameState } from '../types';
import { calculateSimilarity } from '../utils/similarity';

interface GameViewProps {
  list: AssociationList;
  onUpdateList: (list: AssociationList) => void;
  onBack: () => void;
  showSettings: boolean;
  setShowSettings: (val: boolean) => void;
}

const STAGE_NAMES = [
  "Introducción",
  "Descubrimiento",
  "Reconocimiento",
  "Maestría"
];

export const GameView: React.FC<GameViewProps> = ({ list, onUpdateList, onBack, showSettings, setShowSettings }) => {
  const inputRef = useRef<HTMLInputElement>(null);
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

  const stageCounts = useMemo(() => {
    return {
      1: associations.filter(a => a.status === AssociationStatus.DESCONOCIDA).length,
      2: associations.filter(a => a.status === AssociationStatus.DESCUBIERTA).length,
      3: associations.filter(a => a.status === AssociationStatus.RECONOCIDA).length,
      4: associations.filter(a => a.status === AssociationStatus.CONOCIDA).length,
      learned: associations.filter(a => a.status === AssociationStatus.APRENDIDA).length
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

  const isReversed = list.settings.flipOrder === 'reversed';
  const displayTerm = isReversed ? currentAssoc?.definition : currentAssoc?.term;
  const displayDef = isReversed ? currentAssoc?.term : currentAssoc?.definition;
  
  const conceptParts = list.concept.split('/');
  const labelTerm = isReversed ? (conceptParts[1] || 'Definición') : (conceptParts[0] || 'Término');
  const labelDef = isReversed ? (conceptParts[0] || 'Término') : (conceptParts[1] || 'Definición');

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

  const checkAnswer = () => {
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
    if (!currentAssoc || gameState.wasRevealed || gameState.revealed) return;
    advance(gameState.currentCycle === 1 ? AssociationStatus.APRENDIDA : currentAssoc.status);
  };

  const handleNext = () => {
    if (!currentAssoc) return;
    let nextStatus = currentAssoc.status;
    if (gameState.currentCycle === 1) nextStatus = AssociationStatus.DESCUBIERTA;
    else if (gameState.currentCycle === 2) nextStatus = AssociationStatus.RECONOCIDA;
    else if (gameState.currentCycle === 3) nextStatus = AssociationStatus.CONOCIDA;
    else if (gameState.currentCycle === 4) nextStatus = AssociationStatus.APRENDIDA;
    advance(nextStatus);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSettings || gameState.isFinished) return;
      
      if (list.settings.mode === 'real' && !gameState.revealed && feedback === 'none') {
        if (e.key === 'Enter') checkAnswer();
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
  }, [gameState.revealed, gameState.userInput, showSettings, gameState.isFinished, list.settings.mode, feedback]);

  useEffect(() => {
    if (list.settings.mode === 'real' && !gameState.revealed && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState.currentIndex, gameState.revealed, list.settings.mode]);

  if (gameState.isFinished) return (
    <div className="max-w-md mx-auto mt-20 p-10 bg-white rounded-[3rem] shadow-2xl text-center border border-slate-100 animate-in zoom-in-95 duration-500">
      <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
      </div>
      <h2 className="text-3xl font-black text-slate-900 mb-2">¡Sesión Lista!</h2>
      <p className="text-slate-500 mb-8 font-medium">Has fortalecido todas las conexiones de esta lista.</p>
      <div className="flex flex-col gap-3">
        <button onClick={() => {
           const reset = associations.map(a => ({ ...a, status: AssociationStatus.DESCONOCIDA }));
           setAssociations(reset);
           startCycle(1, reset);
        }} className="bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition">Reiniciar Aprendizaje</button>
        <button onClick={onBack} className="text-slate-400 font-bold py-2 hover:text-indigo-600 transition text-sm">Regresar al Panel</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col items-center">
      <div className="w-full mb-12">
        <div className="relative flex justify-between items-center max-w-2xl mx-auto">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 rounded-full"></div>
          <div 
            className="absolute top-1/2 left-0 h-1 bg-indigo-600 -translate-y-1/2 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${((gameState.currentCycle - 1) / 3) * 100}%` }}
          ></div>

          {[1, 2, 3, 4].map((c) => {
            const count = stageCounts[c as keyof typeof stageCounts];
            const isActive = gameState.currentCycle === c;
            const isCompleted = gameState.currentCycle > c;

            return (
              <div key={c} className="relative z-10 flex flex-col items-center">
                <div 
                  className={`w-10 h-10 rounded-full flex flex-col items-center justify-center border-4 transition-all duration-500 ${
                    isCompleted 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                      : isActive 
                        ? 'bg-white border-indigo-600 scale-110 shadow-xl shadow-indigo-100 ring-4 ring-indigo-50' 
                        : 'bg-white border-slate-100 text-slate-300'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                  ) : (
                    <span className="text-[11px] font-black">{count}</span>
                  )}
                </div>
                <div className="absolute -bottom-8 flex flex-col items-center whitespace-nowrap">
                   <span className={`text-[9px] font-black uppercase tracking-tighter transition-colors duration-300 ${
                    isActive ? 'text-indigo-600' : 'text-slate-400'
                  }`}>
                    {STAGE_NAMES[c-1]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-16 flex justify-center gap-4">
           <span className="bg-indigo-50 px-4 py-1.5 rounded-full text-[10px] font-black text-indigo-600 uppercase tracking-widest border border-indigo-100 shadow-sm">
            Fila: {gameState.currentIndex + 1} / {gameState.queue.length}
          </span>
          <span className="bg-emerald-50 px-4 py-1.5 rounded-full text-[10px] font-black text-emerald-600 uppercase tracking-widest border border-emerald-100 shadow-sm">
            Aprendidas: {stageCounts.learned}
          </span>
          <span className="bg-slate-100 px-4 py-1.5 rounded-full text-[10px] font-black text-slate-600 uppercase tracking-widest border border-slate-200 shadow-sm">
            Modo: {list.settings.mode === 'real' ? 'Real (Escrito)' : 'Práctica'}
          </span>
        </div>
      </div>

      <div className={`w-full bg-white rounded-[3.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.1)] border-4 border-white p-12 text-center relative overflow-hidden group min-h-[420px] flex flex-col justify-center transition-all ${feedback === 'correct' ? 'ring-8 ring-emerald-400' : feedback === 'incorrect' ? 'ring-8 ring-rose-400' : ''}`}>
        <div className="absolute top-0 left-0 w-full h-3 bg-indigo-600/10"></div>
        <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em] block mb-3">{labelTerm}</span>
        <h2 className="text-5xl md:text-7xl font-black text-slate-900 mb-12 break-words leading-tight tracking-tight">{displayTerm}</h2>
        
        <div className="min-h-[140px] flex flex-col items-center justify-center gap-6">
          {list.settings.mode === 'real' && !gameState.revealed ? (
            <div className="w-full max-w-md animate-in slide-in-from-bottom-2 duration-300">
               <input
                 ref={inputRef}
                 type="text"
                 autoFocus
                 value={gameState.userInput}
                 onChange={(e) => setGameState(p => ({ ...p, userInput: e.target.value }))}
                 onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
                 placeholder={`Escribe aquí el/la ${labelDef.toLowerCase()}...`}
                 className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-xl font-bold text-slate-800 placeholder-slate-300 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-center"
               />
               <p className="mt-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Presiona ENTER para validar</p>
            </div>
          ) : (
            <>
              {gameState.revealed ? (
                <div className="animate-in fade-in zoom-in slide-in-from-bottom-4 duration-500 text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">{labelDef}</span>
                  <p className="text-4xl font-black text-indigo-600 bg-indigo-50/50 px-10 py-4 rounded-[2rem] border-2 border-indigo-100/50 inline-block shadow-inner">
                    {displayDef}
                  </p>
                </div>
              ) : (
                <div className="flex gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-10 h-16 bg-slate-50 rounded-2xl animate-pulse border-2 border-slate-100 flex items-center justify-center text-slate-200 font-black text-2xl shadow-sm">?</div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="fixed bottom-10 left-0 right-0 px-6 flex justify-center pointer-events-none z-[60]">
        <div className="max-w-xl w-full grid grid-cols-3 gap-5 pointer-events-auto bg-white/90 backdrop-blur-2xl p-5 rounded-[2.5rem] border border-white shadow-[0_30px_100px_rgba(0,0,0,0.1)]">
          <button onClick={handleNext} className="bg-slate-50 border-2 border-slate-100 text-slate-600 h-16 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-sm active:scale-90 transition-all hover:bg-white hover:border-indigo-100 hover:text-indigo-600">Pasar</button>
          
          <button 
            onClick={() => {
              if (list.settings.mode === 'real' && !gameState.revealed) {
                checkAnswer();
              } else {
                setGameState(p => ({...p, revealed: !p.revealed, wasRevealed: true}));
              }
            }} 
            className={`h-16 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-md active:scale-90 transition-all flex flex-col items-center justify-center ${gameState.revealed ? 'bg-indigo-100 text-indigo-800 border-2 border-indigo-200' : 'bg-white text-indigo-600 border-2 border-indigo-50'}`}
          >
            <span>{list.settings.mode === 'real' && !gameState.revealed ? 'Validar' : gameState.revealed ? 'Ocultar' : 'Revelar'}</span>
            <span className="text-[8px] opacity-40 font-bold mt-1 tracking-normal">[ENTER]</span>
          </button>

          <button onClick={handleCorrect} disabled={gameState.wasRevealed || gameState.revealed || list.settings.mode === 'real'} className={`h-16 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg active:scale-90 transition-all flex items-center justify-center gap-2 ${gameState.wasRevealed || gameState.revealed || list.settings.mode === 'real' ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7"/></svg>
            Correcta
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200 border border-white">
            <h3 className="text-3xl font-black text-slate-900 mb-8 tracking-tighter">Configuración</h3>
            
            <div className="space-y-4 mb-8">
              {/* Selector de Modo */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Modo de Juego</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => onUpdateList({ ...list, settings: { ...list.settings, mode: 'training' } })}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${list.settings.mode === 'training' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
                  >
                    Práctica
                  </button>
                  <button 
                    onClick={() => onUpdateList({ ...list, settings: { ...list.settings, mode: 'real' } })}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${list.settings.mode === 'real' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
                  >
                    Real
                  </button>
                </div>
              </div>

              {/* Invertir Caras */}
              <button 
                onClick={() => onUpdateList({ ...list, settings: { ...list.settings, flipOrder: isReversed ? 'normal' : 'reversed' } })}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all shadow-sm ${isReversed ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                  <span className="text-xs font-bold">Invertir Caras</span>
                </div>
                <div className={`w-10 h-6 rounded-full relative transition-colors ${isReversed ? 'bg-indigo-400' : 'bg-slate-200'}`}>
                   <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isReversed ? 'left-5' : 'left-1'}`}></div>
                </div>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  if(confirm('¿Reiniciar todo el progreso de esta lista?')) {
                     const reset = associations.map(a => ({ ...a, status: AssociationStatus.DESCONOCIDA }));
                     setAssociations(reset);
                     onUpdateList({ ...list, associations: reset, resumeState: undefined });
                     startCycle(1, reset);
                     setShowSettings(false);
                  }
                }}
                className="w-full bg-rose-50 text-rose-600 py-4 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-rose-100 transition active:scale-95"
              >
                Reiniciar Lista
              </button>
              <button 
                onClick={() => setShowSettings(false)}
                className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-slate-800 transition active:scale-95 shadow-xl shadow-slate-200"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
