
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AssociationList, Association, AssociationStatus, GameCycle, GameState, FlipOrder, GameMode } from '../types';
import { calculateSimilarity } from '../utils/similarity';

interface GameViewProps {
  list: AssociationList;
  onUpdateList: (list: AssociationList) => void;
  onBack: () => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
}

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
  id: number;
}

export const GameView: React.FC<GameViewProps> = ({ list, onUpdateList, onBack, showSettings, setShowSettings }) => {
  const [associations, setAssociations] = useState<Association[]>(list.associations);
  const [gameState, setGameState] = useState<GameState>({
    listId: list.id,
    currentCycle: 1,
    currentIndex: 0,
    queue: [],
    history: [],
    isFinished: false,
    revealed: false,
    userInput: '',
    lastMatchScore: null,
    wasRevealed: false
  });

  const [lastAttempt, setLastAttempt] = useState<{ text: string; status: 'success' | 'error' | 'none' }>({ 
    text: '', 
    status: 'none' 
  });

  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const focusInput = useCallback(() => {
    if (list.settings.mode === 'real' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [list.settings.mode]);

  useEffect(() => {
    focusInput();
  }, [gameState.currentIndex, gameState.currentCycle, focusInput]);

  const startCycle = useCallback((cycle: GameCycle, currentAssocs: Association[]) => {
    let targetStatus: AssociationStatus;
    switch (cycle) {
      case 1: targetStatus = AssociationStatus.DESCONOCIDA; break;
      case 2: targetStatus = AssociationStatus.DESCUBIERTA; break;
      case 3: targetStatus = AssociationStatus.RECONOCIDA; break;
      case 4: targetStatus = AssociationStatus.CONOCIDA; break;
      default: targetStatus = AssociationStatus.DESCONOCIDA;
    }

    const availableIds = currentAssocs
      .filter(a => a.status === targetStatus && !a.history)
      .map(a => a.id);
    
    const shuffled = [...availableIds].sort(() => Math.random() - 0.5);

    if (shuffled.length === 0 && cycle < 4) {
      startCycle((cycle + 1) as GameCycle, currentAssocs);
      return;
    }

    const allLearned = currentAssocs.every(a => a.status === AssociationStatus.APRENDIDA || a.history);

    setGameState({
      listId: list.id,
      currentCycle: cycle,
      currentIndex: 0,
      queue: shuffled,
      history: [],
      isFinished: allLearned || (shuffled.length === 0 && cycle === 4),
      revealed: false,
      userInput: '',
      wasRevealed: false,
      lastMatchScore: null
    });
    setLastAttempt({ text: '', status: 'none' });
  }, [list.id]);

  useEffect(() => { 
    startCycle(1, associations); 
  }, []);

  const executeFullReset = () => {
    const resetData = associations.map(a => ({ 
      ...a, 
      status: AssociationStatus.DESCONOCIDA, 
      history: false 
    }));
    setAssociations(resetData);
    setShowConfirmReset(false);
    setShowSettings(false);
    onUpdateList({ ...list, associations: resetData });
    startCycle(1, resetData);
    showNotification("Progreso reiniciado", "info");
  };

  const handleArchiveLearned = () => {
    const learnedCount = associations.filter(a => a.status === AssociationStatus.APRENDIDA && !a.history).length;
    if (learnedCount === 0) {
      showNotification("Nada que archivar aún", "error");
      return;
    }
    const archived = associations.map(a => a.status === AssociationStatus.APRENDIDA ? { ...a, history: true } : a);
    setAssociations(archived);
    onUpdateList({ ...list, associations: archived });
    showNotification("Aprendidas archivadas", "success");
    
    const nextRoundAssocs = archived.map(a => !a.history ? { ...a, status: AssociationStatus.DESCONOCIDA } : a);
    setAssociations(nextRoundAssocs);
    startCycle(1, nextRoundAssocs);
  };

  const handleContinue = () => {
    const reset = associations.map(a => !a.history ? { ...a, status: AssociationStatus.DESCONOCIDA } : a);
    setAssociations(reset);
    onUpdateList({ ...list, associations: reset });
    startCycle(1, reset);
    showNotification("Iniciando nueva ronda", "info");
  };

  const currentAssocId = gameState.queue[gameState.currentIndex];
  const currentAssoc = associations.find(a => a.id === currentAssocId);

  const displayTerm = useMemo(() => {
    if (!currentAssoc) return '';
    return list.settings.flipOrder === 'reversed' ? currentAssoc.definition : currentAssoc.term;
  }, [currentAssoc, list.settings.flipOrder]);

  const targetDefinition = useMemo(() => {
    if (!currentAssoc) return '';
    return list.settings.flipOrder === 'reversed' ? currentAssoc.term : currentAssoc.definition;
  }, [currentAssoc, list.settings.flipOrder]);

  const handlePasar = () => {
    if (!currentAssoc) return;
    let nextStatus = currentAssoc.status;

    if (gameState.currentCycle === 1) nextStatus = AssociationStatus.DESCUBIERTA;
    else if (gameState.currentCycle === 2) nextStatus = AssociationStatus.RECONOCIDA;
    else if (gameState.currentCycle === 3) nextStatus = AssociationStatus.CONOCIDA;

    advance(nextStatus);
  };

  const handleCorrect = () => {
    if (!currentAssoc || gameState.wasRevealed || gameState.revealed) return;
    let nextStatus = currentAssoc.status;
    
    if (gameState.currentCycle === 1) {
      nextStatus = AssociationStatus.APRENDIDA;
    }

    advance(nextStatus);
  };

  const advance = (nextStatus: AssociationStatus) => {
    const updatedAssociations = associations.map(a => a.id === currentAssocId ? { ...a, status: nextStatus } : a);
    setAssociations(updatedAssociations);

    if (gameState.currentIndex < gameState.queue.length - 1) {
      setGameState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        revealed: false,
        userInput: '',
        wasRevealed: false,
        lastMatchScore: null
      }));
      setLastAttempt({ text: '', status: 'none' });
    } else {
      onUpdateList({ ...list, associations: updatedAssociations });
      if (gameState.currentCycle < 4) {
        startCycle((gameState.currentCycle + 1) as GameCycle, updatedAssociations);
      } else {
        setGameState(prev => ({ ...prev, isFinished: true }));
      }
    }
  };

  const checkInput = () => {
    if (gameState.wasRevealed || gameState.revealed) return;
    const score = calculateSimilarity(gameState.userInput, targetDefinition);
    
    if (score >= list.settings.threshold) {
      setLastAttempt({ text: gameState.userInput, status: 'success' });
      showNotification("¡Excelente! Asociación correcta", "success");
      handleCorrect();
    } else {
      setLastAttempt({ text: gameState.userInput, status: 'error' });
      setGameState(prev => ({ ...prev, userInput: '' }));
      showNotification("No es del todo correcto, intenta de nuevo", "error");
      focusInput();
    }
  };

  const stats = useMemo(() => ({
    learned: associations.filter(a => a.status === 'APRENDIDA' && !a.history).length,
    known: associations.filter(a => a.status === 'CONOCIDA' && !a.history).length,
    recognized: associations.filter(a => a.status === 'RECONOCIDA' && !a.history).length,
    discovered: associations.filter(a => a.status === 'DESCUBIERTA' && !a.history).length,
    unknown: associations.filter(a => a.status === 'DESCONOCIDA' && !a.history).length,
  }), [associations]);

  const stagesUI = [
    { label: 'Desc.', cycle: 1, fullLabel: 'Desconocidas', count: stats.unknown },
    { label: 'Descub.', cycle: 2, fullLabel: 'Descubiertas', count: stats.discovered },
    { label: 'Recon.', cycle: 3, fullLabel: 'Reconocidas', count: stats.recognized },
    { label: 'Conoc.', cycle: 4, fullLabel: 'Conocidas', count: stats.known },
  ];

  return (
    <div className="min-h-full relative flex flex-col bg-slate-50 overflow-x-hidden">
      {toast && <ToastNotification key={toast.id} toast={toast} onClose={() => setToast(null)} />}

      {showConfirmReset && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 text-center shadow-2xl">
            <h3 className="text-xl font-black text-slate-900 mb-6 tracking-tight">¿Confirmar reinicio?</h3>
            <div className="flex flex-col gap-2">
              <button onClick={executeFullReset} className="w-full bg-rose-600 text-white py-4 rounded-xl font-black shadow-lg hover:bg-rose-700 active:scale-95 transition uppercase text-[10px] tracking-widest">Borrar Todo</button>
              <button onClick={() => setShowConfirmReset(false)} className="w-full bg-slate-100 text-slate-600 py-4 rounded-xl font-bold hover:bg-slate-200 transition uppercase text-[10px] tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {gameState.isFinished ? (
        <FinishedPanel 
          stats={stats} 
          onBack={onBack} 
          onResetAll={() => setShowConfirmReset(true)}
          onArchive={handleArchiveLearned}
          onContinue={handleContinue}
        />
      ) : (
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 w-full flex-1 flex flex-col h-full overflow-y-auto pb-40">
          {/* LADDER INDICATOR */}
          <div className="w-full mb-4 mt-2 px-1">
            <div className="flex items-center justify-between relative max-w-3xl mx-auto gap-1">
              <div className="absolute top-4 md:top-5 left-0 w-full h-0.5 bg-slate-200 -z-10"></div>
              {stagesUI.map((stage, idx) => {
                const isActive = stage.cycle === gameState.currentCycle;
                const isDone = stage.cycle < gameState.currentCycle;
                return (
                  <div key={idx} className="flex flex-col items-center relative bg-slate-50 px-1 md:px-3">
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black text-[9px] md:text-[10px] border-2 md:border-4 transition-all duration-500 relative ${
                      isActive ? 'bg-indigo-600 border-white text-white scale-110 md:scale-125 shadow-lg shadow-indigo-100' :
                      isDone ? 'bg-emerald-500 border-white text-white' : 'bg-white border-slate-300 text-slate-400'
                    }`}>
                      {isDone ? '✓' : stage.cycle}
                      <div className={`absolute -top-2 -right-2 md:-top-3 md:-right-3 min-w-[18px] md:min-w-[22px] h-[18px] md:h-[22px] px-1 rounded-full flex items-center justify-center text-[8px] md:text-[10px] font-black border-2 transition-all shadow-md ${
                        isActive ? 'bg-indigo-900 text-white border-white' : 'bg-slate-800 text-white border-white'
                      }`}>
                        {stage.count}
                      </div>
                    </div>
                    <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-widest mt-2 md:mt-4 whitespace-nowrap transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}>
                      <span className="hidden md:inline">{stage.fullLabel}</span>
                      <span className="md:hidden">{stage.label}</span>
                    </span>
                  </div>
                );
              })}
              <div className="flex flex-col items-center relative bg-slate-50 px-1 md:px-3">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black text-xs border-2 md:border-4 relative ${
                  stats.learned > 0 ? 'bg-amber-400 border-white text-white' : 'bg-white border-slate-300 text-amber-200'
                }`}>
                  ★
                  <div className="absolute -top-2 -right-2 md:-top-3 md:-right-3 min-w-[18px] md:min-w-[22px] h-[18px] md:h-[22px] px-1 rounded-full bg-amber-800 text-white border-white border-2 flex items-center justify-center text-[8px] md:text-[10px] font-black shadow-md">
                    {stats.learned}
                  </div>
                </div>
                <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-widest mt-2 md:mt-4 whitespace-nowrap ${stats.learned > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                  Aprend.
                </span>
              </div>
            </div>
          </div>

          {/* PENDIENTES COUNTER */}
          <div className="flex justify-center mb-4">
            <div className="bg-white border border-slate-200 px-4 md:px-6 py-1.5 md:py-2 rounded-full flex items-center gap-2 md:gap-3 shadow-sm">
              <span className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">Pendientes:</span>
              <span className="text-indigo-800 font-black text-xs md:text-sm">{gameState.queue.length - gameState.currentIndex}</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-start mt-0">
            {/* CARD - WIDER AND LOWER HEIGHT */}
            <div className="w-full max-w-3xl bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-white p-6 md:px-12 md:py-8 text-center relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600 opacity-20" />
              
              <div className="mb-4 md:mb-6">
                <span className="text-[9px] md:text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] block mb-1">{list.concept}</span>
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-2 break-words leading-tight">{displayTerm || '---'}</h2>
                <div className="h-1 w-8 bg-slate-100 mx-auto rounded-full" />
              </div>

              <div className="min-h-[100px] md:min-h-[120px] flex flex-col justify-center">
                {list.settings.mode === 'real' && (
                  <div className="mb-4 min-h-[30px] md:min-h-[40px] flex flex-col items-center">
                    {gameState.revealed ? (
                      <div className="animate-in slide-in-from-top-1 fade-in duration-300">
                        <span className="text-[8px] md:text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-0.5">Respuesta:</span>
                        <div className="text-xl md:text-2xl font-black text-indigo-700 bg-indigo-50 py-1.5 md:py-2 rounded-xl border border-indigo-100 px-4 md:px-6 inline-block">{targetDefinition}</div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 md:gap-3">
                        <span className={`text-lg md:text-2xl font-black transition-colors ${
                          lastAttempt.status === 'error' ? 'text-rose-500' : 
                          lastAttempt.status === 'success' ? 'text-emerald-500' : 'text-slate-400'
                        }`}>
                          {gameState.userInput || lastAttempt.text || '...'}
                        </span>
                        {lastAttempt.status === 'success' && (
                          <svg className="w-5 h-5 md:w-6 md:h-6 text-emerald-500 animate-in zoom-in" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                        )}
                        {lastAttempt.status === 'error' && (
                          <svg className="w-5 h-5 md:w-6 md:h-6 text-rose-500 animate-in zoom-in" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" /></svg>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {list.settings.mode === 'real' ? (
                  <div className="w-full relative max-w-lg mx-auto px-2">
                    <input 
                      ref={inputRef}
                      type="text"
                      value={gameState.userInput}
                      onChange={(e) => {
                        setGameState(prev => ({ ...prev, userInput: e.target.value }));
                        if (lastAttempt.status !== 'none') setLastAttempt({ text: '', status: 'none' });
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && !gameState.wasRevealed && !gameState.revealed && checkInput()}
                      placeholder={gameState.wasRevealed || gameState.revealed ? "No se puede validar" : "Escribe aquí..."}
                      disabled={gameState.wasRevealed || gameState.revealed}
                      className={`w-full text-center text-lg md:text-2xl font-black py-4 md:py-5 px-4 border-2 rounded-2xl md:rounded-3xl outline-none transition-all shadow-inner placeholder-slate-300 ${
                        (gameState.wasRevealed || gameState.revealed)
                          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                          : 'bg-slate-50 border-slate-200 focus:border-indigo-600 focus:bg-white text-slate-900'
                      }`}
                    />
                    {!(gameState.wasRevealed || gameState.revealed) && (
                      <button 
                        onClick={checkInput}
                        className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-indigo-600 text-white rounded-xl md:rounded-2xl flex items-center justify-center hover:bg-indigo-700 transition shadow-md active:scale-90"
                      >
                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-2xl md:text-4xl font-black text-indigo-600 px-4">
                    {gameState.revealed ? (
                      <div className="animate-in slide-in-from-bottom-2 fade-in duration-300 break-words drop-shadow-sm">{targetDefinition}</div>
                    ) : (
                      <div className="flex justify-center items-center gap-2 md:gap-3 py-4 select-none">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div key={i} className="w-5 h-5 md:w-8 md:h-8 rounded-lg bg-slate-100/80 animate-pulse border-2 border-slate-200 shadow-inner flex items-center justify-center text-slate-200 font-black text-xs">
                             ?
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* ATRÁS BUTTON */}
            {gameState.currentIndex > 0 && (
              <button 
                onClick={() => setGameState(prev => ({ ...prev, currentIndex: prev.currentIndex - 1, revealed: false, wasRevealed: false }))}
                className="mt-4 md:mt-6 bg-white text-slate-600 px-5 md:px-6 py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-slate-200 hover:text-indigo-600 transition shadow-sm active:scale-95"
              >
                ← Atras
              </button>
            )}
          </div>

          {/* ACTIONS - STICKY AND ADAPTIVE */}
          <div className="fixed bottom-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent flex justify-center z-30">
            <div className={`max-w-2xl w-full grid gap-2 md:gap-4 ${list.settings.mode === 'real' ? 'grid-cols-2' : 'grid-cols-3'}`}>
              <button onClick={handlePasar} className="h-14 md:h-16 bg-white border-2 border-slate-200 text-slate-600 rounded-xl md:rounded-2xl font-black hover:bg-slate-50 transition shadow-lg active:scale-95 text-[9px] md:text-[10px] uppercase tracking-widest">
                Siguiente
              </button>
              <button 
                onClick={() => setGameState(prev => ({ ...prev, revealed: !prev.revealed, wasRevealed: true }))}
                className={`h-14 md:h-16 rounded-xl md:rounded-2xl font-black transition shadow-lg active:scale-95 text-[9px] md:text-[10px] uppercase tracking-widest ${gameState.revealed ? 'bg-indigo-200 text-indigo-900 border-2 border-indigo-300' : 'bg-indigo-50 text-indigo-700'}`}
              >
                {gameState.revealed ? 'Ocultar' : 'Revelar'}
              </button>
              {list.settings.mode === 'training' && (
                <button 
                  onClick={handleCorrect} 
                  disabled={gameState.wasRevealed || gameState.revealed}
                  className={`h-14 md:h-16 rounded-xl md:rounded-2xl font-black transition shadow-xl active:scale-95 text-[9px] md:text-[10px] uppercase tracking-widest flex items-center justify-center gap-1 md:gap-2 ${
                    (gameState.wasRevealed || gameState.revealed) ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                  }`}
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  Correcta
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-sm:w-full max-w-sm rounded-[2.5rem] p-8 md:p-10 shadow-2xl animate-in zoom-in-95 duration-200 mx-4">
            <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-6 md:mb-8 tracking-tight">Opciones</h3>
            <div className="space-y-6 md:space-y-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 md:mb-4">Modo de Juego</label>
                <div className="flex bg-slate-50 p-1 rounded-xl md:rounded-2xl">
                  {(['training', 'real'] as GameMode[]).map(m => (
                    <button key={m} onClick={() => onUpdateList({ ...list, settings: { ...list.settings, mode: m } })} className={`flex-1 py-2.5 md:py-3 rounded-lg md:rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${list.settings.mode === m ? 'bg-white text-indigo-800 shadow-md' : 'text-slate-400'}`}>{m === 'training' ? 'Memoria' : 'Escritura'}</button>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => setShowConfirmReset(true)}
                className="w-full bg-rose-500 text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-black shadow-lg active:scale-95 uppercase text-[9px] md:text-[10px] tracking-widest"
              >
                Resetear Progreso
              </button>
            </div>
            <button onClick={() => setShowSettings(false)} className="w-full mt-8 md:mt-10 bg-slate-900 text-white py-3 md:py-4 rounded-[2rem] font-black hover:bg-slate-800 transition text-[10px] md:text-[11px] uppercase tracking-widest">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};

const ToastNotification: React.FC<{ toast: Toast, onClose: () => void }> = ({ toast, onClose }) => (
  <div 
    onClick={onClose}
    className={`fixed top-12 left-1/2 -translate-x-1/2 z-[300] px-6 md:px-8 py-3 md:py-4 rounded-[2rem] shadow-2xl font-black text-[10px] md:text-[11px] uppercase tracking-widest cursor-pointer animate-in slide-in-from-top-12 fade-in duration-500 flex items-center gap-3 md:gap-4 border-2 ${
      toast.type === 'success' ? 'bg-emerald-800 text-white border-emerald-500' : 
      toast.type === 'error' ? 'bg-rose-800 text-white border-rose-500' : 
      'bg-indigo-900 text-white border-indigo-700'
    }`}
  >
    {toast.message}
  </div>
);

const FinishedPanel: React.FC<{ stats: any, onBack: () => void, onResetAll: () => void, onArchive: () => void, onContinue: () => void }> = ({ stats, onBack, onResetAll, onArchive, onContinue }) => (
  <div className="max-w-xl mx-auto p-4 md:p-6 text-center animate-in zoom-in duration-500 flex-1 flex flex-col justify-center min-h-screen">
    <div className="bg-white rounded-[3rem] md:rounded-[4rem] shadow-2xl p-8 md:p-12 border border-slate-100">
      <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-50 text-indigo-800 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-inner">
        <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
      </div>
      <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2 tracking-tight">¡Sesión Terminada!</h2>
      <p className="text-slate-400 mb-8 md:mb-10 text-xs md:text-sm font-medium">Resumen de tu aprendizaje:</p>
      
      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-8 md:mb-10">
        <div className="bg-amber-50 p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-amber-200">
          <div className="text-3xl md:text-4xl font-black text-amber-800 mb-1">{stats.learned}</div>
          <div className="text-[9px] md:text-[10px] uppercase font-black text-amber-600 tracking-widest">★ Aprendidas</div>
        </div>
        <div className="bg-indigo-50 p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-indigo-200">
          <div className="text-3xl md:text-4xl font-black text-indigo-900 mb-1">{stats.unknown + stats.discovered + stats.recognized + stats.known}</div>
          <div className="text-[9px] md:text-[10px] uppercase font-black text-indigo-800 tracking-widest">En Proceso</div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button onClick={onContinue} className="w-full bg-indigo-600 text-white py-4 md:py-5 rounded-[2rem] font-black shadow-xl shadow-indigo-100 active:scale-95 text-[11px] md:text-xs uppercase tracking-[0.2em] transition-all hover:bg-indigo-700">Continuar Estudio</button>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onArchive} className="bg-slate-100 text-slate-800 py-3.5 md:py-4 rounded-[2rem] font-black text-[8px] md:text-[9px] uppercase tracking-widest active:scale-95 transition hover:bg-slate-200 border border-slate-200">Archivar Aprendidas</button>
          <button onClick={onResetAll} className="bg-rose-50 text-rose-800 py-3.5 md:py-4 rounded-[2rem] font-black text-[8px] md:text-[9px] uppercase tracking-widest active:scale-95 transition hover:bg-rose-100 border border-rose-100">Reiniciar Todo</button>
        </div>
        <button onClick={onBack} className="w-full bg-white text-slate-500 py-3 md:py-4 rounded-2xl font-bold active:scale-95 text-[9px] md:text-[10px] uppercase tracking-widest mt-2 md:mt-4">Volver al Dashboard</button>
      </div>
    </div>
  </div>
);
