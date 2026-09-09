import React, { useState, useEffect, useCallback } from 'react';
import { PrebuiltDeck } from '../../types/prebuilt-deck';
import { prebuiltDeckService } from '../../services/prebuiltDeckService';
import { validateImportCards } from '../../services/importValidationService';
import { useGameStore } from '../../store/gameStore';
import { normalizeAssociations, AssociationLike } from '../../utils/normalizeAssociation';
import { ImportValidationModal } from '../onboarding/ImportValidationModal';
import { useToast } from '../layout/Toast';
import { DeckCard } from './DeckCard';
import { DeckPreviewModal } from './DeckPreviewModal';
import { CustomCreationSection } from './CustomCreationSection';
import type { ImportValidationResult, CardCategory } from '../../services/importValidationService';

interface DeckStoreOnboardingProps {
  onAddDeck: (deck: PrebuiltDeck) => Promise<void>;
  onCreateCustom: () => void;
  onYouTube: () => void;
  onTextImport: () => void;
}

export const DeckStoreOnboarding: React.FC<DeckStoreOnboardingProps> = ({ onAddDeck, onCreateCustom, onYouTube, onTextImport }) => {
  const { showToast } = useToast();
  const [decks, setDecks] = useState<PrebuiltDeck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewDeck, setPreviewDeck] = useState<PrebuiltDeck | null>(null);
  const [addingDeckId, setAddingDeckId] = useState<string | null>(null);
  const [validationDeck, setValidationDeck] = useState<PrebuiltDeck | null>(null);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Record<CardCategory, boolean>>({
    existing: true,
    similar: true,
    new: true,
  });
  const [isImportValidating, setIsImportValidating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    prebuiltDeckService
      .fetchDecks()
      .then((data) => {
        if (!cancelled) {
          setDecks(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar el catálogo');
          setIsLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    prebuiltDeckService
      .fetchDecks()
      .then((data) => {
        setDecks(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error al cargar el catálogo');
        setIsLoading(false);
      });
  };

  const handleAddDeck = useCallback(async (deck: PrebuiltDeck) => {
    setValidationDeck(deck);
    setSelectedCategories({ existing: true, similar: true, new: true });
    setIsImportValidating(true);
  }, []);

  const handleImportConfirm = useCallback(async (categories: Record<CardCategory, boolean>) => {
    setSelectedCategories(categories);
    setIsImportValidating(false);

    if (!validationDeck) return;

    const categorized = validationResult?.categorized || [];
    const filteredAssociations = categorized
      .filter(c => categories[c.category])
      .map(c => c.card);

    if (filteredAssociations.length === 0) {
      showToast('No hay tarjetas seleccionadas para agregar', 'info');
      return;
    }

    setAddingDeckId(validationDeck.id);
    try {
      await onAddDeck({
        ...validationDeck,
        associations: filteredAssociations,
      });
      showToast(`¡Se agregaron ${filteredAssociations.length} tarjetas a tu espacio!`, 'success');
    } finally {
      setAddingDeckId(null);
    }

    setValidationDeck(null);
    setValidationResult(null);
    setSelectedCategories({ existing: true, similar: true, new: true });
  }, [validationDeck, validationResult, onAddDeck, showToast]);

  useEffect(() => {
    if (validationDeck && !validationResult) {
      const lists = useGameStore.getState().lists;
      const associations: AssociationLike[] = validationDeck.associations.map(a => ({
        id: crypto.randomUUID(),
        term: a.term,
        definition: a.definition,
        currentCycle: 1,
        status: 'pending' as const,
        isLearned: false,
        isArchived: false,
      }));
      setValidationResult(validateImportCards(normalizeAssociations(associations), lists ?? []));
    }
  }, [validationDeck, validationResult]);

  const handleBackToDecks = () => {
    setValidationDeck(null);
    setValidationResult(null);
    setSelectedCategories({ existing: true, similar: true, new: true });
  };

  if (error) {
    return (
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-8 shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-1">¡Bienvenido a tu Tienda de Barajas!</h2>
        <p className="text-white/80 text-sm">
          No pudimos cargar el catálogo de decks preconstruidos.
        </p>
        <button
          onClick={handleRetry}
          className="mt-4 px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-8 shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-1">¡Bienvenido a tu Tienda de Barajas!</h2>
        <p className="text-white/80 text-sm">
          Explorá nuestro catálogo, revisá las tarjetas y cargalas a tu espacio en 1 clic.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-20 mb-3" />
              <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-full mb-1" />
              <div className="h-3 bg-slate-100 rounded w-2/3 mb-4" />
              <div className="h-3 bg-slate-100 rounded w-16 mb-4" />
              <div className="h-9 bg-slate-100 rounded-xl mb-2" />
              <div className="h-9 bg-indigo-200 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {decks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onPreview={() => setPreviewDeck(deck)}
              onValidate={handleAddDeck}
              isAdding={addingDeckId === deck.id}
            />
          ))}
        </div>
      )}

      {validationDeck && validationResult && (
        <ImportValidationModal
          cards={normalizeAssociations(validationDeck.associations.map(a => ({
            ...a,
            id: crypto.randomUUID(),
            currentCycle: 1,
            status: 'pending' as const,
            isLearned: false,
            isArchived: false,
          })))}
          result={validationResult}
          selectedCategories={selectedCategories}
          onToggleCategory={(cat) => setSelectedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))}
          onAddSelected={() => handleImportConfirm(selectedCategories)}
          onBack={() => handleBackToDecks()}
          isSubmitting={isImportValidating}
        />
      )}

      <CustomCreationSection onCreateCustom={onCreateCustom} onYouTube={onYouTube} onTextImport={onTextImport} />

      <DeckPreviewModal
        deck={previewDeck}
        onValidate={handleAddDeck}
        onClose={() => setPreviewDeck(null)}
        isAdding={addingDeckId === previewDeck?.id}
      />
    </div>
  );
};