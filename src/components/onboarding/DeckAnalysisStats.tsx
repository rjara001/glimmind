import React from 'react';
import type { CardCategory, DeckAnalysisStatsProps } from '../../types/deck-validation';

const STAT_CONFIG: Record<CardCategory, { label: string; sub: string; numColor: string; bg: string; border: string }> = {
  existing: {
    label: '✅ Existentes',
    sub: 'ya en tu espacio',
    numColor: '#2563eb',
    bg: '#f0f4fe',
    border: '#c7d9f0',
  },
  similar: {
    label: '⚠️ Similares',
    sub: 'pueden duplicar',
    numColor: '#f59e0b',
    bg: '#fef7e6',
    border: '#f0e0b8',
  },
  new: {
    label: '✨ Nuevas',
    sub: 'completamente nuevas',
    numColor: '#059669',
    bg: '#e3f3e3',
    border: '#b8d9b8',
  },
};

export const DeckAnalysisStats: React.FC<DeckAnalysisStatsProps> = ({ counts, total }) => {
  const statItems = [
    { key: 'total', value: total, label: 'Total', sub: 'tarjetas', numColor: '#0b1a26', bg: '#ffffff', border: '#dce2ea' },
    { key: 'existing', value: counts.existing, ...STAT_CONFIG.existing },
    { key: 'similar', value: counts.similar, ...STAT_CONFIG.similar },
    { key: 'new', value: counts.new, ...STAT_CONFIG.new },
  ];

  return (
    <div style={{ background: '#f8faff', borderRadius: 16, padding: '16px 18px', border: '1px solid #e9edf2', marginBottom: 14 }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
        📊 Análisis de contenido
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5" style={{ gap: 6 }}>
        {statItems.map((stat) => (
          <div
            key={stat.key}
            style={{
              textAlign: 'center',
              padding: '8px 4px',
              borderRadius: 10,
              border: `1px solid ${stat.border}`,
              background: stat.bg,
            }}
          >
            <span style={{ fontSize: '1.2rem', fontWeight: 700, display: 'block', color: stat.numColor }}>
              {stat.value}
            </span>
            <span style={{ fontSize: '0.5rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              {stat.label}
            </span>
            <span style={{ fontSize: '0.4rem', color: '#94a3b8', marginTop: 2, display: 'block' }}>
              {stat.sub}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};