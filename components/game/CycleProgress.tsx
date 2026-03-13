
import React, { useMemo } from 'react';
import { GameState, GameCycle } from '../../types';

interface CycleProgressProps {
  gameState: GameState;
}

interface CycleInfo {
  id: GameCycle;
  label: string;
  count: number;
}

export const CycleProgress: React.FC<CycleProgressProps> = ({ gameState }) => {
  const cycleDistribution = useMemo(() => {
    const distribution = new Map<GameCycle, number>([
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
    ]);
    for (const assoc of gameState.associations) {
      if (assoc.currentCycle >= 1 && assoc.currentCycle <= 4) {
         distribution.set(assoc.currentCycle as GameCycle, (distribution.get(assoc.currentCycle as GameCycle) || 0) + 1);
      }
    }
    return distribution;
  }, [gameState.associations]);
  
  const cycles: CycleInfo[] = [
    { id: 1, label: 'Nueva', count: cycleDistribution.get(1) || 0 },
    { id: 2, label: 'Vista', count: cycleDistribution.get(2) || 0 },
    { id: 3, label: 'Reconocida', count: cycleDistribution.get(3) || 0 },
    { id: 4, label: 'Conocida', count: cycleDistribution.get(4) || 0 },
  ];

  const totalAssociations = gameState.associations.length;
  const learnedCount = gameState.associations.filter(a => a.isLearned || a.status === 'correct').length;
  const totalProgress = totalAssociations > 0 ? (learnedCount / totalAssociations) * 100 : 0;

  return (
    <div className="w-full lg:w-48 bg-white/40 rounded-[2rem] p-5 border border-white flex flex-col gap-3">
      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 text-center lg:text-left">PROGRESO</h3>
      
      <div className="flex lg:flex-col justify-between lg:justify-start gap-3 lg:gap-4">
        {cycles.map((cycle) => {
          const isActive = gameState.globalCycle === cycle.id;
          const isCompleted = cycle.id < gameState.globalCycle;

          return (
            <div key={cycle.id} className={`flex items-center gap-3 transition-all duration-300 ${isActive ? '' : 'opacity-60'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all shadow-sm ${ 
                isCompleted
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-500'
                  : isActive
                    ? 'bg-white border-indigo-600 text-indigo-600 ring-4 ring-indigo-50 shadow-indigo-100'
                    : 'bg-white border-slate-200 text-slate-400'
              }`}>
                <span className="text-sm font-bold">{cycle.count}</span>
              </div>
              <div className="flex flex-col items-start">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {cycle.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 pt-3 border-t border-slate-200">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
            <span className="text-xs font-bold text-indigo-600">{Math.round(totalProgress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${totalProgress}%` }}></div>
          </div>
      </div>
    </div>
  )
}
