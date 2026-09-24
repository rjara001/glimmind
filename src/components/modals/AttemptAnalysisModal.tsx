import React, { useState, useMemo, useEffect } from 'react';
import { Attempt, AssociationList } from '../../types';
import { alignWords, normalize, levenshteinDistance } from '../../utils/wordAlignment';

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
  const normalized = normalize(s);

  if (!ignoreArticles) return normalized;

  return normalized
    .split(/\s+/)
    .filter((token) => token.length > 0 && !IGNORED_WORDS.has(token))
    .join(' ');
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
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const ignoreArticles = list.settings.ignoreArticles === true;
  const isReversed = list.settings.flipOrder === 'reversed';
  const threshold = list.settings.threshold * 100;
  const updateField: 'term' | 'definition' = isReversed ? 'term' : 'definition';

  const alignment = useMemo(
    () => (attempt ? alignWords(attempt.userInput, attempt.expectedAnswer) : null),
    [attempt]
  );

  if (!alignment) return null;

  const userNormalized = useMemo(
    () => normalizeString(attempt.userInput, ignoreArticles),
    [attempt.userInput, ignoreArticles],
  );
  const expectedNormalized = useMemo(
    () => normalizeString(attempt.expectedAnswer, ignoreArticles),
    [attempt.expectedAnswer, ignoreArticles],
  );

  const distance = useMemo(
    () => levenshteinDistance(userNormalized, expectedNormalized),
    [userNormalized, expectedNormalized],
  );
  const longerLength = Math.max(userNormalized.length, expectedNormalized.length);
  const computedSimilarity =
    longerLength === 0 ? 100 : Math.round((1 - distance / longerLength) * 100);

  const diffCount = useMemo(
    () => alignment.words.filter((w) => w.status !== 'correct').length,
    [alignment],
  );

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
              🔬 Comparación palabra por palabra
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="w-8 text-center py-2">#</th>
                    <th className="text-left py-2 px-3">Tu respuesta</th>
                    <th className="text-left py-2 px-3">Sistema</th>
                    <th className="w-40 text-center py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {alignment.words.map((word, i) => (
                    <React.Fragment key={i}>
                      <tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="w-8 text-center py-2 text-slate-500 font-medium">{word.index}</td>
                        <td className="py-2 px-3 font-mono text-slate-800">
                          {word.userWord || <span className="text-slate-400">—</span>}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-800">
                          {word.systemWord || <span className="text-slate-400">—</span>}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black ${
                                word.status === 'correct'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : word.status === 'similar'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {word.status === 'correct' && '✅'}
                              {word.status === 'similar' && '⚠️'}
                              {word.status === 'wrong' && '❌'}
                            </span>
                            {word.status !== 'correct' && (
                              <button
                                onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                                className="text-slate-400 hover:text-slate-600 transition font-mono text-xs"
                                aria-label={expandedIndex === i ? 'Contraer' : 'Expandir'}
                              >
                                {expandedIndex === i ? '▲' : '▼'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedIndex === i && word.charDiff.length > 0 && (
                        <tr>
                          <td colSpan={4} className="p-0">
                            <div className="bg-slate-50 border-t border-slate-200 animate-in slide-down-2 duration-200">
                              <div className="p-3">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                        <th className="w-10 text-center py-1">Pos</th>
                                        <th className="text-left py-1 px-2">Tu letra</th>
                                        <th className="text-left py-1 px-2">Sistema</th>
                                        <th className="w-24 text-center py-1">Tipo</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {word.charDiff.map((diff, j) => (
                                        <tr key={j} className="border-b border-slate-100 last:border-0">
                                          <td className="w-10 text-center py-1 text-slate-500">{diff.index + 1}</td>
                                          <td className="py-1 px-2 font-mono">
                                            {diff.type === 'match' && diff.char}
                                            {diff.type === 'diff' && diff.userChar}
                                            {diff.type === 'extra' && diff.char}
                                            {diff.type === 'missing' && <span className="text-slate-300">—</span>}
                                          </td>
                                          <td className="py-1 px-2 font-mono">
                                            {diff.type === 'match' && diff.char}
                                            {diff.type === 'diff' && diff.systemChar}
                                            {diff.type === 'extra' && <span className="text-slate-300">—</span>}
                                            {diff.type === 'missing' && diff.char}
                                          </td>
                                          <td className="py-1 px-2 text-center">
                                            <span
                                              className={`inline-flex items-center justify-center w-20 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                diff.type === 'match'
                                                  ? 'bg-emerald-100 text-emerald-800'
                                                  : diff.type === 'diff'
                                                  ? 'bg-amber-100 text-amber-800'
                                                  : diff.type === 'extra'
                                                  ? 'bg-rose-100 text-rose-800'
                                                  : 'bg-rose-50 text-rose-600 border-b-2 border-dotted border-rose-400'
                                              }`}
                                            >
                                              {diff.type === 'match' && '✓'}
                                              {diff.type === 'diff' && '↔'}
                                              {diff.type === 'extra' && '+'}
                                              {diff.type === 'missing' && '−'}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                <p className="mt-2 text-xs font-medium text-slate-600">{word.hint}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 text-right text-sm font-medium text-slate-600">
              {alignment.stats.correct} / {alignment.stats.total} palabras correctas
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
