import React, { useState, useCallback, useMemo } from 'react';
import { VocabularyResult, DeckSizeOption, VocabularyLevel } from '../../types/youtube-deck';
import { youtubeDeckService } from '../../services/youtubeDeckService';
import { useGameStore } from '../../store/gameStore';
import { FunctionCallError } from '../../services/callFunction';
import { QuotaService } from '../../services/quotaService';
import { useToast } from '../layout/Toast';

const DECK_SIZE_OPTIONS: DeckSizeOption[] = [
  { tier: 'express', label: 'Express', description: 'Rápido', terms: 20, costPercent: 15 },
  { tier: 'standard', label: 'Standard', description: 'Recomendado', terms: 40, costPercent: 30 },
  { tier: 'extended', label: 'Extended', description: 'Profundo', terms: 80, costPercent: 60 },
  { tier: 'massive', label: 'Massive', description: 'Completo', terms: 150, costPercent: 100 },
];

const DEFAULT_TIER = DECK_SIZE_OPTIONS[1];
const DEFAULT_LEVEL: VocabularyLevel = 'b2c1';

const TIER_COLORS: Record<string, string> = {
  express: 'bg-emerald-500',
  standard: 'bg-amber-400',
  extended: 'bg-orange-500',
  massive: 'bg-red-700',
};

const TIER_SELECTED_RING: Record<string, string> = {
  express: 'ring-emerald-500 border-emerald-500',
  standard: 'ring-amber-500 border-amber-500',
  extended: 'ring-orange-500 border-orange-500',
  massive: 'ring-red-700 border-red-700',
};

const TARGET_LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Alemán' },
  { code: 'fr', label: 'Francés' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Portugués' },
  { code: 'en', label: 'Inglés' },
];

const LEVEL_OPTIONS: { value: VocabularyLevel; label: string; hint: string }[] = [
  { value: 'b1', label: 'B1 Intermedio', hint: 'Vocabulario cotidiano y frases útiles' },
  { value: 'b2c1', label: 'B2-C1 Avanzado', hint: 'Phrasal verbs, idioms y coloquialismos' },
];

interface CreateYouTubeDeckModalProps {
  onClose: () => void;
  onSuccess: (result: VocabularyResult) => void;
}

