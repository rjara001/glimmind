import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLandingDemo } from '../../hooks/landing/useLandingDemo';
import { CYCLE_COLORS, CYCLE_LABELS, cycleToColorKey } from '../../utils/cycle-colors';
import type { LandingDemoProps } from '../../types/landing-demo';

export const LandingDemo: React.FC<LandingDemoProps> = ({ deckName }) => {
  const { t } = useTranslation('common');
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
    deckLength,
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

  const cycleLabel = useMemo(() => {
    switch (card.cycle) {
      case 1:
        return t('stage_new', CYCLE_LABELS[1]);
      case 2:
        return t('stage_view', CYCLE_LABELS[2]);
      case 3:
        return t('stage_recognized', CYCLE_LABELS[3]);
      case 4:
        return t('stage_frequent', CYCLE_LABELS[4]);
      default:
        return CYCLE_LABELS[card.cycle] ?? '';
    }
  }, [card.cycle, t]);

  const feedbackClass =
    feedback === 'correct'
      ? 'landing-demo-feedback landing-demo-feedback-correct'
      : 'landing-demo-feedback landing-demo-feedback-incorrect';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleValidate();
  };

  const displayName = deckName ?? t('deck_name', 'Inglés Básico');
  const placeholderText = t('input_placeholder', 'Escribe tu respuesta...');

  return (
    <div className="landing-screenshot-wrap">
      <div className="landing-screenshot landing-demo">
        <div className="landing-game-header">
          <span className="landing-deck-name">{displayName}</span>
          <div className="landing-stats">
            <span>
              <strong>{correctCount}</strong> {t('stat_correct', 'correctas')}
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
              style={{ width: `${(progress / deckLength) * 100}%` }}
            />
          </div>
          <span className="landing-demo-progress-label">
            {progress}/{deckLength}
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
                {feedback === 'correct' ? t('feedback_correct', '✓ Correcto') : t('feedback_incorrect', '✗ Incorrecto')}
              </span>
              {lastAttempt && <span className="landing-demo-attempt">{lastAttempt}</span>}
              {similarity !== null && (
                <span className="landing-demo-similarity">
                  {t('similarity_label', 'Similitud')}: {similarity}%
                </span>
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
            placeholder={placeholderText}
            aria-label={placeholderText.replace(/\.\.\.$/, '')}
          />
          <button type="submit" className="landing-btn-validate">
            {t('btn_validate', 'VALIDAR')}
          </button>
        </form>

        <div className="landing-demo-actions">
          <button
            type="button"
            className="landing-demo-btn"
            onClick={handleReveal}
            disabled={isRevealed}
          >
            {t('btn_reveal', 'Revelar')}
          </button>
          <button
            type="button"
            className="landing-demo-btn landing-demo-btn-primary"
            onClick={handleNext}
            disabled={!hasAttempted}
          >
            {t('btn_next', 'Siguiente →')}
          </button>
        </div>

        <p className="landing-demo-hint-text">
          {t('demo_hint', 'Prueba con un typo. Si coincide el 80% de los caracteres, cuenta como acierto.')}
        </p>
      </div>
    </div>
  );
};

export default LandingDemo;
