import React, { useState, useEffect } from 'react';
import { PrebuiltDeck } from '../../types/prebuilt-deck';
import { prebuiltDeckService } from '../../services/prebuiltDeckService';
import { useToast } from '../layout/Toast';
import { DeckCard } from './DeckCard';
import { DeckPreviewModal } from './DeckPreviewModal';
import { CustomCreationSection } from './CustomCreationSection';

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
  const [previewDeck, setPreviewDeck] = useState<PrebuiltDeck | null>(null);
  const [addingDeckId, setAddingDeckId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    prebuiltDeckService.fetchDecks().then((data) => {
      if (!cancelled) {
        setDecks(data);
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const handleAddDeck = async (deck: PrebuiltDeck) => {
    setAddingDeckId(deck.id);
    try {
      await onAddDeck(deck);
      showToast(`¡"${deck.name}" agregada a tu espacio!`, 'success');
    } finally {
      setAddingDeckId(null);
    }
  };

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
              onPreview={setPreviewDeck}
              onAdd={handleAddDeck}
              isAdding={addingDeckId === deck.id}
            />
          ))}
        </div>
      )}

      <CustomCreationSection onCreateCustom={onCreateCustom} onYouTube={onYouTube} onTextImport={onTextImport} />

      <DeckPreviewModal
        deck={previewDeck}
        onAdd={handleAddDeck}
        onClose={() => setPreviewDeck(null)}
        isAdding={addingDeckId === previewDeck?.id}
      />
    </div>
  );
};
