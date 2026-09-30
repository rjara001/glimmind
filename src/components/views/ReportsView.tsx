import React, { useState } from 'react';

interface ReportsViewProps {
  onBack: () => void;
  onGoToSettings: () => void;
}

type ReportsTab = 'summary' | 'ranking';

export const ReportsView: React.FC<ReportsViewProps> = ({ onBack, onGoToSettings }) => {
  const [tab, setTab] = useState<ReportsTab>('summary');

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          aria-label="Volver"
          className="text-gray-400 hover:text-indigo-600 transition p-2 hover:bg-white rounded-full"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Informes</h2>
          <p className="text-sm text-gray-500">Resumen de tus juegos y ranking de tarjetas.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('summary')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
            tab === 'summary' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:text-indigo-600'
          }`}
        >
          Resumen de juegos
        </button>
        <button
          onClick={() => setTab('ranking')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
            tab === 'ranking' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:text-indigo-600'
          }`}
        >
          Ranking
        </button>
      </div>

      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 002-2V5a2 2 0 012-2h2a2 2 0 002-2V1a2 2 0 012-2h2a2 2 0 012 2v3a2 2 0 002 2h2a2 2 0 002-2V1a2 2 0 012-2h2a2 2 0 012 2v3a2 2 0 002 2h2a2 2 0 012 2v3a2 2 0 01-2 2h-2a2 2 0 01-2 2v3a2 2 0 01-2 2H7a2 2 0 01-2-2v-3a2 2 0 00-2-2H5a2 2 0 00-2 2v3a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">{tab === 'summary' ? 'Resumen de juegos' : 'Ranking de tarjetas'}</h3>
        <p className="mt-2 text-gray-500">
          Esta funcionalidad está en desarrollo. Pronto podrás ver tus estadísticas aquí.
        </p>
        <button
          onClick={onGoToSettings}
          className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
        >
          Ir a Configuración
        </button>
      </div>
    </div>
  );
};