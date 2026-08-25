import React, { useState, useMemo, useEffect } from 'react';
import { Attempt, AssociationList } from '../../types';

interface AttemptAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  attempt: Attempt;
  list: AssociationList;
  onUpdateExpectedAnswer: (associationId: string, field: 'term' | 'definition', value: string) => void;
}

const IGNORED_WORDS = new Set([
  'the', 'a', 'an', 'to', 'at', 'in', 'on', 'of', 'for', 'with', 'by',
  'from', 'as', 'and', 'or',
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'a', 'en', 'para', 'con', 'por',
]);

function normalizeString(s: string, ignoreArticles: boolean): string {
  const normalized = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-–—]+/g, ' ')
    .replace(/[^\w\s]/gi, '');

  if (!ignoreArticles) return normalized;

  return normalized
    .split(/\s+/)
    .filter((token) => token.length > 0 && !IGNORED_WORDS.has(token))
    .join(' ');
}

function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i += 1) {
    matrix[0][i] = i;
  }
  for (let j = 0; j <= b.length; j += 1) {
    matrix[j][0] = j;
  }
  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator,
      );
    }
  }
  return matrix[b.length][a.length];
}

export const AttemptAnalysisModal: React.FC<AttemptAnalysisModalProps> = ({
  isOpen,
  onClose,
  attempt,
  list,
  onUpdateExpectedAnswer,
}) => {
  if (!isOpen || !attempt) return null;

  const [isFixing, setIsFixing] = useState(false);
  const [fixedValue, setFixedValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ignoreArticles = list.settings.ignoreArticles === true;
  const isReversed = list.settings.flipOrder === 'reversed';
  const threshold = list.settings.threshold * 100;
  const updateField: 'term' | 'definition' = isReversed ? 'term' : 'definition';

  const userNormalized = useMemo(
    () => normalizeString(attempt.userInput, ignoreArticles),
    [attempt.userInput, ignoreArticles],
  );
  const expectedNormalized = useMemo(
    () => normalizeString(attempt.expectedAnswer, ignoreArticles),
    [attempt.expectedAnswer, ignoreArticles],
  );

  const comparison = useMemo(() => {
    const maxLen = Math.max(userNormalized.length, expectedNormalized.length);
    const chars: { user: string; expected: string; match: boolean }[] = [];
    for (let i = 0; i < maxLen; i++) {
      const u = userNormalized[i] || '';
      const e = expectedNormalized[i] || '';
      chars.push({
        user: u,
        expected: e,
        match: u === e && u !== '',
      });
    }
    return chars;
  }, [userNormalized, expectedNormalized]);

  const diffCount = useMemo(
    () => comparison.filter((c) => !c.match && (c.user || c.expected)).length,
    [comparison],
  );

  const distance = useMemo(
    () => levenshteinDistance(userNormalized, expectedNormalized),
    [userNormalized, expectedNormalized],
  );
  const longerLength = Math.max(userNormalized.length, expectedNormalized.length);
  const computedSimilarity =
    longerLength === 0 ? 100 : Math.round((1 - distance / longerLength) * 100);

  const possibleTypo = useMemo(() => {
    if (attempt.similarity >= threshold) return false;
    if (attempt.similarity < 70) return false;
    return distance <= 2;
  }, [attempt.similarity, threshold, distance]);

  useEffect(() => {
    if (isOpen) {
      setIsFixing(false);
      setFixedValue(attempt.userInput);
      setIsSubmitting(false);
    }
  }, [isOpen, attempt.userInput]);

  const handleStartFix = () => {
    setIsFixing(true);
    setFixedValue(attempt.userInput);
  };

  const handleSubmitFix = async () => {
    if (!fixedValue.trim()) return;
    setIsSubmitting(true);
    try {
      onUpdateExpectedAnswer(attempt.associationId, updateField, fixedValue.trim());
      setIsFixing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsFixing(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 bg-indigo-600 text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">¿Por qué {attempt.similarity}%?</h2>
            <p className="text-indigo-100 text-xs font-medium mt-1">
              Análisis de similitud · Umbral: {Math.round(threshold)}%
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-xl transition"
            aria-label="Cerrar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 bg-slate-50 max-h-[70vh] overflow-y-auto">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 mb-4">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              📝 Frase completa
            </div>
            <div className="text-base font-medium text-slate-800 leading-relaxed">
              {attempt.expectedAnswer.split(/\s+/).map((word, i) => {
                const normalizedWord = word
                  .toLowerCase()
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .replace(/[^\w]/gi, '');
                const isIgnored = ignoreArticles && IGNORED_WORDS.has(normalizedWord);
                return (
                  <span
                    key={i}
                    className={isIgnored ? 'text-slate-400 line-through mr-1.5' : 'mr-1.5'}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
            {ignoreArticles && (
              <div className="text-[10px] text-slate-500 mt-2 font-medium">
                ⚙️ Regla: ignoreArticles = true → palabras como "in", "the", "we" se
                ignoran en la comparación
              </div>
            )}
          </div>

          {possibleTypo && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <p className="text-xs font-bold text-amber-800">
                La respuesta esperada parece tener un typo. Tu respuesta es correcta,
                pero el sistema tiene un error de escritura.
              </p>
            </div>
          )}

          <div className="bg-white rounded-2xl p-4 border border-slate-200 mb-4">
            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">
              🔬 Comparación carácter por carácter
            </div>

            <div className="mb-3">
              <div className="text-[10px] font-bold text-slate-500 mb-1">
                🎤 Tu respuesta (normalizada)
              </div>
              <div className="flex flex-wrap gap-1">
                {comparison.map((char, i) => (
                  <span
                    key={`user-${i}`}
                    className={`inline-flex items-center justify-center min-w-[28px] h-8 px-1 rounded-md text-sm font-bold ${
                      char.match
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-amber-100 text-amber-800 border-b-2 border-amber-400'
                    }`}
                  >
                    {char.user || <span className="text-slate-300">·</span>}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <div className="text-[10px] font-bold text-slate-500 mb-1">
                💾 Respuesta esperada (normalizada)
              </div>
              <div className="flex flex-wrap gap-1">
                {comparison.map((char, i) => (
                  <span
                    key={`expected-${i}`}
                    className={`inline-flex items-center justify-center min-w-[28px] h-8 px-1 rounded-md text-sm font-bold ${
                      char.match
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-rose-100 text-rose-800 border-b-2 border-rose-400 line-through'
                    }`}
                  >
                    {char.expected || <span className="text-slate-300">·</span>}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-[10px] font-medium text-slate-600">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200" />
                Coinciden
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-amber-100 border-b-2 border-amber-400" />
                Tu versión
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-rose-100 border-b-2 border-rose-400" />
                Sistema (typo)
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 mb-4">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              📊 Desglose del puntaje
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase">
                  Distancia
                </div>
                <div className="text-lg font-black text-slate-800">{distance}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase">
                  Caracteres
                </div>
                <div className="text-lg font-black text-slate-800">
                  {longerLength}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase">
                  Diferencias
                </div>
                <div className="text-lg font-black text-rose-600">{diffCount}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase">
                  Umbral
                </div>
                <div className="text-lg font-black text-slate-800">
                  {Math.round(threshold)}%
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">
                  Similitud calculada
                </div>
                <div className="text-2xl font-black text-rose-600">
                  {computedSimilarity}%
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-sm font-black ${
                    attempt.similarity >= threshold
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {attempt.similarity >= threshold ? '✅ Pasa' : '❌ No pasa'}
                </div>
                <div className="text-[10px] text-slate-500">
                  por {diffCount} diferencia{diffCount !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              ✏️ Corregir respuesta esperada
            </div>

            {!isFixing ? (
              <div>
                <p className="text-xs text-slate-600 mb-3">
                  Si crees que la respuesta esperada tiene un typo, puedes
                  corregirla usando tu respuesta como base.
                </p>
                <button
                  onClick={handleStartFix}
                  className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 transition active:scale-95"
                >
                  Corregir respuesta esperada
                </button>
              </div>
            ) : (
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Nuevo valor para {updateField === 'term' ? 'término' : 'definición'}
                </label>
                <input
                  type="text"
                  value={fixedValue}
                  onChange={(e) => setFixedValue(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-base font-medium text-slate-800 focus:ring-4 focus:ring-indigo-100 outline-none transition mb-3"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSubmitFix}
                    disabled={isSubmitting || !fixedValue.trim()}
                    className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-emerald-700 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar corrección'}
                  </button>
                  <button
                    onClick={() => setIsFixing(false)}
                    className="px-4 py-3 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
