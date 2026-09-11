import React, { useState, useCallback, useMemo } from 'react';
import type { Association } from '../../types';
import type { ImportValidationResult, CardCategory } from '../../services/importValidationService';
import { splitAssociationsByMax } from '../../utils/splitAssociations';
import { MAX_CARDS_PER_DECK } from '../../constants/limits';
import { DeckDistributionList, type DeckDistributionItem } from './DeckDistributionList';

interface ImportValidationModalProps {
  cards: Association[];
  result: ImportValidationResult;
  selectedCategories: Record<CardCategory, boolean>;
  onToggleCategory: (cat: CardCategory) => void;
  onAddSelected: (deckName: string) => void;
  onBack: () => void;
  isSubmitting: boolean;
  maxCardsPerDeck?: number;
  defaultDeckName?: string;
}

const CARD_CATEGORY = {
  existing: { icon: '✅', label: 'Existentes', badgeColor: 'bg-slate-200 text-slate-800', description: '— ya están en tu espacio' },
  similar: { icon: '⚠️', label: 'Similares', badgeColor: 'bg-amber-100 text-amber-800', description: '— pueden crear duplicados' },
  new: { icon: '✨', label: 'Nuevas', badgeColor: 'bg-emerald-100 text-emerald-800', description: '— completamente nuevas' },
};

interface StatTileProps {
  category: CardCategory;
  count: number;
  label: string;
  subtext: string;
}

