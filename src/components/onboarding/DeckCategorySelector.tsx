import React, { useState } from 'react';
import type {
  CardCategory,
  DeckCategorySelectorProps,
} from '../../types/deck-validation';

const CATEGORY_CONFIG: Record<CardCategory, {
  label: string;
  icon: string;
  badgeText: string;
  badgeBg: string;
  badgeColor: string;
  desc: string;
}> = {
  existing: {
    label: 'Existentes',
    icon: '✅',
    badgeText: 'ya están',
    badgeBg: '#c7d9f0',
    badgeColor: '#1a2b3c',
    desc: '— ya están en tu espacio',
  },
  similar: {
    label: 'Similares',
    icon: '⚠️',
    badgeText: 'pueden duplicar',
    badgeBg: '#f0e0b8',
    badgeColor: '#7c5a00',
    desc: '— pueden crear duplicados',
  },
  new: {
    label: 'Nuevas',
    icon: '✨',
    badgeText: 'recomendado',
    badgeBg: '#b8d9b8',
    badgeColor: '#1a4a1a',
    desc: '— completamente nuevas',
  },
};

const ARIA_LABELS: Record<CardCategory, string> = {
  existing: 'Tarjetas existentes',
  similar: 'Tarjetas similares',
  new: 'Tarjetas nuevas',
};

export const DeckCategorySelector: React.FC<DeckCategorySelectorProps> = ({
  counts,
  selected,
  onToggle,
  similarExamples,
}) => {
  const [showSimilar, setShowSimilar] = useState(false);

  const categories: CardCategory[] = ['existing', 'similar', 'new'];

  return (
    <div
      role="group"
      aria-label="Seleccionar categorías a importar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '14px 16px',
        background: '#f8faff',
        borderRadius: 14,
        border: '1px solid #e9edf2',
      }}
    >
      {categories.map((category) => {
        const config = CATEGORY_CONFIG[category];
        const isChecked = selected[category];
        const showExamples =
          category === 'similar' && similarExamples && similarExamples.length > 0;

        return (
          <div key={category}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 10px',
                borderRadius: 10,
                cursor: 'pointer',
                transition: '0.15s ease',
              }}
            >
              <input
                type="checkbox"
                aria-label={ARIA_LABELS[category]}
                className="w-4 h-4 accent-indigo-600 cursor-pointer flex-shrink-0"
                checked={isChecked}
                onChange={() => onToggle(category)}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1rem' }}>{config.icon}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#0b1a26' }}>
                  {config.label}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                  ({counts[category]})
                </span>
                <span
                  style={{
                    fontSize: '0.55rem',
                    fontWeight: 500,
                    padding: '1px 10px',
                    borderRadius: 40,
                    background: config.badgeBg,
                    color: config.badgeColor,
                  }}
                >
                  {config.badgeText}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{config.desc}</span>
              </div>
            </label>

            {showExamples && (
              <button
                type="button"
                onClick={() => setShowSimilar(!showSimilar)}
                style={{
                  marginLeft: 40,
                  fontSize: '0.65rem',
                  color: '#64748b',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>{showSimilar ? 'Ocultar' : 'Ver ejemplos'}</span>
                <span style={{ display: 'inline-block', transform: showSimilar ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>
                  ▼
                </span>
              </button>
            )}

            {showExamples && showSimilar && similarExamples && (
              <div style={{ marginLeft: 40, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {similarExamples.map((ex, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: '0.7rem',
                      color: '#475569',
                      paddingLeft: 8,
                      borderLeft: '2px solid #f0e0b8',
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{ex.deckTerm}</span>
                    <span style={{ color: '#94a3b8' }}> ↔ </span>
                    <span style={{ fontWeight: 500 }}>{ex.existingTerm}</span>
                    <span style={{ color: '#d97706', fontWeight: 500 }}>
                      {' '}({Math.round(ex.similarity * 100)}% similar)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};