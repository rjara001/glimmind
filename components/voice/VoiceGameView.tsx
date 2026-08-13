import React, { useEffect, useRef } from 'react';
import { AssociationList } from '../../types';
import { useVoiceSession } from '../../hooks/useVoiceSession';
import { VoiceCard } from './VoiceCard';
import { VoiceFinished } from './VoiceFinished';

interface VoiceGameViewProps {
  list: AssociationList;
  onBack: () => void;
  onUpdateAssociations: (updatedAssociations: any[]) => Promise<void>;
}

export const VoiceGameView: React.FC<VoiceGameViewProps> = ({ list, onBack, onUpdateAssociations }) => {
  const session = useVoiceSession(list);
  const lastSyncedRef = useRef('');

  useEffect(() => {
    if (session.gameState.associations.length === 0) return;
    const snapshot = JSON.stringify(session.gameState.associations);
    if (lastSyncedRef.current === snapshot) return;
    lastSyncedRef.current = snapshot;
    void onUpdateAssociations(session.gameState.associations);
  }, [session.gameState.associations, onUpdateAssociations]);

  if (session.isFinished) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col min-h-[calc(100vh-80px)]">
        <VoiceFinished
          listName={list.name}
          counts={session.counts}
          onRestart={session.restart}
          onBack={onBack}
        />
      </div>
    );
  }

  if (!session.currentAssociation) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-slate-500">Cargando...</div>
      </div>
    );
  }

  const isReversed = list.settings.flipOrder === 'reversed';
  const displayWord = isReversed ? session.currentAssociation.definition : session.currentAssociation.term;
  const expectedAnswer = isReversed ? session.currentAssociation.term : session.currentAssociation.definition;

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col min-h-[calc(100vh-80px)]">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-slate-900">{list.name}</h1>
        <button
          onClick={() => {
            session.stop();
            onBack();
          }}
          className="text-slate-400 hover:text-indigo-600 transition"
        >
          Volver
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <VoiceCard
          displayWord={displayWord}
          expectedAnswer={expectedAnswer}
          phase={session.phase}
          transcript={session.transcript}
          interim={session.interim}
          error={session.error}
          isListening={session.isListening}
          onRepeat={session.repeat}
          onStop={session.stop}
          onSubmitTyped={session.submitTyped}
        />
      </div>
    </div>
  );
};
