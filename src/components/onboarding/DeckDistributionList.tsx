import React, { useState } from 'react';

export interface DeckDistributionItem {
  name: string;
  count: number;
  max: number;
}

interface DeckDistributionListProps {
  deckItems: DeckDistributionItem[];
  limit: number;
  maxVisible?: number;
}

const BAR_COLORS = ['#8b5cf6', '#6366f1', '#3b82f6', '#059669', '#d97706', '#64748b'];

export const DeckDistributionList: React.FC<DeckDistributionListProps> = ({
  deckItems,
  limit,
  maxVisible = 5,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (deckItems.length === 0) return null;

  const showToggle = deckItems.length > 10;
  const effectiveMaxVisible = showToggle && !isExpanded ? maxVisible : deckItems.length;
  const hasHidden = deckItems.length > effectiveMaxVisible;
  const hiddenCount = deckItems.length - effectiveMaxVisible;

  return (
    <div
      style={{
        background: '#f8faff',
        borderRadius: 14,
        padding: '14px 16px',
        border: '1px solid #e9edf2',
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          📋 Distribución en decks
        </span>
        <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>
          Límite: <span style={{ fontWeight: 600, color: '#2563eb' }}>{limit}</span> tarjetas por deck
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          ...(hasHidden ? { maxHeight: 240, overflowY: 'auto', paddingRight: 4 } : {}),
        }}
      >
        {deckItems.slice(0, effectiveMaxVisible).map((item, index) => {
          const fillPercentage = Math.min((item.count / item.max) * 100, 100);
          const barColor = BAR_COLORS[index % BAR_COLORS.length];
          const isFull = item.count >= item.max;
          const ariaLabel = `Deck ${item.name}: ${item.count} de ${item.max} tarjetas`;

          return (
            <div
              key={item.name}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}
            >
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color: '#2563eb',
                  minWidth: 90,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.name}
                {isFull && <span style={{ marginLeft: 4, fontSize: '0.6rem', color: '#f59e0b' }}>●</span>}
              </span>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#0b1a26',
                  minWidth: 60,
                  textAlign: 'right',
                }}
              >
                {item.count}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 6,
                  background: '#e2e8f0',
                  borderRadius: 20,
                  overflow: 'hidden',
                }}
              >
                <div
                  role="progressbar"
                  aria-label={ariaLabel}
                  aria-valuenow={item.count}
                  aria-valuemin={0}
                  aria-valuemax={item.max}
                  style={{
                    height: '100%',
                    borderRadius: 20,
                    width: `${fillPercentage}%`,
                    backgroundColor: barColor,
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
        {hasHidden && (
          <div
            style={{
              fontSize: '0.65rem',
              color: '#94a3b8',
              textAlign: 'center',
              paddingTop: 4,
            }}
          >
            +{hiddenCount} deck{hiddenCount > 1 ? 's' : ''} más
          </div>
        )}
      </div>

      {showToggle && (
        <button
          type="button"
          onClick={() => setIsExpanded(prev => !prev)}
          style={{
            marginTop: 12,
            width: '100%',
            fontSize: '0.65rem',
            color: '#2563eb',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {isExpanded ? 'Ocultar decks ▲' : `Ver todos (${deckItems.length}) ▼`}
        </button>
      )}
    </div>
  );
};