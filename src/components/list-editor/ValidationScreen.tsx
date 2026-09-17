import React from 'react';
import type { CardCategory } from '../../services/importValidationService';
import { MAX_CARDS_PER_DECK } from '../../constants/limits';

interface ValidationScreenProps {
  validationResult: import('../../services/importValidationService').ImportValidationResult | null;
  onConfirmImport: (categories: Record<CardCategory, boolean>) => Promise<void>;
  onBack: () => void;
  deckName: string;
  showToast: (message: string, type?: string) => void;
  isImporting?: boolean;
}

const BAR_COLORS = ['#8b5cf6', '#6366f1', '#3b82f6', '#059669', '#d97706', '#64748b'];

export const ValidationScreen: React.FC<ValidationScreenProps> = ({
  validationResult,
  onConfirmImport,
  onBack,
  deckName,
  showToast,
  isImporting = false,
}) => {
  const [selectedCategories, setSelectedCategories] = React.useState<Record<CardCategory, boolean>>({
    existing: true,
    similar: true,
    new: true,
  });

  if (!validationResult) return null;

  const { total, counts } = validationResult;
  const { existing, similar, new: newCards } = counts;

  const deckCount = Math.ceil(total / MAX_CARDS_PER_DECK);
  const decks: { name: string; count: number; max: number }[] = [];
  for (let i = 0; i < deckCount; i++) {
    const remaining = total - i * MAX_CARDS_PER_DECK;
    const count = Math.min(MAX_CARDS_PER_DECK, remaining);
    const name = i === 0 ? deckName : `${deckName}-${i + 1}`;
    decks.push({ name, count, max: MAX_CARDS_PER_DECK });
  }

  const selectedCount =
    (selectedCategories.existing ? existing : 0) +
    (selectedCategories.similar ? similar : 0) +
    (selectedCategories.new ? newCards : 0);

  const canImport = selectedCount > 0;

  const handleToggle = (category: CardCategory) => {
    setSelectedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const confirmImport = async () => {
    if (!canImport) {
      showToast('⚠️ Selecciona al menos una categoría para importar.', 'error');
      return;
    }
    await onConfirmImport(selectedCategories);
  };

  if (total === 0) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl my-8">
        {/* HEADER */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">
            📚 Validar importación <span className="text-indigo-600">"{deckName}"</span>
          </h2>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {total} tarjetas
          </span>
        </div>

        <div className="p-5 space-y-4">
          {/* ANALYSIS STATS */}
          <div style={{ background: '#f8faff', borderRadius: 16, padding: '16px 18px', border: '1px solid #e9edf2' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              📊 Análisis de contenido
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5" style={{ gap: 6 }}>
              <StatTile value={total} label="Total" sub="tarjetas" numColor="#0b1a26" bg="#ffffff" border="#dce2ea" />
              <StatTile value={existing} label="✅ Existentes" sub="ya en tu espacio" numColor="#2563eb" bg="#f0f4fe" border="#c7d9f0" />
              <StatTile value={similar} label="⚠️ Similares" sub="pueden duplicar" numColor="#f59e0b" bg="#fef7e6" border="#f0e0b8" />
              <StatTile value={newCards} label="✨ Nuevas" sub="completamente nuevas" numColor="#059669" bg="#e3f3e3" border="#b8d9b8" />
              <StatTile value={deckCount} label="📦 Decks" sub="máx. 100 c/u" numColor="#8b5cf6" bg="#f0eaf8" border="#d8cce8" />
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="text-sm text-slate-600 leading-relaxed">
            De las <strong>{total}</strong> tarjetas importadas: <strong>{existing}</strong> existentes, <strong>{similar}</strong> similares, <strong>{newCards}</strong> nuevas.
          </div>

          {/* DECK DISTRIBUTION */}
          {deckCount > 1 && (
            <div style={{ background: '#f8faff', borderRadius: 14, padding: '14px 16px', border: '1px solid #e9edf2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  📋 Distribución en decks
                </span>
                <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>
                  Límite: <span style={{ fontWeight: 600, color: '#2563eb' }}>{MAX_CARDS_PER_DECK}</span> tarjetas por deck
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {decks.map((deck, i) => {
                  const pct = Math.min((deck.count / deck.max) * 100, 100);
                  const color = BAR_COLORS[i % BAR_COLORS.length];
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#2563eb', minWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {deck.name}
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0b1a26', minWidth: 60, textAlign: 'right' }}>
                        {deck.count}
                      </span>
                      <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 20, overflow: 'hidden' }}>
                        <div
                          role="progressbar"
                          aria-label={`Deck ${deck.name}: ${deck.count} de ${deck.max} tarjetas`}
                          aria-valuenow={deck.count}
                          aria-valuemin={0}
                          aria-valuemax={deck.max}
                          style={{ height: '100%', borderRadius: 20, width: `${pct}%`, backgroundColor: color, transition: 'width 0.5s ease' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CATEGORY SELECTOR */}
          <div role="group" aria-label="Seleccionar categorías a importar" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px', background: '#f8faff', borderRadius: 14, border: '1px solid #e9edf2' }}>
            <SelectorItem
              category="existing"
              icon="✅"
              label="Existentes"
              count={existing}
              badgeText="ya están"
              badgeBg="#c7d9f0"
              badgeColor="#1a2b3c"
              desc="— ya están en tu espacio"
              checked={selectedCategories.existing}
              onToggle={() => handleToggle('existing')}
            />
            <SelectorItem
              category="similar"
              icon="⚠️"
              label="Similares"
              count={similar}
              badgeText="pueden duplicar"
              badgeBg="#f0e0b8"
              badgeColor="#7c5a00"
              desc="— pueden crear duplicados"
              checked={selectedCategories.similar}
              onToggle={() => handleToggle('similar')}
            />
            <SelectorItem
              category="new"
              icon="✨"
              label="Nuevas"
              count={newCards}
              badgeText="recomendado"
              badgeBg="#b8d9b8"
              badgeColor="#1a4a1a"
              desc="— completamente nuevas"
              checked={selectedCategories.new}
              onToggle={() => handleToggle('new')}
            />
          </div>

          {/* ACTIONS */}
          <div className="pt-4 space-y-2">
            <button
              onClick={confirmImport}
              disabled={!canImport || isImporting}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex flex-col items-center justify-center gap-1"
            >
              {isImporting ? (
                <>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Importando...</span>
                  </div>
                </>
              ) : (
                <>
                  <span>📤 Agregar tarjetas</span>
                  <span className="text-[0.65rem] font-normal opacity-85">
                    {selectedCount} tarjetas seleccionadas
                  </span>
                </>
              )}
            </button>
            <button
              onClick={onBack}
              disabled={isImporting}
              className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Volver al editor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---- Sub-componentes ----

interface StatTileProps {
  value: number;
  label: string;
  sub: string;
  numColor: string;
  bg: string;
  border: string;
}

const StatTile: React.FC<StatTileProps> = ({ value, label, sub, numColor, bg, border }) => (
  <div style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 10, border: `1px solid ${border}`, background: bg }}>
    <span style={{ fontSize: '1.2rem', fontWeight: 700, display: 'block', color: numColor }}>{value}</span>
    <span style={{ fontSize: '0.5rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</span>
    <span style={{ fontSize: '0.4rem', color: '#94a3b8', marginTop: 2, display: 'block' }}>{sub}</span>
  </div>
);

interface SelectorItemProps {
  category: CardCategory;
  icon: string;
  label: string;
  count: number;
  badgeText: string;
  badgeBg: string;
  badgeColor: string;
  desc: string;
  checked: boolean;
  onToggle: () => void;
}

const SelectorItem: React.FC<SelectorItemProps> = ({ category, icon, label, count, badgeText, badgeBg, badgeColor, desc, checked, onToggle }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 10, cursor: 'pointer', transition: '0.15s ease' }}>
    <input
      type="checkbox"
      aria-label={`Tarjetas ${label.toLowerCase()}`}
      className="w-4 h-4 accent-indigo-600 cursor-pointer flex-shrink-0"
      checked={checked}
      onChange={onToggle}
    />
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: '1rem' }}>{icon}</span>
      <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#0b1a26' }}>{label}</span>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>({count})</span>
      <span style={{ fontSize: '0.55rem', fontWeight: 500, padding: '1px 10px', borderRadius: 40, background: badgeBg, color: badgeColor }}>
        {badgeText}
      </span>
      <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{desc}</span>
    </div>
  </label>
);