import React, { useRef, useEffect } from 'react';
import { getLanguageFlag } from '../../services/voice/languageFlags';

interface CardEditFormProps {
  labelTerm: string;
  labelDef: string;
  initialTerm: string;
  initialDef: string;
  onSave: (term: string, definition: string) => void;
  onCancel: () => void;
  voiceTermLang?: string;
  voiceDefLang?: string;
}

export const CardEditForm: React.FC<CardEditFormProps> = ({
  labelTerm,
  labelDef,
  initialTerm,
  initialDef,
  onSave,
  onCancel,
  voiceTermLang,
  voiceDefLang,
}) => {
  const editTermRef = useRef<HTMLInputElement>(null);
  const editDefRef = useRef<HTMLTextAreaElement>(null);
  const [editTerm, setEditTerm] = React.useState(initialTerm || '');
  const [editDef, setEditDef] = React.useState(initialDef || '');

  React.useEffect(() => {
    setEditTerm(initialTerm || '');
    setEditDef(initialDef || '');
  }, [initialTerm, initialDef]);

  React.useEffect(() => {
    requestAnimationFrame(() => {
      editTermRef.current?.focus();
      editTermRef.current?.select();
    });
  }, []);

  const handleSave = () => {
    onSave(editTerm, editDef);
  };

  const handleCancel = () => {
    setEditTerm(initialTerm || '');
    setEditDef(initialDef || '');
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
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
    <div className="w-full max-w-full sm:max-w-2xl mx-auto space-y-4">
      <div>
        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">{renderLabel(labelTerm, voiceTermLang)}</label>
        <input
          ref={editTermRef}
          type="text"
          value={editTerm}
          onChange={(e) => setEditTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-white border-2 border-indigo-100 rounded-2xl px-5 py-3 text-xl sm:text-2xl font-black text-slate-900 placeholder-slate-300 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-center"
          placeholder="Term"
        />
      </div>
      <div>
        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">{renderLabel(labelDef, voiceDefLang)}</label>
        <textarea
          ref={editDefRef as any}
          value={editDef}
          onChange={(e) => setEditDef(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-white border-2 border-indigo-100 rounded-2xl px-5 py-3 text-lg sm:text-xl font-bold text-slate-800 placeholder-slate-300 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-center resize-none"
          placeholder="Definition"
          rows={2}
        />
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 transition-all"
        >
          Guardar
        </button>
        <button
          onClick={handleCancel}
          className="px-6 bg-white border-2 border-slate-200 text-slate-600 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};
