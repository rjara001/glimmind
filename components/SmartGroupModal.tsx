
import React, { useState } from 'react';
import { Association, AssociationList } from '../types';

interface SmartGroupModalProps {
  originalList: AssociationList;
  onConfirm: (groups: { name: string, associations: Association[] }[]) => void;
  onCancel: () => void;
  suggestions: { groupName: string, indices: number[] }[];
}

export const SmartGroupModal: React.FC<SmartGroupModalProps> = ({ originalList, onConfirm, onCancel, suggestions }) => {
  const [selectedGroups, setSelectedGroups] = useState<number[]>(suggestions.map((_, i) => i));

  const toggleGroup = (index: number) => {
    setSelectedGroups(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  };

  const handleExecute = () => {
    const finalGroups = selectedGroups.map(idx => {
      const sugg = suggestions[idx];
      return {
        name: sugg.groupName,
        associations: sugg.indices.map(i => originalList.associations[i]).filter(Boolean)
      };
    });
    onConfirm(finalGroups);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 bg-indigo-600 text-white">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black">División Inteligente</h2>
          </div>
          <p className="text-indigo-100 font-medium">Hemos analizado {originalList.associations.length} elementos. Selecciona los grupos que deseas crear:</p>
        </div>

        <div className="p-8 max-h-[50vh] overflow-y-auto bg-slate-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {suggestions.map((group, idx) => (
              <button 
                key={idx}
                onClick={() => toggleGroup(idx)}
                className={`p-4 rounded-2xl text-left border-2 transition-all ${
                  selectedGroups.includes(idx) 
                  ? 'border-indigo-600 bg-white shadow-md' 
                  : 'border-slate-200 bg-slate-100 opacity-60'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedGroups.includes(idx) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                    {selectedGroups.includes(idx) && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
                  </span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{group.indices.length} items</span>
                </div>
                <h4 className="font-bold text-slate-800 leading-tight">{group.groupName}</h4>
              </button>
            ))}
          </div>
        </div>

        <div className="p-8 bg-white border-t flex flex-col sm:flex-row gap-4">
          <button onClick={onCancel} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition">Cancelar</button>
          <button 
            onClick={handleExecute}
            disabled={selectedGroups.length === 0}
            className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:bg-slate-300 disabled:shadow-none transition active:scale-95"
          >
            Crear {selectedGroups.length} Listas Nuevas
          </button>
        </div>
      </div>
    </div>
  );
};
