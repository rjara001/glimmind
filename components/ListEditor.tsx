
import React, { useState, useEffect, useCallback } from 'react';
import { AssociationList, Association } from '../types';
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

  const cleanupAndSave = useCallback((listToSave: AssociationList) => {
    // Create a set of seen IDs to ensure uniqueness
    const seenIds = new Set<string>();
    const cleanedAssociations = listToSave.associations
      .map(assoc => {
        // Trim whitespace from term and definition
        const term = assoc.term.trim();
        const definition = assoc.definition.trim();
        
        // Ensure ID is unique, generate a new one if it's a duplicate or invalid
        let id = assoc.id;
        if (!id || seenIds.has(id)) {
          id = crypto.randomUUID();
        }
        seenIds.add(id);

        return { ...assoc, id, term, definition };
      })
      // Filter out any associations that are completely empty
      .filter(assoc => assoc.term !== '' || assoc.definition !== '');

    const updatedList = { ...listToSave, associations: cleanedAssociations };
    setEditList(updatedList);
    onSave(updatedList);
  }, [onSave]);

  // Effect for initial cleanup when the component mounts
  useEffect(() => {
    const initialAssociations = list.associations;
    let needsCleanup = false;

    const seenIds = new Set<string>();
    for (const assoc of initialAssociations) {
      if (!assoc.id || seenIds.has(assoc.id) || assoc.term.trim() !== assoc.term || assoc.definition.trim() !== assoc.definition || (assoc.term.trim() === '' && assoc.definition.trim() === '')) {
        needsCleanup = true;
        break;
      }
      seenIds.add(assoc.id);
    }

    if (needsCleanup) {
      console.log("🧼 Data sanitization: Detected duplicate IDs, whitespace, or empty rows on load. Cleaning up...");
      cleanupAndSave(list);
    }
  }, [list, cleanupAndSave]);


  const handleBulkAdd = () => {
    if (!bulkText.trim()) return;
    const newAssocs: Association[] = bulkText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        const parts = line.split(/[\t;]|,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const term = (parts[0]?.replace(/^"|"$/g, '').trim() || '');
        const definition = (parts[1]?.replace(/^"|"$/g, '').trim() || '');
        return {
          id: crypto.randomUUID(),
          term,
          definition,
          currentCycle: 1,
          status: 'pending' as const,
          isLearned: false,
          isArchived: false,
        };
      })
      .filter(a => a.term || a.definition);
    
    cleanupAndSave({ ...editList, associations: [...editList.associations, ...newAssocs] });
    setBulkText('');
    setShowBulk(false);
  };

  const handleSmartSplit = async () => {
    const activeAssociations = editList.associations.filter(a => !a.isArchived);
    if (activeAssociations.length < 3) {
      alert("Necesitas al menos 3 elementos para que la IA encuentre patrones lógicos.");
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const suggestions = await aiService.groupAssociations(activeAssociations, editList.concept);
      setAiSuggestions(suggestions);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Ocurrió un error inesperado al contactar con la IA.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddRow = () => {
    const newAssociation: Association = {
      id: crypto.randomUUID(),
      term: '',
      definition: '',
      currentCycle: 1,
      status: 'pending',
      isLearned: false,
      isArchived: false,
    };
    setEditList(current => ({ ...current, associations: [newAssociation, ...current.associations] }));
  };

  const handleUpdateField = (id: string, field: keyof Association, value: any) => {
    const updatedAssociations = editList.associations.map(a => a.id === id ? { ...a, [field]: value } : a);
    setEditList({ ...editList, associations: updatedAssociations });
  };

  const handleBlurRow = () => {
    cleanupAndSave(editList);
  };

  const handleRemoveRow = (id: string) => {
    const updated = { ...editList, associations: editList.associations.filter(a => a.id !== id) };
    cleanupAndSave(updated);
  };
  
  const handleRestoreRow = (id: string) => {
    const updatedAssociations = editList.associations.map(a => a.id === id ? { ...a, isArchived: false } : a);
    cleanupAndSave({ ...editList, associations: updatedAssociations });
  };

  const activeAssociations = editList.associations.filter(a => !a.isArchived);
  const archivedAssociations = editList.associations.filter(a => a.isArchived);

  const filteredActive = activeAssociations.filter(assoc => 
    assoc.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assoc.definition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredArchived = archivedAssociations.filter(assoc => 
    assoc.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assoc.definition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-gray-400 hover:text-indigo-600 transition p-2 hover:bg-white rounded-full">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{editList.name}</h2>
            <p className="text-sm text-gray-500">{activeAssociations.length} tarjetas activas • {archivedAssociations.length} archivadas</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleSmartSplit}
            disabled={isAnalyzing || activeAssociations.length < 3}
            title={activeAssociations.length < 3 ? "Añade al menos 3 tarjetas para usar esta función" : "Organizar con IA"}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait"
          >
            {isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>}
            {isAnalyzing ? 'Procesando...' : 'Organización IA'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative flex-1 w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input type="text" placeholder="Filter in both lists..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition outline-none shadow-sm" />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
             <button onClick={() => setShowBulk(!showBulk)} className="px-4 py-3 text-indigo-600 text-xs font-black uppercase tracking-widest hover:bg-white rounded-xl transition">Import</button>
             <button onClick={handleAddRow} className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition flex-1 sm:flex-none shadow-sm">Add Row</button>
          </div>
        </div>

        {showBulk && (
          <div className="p-6 bg-indigo-50/50 border-b border-indigo-100"><textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="Term, Definition (one per line)" className="w-full h-32 px-4 py-3 border border-indigo-100 rounded-xl text-sm mb-4 outline-none focus:ring-2 focus:ring-indigo-500 font-mono shadow-inner" /><div className="flex justify-end"><button onClick={handleBulkAdd} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md hover:bg-indigo-700 transition">Process Import</button></div></div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="text-[10px] uppercase text-slate-400 font-black border-b bg-slate-50/30"><th className="px-8 py-4">{editList.concept.split('/')[0] || 'Term'}</th><th className="px-8 py-4">{editList.concept.split('/')[1] || 'Definition'}</th><th className="px-8 py-4 w-16"></th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filteredActive.map((assoc) => (
                <tr key={assoc.id} className="group hover:bg-slate-50/80 transition-colors">
                  <td className="px-8 py-4"><input type="text" value={assoc.term} onBlur={handleBlurRow} onChange={(e) => handleUpdateField(assoc.id, 'term', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 font-bold text-slate-900 placeholder-slate-300" placeholder="Enter term..." /></td>
                  <td className="px-8 py-4"><input type="text" value={assoc.definition} onBlur={handleBlurRow} onChange={(e) => handleUpdateField(assoc.id, 'definition', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 text-slate-500 placeholder-slate-300" placeholder="Enter definition..." /></td>
                  <td className="px-8 py-4"><button onClick={() => handleRemoveRow(assoc.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1" aria-label="Delete row"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></td>
                </tr>
              ))}
              {filteredActive.length === 0 && <tr><td colSpan={3} className="px-8 py-12 text-center text-slate-400 text-sm italic">{searchTerm ? "No results in active cards." : "Add a card to get started."}</td></tr>}
            </tbody>
          </table>
        </div>

        {archivedAssociations.length > 0 && (
          <div className="pt-6">
            <div className="px-8 pb-4">
              <h3 className="text-lg font-bold text-slate-800">Tarjetas Archivadas</h3>
              <p className="text-sm text-slate-500">Estas tarjetas ya no aparecen en tus partidas. Puedes restaurarlas en cualquier momento.</p>
            </div>
            <div className="overflow-x-auto border-t">
              <table className="w-full text-left">
                <thead><tr className="text-[10px] uppercase text-slate-400 font-black border-b bg-slate-50/30"><th className="px-8 py-4">{editList.concept.split('/')[0] || 'Término'}</th><th className="px-8 py-4">{editList.concept.split('/')[1] || 'Definición'}</th><th className="px-8 py-4 w-24 text-right">Acción</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredArchived.map((assoc) => (
                    <tr key={assoc.id} className="group hover:bg-slate-50/80 transition-colors bg-slate-50/50">
                      <td className="px-8 py-4 font-semibold text-slate-500 italic">{assoc.term}</td>
                      <td className="px-8 py-4 text-slate-500 italic">{assoc.definition}</td>
                      <td className="px-8 py-4 text-right"><button onClick={() => handleRestoreRow(assoc.id)} className="text-indigo-500 hover:text-indigo-700 font-bold text-xs uppercase tracking-wider transition-all">Restaurar</button></td>
                    </tr>
                  ))}
                  {filteredArchived.length === 0 && <tr><td colSpan={3} className="px-8 py-12 text-center text-slate-400 text-sm italic">No hay resultados en tarjetas archivadas.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {aiSuggestions && <SmartGroupModal originalList={editList} suggestions={aiSuggestions} onCancel={() => setAiSuggestions(null)} onConfirm={(groups) => { if (onCreateMultiple) onCreateMultiple(groups); setAiSuggestions(null); onBack(); }} />}
    </div>
  );
};
