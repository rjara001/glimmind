
import React, { useState, useMemo } from 'react';
import { AssociationList, Association } from '../types';

interface DashboardProps {
  lists: AssociationList[];
  lastPlayedId?: string;
  onCreate: (name: string, concept: string, initialAssociations: Association[]) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onPlay: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ lists, lastPlayedId, onCreate, onDelete, onEdit, onPlay }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newConcept, setNewConcept] = useState('');
  const [bulkData, setBulkData] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const stats = useMemo(() => {
    let totalWords = 0;
    let totalLearned = 0;
    lists.forEach(list => {
      const activeAssociations = (list.associations || []).filter((a: any) => !a.isArchived);
      totalWords += activeAssociations.length;
      totalLearned += activeAssociations.filter((a: any) => a.isLearned || a.status === 'correct').length;
    });
    return {
      totalWords,
      totalLearned,
      percentage: totalWords > 0 ? Math.round((totalLearned / totalWords) * 100) : 0
    };
  }, [lists]);

  const recentLists = useMemo(() => {
    return [...lists].sort((a, b) => {
      if (!a.updatedAt || !b.updatedAt) return 0;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }).slice(0, 3);
  }, [lists]);

  const currentList = lastPlayedId ? lists.find(l => l.id === lastPlayedId) : null;

  const parseBulkData = (text: string): Association[] => {
    if (!text.trim()) return [];
    
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        const parts = line.split(/[\t;]|,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const term = parts[0]?.replace(/^"|"$/g, '').trim() || '';
        const definition = parts[1]?.replace(/^"|"$/g, '').trim() || '';
        
        const newAssociation: Association = {
          id: crypto.randomUUID(),
          term,
          definition,
          currentCycle: 1,
          status: 'pending',
          isLearned: false,
          isArchived: false,
        };
        return newAssociation;
      })
      .filter(a => a.term || a.definition);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName && newConcept) {
      const initialAssocs = parseBulkData(bulkData);
      onCreate(newName, newConcept, initialAssocs);
      setNewName('');
      setNewConcept('');
      setBulkData('');
      setIsCreating(false);
      setShowBulk(false);
    }
  };

  const filteredLists = lists.filter(list => 
    list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    list.concept.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [continuePlay, setContinuePlay] = useState(false);

  useMemo(() => {
    if (lastPlayedId) setContinuePlay(true);
  }, [lastPlayedId]);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-8 shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-4">Tu Progreso</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/20 rounded-xl p-4 backdrop-blur">
            <p className="text-white/80 text-sm">Total Palabras</p>
            <p className="text-3xl font-bold text-white">{stats.totalWords}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-4 backdrop-blur">
            <p className="text-white/80 text-sm">Aprendidas</p>
            <p className="text-3xl font-bold text-white">{stats.totalLearned}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-4 backdrop-blur">
            <p className="text-white/80 text-sm">Por Aprender</p>
            <p className="text-3xl font-bold text-white">{stats.totalWords - stats.totalLearned}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-4 backdrop-blur">
            <p className="text-white/80 text-sm">Completado</p>
            <p className="text-3xl font-bold text-white">{stats.percentage}%</p>
          </div>
        </div>
        <div className="mt-4 h-3 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${stats.percentage}%` }}
          />
        </div>
      </div>

      {lastPlayedId && continuePlay && currentList && (
        <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-amber-700 font-medium">Continuar última sesión</p>
            <p className="text-lg font-bold text-gray-900">{currentList.name}</p>
          </div>
          <button 
            onClick={() => onPlay(lastPlayedId)}
            className="bg-amber-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-amber-600 transition"
          >
            Continuar
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Tus Listas de Estudio</h2>
          <p className="text-gray-500 mt-1">Memoriza asociaciones de palabras rápidamente.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition shadow-sm flex items-center gap-2 w-full md:w-auto justify-center"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Lista
        </button>
      </div>

      {recentLists.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Listas Recientes</h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recentLists.map(list => {
              const activeAssociations = (list.associations || []).filter((a: any) => !a.isArchived);
              const learnedCount = activeAssociations.filter((a: any) => a.isLearned || a.status === 'correct').length;
              return (
                <button
                  key={list.id}
                  onClick={() => onPlay(list.id)}
                  className="flex-shrink-0 bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition text-left min-w-[200px]"
                >
                  <p className="font-bold text-gray-900 truncate">{list.name}</p>
                  <p className="text-sm text-gray-500">{learnedCount}/{activeAssociations.length} aprendidas</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Buscar listas por nombre o concepto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition shadow-sm"
        />
      </div>

      {isCreating && (
        <div className="mb-8 bg-white p-6 rounded-xl border border-indigo-100 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Lista</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ej: Verbos Irregulares"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto (Par)</label>
                <input 
                  type="text" 
                  value={newConcept}
                  onChange={(e) => setNewConcept(e.target.value)}
                  placeholder="ej: Inglés / Español"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <button 
                type="button"
                onClick={() => setShowBulk(!showBulk)}
                className="text-indigo-600 text-sm font-semibold flex items-center gap-1 hover:underline mb-2"
              >
                {showBulk ? '− Quitar datos masivos' : '+ Pegar lista CSV / Excel ahora'}
              </button>
              
              {showBulk && (
                <div className="animate-in fade-in zoom-in-95 duration-200">
                  <p className="text-xs text-gray-400 mb-2">Pega tus datos aquí (Formato: Término, Definición). Puedes usar Tab, "," o ";".</p>
                  <textarea 
                    value={bulkData}
                    onChange={(e) => setBulkData(e.target.value)}
                    placeholder="correr, run&#10;saltar, jump&#10;hablar, talk"
                    className="w-full h-32 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button 
                type="button"
                onClick={() => { setIsCreating(false); setBulkData(''); setShowBulk(false); }}
                className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-indigo-700 transition shadow-md"
              >
                Crear y Empezar
              </button>
            </div>
          </form>
        </div>
      )}

      {filteredLists.length === 0 && !isCreating ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">No hay listas aún</h3>
          <p className="text-gray-500 mt-2">Crea tu primera lista para empezar a estudiar.</p>
        </div>
      ) : filteredLists.length === 0 && searchTerm ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">No se encontraron resultados</h3>
          <p className="text-gray-500 mt-1">Prueba con términos diferentes.</p>
          <button onClick={() => setSearchTerm('')} className="mt-4 text-indigo-600 font-bold hover:underline">Ver todas las listas</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLists.map(list => {
            const associations = list.associations || [];
            const activeAssociations = associations.filter((a: any) => !a.isArchived);
            const learnedCount = activeAssociations.filter((a: any) => a.isLearned || a.status === 'correct').length;
            const pendingCount = activeAssociations.filter((a: any) => a.status === 'pending').length;
            const cycle4Count = activeAssociations.filter((a: any) => a.currentCycle === 4).length;
            const canPlay = activeAssociations.length > 0;

            return (
              <div key={list.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition group">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                    {list.concept}
                  </span>
                  <button onClick={() => onDelete(list.id)} className="text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{list.name}</h3>
                <p className="text-gray-500 text-sm mb-2">
                  {activeAssociations.length} pairs
                </p>
                <div className="flex gap-2 text-xs mb-4">
                  {learnedCount > 0 && (
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-medium">
                      {learnedCount} learned
                    </span>
                  )}
                  {cycle4Count > 0 && (
                    <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded font-medium">
                      {cycle4Count} in cycle 4
                    </span>
                  )}
                  {pendingCount > 0 && (
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">
                      {pendingCount} pending
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => onPlay(list.id)} disabled={!canPlay} className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition">
                    Study
                  </button>
                  <button onClick={() => onEdit(list.id)} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition">
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