export const ImportValidationModal: React.FC<ImportValidationModalProps> = ({
  cards,
  result,
  selectedCategories,
  onToggleCategory,
  onAddSelected,
  onBack,
  isSubmitting,
  maxCardsPerDeck = MAX_CARDS_PER_DECK,
  defaultDeckName = 'Importado',
}) => {
  const [showSimilarExamples, setShowSimilarExamples] = useState(false);
  const [deckName, setDeckName] = useState(defaultDeckName);
  const [nameError, setNameError] = useState<string | null>(null);

  const { counts, categorized } = result;
  const totalSelected =
    (selectedCategories.existing ? counts.existing : 0) +
    (selectedCategories.similar ? counts.similar : 0) +
    (selectedCategories.new ? counts.new : 0);

  // Compute deck distribution if cards exceed max per deck
  const deckDistribution = useMemo((): DeckDistributionItem[] | null => {
    const total = cards.length;
    if (total <= maxCardsPerDeck) return null;
    const { deckNames } = splitAssociationsByMax(cards, maxCardsPerDeck, deckName.trim() || defaultDeckName);
    return deckNames.map((name, index) => {
      const start = index * maxCardsPerDeck;
      const end = Math.min(start + maxCardsPerDeck, total);
      return {
        name,
        count: end - start,
        max: maxCardsPerDeck,
      };
    });
  }, [cards, maxCardsPerDeck, deckName, defaultDeckName]);

  // Descripción contextual
  const descriptionText = counts.new === cards.length
    ? '✨ ¡Todas las tarjetas son nuevas para ti!'
    : `De las ${cards.length} tarjetas importadas: ${counts.existing} existentes, ${counts.similar} similares, ${counts.new} nuevas.`;

  // Similares examples (up to 3)
  const similarCards = categorized
    .filter(c => c.category === 'similar' && c.similarMatch)
    .slice(0, 3);

  const handleToggleCategory = useCallback(
    (cat: CardCategory) => onToggleCategory(cat),
    [onToggleCategory],
  );

  // Button subtext with deck breakdown
  const buttonSubtext = deckDistribution && deckDistribution.length > 1
    ? `• ${deckDistribution.map(d => `"${d.name}" (${d.count})`).join(' · ')}`
    : undefined;

  const handleSubmit = () => {
    const trimmed = deckName.trim();
    if (!trimmed) {
      setNameError('El nombre del mazo es obligatorio');
      return;
    }
    if (trimmed.length < 2) {
      setNameError('El nombre debe tener al menos 2 caracteres');
      return;
    }
    setNameError(null);
    onAddSelected(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md sm:max-w-lg shadow-2xl animate-slide-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-800">
            {' '}{' '}
            <span className="text-indigo-600">Validar importación</span>{' '}
            <span className="text-slate-400 badge">
              {cards.length} tarjetas
            </span>
          </h2>
          <button
            onClick={onBack}
            className="p-1 rounded-md hover:bg-slate-100 transition"
            aria-label="Cerrar"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Análisis */}
          <div>
            <p className="text-slate-500 text-sm mb-4">
              Análisis de contenido
            </p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-2">
              <StatTile
                category="existing"
                count={counts.existing}
                label="Existentes"
                subtext={CARD_CATEGORY.existing.description}
              />
              <StatTile
                category="similar"
                count={counts.similar}
                label="Similares"
                subtext={CARD_CATEGORY.similar.description}
              />
              <StatTile
                category="new"
                count={counts.new}
                label="Nuevas"
                subtext={CARD_CATEGORY.new.description}
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <p className="text-slate-500 text-sm mb-3">{descriptionText}</p>
            {showSimilarExamples && similarCards.length > 0 && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg text-slate-600 text-xs">
                <p className="font-medium mb-2">Ejemplos similares:</p>
                {similarCards.map((ex, i) => (
                  <div key={i} className="flex gap-2">
                    <span>
                      <span className="font-medium">{ex.card.term}</span>
                      <span className="text-slate-400"> ↔ </span>
                      <span className="font-medium">{ex.similarMatch?.existingTerm}</span>
                    </span>
                    <span className="text-slate-400">{Math.round((ex.similarMatch?.similarity ?? 0) * 100)}%</span>
                  </div>
                ))}
              </div>
            )}
            {showSimilarExamples ? (
              <button
                onClick={() => setShowSimilarExamples(false)}
                className="mt-2 text-right text-indigo-600 text-sm underline"
              >
                Ocultar ejemplos ▲
              </button>
            ) : (
              <button
                onClick={() => setShowSimilarExamples(true)}
                className="mt-2 text-right text-indigo-600 text-sm underline"
              >
                Mostrar ejemplos ▼
              </button>
            )}
          </div>

          {/* Distribución en decks */}
          {deckDistribution && deckDistribution.length > 1 && (
            <DeckDistributionList
              deckItems={deckDistribution}
              limit={maxCardsPerDeck}
            />
          )}

{/* Selectores */}
          <div>
            <p className="text-slate-500 text-sm mb-4">¿Qué deseas agregar a tu espacio?</p>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                   checked={selectedCategories.existing}
                   disabled={counts.existing === 0}
                  onChange={() => handleToggleCategory('existing')}
                  className="w-4 h-4 rounded border-slate-400 focus-visible:outline focus-visible:ring-indigo-600"
                />
                <div className="flex-1 min-w-[120px]">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{CARD_CATEGORY.existing.icon}</span>
                    <span className="font-medium text-slate-800">{CARD_CATEGORY.existing.label}</span>
                  </div>
                  <p className="text-slate-500 text-xs">{CARD_CATEGORY.existing.description}</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                   checked={selectedCategories.similar}
                   disabled={counts.similar === 0}
                  onChange={() => handleToggleCategory('similar')}
                  className="w-4 h-4 rounded border-slate-400 focus-visible:outline focus-visible:ring-indigo-600"
                />
                <div className="flex-1 min-w-[120px]">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{CARD_CATEGORY.similar.icon}</span>
                    <span className="font-medium text-slate-800">{CARD_CATEGORY.similar.label}</span>
                  </div>
                  <p className="text-slate-500 text-xs">{CARD_CATEGORY.similar.description}</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                   checked={selectedCategories.new}
                   disabled={counts.new === 0}
                  onChange={() => handleToggleCategory('new')}
                  className="w-4 h-4 rounded border-slate-400 focus-visible:outline focus-visible:ring-indigo-600"
                />
                <div className="flex-1 min-w-[120px]">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{CARD_CATEGORY.new.icon}</span>
                    <span className="font-medium text-slate-800">{CARD_CATEGORY.new.label}</span>
                  </div>
                  <p className="text-slate-500 text-xs">{CARD_CATEGORY.new.description}</p>
                </div>
              </label>
            </div>
          </div>

          {/* Nombre del mazo */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              📝 Nombre del mazo X
            </label>
            <input
              type="text"
              value={deckName}
              onChange={(e) => {
                setDeckName(e.target.value);
                if (nameError) setNameError(null);
              }}
              placeholder="Ej: Mi vocabulario de viajes"
              className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 ${
                nameError
                  ? 'border-red-400 focus:ring-red-200'
                  : 'border-slate-300 focus:ring-indigo-200'
              }`}
              disabled={isSubmitting}
            />
            {nameError && (
              <p className="text-red-500 text-xs mt-1">{nameError}</p>
            )}
            {deckDistribution && deckDistribution.length > 1 && (
              <p className="text-xs text-slate-400 mt-1">
                Se crearán {deckDistribution.length} decks: {deckDistribution.map(d => `"${d.name}"`).join(', ')}
              </p>
            )}
          </div>

          {/* Botón de acción */}
          <div>
            <button
              onClick={handleSubmit}
              disabled={totalSelected === 0 || isSubmitting}
              className="w-full flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: totalSelected > 0 ? '#2563eb' : '#6b7280',
                color: 'white',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)',
              }}
            >
              {isSubmitting ? (
                <svg
                  className="w-4 h-4 animate-spin fill-current"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.562l15 15-.562L4 19v5H2v-2h2v2h6v-2H4l2-2H2v-2h2v-6zm16-12h2v6h-2V5zM4 7h16v2H4V7zM4 4h6v14H4V4z"
                  />
                </svg>
              ) : (
                <>
                  <span>
                    📤 Agregar {totalSelected} tarjetas
                    {deckDistribution && deckDistribution.length > 1 && ` ({deckDistribution.length} decks)`}
                  </span>
                  {buttonSubtext && (
                    <span className="text-xs font-normal opacity-80">
                      {buttonSubtext}
                    </span>
                  )}
                </>
              )}
            </button>
</div>
        </div>
      </div>
    </div>
  );
};

export { StatTile };

interface StatTileProps {
  category: CardCategory;
  count: number;
  label: string;
  subtext: string;
}

const StatTile: React.FC<StatTileProps> = ({
  category,
  count,
  label,
  subtext,
}) => {
  const isSelected = count > 0;
  const bgClass =
    category === 'existing'
      ? 'bg-slate-100'
      : category === 'similar'
        ? 'bg-amber-100'
        : 'bg-emerald-100';

  return (
    <div
      className={`
        border-2 rounded-lg p-3 text-center transition-all duration-150 ${
          isSelected ? bgClass : 'bg-slate-100/50'
        } ${isSelected ? 'border-indigo-500' : 'border-transparent'}
      `}
      style={{ minWidth: '70px' }}
    >
      <div className="text-3xl font-bold mb-1">{count}</div>
      <div className="text-sm text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-xs text-slate-400">{subtext}</div>
    </div>
  );
};