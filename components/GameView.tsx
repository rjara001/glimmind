
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AssociationList, Association, AssociationStatus, GameCycle, GameState } from '../types';

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
      wasRevealed: false
    };

    setGameState(newState);
    
    // Guardar el inicio del nuevo ciclo
    onUpdateList({
      ...list,
      associations: currentAssocs,
      resumeState: { cycle, queue, index: 0 }
    });
  }, [onUpdateList, list]);

  // Inicialización inteligente
  useEffect(() => {
    if (list.resumeState && list.resumeState.queue.length > 0) {
      // Reanudando sesión existente
      setGameState(prev => ({
        ...prev,
        currentCycle: list.resumeState!.cycle,
        queue: list.resumeState!.queue,
        currentIndex: list.resumeState!.index
      }));
    } else {
      // Nueva sesión
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
        wasRevealed: false 
      }));

      // PERSISTENCIA INMEDIATA: Guardar el progreso de la fila actual
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
      // Fin del ciclo
      if (gameState.currentCycle < 4) {
        startCycle((gameState.currentCycle + 1) as GameCycle, updatedAssocs);
      } else {
        setGameState(prev => ({ ...prev, isFinished: true }));
        // Limpiar estado de reanudación al terminar
        onUpdateList({
          ...list,
          associations: updatedAssocs,
          resumeState: undefined
        });
      }
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
    advance(nextStatus);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSettings || gameState.isFinished) return;
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
  }, [gameState.revealed, showSettings, gameState.isFinished]);

  if (gameState.isFinished) return (
    <div className="max-w-md mx-auto mt-20 p-10 bg-white rounded-[3rem] shadow-2xl text-center border border-slate-100 animate-in zoom-in-95 duration-500">
      <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
      </div>
      <h2 className="text-3xl font-black text-slate-900 mb-2">¡Sesión Lista!</h2>
      <p className="text-slate-500 mb-8 font-medium">Has fortalecido {gameState.queue.length} conexiones hoy.</p>
      <div className="flex flex-col gap-3">
        <button onClick={() => {
           const reset = associations.map(a => ({ ...a, status: AssociationStatus.DESCONOCIDA }));
           setAssociations(reset);
           startCycle(1, reset);
        }} className="bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition">Estudiar de nuevo</button>
        <button onClick={onBack} className="text-slate-400 font-bold py-2 hover:text-indigo-600 transition text-sm">Regresar al Panel</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col items-center">
      {/* Indicador de Etapas Sofisticado */}
      <div className="w-full mb-12">
        <div className="relative flex justify-between items-center max-w-2xl mx-auto">
          {/* Línea de fondo */}
          <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 rounded-full"></div>
          {/* Línea de progreso activa */}
          <div 
            className="absolute top-1/2 left-0 h-1 bg-indigo-600 -translate-y-1/2 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${((gameState.currentCycle - 1) / 3) * 100}%` }}
          ></div>

          {[1, 2, 3, 4].map((c) => (
            <div key={c} className="relative z-10 flex flex-col items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
                  gameState.currentCycle > c 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                    : gameState.currentCycle === c 
                      ? 'bg-white border-indigo-600 scale-125 shadow-xl shadow-indigo-100 ring-4 ring-indigo-50' 
                      : 'bg-white border-slate-100 text-slate-300'
                }`}
              >
                {gameState.currentCycle > c ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                ) : (
                  <span className="text-[10px] font-black">{c}</span>
                )}
              </div>
              <span className={`absolute -bottom-7 whitespace-nowrap text-[9px] font-black uppercase tracking-tighter transition-colors duration-300 ${
                gameState.currentCycle === c ? 'text-indigo-600' : 'text-slate-400'
              }`}>
                {STAGE_NAMES[c-1]}
              </span>
            </div>
          ))}
        </div>
        
        <div className="mt-14 flex justify-center">
           <span className="bg-indigo-50 px-4 py-1.5 rounded-full text-[10px] font-black text-indigo-600 uppercase tracking-widest border border-indigo-100 shadow-sm animate-pulse">
            Progreso: {gameState.currentIndex + 1} de {gameState.queue.length}
          </span>
        </div>
      </div>

      {/* Carta de Juego */}
      <div className="w-full bg-white rounded-[3.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.1)] border-4 border-white p-12 text-center relative overflow-hidden group min-h-[420px] flex flex-col justify-center transition-all hover:shadow-[0_30px_60px_rgba(79,70,229,0.15)]">
        <div className="absolute top-0 left-0 w-full h-3 bg-indigo-600/10"></div>
        <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em] block mb-3">{list.concept.split('/')[0] || 'Término'}</span>
        <h2 className="text-5xl md:text-7xl font-black text-slate-900 mb-12 break-words leading-tight tracking-tight">{currentAssoc?.term}</h2>
        
        <div className="min-h-[140px] flex items-center justify-center">
          {gameState.revealed ? (
            <div className="animate-in fade-in zoom-in slide-in-from-bottom-4 duration-500 text-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">{list.concept.split('/')[1] || 'Definición'}</span>
              <p className="text-4xl font-black text-indigo-600 bg-indigo-50/50 px-10 py-4 rounded-[2rem] border-2 border-indigo-100/50 inline-block shadow-inner">
                {currentAssoc?.definition}
              </p>
            </div>
          ) : (
            <div className="flex gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-10 h-16 bg-slate-50 rounded-2xl animate-pulse border-2 border-slate-100 flex items-center justify-center text-slate-200 font-black text-2xl shadow-sm">?</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Controles Flotantes */}
      <div className="fixed bottom-10 left-0 right-0 px-6 flex justify-center pointer-events-none">
        <div className="max-w-xl w-full grid grid-cols-3 gap-5 pointer-events-auto bg-white/80 backdrop-blur-2xl p-5 rounded-[2.5rem] border border-white shadow-[0_30px_100px_rgba(0,0,0,0.1)]">
          <button onClick={handleNext} className="bg-slate-50 border-2 border-slate-100 text-slate-600 h-16 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-sm active:scale-90 transition-all hover:bg-white hover:border-indigo-100 hover:text-indigo-600">Pasar</button>
          <button onClick={() => setGameState(p => ({...p, revealed: !p.revealed, wasRevealed: true}))} className={`h-16 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-md active:scale-90 transition-all flex flex-col items-center justify-center ${gameState.revealed ? 'bg-indigo-100 text-indigo-800' : 'bg-white text-indigo-600 border-2 border-indigo-50'}`}>
            <span>{gameState.revealed ? 'Ocultar' : 'Revelar'}</span>
            <span className="text-[8px] opacity-40 font-bold mt-1 tracking-normal">[ESPACIO]</span>
          </button>
          <button onClick={handleCorrect} disabled={gameState.wasRevealed || gameState.revealed} className={`h-16 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg active:scale-90 transition-all flex items-center justify-center gap-2 ${gameState.wasRevealed || gameState.revealed ? 'bg-slate-100 text-slate-300' : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7"/></svg>
            Correcta
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200 border border-white">
            <h3 className="text-3xl font-black text-slate-900 mb-8 tracking-tighter">Opciones</h3>
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
              className="w-full bg-rose-50 text-rose-600 py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest hover:bg-rose-100 transition active:scale-95 mb-4"
            >
              Reiniciar Lista
            </button>
            <button 
              onClick={() => setShowSettings(false)}
              className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest hover:bg-slate-800 transition active:scale-95 shadow-xl shadow-slate-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
