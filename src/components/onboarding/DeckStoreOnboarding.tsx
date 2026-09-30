import React, { useState, useCallback, useRef } from 'react';
import { PrebuiltDeck } from '../../types/prebuilt-deck';
import { prebuiltDeckService } from '../../services/prebuiltDeckService';
import { useGameStore } from '../../store/gameStore';
import { useDeckValidation } from '../../hooks/dashboard/useDeckValidation';
import { useToast } from '../layout/Toast';
import { DeckCard } from './DeckCard';
import { DeckPreviewModal } from './DeckPreviewModal';
import { DeckValidationScreen } from './DeckValidationScreen';
import { CustomCreationSection } from './CustomCreationSection';
import type { CardCategory } from '../../services/importValidationService';

interface DeckStoreOnboardingProps {
  onAddDeck: (deck: PrebuiltDeck) => Promise<void>;
  onCreateCustom: () => void;
  onYouTube: () => void;
  onTextImport: () => void;
}

export const DeckStoreOnboarding: React.FC<DeckStoreOnboardingProps> = ({
  onAddDeck,
  onCreateCustom,
  onYouTube,
  onTextImport,
}) => {
  const { showToast } = useToast();
  // Hook reactivo (no getState)
  const lists = useGameStore((state) => state.lists);
  const [decks, setDecks] = useState<PrebuiltDeck[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewDeck, setPreviewDeck] = useState<PrebuiltDeck | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<PrebuiltDeck | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Record<CardCategory, boolean>>({
    existing: true,
    similar: true,
    new: true,
  });
  const hasFetchedRef = useRef(false);
  const [hasExplored, setHasExplored] = useState(false);
  const { result: validationResult, isValidating } = useDeckValidation(selectedDeck, lists);

  const handleExplore = useCallback(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    setHasExplored(true);
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
  }, []);

  const handleRetry = useCallback(() => {
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
  }, []);

  const handleAddDeck = useCallback(async (deck: PrebuiltDeck) => {
    setPreviewDeck(null); // Cerrar modal si está abierto
    setSelectedDeck(deck);
    setSelectedCategories({ existing: true, similar: true, new: true });
  }, []);

  const handleImportConfirm = useCallback(async () => {
    if (!selectedDeck || !validationResult) return;

    const categorized = validationResult.categorized.filter(
      (c) => selectedCategories[c.category]
    );
    const filteredAssociations = categorized.map((c) => ({
      term: c.card.term,
      definition: c.card.definition,
      context: c.card.context,
    }));

    const filteredDeck: PrebuiltDeck = {
      ...selectedDeck,
      associations: filteredAssociations,
    };

    setSelectedDeck(null);
    setSelectedCategories({ existing: true, similar: true, new: true });

    try {
      await onAddDeck(filteredDeck);
      showToast(`¡Se agregaron ${filteredAssociations.length} tarjetas a tu espacio!`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error al agregar tarjetas', 'error');
    }
  }, [selectedDeck, validationResult, onAddDeck, selectedCategories, showToast]);

  const handleBackToDecks = useCallback(() => {
    setSelectedDeck(null);
    setSelectedCategories({ existing: true, similar: true, new: true });
  }, []);

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

  // Mientras el análisis está en curso, mostrar overlay
  if (selectedDeck && isValidating) {
    return (
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-2xl flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-700">Analizando tarjetas...</span>
        </div>
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

      {!hasExplored && !error && (
        <div className="mb-8 flex justify-center">
          <button
            onClick={handleExplore}
            className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-medium text-lg hover:bg-indigo-700 transition shadow-lg"
          >
            Explorar Catálogo
          </button>
        </div>
      )}

      {(hasExplored || error) && isLoading && (
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
      )}

      {(hasExplored || error) && !isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {decks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onPreview={() => setPreviewDeck(deck)}
              onValidate={handleAddDeck}
            />
          ))}
        </div>
      )}

      <DeckPreviewModal
        deck={previewDeck}
        onValidate={handleAddDeck}
        onClose={() => setPreviewDeck(null)}
      />

      {/* DeckValidationScreen se renderiza como overlay fullscreen */}
      {selectedDeck && validationResult && !isValidating && (
        <DeckValidationScreen
          deck={selectedDeck}
          result={validationResult}
          selectedCategories={selectedCategories}
          onToggleCategory={(cat: CardCategory) =>
            setSelectedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }))
          }
          onAddSelected={handleImportConfirm}
          onBack={handleBackToDecks}
        />
      )}

      <CustomCreationSection
        onCreateCustom={onCreateCustom}
        onYouTube={onYouTube}
        onTextImport={onTextImport}
      />
    </div>
  );
};

export default DeckStoreOnboarding;