import React, { useMemo } from 'react';
import type {
  CardCategory,
  DeckValidationScreenProps,
  SimilarMatchSample,
} from '../../types/deck-validation';
import { DeckAnalysisStats } from './DeckAnalysisStats';
import { DeckCategorySelector } from './DeckCategorySelector';
import { DeckDistributionList } from './DeckDistributionList';

const CATEGORY_ORDER: CardCategory[] = ['existing', 'similar', 'new'];

const MAX_CARDS_PER_DECK = 100;

export const DeckValidationScreen: React.FC<DeckValidationScreenProps> = ({
  deck,
  result,
  selectedCategories,
  onToggleCategory,
  onAddSelected,
  onBack,
}) => {
  const selectedCount = useMemo(() => {
    return CATEGORY_ORDER.reduce((sum, cat) => {
      return sum + (selectedCategories[cat] ? result.counts[cat] : 0);
    }, 0);
  }, [result.counts, selectedCategories]);

  const deckItems = useMemo(() => {
    const deckCount = Math.ceil(result.total / MAX_CARDS_PER_DECK);
    const items = [];
    for (let i = 0; i < deckCount; i++) {
      const remaining = result.total - i * MAX_CARDS_PER_DECK;
      const count = Math.min(MAX_CARDS_PER_DECK, remaining);
      const name = i === 0 ? deck.name : `${deck.name}-${i + 1}`;
      items.push({ name, count, max: MAX_CARDS_PER_DECK });
    }
    return items;
  }, [deck.name, result.total]);

  const similarExamples = useMemo((): SimilarMatchSample[] => {
    return result.categorized
      .filter((c) => c.category === 'similar' && c.similarMatch)
      .slice(0, 5)
      .map((c) => ({
        deckTerm: c.card.term,
        existingTerm: c.similarMatch!.existingTerm,
        similarity: c.similarMatch!.similarity,
      }));
  }, [result.categorized]);

  const allCardsNew = result.counts.existing === 0 && result.counts.similar === 0;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl my-8">
        {/* HEADER */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">
            📚 Validar importación <span className="text-indigo-600">"{deck.name}"</span>
          </h2>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {result.total} tarjetas
          </span>
        </div>

        {/* BODY */}
        <div className="p-5 space-y-4">
          {/* All new message */}
          {allCardsNew && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-sm text-emerald-800 font-medium">
                ✨ ¡Todas las tarjetas son nuevas para ti!
              </p>
            </div>
          )}

          {/* Analysis stats */}
          <DeckAnalysisStats
            counts={result.counts}
            total={result.total}
            deckCount={deckItems.length}
          />

          {/* Description */}
          <div className="text-sm text-slate-600 leading-relaxed">
            De las <strong>{result.total}</strong> tarjetas: <strong>{result.counts.existing}</strong> existentes, <strong>{result.counts.similar}</strong> similares, <strong>{result.counts.new}</strong> nuevas.
          </div>

          {/* Deck distribution */}
          {deckItems.length > 1 && (
            <DeckDistributionList deckItems={deckItems} limit={MAX_CARDS_PER_DECK} />
          )}

          {/* Category selector */}
          <DeckCategorySelector
            counts={result.counts}
            selected={selectedCategories}
            onToggle={onToggleCategory}
            similarExamples={similarExamples}
          />

          {/* Actions */}
          <div className="pt-4 space-y-2">
            <button
              onClick={onAddSelected}
              disabled={selectedCount === 0}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex flex-col items-center justify-center gap-1"
            >
              <span>📤 Agregar tarjetas</span>
              {deckItems.length > 1 && (
                <span className="text-[0.65rem] font-normal opacity-85">
                  {deckItems.map((d) => `"${d.name}" (${d.count})`).join(' · ')}
                </span>
              )}
              {deckItems.length === 1 && (
                <span className="text-[0.65rem] font-normal opacity-85">
                  "{deck.name}" ({result.total} tarjetas)
                </span>
              )}
            </button>
            <button
              onClick={onBack}
              className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition"
            >
              ← Volver al Catálogo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};