
import React from 'react';
import { AssociationStatus, GameCycle } from '../../types';

interface CycleProgressProps {
  stageCounts: {
    1: number;
    2: number;
    3: number;
    learned: number;
  }
  associationsLength: number;
  currentCycle: GameCycle;
}

export const CycleProgress: React.FC<CycleProgressProps> = ({ stageCounts, associationsLength, currentCycle }) => {
  return (
    <div className="w-full lg:w-40 bg-white/40 rounded-[2rem] p-5 border border-white flex flex-col gap-3">
      <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 text-center lg:text-left">Ciclos</h3>
      
      <div className="flex lg:flex-col justify-between lg:justify-start gap-3 lg:gap-4">
        {[1, 2, 3, 4].map((c) => {
          const count = stageCounts[c as keyof typeof stageCounts];
          const isActive = currentCycle === c;
          const isCompleted = currentCycle > c;

          return (
            <div key={c} className={`flex flex-col lg:flex-row items-center gap-2 transition-all duration-300 ${isActive ? 'scale-105' : 'opacity-60'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all shadow-sm ${
                isCompleted 
                  ? 'bg-emerald-500 border-emerald-500 text-white' 
                  : isActive 
                    ? 'bg-white border-indigo-600 text-indigo-600 ring-4 ring-indigo-50 shadow-indigo-100' 
                    : 'bg-white border-slate-200 text-slate-400'
              }`}>
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                ) : (
                  <span className="text-[10px] font-black">{count}</span>
                )}
              </div>
              <div className="flex flex-col items-center lg:items-start">
                <span className={`text-[7px] font-black uppercase tracking-widest ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {Object.values(AssociationStatus)[c - 1]}
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
