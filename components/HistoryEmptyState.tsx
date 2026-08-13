import React from 'react';

interface HistoryEmptyStateProps {
  title: string;
  description: string;
  onGoToSettings: () => void;
}

export const HistoryEmptyState: React.FC<HistoryEmptyStateProps> = ({ title, description, onGoToSettings }) => {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
      <div className="w-14 h-14 mx-auto mb-4 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-500 mt-2 max-w-md mx-auto">{description}</p>
      <button onClick={onGoToSettings} className="mt-4 text-indigo-600 font-bold hover:underline">
        Ir a Configuración
      </button>
    </div>
  );
};
