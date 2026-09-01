import React, { useEffect } from 'react';
import { CelebrationOverlayProps } from '../../types/celebration-overlay-props';

const AUTO_CLOSE_MS = 2500;

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({ celebration, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300"
      role="alert"
    >
      <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 px-5 py-4 flex items-center gap-4 max-w-sm">
        <div className="text-3xl flex-shrink-0">
          {celebration.type === 'goal' ? '🎯' : '🏆'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-slate-900 truncate">{celebration.message}</p>
          {celebration.subtitle && (
            <p className="text-xs text-slate-500 truncate">{celebration.subtitle}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          aria-label="Cerrar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
