import React from 'react';

interface CardToolbarProps {
  showEditButton: boolean;
  onStartEdit?: () => void;
  revealed: boolean;
  onSpeakAnswer?: (text: string, lang: string) => void;
  displayDef?: string;
  voiceDefLang?: string;
}

export const CardToolbar: React.FC<CardToolbarProps> = ({
  showEditButton,
  onStartEdit,
  revealed,
  onSpeakAnswer,
  displayDef,
  voiceDefLang,
}) => {
  return (
    <>
      {showEditButton && (
        <button
          onClick={onStartEdit}
          className="absolute top-4 right-4 text-slate-300 hover:text-indigo-500 transition-all p-2 rounded-xl hover:bg-white/50"
          aria-label="Edit card"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L18 9.375M19.5 7.125L16.5 4.125M19.5 7.125H16.5" />
          </svg>
        </button>
      )}
      {revealed && onSpeakAnswer && displayDef && (
        <button
          onClick={() => onSpeakAnswer(displayDef, voiceDefLang || 'es')}
          className="absolute top-4 right-14 text-slate-300 hover:text-indigo-500 transition-all p-2 rounded-xl hover:bg-white/50"
          aria-label="Escuchar respuesta"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
        </button>
      )}
    </>
  );
};
