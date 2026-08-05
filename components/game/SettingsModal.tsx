
import React from 'react';
import { AssociationList } from '../../types';

const THRESHOLD_MIN = 50;
const THRESHOLD_MAX = 100;
const THRESHOLD_STEP = 5;

interface SettingsModalProps {
  list: AssociationList;
  onUpdateList: (list: AssociationList) => void;
  onClose: () => void;
  onRestart: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ list, onUpdateList, onClose, onRestart }) => {
  const isReversed = list.settings.flipOrder === 'reversed';
  const isPracticeMode = list.settings.mode === 'training';
  const isIgnoringArticles = list.settings.ignoreArticles === true;
  const thresholdPercent = Math.round(list.settings.threshold * 100);

  const handleRestart = () => {
    if(confirm('¿Reiniciar todo el progreso de esta lista?')) {
      onRestart();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 border border-white" style={{ scrollbarWidth: 'none' }}>
        <h3 className="text-3xl font-black text-slate-900 mb-6 sm:mb-8 tracking-tighter text-center">Settings</h3>
        
        <div className="space-y-4 mb-8">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Game Mode</p>
            <div className="flex gap-2">
              <button 
                onClick={() => onUpdateList({ ...list, settings: { ...list.settings, mode: 'training' } })}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${isPracticeMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
              >
                Practice
              </button>
              <button 
                onClick={() => onUpdateList({ ...list, settings: { ...list.settings, mode: 'real' } })}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!isPracticeMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
              >
                Real
              </button>
            </div>
          </div>

          <button 
            onClick={() => onUpdateList({ ...list, settings: { ...list.settings, flipOrder: isReversed ? 'normal' : 'reversed' } })}
            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all shadow-sm ${isReversed ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              <span className="text-xs font-bold">Flip Cards</span>
            </div>
            <div className={`w-10 h-6 rounded-full relative transition-colors ${isReversed ? 'bg-indigo-400' : 'bg-slate-200'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isReversed ? 'left-5' : 'left-1'}`}></div>
            </div>
          </button>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-8">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Answer Validation</p>
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-bold text-slate-700">Ignore articles</p>
              <p className="text-[10px] text-slate-400 mt-0.5">the, at, to, el, la... not required</p>
            </div>
            <button
              onClick={() => onUpdateList({ ...list, settings: { ...list.settings, ignoreArticles: !isIgnoringArticles } })}
              className={`w-10 h-6 rounded-full relative transition-colors flex-shrink-0 ${isIgnoringArticles ? 'bg-indigo-400' : 'bg-slate-200'}`}
              aria-label="Toggle ignore articles"
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isIgnoringArticles ? 'left-5' : 'left-1'}`}></div>
            </button>
          </div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-bold text-slate-700">Similarity threshold</p>
            <span className="text-xs font-black text-indigo-600">{thresholdPercent}%</span>
          </div>
          <input
            type="range"
            min={THRESHOLD_MIN}
            max={THRESHOLD_MAX}
            step={THRESHOLD_STEP}
            value={thresholdPercent}
            onChange={(e) => onUpdateList({ ...list, settings: { ...list.settings, threshold: Number(e.target.value) / 100 } })}
            className="w-full accent-indigo-600"
            aria-label="Similarity threshold"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>{THRESHOLD_MIN}%</span>
            <span>{THRESHOLD_MAX}%</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={handleRestart}
            className="w-full bg-rose-50 text-rose-600 py-4 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-rose-100 transition active:scale-95"
          >
            Restart List
          </button>
          <button 
            onClick={onClose}
            className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-slate-800 transition active:scale-95 shadow-xl shadow-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
