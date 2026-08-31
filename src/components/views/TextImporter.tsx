import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { VocabularyItem } from '../../types/youtube-deck';
import type { Association } from '../../types';
import type { VocabularySourceMeta } from '../modals/VocabularyPreview';
import { useGameStore } from '../../store/gameStore';
import { youtubeDeckService } from '../../services/youtubeDeckService';
import { translationService } from '../../services/translationService';
import { QuotaService } from '../../services/quotaService';
import { useToast } from '../layout/Toast';
import { GUEST_UID } from '../../constants/app';

interface SelectionMenu {
  text: string;
  x: number;
  y: number;
}

interface TextImporterProps {
  onSave: (associations: Association[], sourceMeta: VocabularySourceMeta) => void;
  onBack: () => void;
}

type ImporterMode = 'EDIT_MODE' | 'READ_MODE';

const DEFAULT_TARGET_LANGUAGE = 'es';
const DEFAULT_SOURCE_LANGUAGE = 'en';

export const TextImporter: React.FC<TextImporterProps> = ({ onSave, onBack }) => {
  const { showToast } = useToast();
  const user = useGameStore((state) => state.user);
  const userId = user?.uid || GUEST_UID;

  const [mode, setMode] = useState<ImporterMode>('EDIT_MODE');
  const [rawText, setRawText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vocabularyItems, setVocabularyItems] = useState<VocabularyItem[]>([]);
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenu | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [manualInput, setManualInput] = useState<{ text: string; translation: string } | null>(null);
  const [deckTitle, setDeckTitle] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = rawText.trim();
    if (!trimmed) {
      setError('Pegá o escribí el texto antes de generar vocabulario');
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
      const result = await youtubeDeckService.createDeckFromText(trimmed, {
        maxTerms: 40,
        targetLanguage: DEFAULT_TARGET_LANGUAGE,
        level: 'b2c1',
      });
      const sourceText = result.rawSourceText ?? trimmed;
      setRawText(sourceText);
      setVocabularyItems(result.items);
      setDeckTitle(result.title || '');
      setMode('READ_MODE');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al generar vocabulario';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [rawText, showToast]);

  const handleDeleteTerm = useCallback((term: string) => {
    setVocabularyItems((prev) => prev.filter((item) => item.term !== term));
    setActiveTooltip(null);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (mode !== 'READ_MODE') return;
    if (manualInput) return;

    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    if (!selectedText || selectedText.length === 0 || !selection || selection.rangeCount === 0) {
      setSelectionMenu(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setSelectionMenu(null);
      return;
    }

    setSelectionMenu({
      text: selectedText,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  }, [mode, manualInput]);

  const hideSelectionMenu = useCallback(() => {
    setSelectionMenu(null);
    setManualInput(null);
  }, []);

  const handleAddSelection = useCallback(async () => {
    if (!selectionMenu) return;
    const text = selectionMenu.text;

    window.getSelection()?.removeAllRanges();
    setSelectionMenu(null);

    if (!text) return;

    const alreadyAdded = vocabularyItems.some(
      (item) => item.term.toLowerCase() === text.toLowerCase()
    );
    if (alreadyAdded) {
      showToast('Ese fragmento ya está en la lista', 'error');
      return;
    }

    if (user?.uid === GUEST_UID) {
      const newItem: VocabularyItem = {
        term: text,
        type: text.split(' ').length > 1 ? 'phrase' : 'word',
        frequency: 1,
        example: '',
        context: '',
        start: 0,
        score: 1,
        translation: '',
        metadata: { difficulty: 'basic', frequencyRank: 0, tags: [] },
      };
      setVocabularyItems((prev) => [...prev, newItem]);
      showToast('Fragmento agregado (modo invitado)', 'success');
      return;
    }

    setIsTranslating(true);
    try {
      const response = await translationService.translateBatch(
        userId,
        [{ term: text, context: rawText }],
        DEFAULT_TARGET_LANGUAGE,
        DEFAULT_SOURCE_LANGUAGE
      );

      const translation = response.translations[0]?.translated ?? '';
      const newItem: VocabularyItem = {
        term: text,
        type: text.split(' ').length > 1 ? 'phrase' : 'word',
        frequency: 1,
        example: '',
        context: rawText.slice(0, 200),
        start: 0,
        score: 1,
        translation,
        metadata: { difficulty: 'basic', frequencyRank: 0, tags: [] },
      };
      setVocabularyItems((prev) => [...prev, newItem]);
      showToast('Fragmento agregado con traducción', 'success');
    } catch (err) {
      setManualInput({ text, translation: '' });
    } finally {
      setIsTranslating(false);
    }
  }, [selectionMenu, vocabularyItems, user?.uid, userId, rawText, showToast]);

  const handleManualTranslationSave = useCallback(() => {
    if (!manualInput) return;
    const newItem: VocabularyItem = {
      term: manualInput.text,
      type: manualInput.text.split(' ').length > 1 ? 'phrase' : 'word',
      frequency: 1,
      example: '',
      context: rawText.slice(0, 200),
      start: 0,
      score: 1,
      translation: manualInput.translation || undefined,
      metadata: { difficulty: 'basic', frequencyRank: 0, tags: [] },
    };
    setVocabularyItems((prev) => [...prev, newItem]);
    setManualInput(null);
    showToast('Fragmento agregado manualmente', 'success');
  }, [manualInput, rawText, showToast]);

  const handleSave = useCallback(() => {
    const associations: Association[] = vocabularyItems.map((item) => ({
      id: crypto.randomUUID(),
      term: item.term,
      definition: [item.translation || item.example || ''],
      translation: item.translation || undefined,
      context: item.context || '',
      metadata: item.metadata,
      currentCycle: 1,
      status: 'pending' as const,
      isLearned: false,
      isArchived: false,
    }));

    onSave(associations, {
      sourceType: 'raw_text',
      rawSourceText: rawText,
      title: deckTitle || undefined,
    });
  }, [vocabularyItems, rawText, onSave, deckTitle]);

  const handleBackToEdit = useCallback(() => {
    setMode('EDIT_MODE');
    setActiveTooltip(null);
    setSelectionMenu(null);
    setManualInput(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideSelectionMenu();
        setActiveTooltip(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hideSelectionMenu]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectionMenu && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        hideSelectionMenu();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectionMenu, hideSelectionMenu]);

  const highlightedContent = useMemo(() => {
    if (mode !== 'READ_MODE' || !rawText || vocabularyItems.length === 0) {
      return rawText;
    }

    const sorted = [...vocabularyItems].sort((a, b) => b.term.length - a.term.length);
    const escapedTerms = sorted.map((item) => item.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = new RegExp(`(${escapedTerms.join('|')})`, 'gi');

    const parts = rawText.split(pattern);
    const termMap = new Map<string, VocabularyItem>();
    for (const item of vocabularyItems) {
      termMap.set(item.term.toLowerCase(), item);
    }

    const nodes: React.ReactNode[] = [];
    let key = 0;

    for (const part of parts) {
      if (!part) continue;
      const matchedItem = termMap.get(part.toLowerCase());
      if (matchedItem) {
        const termKey = matchedItem.term;
        const isTooltipOpen = activeTooltip === termKey;
        nodes.push(
          <span
            key={key++}
            className="relative inline-block"
            onMouseEnter={() => setActiveTooltip(termKey)}
            onMouseLeave={() => setActiveTooltip(null)}
          >
            <mark
              className={`bg-amber-100 text-amber-900 rounded px-0.5 cursor-pointer transition-colors ${
                isTooltipOpen ? 'bg-amber-200' : 'hover:bg-amber-200'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveTooltip(isTooltipOpen ? null : termKey);
              }}
            >
              {part}
            </mark>
            {isTooltipOpen && (
              <span
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl z-50 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-semibold text-sm">{matchedItem.translation || matchedItem.example || 'Sin traducción'}</span>
                </div>
                {matchedItem.metadata?.tags && matchedItem.metadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 mb-2">
                    {matchedItem.metadata.tags.map((tag) => (
                      <span key={tag} className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-gray-700 text-gray-200 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteTerm(matchedItem.term)}
                  className="mt-1 text-red-300 hover:text-red-100 text-[11px] font-medium flex items-center gap-1"
                >
                  🗑️ Descartar
                </button>
                <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
              </span>
            )}
          </span>
        );
      } else {
        nodes.push(<span key={key++}>{part}</span>);
      }
    }

    return nodes;
  }, [rawText, vocabularyItems, mode, activeTooltip, handleDeleteTerm]);

  if (mode === 'EDIT_MODE') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">📝 Crear Mazo desde Texto Libre</h2>
              <p className="text-sm text-gray-500 mt-1">Pegá un artículo, transcripción o texto y generamos vocabulario automáticamente.</p>
            </div>
            <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Texto fuente</label>
              <textarea
                ref={textareaRef}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={12}
                placeholder="Pegá aquí el texto del que querés extraer vocabulario..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-mono leading-relaxed"
                disabled={isLoading}
              />
            </div>

            {error && <p className="text-red-600 text-xs mb-3">{error}</p>}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition shadow-md"
              >
                {isLoading ? 'Procesando...' : 'Generar vocabulario'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6" ref={containerRef}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">📝 Crear Mazo desde Texto Libre</h2>
            <p className="text-sm text-gray-500 mt-1">Revisá las expresiones detectadas y ajustalas antes de guardar.</p>
          </div>
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBackToEdit}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium"
          >
            ✏️ Editar texto fuente
          </button>
          <span className="text-sm font-semibold text-gray-600">
            ✓ Se encontraron {vocabularyItems.length} términos
          </span>
        </div>

        {deckTitle && (
          <div className="mb-4 flex items-center gap-2">
            <label htmlFor="deck-title" className="text-sm font-semibold text-gray-700 whitespace-nowrap">
              Nombre del mazo:
            </label>
            <input
              id="deck-title"
              type="text"
              value={deckTitle}
              onChange={(e) => setDeckTitle(e.target.value)}
              placeholder="Nombre del mazo"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        <div
          className="border border-gray-200 rounded-xl p-6 mb-4 leading-relaxed text-gray-800 text-base select-text"
          onMouseUp={handleMouseUp}
        >
          {highlightedContent}
        </div>

        {vocabularyItems.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2">Lista de Tarjetas a Generar:</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {vocabularyItems.map((item) => (
                <div key={item.term} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-gray-900 truncate">{item.term}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-gray-600 truncate">{item.translation || item.example || 'Sin traducción'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteTerm(item.term)}
                    className="ml-2 text-gray-400 hover:text-red-500 transition flex-shrink-0"
                    title="Descartar"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={vocabularyItems.length === 0}
            className="px-6 py-2.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition shadow-md"
          >
            💾 Guardar Mazo en Firestore
          </button>
        </div>
      </div>

      {selectionMenu && !manualInput && (
        <div
          className="fixed z-50"
          style={{ left: selectionMenu.x, top: selectionMenu.y, transform: 'translate(-50%, -100%)' }}
        >
          <button
            type="button"
            onClick={handleAddSelection}
            disabled={isTranslating}
            className="whitespace-nowrap px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg shadow-xl hover:bg-gray-800 disabled:bg-gray-500 disabled:cursor-not-allowed transition flex items-center gap-1"
          >
            {isTranslating ? 'Traduciendo...' : '➕ Agregar al mazo'}
          </button>
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
        </div>
      )}

      {selectionMenu && manualInput && (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-72"
          style={{ left: selectionMenu.x, top: selectionMenu.y, transform: 'translate(-50%, -100%)' }}
        >
          <p className="text-xs font-semibold text-gray-700 mb-2">Agregar traducción manual</p>
          <p className="text-sm font-medium text-gray-900 mb-2 truncate">{manualInput.text}</p>
          <input
            type="text"
            value={manualInput.translation}
            onChange={(e) => setManualInput({ ...manualInput, translation: e.target.value })}
            placeholder="Traducción..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleManualTranslationSave}
              className="flex-1 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={hideSelectionMenu}
              className="px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
