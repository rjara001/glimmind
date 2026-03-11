
import React from 'react';
import { AssociationStatus, GameCycle, StageCounts } from '../../types';

interface CycleProgressProps {
  stageCounts: StageCounts;
  associationsLength: number;
  currentCycle: GameCycle;
}

export const CycleProgress: React.FC<CycleProgressProps> = ({ stageCounts, associationsLength, currentCycle }) => {
  const cycles = [
    { id: 1, label: AssociationStatus.DESCONOCIDA, count: stageCounts.unknown },
    { id: 2, label: AssociationStatus.DESCUBIERTA, count: stageCounts.discovered },
    { id: 3, label: AssociationStatus.RECONOCIDA, count: stageCounts.recognized },
    { id: 4, label: AssociationStatus.CONOCIDA, count: stageCounts.learned },
  ];

  return (
    <div className="w-full lg:w-40 bg-white/40 rounded-[2rem] p-5 border border-white flex flex-col gap-3">
      <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 text-center lg:text-left">Ciclos</h3>
      
      <div className="flex lg:flex-col justify-between lg:justify-start gap-3 lg:gap-4">
        {cycles.map((cycle) => {
          const isActive = currentCycle === cycle.id;
          const isCompleted = currentCycle > cycle.id;

          return (
            <div key={cycle.id} className={`flex flex-col lg:flex-row items-center gap-2 transition-all duration-300 ${isActive ? 'scale-105' : 'opacity-60'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all shadow-sm ${ 
                isCompleted
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-500'
                  : isActive
                    ? 'bg-white border-indigo-600 text-indigo-600 ring-4 ring-indigo-50 shadow-indigo-100'
                    : 'bg-white border-slate-200 text-slate-400'
              }`}>
                <span className="text-[10px] font-black">{cycle.count}</span>
              </div>
              <div className="flex flex-col items-center lg:items-start">
                <span className={`text-[7px] font-black uppercase tracking-widest ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {cycle.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 pt-3 border-t border-slate-100">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Master</span>
            <span className="text-[8px] font-black text-indigo-600">{Math.round((stageCounts.learned / associationsLength) * 100)}%</span>
          </div>
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${(stageCounts.learned / associationsLength) * 100}%` }}></div>
          </div>
      </div>
    </div>
  )
}
