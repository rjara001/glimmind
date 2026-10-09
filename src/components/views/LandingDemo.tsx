import React, { useEffect, useMemo, useRef } from 'react';
import { LANDING_DEMO_DECK_LENGTH, useLandingDemo } from '../../hooks/landing/useLandingDemo';
import { CYCLE_COLORS, CYCLE_LABELS, cycleToColorKey } from '../../utils/cycle-colors';
import type { LandingDemoProps } from '../../types/landing-demo';
import { LANDING_DEMO_DECK_NAME } from '../../constants/landingDemoDeck';

export const LandingDemo: React.FC<LandingDemoProps> = ({ deckName = LANDING_DEMO_DECK_NAME }) => {
  const {
    card,
    hint,
    progress,
    inputValue,
    feedback,
    similarity,
    lastAttempt,
    isRevealed,
    hasAttempted,
    correctCount,
    accuracy,
    handleInputChange,
    handleValidate,
    handleReveal,
    handleNext,
  } = useLandingDemo();

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [card.id]);

  const cycleKey = useMemo(() => cycleToColorKey(card.cycle), [card.cycle]);
  const cyclePalette = CYCLE_COLORS[cycleKey];
  const cycleLabel = CYCLE_LABELS[card.cycle];

  const feedbackClass =
    feedback === 'correct'
      ? 'landing-demo-feedback landing-demo-feedback-correct'
      : 'landing-demo-feedback landing-demo-feedback-incorrect';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleValidate();
  };

  return (
    <div className="landing-screenshot-wrap">
      <div className="landing-screenshot landing-demo">
        <div className="landing-game-header">
          <span className="landing-deck-name">{deckName}</span>
          <div className="landing-stats">
            <span>
              <strong>{correctCount}</strong> correctas
            </span>
            <span>
              <strong>{accuracy}%</strong>
            </span>
          </div>
        </div>

        <div className="landing-demo-progress">
          <div className="landing-demo-progress-track">
            <div
              className="landing-demo-progress-fill"
              style={{ width: `${(progress / LANDING_DEMO_DECK_LENGTH) * 100}%` }}
            />
          </div>
          <span className="landing-demo-progress-label">
            {progress}/{LANDING_DEMO_DECK_LENGTH}
          </span>
        </div>

        <div className="landing-demo-stage">
          <span
            className="landing-demo-cycle"
            style={{ background: cyclePalette.bg, borderColor: cyclePalette.border, color: cyclePalette.text }}
          >
            {cycleLabel}
          </span>

          <div className="landing-question">
            <div className="landing-term">{card.term}</div>
            <div className="landing-hint">{hint}</div>
          </div>

          {isRevealed && <div className="landing-demo-revealed">{card.definition}</div>}

          {feedback !== 'none' && (
            <div className={feedbackClass} role="status" aria-live="polite">
              <span className="landing-demo-feedback-label">
                {feedback === 'correct' ? '✓ Correcto' : '✗ Incorrecto'}
              </span>
              {lastAttempt && <span className="landing-demo-attempt">{lastAttempt}</span>}
              {similarity !== null && (
                <span className="landing-demo-similarity">Similitud: {similarity}%</span>
              )}
            </div>
          )}
        </div>

        <form className="landing-input-row" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Escribe tu respuesta..."
            aria-label="Escribe tu respuesta"
          />
          <button type="submit" className="landing-btn-validate">
            VALIDAR
          </button>
        </form>

        <div className="landing-demo-actions">
          <button
            type="button"
            className="landing-demo-btn"
            onClick={handleReveal}
            disabled={isRevealed}
          >
            Revelar
          </button>
          <button
            type="button"
            className="landing-demo-btn landing-demo-btn-primary"
            onClick={handleNext}
            disabled={!hasAttempted}
          >
            Siguiente →
          </button>
        </div>

        <p className="landing-demo-hint-text">
          Prueba con un typo. Si coincide el 80% de los caracteres, cuenta como acierto.
        </p>
      </div>
    </div>
  );
};

export default LandingDemo;