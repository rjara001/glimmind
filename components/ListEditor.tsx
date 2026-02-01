
import React, { useState } from 'react';
import { AssociationList, Association, AssociationStatus } from '../types';
import { aiService } from '../services/aiService';
import { SmartGroupModal } from './SmartGroupModal';

interface ListEditorProps {
  list: AssociationList;
  onSave: (list: AssociationList) => void;
  onBack: () => void;
  onCreateMultiple?: (groups: { name: string, associations: Association[] }[]) => void;
}

export const ListEditor: React.FC<ListEditorProps> = ({ list, onSave, onBack, onCreateMultiple }) => {
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [editList, setEditList] = useState<AssociationList>(list);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[] | null>(null);

  const handleBulkAdd = () => {
    if (!bulkText.trim()) return;

    const newAssocs: Association[] = bulkText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        const parts = line.split(/[\t;]|,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const term = parts[0]?.replace(/^"|"$/g, '').trim() || '';
        const definition = parts[1]?.replace(/^"|"$/g, '').trim() || '';
        
        return {
          id: crypto.randomUUID(),
          term,
          definition,
          status: AssociationStatus.DESCONOCIDA
        };
      })
      .filter(a => a.term || a.definition);
    
    const updated = {
      ...editList,
      associations: [...editList.associations, ...newAssocs]
    };
    setEditList(updated);
    onSave(updated);
    setBulkText('');
    setShowBulk(false);
  };

  const handleSmartSplit = async () => {
    if (editList.associations.length < 5) {
      alert("Necesitas al menos 5 asociaciones para agrupar.");
      return;
    }
    setIsAnalyzing(true);
    try {
      const suggestions = await aiService.groupAssociations(editList.associations, editList.concept);
      if (suggestions && suggestions.length > 0) {
        setAiSuggestions(suggestions);
      } else {
        alert("La IA no pudo generar sugerencias útiles para esta lista.");
      }
    } catch (e: any) {
      console.error("Error en handleSmartSplit:", e);
      alert(`Error de IA: ${e.message || "No se pudo conectar con el servidor."}\n\nVerifica que tu API Key sea válida y tengas conexión a internet.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddRow = () => {
    const updated = {
      ...editList,
      associations: [
        ...editList.associations,
        { id: crypto.randomUUID(), term: '', definition: '', status: AssociationStatus.DESCONOCIDA }
      ]
    };
    setEditList(updated);
    onSave(updated);
  };

  const handleUpdateRow = (id: string, field: keyof Association, value: string) => {
    const updated = {
      ...editList,
      associations: editList.associations.map(a => a.id === id ? { ...a, [field]: value } : a)
    };
    setEditList(updated);
    onSave(updated);
  };

  const handleRemoveRow = (id: string) => {
    const updated = {
      ...editList,
      associations: editList.associations.filter(a => a.id !== id)
    };
    setEditList(updated);
    onSave(updated);
  };

  const filteredAssociations = editList.associations.filter(assoc => 
    assoc.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assoc.definition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-gray-400 hover:text-indigo-600 transition p-2 hover:bg-white rounded-full">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{editList.name}</h2>
            <p className="text-sm text-gray-500">{editList.associations.length} asociaciones de {editList.concept}</p>
          </div>
        </div>

        {editList.associations.length > 5 && (
          <button 
            onClick={handleSmartSplit}
            disabled={isAnalyzing}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.456-2.454L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.454zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            )}
            {isAnalyzing ? 'Analizando...' : 'Organización IA'}
          </button>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar asociaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl text-sm bg-white focus:ring-4 focus:ring-indigo-500/10 transition shadow-inner"
              />
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
             <button 
              onClick={() => setShowBulk(!showBulk)}
              className="px-4 py-3 text-indigo-600 text-xs font-black uppercase tracking-widest hover:bg-white rounded-xl transition"
            >
              CSV
            </button>
            <button 
              onClick={handleAddRow}
              className="bg-white border-2 border-slate-100 text-slate-700 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition flex-1 sm:flex-none shadow-sm"
            >
              Añadir Fila
            </button>
          </div>
        </div>

        {showBulk && (
          <div className="p-8 bg-indigo-50 border-b animate-in slide-in-from-top-4 duration-300">
            <label className="block text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Importación Masiva</label>
            <textarea 
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="Término, Definición..."
              className="w-full h-40 px-5 py-4 border-2 border-indigo-100 rounded-[2rem] text-sm mb-4 outline-none focus:border-indigo-600 font-mono shadow-inner"
            />
            <div className="flex justify-end">
              <button 
                onClick={handleBulkAdd}
                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition active:scale-95"
              >
                Procesar Registros
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase text-slate-400 font-black border-b bg-slate-50/30">
                <th className="px-8 py-4 tracking-[0.2em]">{editList.concept.split('/')[0]?.trim()}</th>
                <th className="px-8 py-4 tracking-[0.2em]">{editList.concept.split('/')[1]?.trim() || 'Definición'}</th>
                <th className="px-8 py-4 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAssociations.map((assoc) => (
                <tr key={assoc.id} className="group hover:bg-indigo-50/30 transition">
                  <td className="px-8 py-4">
                    <input 
                      type="text" 
                      value={assoc.term}
                      onChange={(e) => handleUpdateRow(assoc.id, 'term', e.target.value)}
                      className="w-full bg-transparent border-none focus:ring-0 text-slate-900 font-bold"
                      placeholder="Término..."
                    />
                  </td>
                  <td className="px-8 py-4">
                    <input 
                      type="text" 
                      value={assoc.definition}
                      onChange={(e) => handleUpdateRow(assoc.id, 'definition', e.target.value)}
                      className="w-full bg-transparent border-none focus:ring-0 text-slate-500 font-medium"
                      placeholder="Definición..."
                    />
                  </td>
                  <td className="px-8 py-4 text-right">
                    <button 
                      onClick={() => handleRemoveRow(assoc.id)}
                      className="text-slate-200 hover:text-rose-500 transition opacity-0 group-hover:opacity-100 p-1"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAssociations.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4v16m8-8H4" strokeWidth={2} /></svg>
               </div>
               <p className="text-slate-400 font-medium italic">Sin resultados</p>
            </div>
          )}
        </div>
      </div>

      {aiSuggestions && (
        <SmartGroupModal 
          originalList={editList}
          suggestions={aiSuggestions}
          onCancel={() => setAiSuggestions(null)}
          onConfirm={(groups) => {
            if (onCreateMultiple) onCreateMultiple(groups);
            setAiSuggestions(null);
            onBack();
          }}
        />
      )}
    </div>
  );
};
