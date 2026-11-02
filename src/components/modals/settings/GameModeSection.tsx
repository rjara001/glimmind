import React from 'react';
import { useTranslation } from 'react-i18next';

interface GameModeSectionProps {
  isPracticeMode: boolean;
  onModeChange: (mode: 'training' | 'real') => void;
}

export const GameModeSection: React.FC<GameModeSectionProps> = ({
  isPracticeMode,
  onModeChange,
}) => {
  const { t } = useTranslation('settings');

  return (
    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
        {t('game_mode', 'Game Mode')}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onModeChange('training')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
            isPracticeMode
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-500 border border-slate-200'
          }`}
        >
          {t('practice', 'Practice')}
        </button>
        <button
          onClick={() => onModeChange('real')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
            !isPracticeMode
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-500 border border-slate-200'
          }`}
        >
          {t('real', 'Real')}
        </button>
      </div>
    </div>
  );
};
