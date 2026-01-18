
import React, { useState } from 'react';
import { AssociationList, Association, AssociationStatus } from '../types';

interface ListEditorProps {
  list: AssociationList;
  onSave: (list: AssociationList) => void;
  onBack: () => void;
}

export const ListEditor: React.FC<ListEditorProps> = ({ list, onSave, onBack }) => {
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [editList, setEditList] = useState<AssociationList>(list);
  const [searchTerm, setSearchTerm] = useState('');

  const handleBulkAdd = () => {
    if (!bulkText.trim()) return;

    const newAssocs: Association[] = bulkText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // Soporta tab, punto y coma o coma
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
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="text-gray-400 hover:text-indigo-600 transition p-2 hover:bg-white rounded-full">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{editList.name}</h2>
          <p className="text-sm text-gray-500">Editando {editList.associations.length} asociaciones de {editList.concept}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar en esta lista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
            {searchTerm && (
               <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                {filteredAssociations.length} de {editList.associations.length}
               </span>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
             <button 
              onClick={() => setShowBulk(!showBulk)}
              className="text-indigo-600 text-sm font-medium hover:underline px-3 whitespace-nowrap"
            >
              {showBulk ? 'Ocultar' : 'Importación CSV'}
            </button>
            <button 
              onClick={handleAddRow}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition flex-1 sm:flex-none"
            >
              Añadir Fila
            </button>
          </div>
        </div>

        {showBulk && (
          <div className="p-4 bg-indigo-50 border-b animate-in slide-in-from-top-2 duration-200">
            <label className="block text-sm font-medium text-indigo-900 mb-2">Pega tus datos (CSV, Excel o Tabulado)</label>
            <textarea 
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="Ejemplo:&#10;palabra 1, definición 1&#10;palabra 2, definición 2"
              className="w-full h-32 px-3 py-2 border border-indigo-200 rounded-lg text-sm mb-3 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-indigo-400">Soporta: Coma (,), Punto y coma (;) o Tabulación</span>
              <button 
                onClick={handleBulkAdd}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm"
              >
                Añadir Registros
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs uppercase text-gray-400 font-bold border-b">
                <th className="px-6 py-3">Término ({editList.concept.split('/')[0]?.trim()})</th>
                <th className="px-6 py-3">Definición ({editList.concept.split('/')[1]?.trim() || 'Par'})</th>
                <th className="px-6 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredAssociations.map((assoc) => (
                <tr key={assoc.id} className="group hover:bg-gray-50 transition">
                  <td className="px-6 py-3">
                    <input 
                      type="text" 
                      value={assoc.term}
                      onChange={(e) => handleUpdateRow(assoc.id, 'term', e.target.value)}
                      className="w-full bg-transparent border-none focus:ring-0 text-gray-900 placeholder-gray-300"
                      placeholder="Escribe el término..."
                    />
                  </td>
                  <td className="px-6 py-3">
                    <input 
                      type="text" 
                      value={assoc.definition}
                      onChange={(e) => handleUpdateRow(assoc.id, 'definition', e.target.value)}
                      className="w-full bg-transparent border-none focus:ring-0 text-gray-900 placeholder-gray-300"
                      placeholder="Escribe la definición..."
                    />
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button 
                      onClick={() => handleRemoveRow(assoc.id)}
                      className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAssociations.length === 0 && (
            <div className="py-12 text-center text-gray-400 italic">
              {searchTerm ? 'No se encontraron asociaciones que coincidan.' : 'No hay asociaciones aún. Usa la importación CSV o añade una fila manualmente.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
