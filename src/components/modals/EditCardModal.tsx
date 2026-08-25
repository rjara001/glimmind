import React, { useEffect, useRef, useState } from 'react';
import { getLanguageFlag } from '../../services/voice/languageFlags';

interface EditCardModalProps {
  labelTerm: string;
  labelDef: string;
  initialTerm: string;
  initialDef: string;
  voiceTermLang?: string;
  voiceDefLang?: string;
  onSave: (term: string, definition: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export const EditCardModal: React.FC<EditCardModalProps> = ({
  labelTerm,
  labelDef,
  initialTerm,
  initialDef,
  voiceTermLang,
  voiceDefLang,
  onSave,
  onDelete,
  onClose,
}) => {
  const termInputRef = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState(initialTerm || '');
  const [definition, setDefinition] = useState(initialDef || '');

  useEffect(() => {
    setTerm(initialTerm || '');
    setDefinition(initialDef || '');
  }, [initialTerm, initialDef]);

  useEffect(() => {
    requestAnimationFrame(() => {
      termInputRef.current?.focus();
      termInputRef.current?.select();
    });
  }, []);

  const handleSave = () => {
    onSave(term, definition);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const renderLabel = (label: string, lang: string | undefined) => {
    const flag = getLanguageFlag(lang);
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-sm leading-none">{flag}</span>
        <span>{label}</span>
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Editar tarjeta"
        className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8 space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Editar tarjeta</h2>
          <div>
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">
              {renderLabel(labelTerm, voiceTermLang)}
            </label>
            <input
              ref={termInputRef}
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-white border-2 border-indigo-100 rounded-2xl px-5 py-3 text-xl sm:text-2xl font-black text-slate-900 placeholder-slate-300 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-center"
              placeholder="Term"
            />
          </div>
          <div>
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">
              {renderLabel(labelDef, voiceDefLang)}
            </label>
            <textarea
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-white border-2 border-indigo-100 rounded-2xl px-5 py-3 text-lg sm:text-xl font-bold text-slate-800 placeholder-slate-300 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-center resize-none"
              placeholder="Definition"
              rows={2}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 transition-all"
            >
              Guardar
            </button>
            <button
              onClick={onClose}
              className="px-6 bg-white border-2 border-slate-200 text-slate-600 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
          </div>
          <div className="pt-1 flex justify-center">
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-all"
              aria-label="Eliminar tarjeta"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar tarjeta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
