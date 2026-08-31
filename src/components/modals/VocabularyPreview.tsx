import React, { useCallback, useState } from 'react';
import { VocabularyResult, DeckSourceType } from '../../types/youtube-deck';
import { SourceRow } from '../../types/source-row';
import { Association } from '../../types';

export interface VocabularySourceMeta {
  sourceType?: DeckSourceType;
  sourceUrl?: string;
  rawSourceText?: string;
  sourceRow?: SourceRow;
  title?: string;
}

interface VocabularyPreviewProps {
  result: VocabularyResult;
  onClose: () => void;
  onAccept: (associations: Association[], sourceMeta: VocabularySourceMeta) => void;
}

export const VocabularyPreview: React.FC<VocabularyPreviewProps> = ({ result, onClose, onAccept }) => {
  const [expandedContext, setExpandedContext] = useState<number | null>(null);
  const [deckTitle, setDeckTitle] = useState(result.title || '');

  const handleAccept = useCallback(() => {
    const associations: Association[] = result.items.map((item) => ({
      id: crypto.randomUUID(),
      term: item.term,
      definition: [item.translation || item.example || ''],
      context: item.context || '',
      translation: item.translation || undefined,
      metadata: item.metadata,
      currentCycle: 1,
      status: 'pending' as const,
      isLearned: false,
      isArchived: false,
    }));
    onAccept(associations, {
      sourceType: result.sourceType,
      sourceUrl: result.sourceUrl,
      rawSourceText: result.rawSourceText,
      sourceRow: result.sourceRow,
      title: deckTitle.trim() || undefined,
    });
  }, [result.items, result.sourceType, result.sourceUrl, result.rawSourceText, result.sourceRow, deckTitle, onAccept]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Vocabulary preview</h2>
              <p className="text-sm text-gray-600 mt-1">{result.video?.title || result.sourceUrl || 'Texto manual'}</p>
              {result.wasTruncated && (
                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded">
                  Video truncado a la primera hora de contenido
                </span>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex gap-4 mt-3 text-sm">
            <span className="text-indigo-700 font-medium">✓ Se encontraron {result.items.length} términos</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
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
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-bold text-gray-900 uppercase tracking-wider">value1</th>
                <th className="text-left py-2 px-3 font-bold text-gray-900 uppercase tracking-wider">Traducción</th>
                <th className="text-left py-2 px-3 font-bold text-gray-900 uppercase tracking-wider">tags</th>
                <th className="text-left py-2 px-3 font-bold text-gray-900 uppercase tracking-wider w-10"></th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((item, idx) => (
                <React.Fragment key={idx}>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <span className="font-medium text-gray-900">{item.term}</span>
                      <span className="text-xs text-gray-500 ml-2">{item.type === 'phrase' ? 'Frase' : 'Palabra'}</span>
                    </td>
                    <td className="py-2 px-3 text-gray-400">
                      {item.translation ? (
                        <span className="text-gray-700">{item.translation}</span>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Sin traducción</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {item.metadata?.tags && item.metadata.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.metadata.tags.map((tag) => (
                            <span key={tag} className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {item.context && (
                        <button
                          onClick={() => setExpandedContext(expandedContext === idx ? null : idx)}
                          className="text-gray-400 hover:text-indigo-600 transition"
                          title="Ver contexto"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedContext === idx && item.context && (
                    <tr className="bg-indigo-50/50">
                      <td colSpan={4} className="py-2 px-3 text-xs text-gray-600 leading-relaxed">
                        <span className="font-semibold text-indigo-700">Contexto:</span>{' '}
                        {item.context}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-between items-center">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">
            Cerrar
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Crear Baraja ({result.items.length})
          </button>
        </div>
      </div>
    </div>
  );
};
