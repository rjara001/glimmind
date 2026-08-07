import React, { useState } from 'react';
import { GameSummaryView } from './GameSummaryView';
import { RankingView } from './RankingView';

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

      {tab === 'summary' ? (
        <GameSummaryView onGoToSettings={onGoToSettings} />
      ) : (
        <RankingView onGoToSettings={onGoToSettings} />
      )}
    </div>
  );
};
