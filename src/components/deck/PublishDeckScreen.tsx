import React, { useEffect, useMemo, useState } from 'react';
import type { AssociationList } from '../../types';
import { useToast } from '../layout/Toast';
import { catalogService } from '../../services/catalogService';
import { PUBLISH_MAX_CARDS, PUBLISH_MIN_CARDS } from '../../constants/publishDeck';
import {
  PUBLISH_DECK_CATEGORIES,
  type ModerationResult,
  type PublishDeckCategory,
  type PublishDeckResponse,
} from '../../types/catalog';

interface PublishDeckScreenProps {
  list: AssociationList & { history?: { completedAt?: number } };
  onCancel: () => void;
  onPublished?: (deckId: string, response: PublishDeckResponse) => void;
}

const DEFAULT_CATEGORY: PublishDeckCategory = 'Other';

function parseTagsInput(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((tag) => tag.replace(/^#/, '').trim())
    .filter((tag) => tag.length > 0)
    .slice(0, 12);
}

function buildEmptyModeration(cardCount: number): ModerationResult {
  return {
    approved: cardCount,
    review: 0,
    rejected: 0,
    flaggedItems: [],
    level: 'approved',
  };
}

export const PublishDeckScreen: React.FC<PublishDeckScreenProps> = ({ list, onCancel, onPublished }) => {
  const { showToast } = useToast();
  const cardCount = list.associations.length;
  const isCompleted = Boolean(list.history?.completedAt);
  const minOk = cardCount >= PUBLISH_MIN_CARDS;
  const maxOk = cardCount <= PUBLISH_MAX_CARDS;

  const [name, setName] = useState(list.name);
  const [category, setCategory] = useState<PublishDeckCategory>(DEFAULT_CATEGORY);
  const [description, setDescription] = useState(list.concept ?? '');
  const [tagsInput, setTagsInput] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [moderation, setModeration] = useState<ModerationResult | null>(null);
  const [moderationPending, setModerationPending] = useState(true);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setModerationPending(true);
    setModerationError(null);
    catalogService
      .moderatePreview(list.id)
      .then((result) => {
        if (cancelled) return;
        setModeration(result);
      })
      .catch((error: Error) => {
        if (cancelled) return;
        console.warn('[PublishDeckScreen] moderation preview failed:', error);
        setModerationError(error.message || 'No se pudo moderar el contenido');
        setModeration(buildEmptyModeration(cardCount));
      })
      .finally(() => {
        if (!cancelled) setModerationPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [list.id, cardCount]);

  const moderationPassed = moderation !== null && moderation.rejected === 0;
  const canPublish = isCompleted && minOk && maxOk && moderationPassed && termsAccepted && !moderationPending && !publishing;

  const checklistItems = useMemo(() => {
    return [
      {
        key: 'completion',
        label: 'Has completado este mazo al 100% al menos una vez',
        status: isCompleted ? 'pass' : 'fail',
      },
      {
        key: 'cards',
        label: `Tiene ${cardCount} tarjetas (mínimo ${PUBLISH_MIN_CARDS}, máximo ${PUBLISH_MAX_CARDS})`,
        status: minOk && maxOk ? 'pass' : 'fail',
      },
      {
        key: 'moderation',
        label: moderationPending
          ? 'El contenido está siendo moderado por IA...'
          : moderationPassed
            ? `${cardCount} tarjetas aprobadas${moderation && moderation.review > 0 ? `, ${moderation.review} requieren revisión` : ''}`
            : 'El contenido no pasó la moderación',
        status: moderationPending ? 'pending' : moderationPassed ? 'pass' : 'fail',
      },
    ] as const;
  }, [isCompleted, minOk, maxOk, cardCount, moderationPending, moderationPassed, moderation]);

  const handlePublish = async () => {
    if (!canPublish) return;
    if (!name.trim()) {
      showToast('⚠️ El nombre del mazo no puede estar vacío.', 'error');
      return;
    }
    if (!isCompleted) {
      showToast('⚠️ Debes completar el mazo al 100% al menos una vez antes de publicarlo.', 'error');
      return;
    }
    if (!termsAccepted) {
      showToast('⚠️ Debes aceptar los términos y condiciones.', 'error');
      return;
    }
    setPublishing(true);
    try {
      const response = await catalogService.submitDeck({
        listId: list.id,
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        tags: parseTagsInput(tagsInput),
      });
      showToast('✅ ¡Mazo publicado exitosamente al catálogo global!', 'success');
      onPublished?.(response.deckId, response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al publicar el mazo.';
      showToast(`❌ ${message}`, 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleCancel = () => {
    showToast('📋 Publicación cancelada.', 'info');
    onCancel();
  };

  const statusBadge = (status: 'pass' | 'fail' | 'pending'): string => {
    if (status === 'pass') return '✓';
    if (status === 'fail') return '✕';
    return '⏳';
  };

  const cardLabel = (status: 'pass' | 'fail' | 'pending'): string => {
    if (status === 'pass') return 'bg-emerald-50 text-emerald-700';
    if (status === 'fail') return 'bg-rose-50 text-rose-700';
    return 'bg-amber-50 text-amber-700';
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4 flex-wrap gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              📤 Publicar mazo: <span className="text-indigo-600">"{list.name}"</span>
            </h2>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {cardCount} tarjetas
            </span>
          </div>

          <div className="flex flex-col gap-1.5 p-3 bg-slate-50 rounded-2xl border border-slate-100 mb-4">
            {checklistItems.map((item) => (
              <div
                key={item.key}
                className={`flex items-center gap-2.5 px-2 py-1 rounded-lg text-xs ${cardLabel(item.status)}`}
              >
                <span className="text-base w-6 text-center">
                  {item.status === 'pass' ? '✅' : item.status === 'fail' ? '❌' : '⏳'}
                </span>
                <span className="flex-1">{item.label}</span>
                <span className="font-bold">{statusBadge(item.status)}</span>
              </div>
            ))}
          </div>

          <div className="mb-3">
            <label htmlFor="publish-deck-name" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Nombre del mazo X
            </label>
            <input
              id="publish-deck-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label htmlFor="publish-deck-category" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Categoría
              </label>
              <select
                id="publish-deck-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as PublishDeckCategory)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
              >
                {PUBLISH_DECK_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="publish-deck-tags" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Etiquetas
              </label>
              <input
                id="publish-deck-tags"
                type="text"
                placeholder="#latin #raices"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="publish-deck-desc" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Descripción
            </label>
            <textarea
              id="publish-deck-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none resize-none"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 mb-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              📊 Resultado de la moderación
            </div>
            {moderationPending ? (
              <div className="text-xs text-slate-500">⏳ Analizando contenido…</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center py-2 rounded-xl border border-emerald-200 bg-emerald-50">
                  <span className="text-xl font-bold text-emerald-700 block">
                    {moderation?.approved ?? 0}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    ✅ Aprobadas
                  </span>
                </div>
                <div className="text-center py-2 rounded-xl border border-amber-200 bg-amber-50">
                  <span className="text-xl font-bold text-amber-700 block">
                    {moderation?.review ?? 0}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    ⚠️ Revisión
                  </span>
                </div>
                <div className="text-center py-2 rounded-xl border border-rose-200 bg-rose-50">
                  <span className="text-xl font-bold text-rose-700 block">
                    {moderation?.rejected ?? 0}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                    ❌ Rechazadas
                  </span>
                </div>
              </div>
            )}
            {moderationError && (
              <p className="mt-2 text-[11px] text-rose-600">{moderationError}</p>
            )}
          </div>

          <label className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-2xl border border-slate-100 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-indigo-600 cursor-pointer"
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              Acepto los <a href="#" className="text-indigo-600 hover:underline">términos y condiciones</a> de publicación.
              Entiendo que mi mazo será revisado y puede ser retirado si no cumple con las normas de la comunidad.
            </span>
          </label>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handlePublish}
              disabled={!canPublish}
              className="w-full py-3 rounded-2xl bg-indigo-600 text-white text-sm font-bold uppercase tracking-wider shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {publishing ? '⏳ Publicando...' : '📤 PUBLICAR AL CATÁLOGO GLOBAL'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="w-full py-2.5 rounded-2xl bg-slate-100 text-slate-700 text-sm font-semibold border border-slate-200 hover:bg-slate-200 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