export const CreateYouTubeDeckModal: React.FC<CreateYouTubeDeckModalProps> = ({ onClose, onSuccess }) => {
  const { showToast } = useToast();
  const quota = useGameStore((state) => state.quota);
  const [url, setUrl] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tier, setTier] = useState<DeckSizeOption>(DEFAULT_TIER);
  const [level, setLevel] = useState<VocabularyLevel>(DEFAULT_LEVEL);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [manualTranscript, setManualTranscript] = useState('');
  const [isSubmittingFallback, setIsSubmittingFallback] = useState(false);

  const effectiveMaxTerms = showAdvanced ? tier.terms : DEFAULT_TIER.terms;
  const effectiveLevel = showAdvanced ? level : DEFAULT_LEVEL;
  const effectiveCost = showAdvanced ? tier.costPercent : DEFAULT_TIER.costPercent;

  const remainingPoints = quota ? Math.max(0, quota.ytAiDailyLimit - quota.ytAiUsedToday) : null;
  const remainingPercent = quota && quota.ytAiDailyLimit > 0
    ? Math.round((remainingPoints! / quota.ytAiDailyLimit) * 100)
    : null;

  const affordableTierLabels = useMemo(() => {
    if (remainingPoints === null) return [];
    return DECK_SIZE_OPTIONS
      .filter((option) => option.costPercent <= remainingPoints)
      .map((option) => option.label);
  }, [remainingPoints]);

  const quotaMessage = useMemo(() => {
    if (!quota || remainingPoints === null) return null;
    if (remainingPoints < DECK_SIZE_OPTIONS[0].costPercent) {
      return { type: 'exhausted' as const, text: 'Reducción de cuota alcanzada por hoy. Se reinicia a medianoche.' };
    }
    if (remainingPoints < effectiveCost) {
      const options = affordableTierLabels.join(' o ');
      return { type: 'warning' as const, text: `Te queda cuota suficiente para un mazo ${options}` };
    }
    return { type: 'ok' as const, text: `Dispones del ${remainingPercent}% de tu cuota diaria de análisis` };
  }, [quota, remainingPoints, remainingPercent, effectiveCost, affordableTierLabels]);

  const canSubmit = useMemo(() => {
    if (isLoading) return false;
    if (!quota || remainingPoints === null) return true;
    return remainingPoints >= effectiveCost;
  }, [isLoading, quota, remainingPoints, effectiveCost]);

  const isValidYouTubeUrl = useCallback((value: string): boolean => {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[A-Za-z0-9_-]{11}/;
    return pattern.test(value.trim());
  }, []);

  const toggleAdvanced = useCallback(() => {
    if (showAdvanced) {
      setTier(DEFAULT_TIER);
      setLevel(DEFAULT_LEVEL);
    }
    setShowAdvanced(!showAdvanced);
  }, [showAdvanced]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!isValidYouTubeUrl(trimmed)) {
      setError('Ingresa una URL de YouTube válida');
      return;
    }

    const quota = useGameStore.getState().quota;
    const tier = quota?.tier || 'free';
    const currentCards = useGameStore.getState().lists.reduce((sum, l) => sum + (l.associations?.length || 0), 0);
    const status = QuotaService.getStatus(currentCards, tier);

    if (status.isAiBlocked) {
      const message = status.level === 'blocked'
        ? `Llegaste al límite de tarjetas (${status.currentCards}/${status.maxCards}). Liberá espacio para usar IA.`
        : `Te quedan pocas tarjetas disponibles (${status.remainingCards}). Liberá espacio para usar IA.`;
      setError(message);
      showToast(message, 'error');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const result = await youtubeDeckService.createVocabularyDeck(trimmed, {
        maxTerms: effectiveMaxTerms,
        targetLanguage,
        level: effectiveLevel,
      });
      await useGameStore.getState().loadQuota();
      onSuccess(result);
    } catch (err) {
      const callError = err as FunctionCallError;
      if (callError.code === 'SUBTITLES_UNAVAILABLE' || callError.fallbackAvailable) {
        setShowFallback(true);
        setError(callError.message || 'No se pudieron obtener los subtítulos. Usa la opción manual.');
        return;
      }
      setError(err instanceof Error ? err.message : 'Error al procesar el video');
    } finally {
      setIsLoading(false);
    }
  }, [url, isValidYouTubeUrl, effectiveMaxTerms, targetLanguage, effectiveLevel, onSuccess]);

  const handleManualSubmit = useCallback(async () => {
    const trimmedText = manualTranscript.trim();
    if (!trimmedText) {
      setError('Pega la transcripción antes de generar la baraja');
      return;
    }
    setError(null);
    setIsSubmittingFallback(true);
    try {
      const result = await youtubeDeckService.createDeckFromText(trimmedText, {
        videoUrl: url.trim() || undefined,
        maxTerms: effectiveMaxTerms,
        targetLanguage,
        level: effectiveLevel,
      });
      await useGameStore.getState().loadQuota();
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar la baraja desde la transcripción');
    } finally {
      setIsSubmittingFallback(false);
    }
  }, [manualTranscript, url, effectiveMaxTerms, targetLanguage, effectiveLevel, onSuccess]);

  const quotaBarColor = quotaMessage?.type === 'exhausted' ? 'bg-red-500' : 'bg-indigo-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Crear baraja desde YouTube</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">URL del video</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            />
          </div>

          {showFallback && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-sm">⚠️</span>
                <p className="text-sm text-amber-800">
                  No pudimos acceder a los subtítulos automáticamente. Puedes obtener la transcripción
                  en{' '}
                  <a
                    href="https://youtubetranscript.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-amber-900 underline hover:text-amber-700"
                  >
                    youtubetranscript.com
                  </a>{' '}
                  y pegarla aquí abajo para generar la baraja manualmente.
                </p>
              </div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Transcripción del video</label>
              <textarea
                value={manualTranscript}
                onChange={(e) => setManualTranscript(e.target.value)}
                rows={6}
                placeholder="Pega aquí la transcripción completa del video..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                disabled={isSubmittingFallback}
              />
              <button
                type="button"
                onClick={handleManualSubmit}
                disabled={isSubmittingFallback}
                className="w-full px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                {isSubmittingFallback ? 'Generando baraja...' : 'Generar Baraja desde Transcripción'}
              </button>
            </div>
          )}

          <div>
            <span className="block text-sm font-semibold text-gray-700 mb-1">Idioma de traducción</span>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              disabled={isLoading}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {TARGET_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-3">
            <span className="text-sm">⚡</span>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Mazo recomendado:</span> {DEFAULT_TIER.terms} tarjetas (Nivel {LEVEL_OPTIONS[1].label})
            </p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={toggleAdvanced}
              aria-expanded={showAdvanced}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-indigo-600 transition"
            >
              <span>⚙️ Opciones avanzadas</span>
              <svg
                className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-5">
                <div>
                  <span className="block text-sm font-semibold text-gray-700 mb-2">Tamaño de la baraja</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DECK_SIZE_OPTIONS.map((option) => {
                      const selected = option.tier === tier.tier;
                      return (
                        <button
                          key={option.tier}
                          type="button"
                          onClick={() => setTier(option)}
                          aria-pressed={selected}
                          className={`relative border rounded-xl p-3 text-left transition ${selected
                            ? `ring-2 ${TIER_SELECTED_RING[option.tier]} bg-white`
                            : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                        >
                          <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${TIER_COLORS[option.tier]}`} />
                          <span className="text-sm font-semibold text-gray-900">{option.label}</span>
                          <span className="text-xs text-gray-500"> ({option.description})</span>
                          <div className="mt-1 text-2xl font-bold text-gray-900">{option.terms}</div>
                          <div className="text-[11px] font-medium text-gray-500">términos</div>
                          {option.description === 'Recomendado' && (
                            <span className="absolute top-2 right-2 text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full bg-indigo-600">
                              {option.description}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="block text-sm font-semibold text-gray-700 mb-2">Perfil de foco</span>
                  <div className="grid grid-cols-2 gap-2">
                    {LEVEL_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setLevel(option.value)}
                        aria-pressed={level === option.value}
                        className={`rounded-lg border px-3 py-2 text-left transition ${level === option.value
                          ? 'ring-2 ring-indigo-500 border-indigo-500 bg-white'
                          : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                      >
                        <div className="text-sm font-semibold text-gray-900">{option.label}</div>
                        <div className="text-[11px] text-gray-500 leading-tight">{option.hint}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {quotaMessage && (
            <div>
              <p className={`text-xs font-medium mb-1 ${quotaMessage.type === 'exhausted' ? 'text-red-600' : quotaMessage.type === 'warning' ? 'text-amber-700' : 'text-emerald-700'}`}>
                {quotaMessage.type === 'ok' ? '⚡' : quotaMessage.type === 'warning' ? '⚠️' : '🔴'} {quotaMessage.text}
              </p>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${quotaBarColor}`}
                  style={{ width: `${Math.min(100, remainingPercent ?? 0)}%` }}
                />
              </div>
            </div>
          )}

          {error && <p className="text-red-600 text-xs">{error}</p>}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-2">
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <span>ℹ️</span> Procesa automáticamente hasta los primeros 60 minutos del vídeo.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                {isLoading ? 'Procesando...' : 'Analizar vídeo'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};