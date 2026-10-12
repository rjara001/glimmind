import React, { useMemo, useState } from 'react';
import { alignWords, levenshteinDistance, normalize } from '../../utils/wordAlignment';
import {
  LANDING_VALIDATION_EXPECTED,
  LANDING_VALIDATION_THRESHOLD_PERCENT,
  LANDING_VALIDATION_USER_INPUT,
} from '../../constants/landingValidationExample';
import type { AlignedWord } from '../../utils/wordAlignment';

const STATUS_ICON: Record<AlignedWord['status'], string> = {
  correct: '✓',
  similar: '≈',
  wrong: '✕',
};

export const LandingValidationAnalysis: React.FC = () => {
  const alignment = useMemo(
    () => alignWords(LANDING_VALIDATION_USER_INPUT, LANDING_VALIDATION_EXPECTED),
    []
  );

  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const score = useMemo(() => {
    const distance = levenshteinDistance(
      normalize(LANDING_VALIDATION_USER_INPUT),
      normalize(LANDING_VALIDATION_EXPECTED)
    );
    const longer = Math.max(
      normalize(LANDING_VALIDATION_USER_INPUT).length,
      normalize(LANDING_VALIDATION_EXPECTED).length
    );
    return {
      distance,
      chars: longer,
      similarity: longer === 0 ? 100 : Math.round((1 - distance / longer) * 100),
    };
  }, []);

  const passed = score.similarity >= LANDING_VALIDATION_THRESHOLD_PERCENT;
  const diffCount = alignment.stats.wrong + alignment.stats.similar;

  const handleToggle = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="landing-analysis">
      <div className="landing-analysis-header">
        <div className="landing-analysis-header-info">
          <div className="landing-analysis-score">
            <span className="landing-analysis-score-pct">{score.similarity}%</span>
            <span className="landing-analysis-score-lbl">Score</span>
          </div>
          <div>
            <h3 className="landing-analysis-title">Análisis de tu respuesta</h3>
            <p className="landing-analysis-subtitle">
              Umbral para aprobar: <strong>{LANDING_VALIDATION_THRESHOLD_PERCENT}%</strong>
              {!passed && ' · No alcanzaste'}
            </p>
          </div>
        </div>
      </div>

      <div className="landing-analysis-body">
        <div className="landing-analysis-section">
          <div className="landing-analysis-label">📝 Frase completa</div>
          <div className="landing-analysis-sentence">{LANDING_VALIDATION_EXPECTED}</div>
        </div>

        <div className="landing-analysis-section">
          <div className="landing-analysis-label">🔍 Comparación palabra por palabra</div>

          <table className="landing-analysis-table">
            <thead>
              <tr>
                <th aria-label="Índice" />
                <th>Tu respuesta</th>
                <th>Sistema</th>
                <th className="landing-analysis-th-status">Estado</th>
              </tr>
            </thead>
            <tbody>
              {alignment.words.map((word, wordIndex) => {
                const isOpen = expandedIndex === wordIndex;
                const isExpandable = word.charDiff.length > 0;

                return (
                  <React.Fragment key={word.index}>
                    <tr className="landing-analysis-row">
                      <td className="landing-analysis-idx">{word.index}</td>
                      <td className="landing-analysis-word">{word.userWord || '—'}</td>
                      <td className="landing-analysis-word-alt">{word.systemWord || '—'}</td>
                      <td className="landing-analysis-status">
                        <span
                          className={`landing-analysis-badge landing-analysis-badge-${word.status}`}
                          aria-label={
                            word.status === 'correct'
                              ? 'Correcto'
                              : word.status === 'similar'
                                ? 'Similar'
                                : 'Incorrecto'
                          }
                        >
                          {STATUS_ICON[word.status]}
                        </span>
                        {isExpandable && (
                          <button
                            type="button"
                            className="landing-analysis-expand"
                            onClick={() => handleToggle(wordIndex)}
                            aria-expanded={isOpen}
                            aria-label={`Ver detalle de la palabra ${word.index}`}
                          >
                            {isOpen ? '▲' : '▼'}
                          </button>
                        )}
                      </td>
                    </tr>

                    {isOpen && isExpandable && (
                      <tr className="landing-analysis-detail-row">
                        <td colSpan={4}>
                          <div className="landing-analysis-detail">
                            <div className="landing-analysis-detail-header">
                              {word.userWord} <span>→</span> <strong>{word.systemWord}</strong>
                            </div>

                            <div className="landing-analysis-chars">
                              <div className="landing-analysis-char-row">
                                <span className="landing-analysis-char-label">Tú</span>
                                {word.charDiff.map((diff, i) => (
                                  <span
                                    key={`user-${i}`}
                                    className={`landing-analysis-char landing-analysis-char-${diff.type}`}
                                  >
                                    {diff.type === 'missing' ? '_' : diff.type === 'diff' ? diff.userChar : diff.char}
                                  </span>
                                ))}
                              </div>
                              <div className="landing-analysis-char-row">
                                <span className="landing-analysis-char-label">Sistema</span>
                                {word.charDiff.map((diff, i) => (
                                  <span
                                    key={`sys-${i}`}
                                    className={`landing-analysis-char landing-analysis-char-${diff.type}`}
                                  >
                                    {diff.type === 'extra' ? '_' : diff.type === 'diff' ? diff.systemChar : diff.char}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <p className="landing-analysis-hint">
                              <span aria-hidden="true">⚠️</span> {word.hint}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          <div className="landing-analysis-summary">
            <span>Palabras correctas</span>
            <span>
              <strong>{alignment.stats.correct}</strong> / {alignment.stats.total}
            </span>
          </div>
        </div>

        <div className="landing-analysis-section">
          <div className="landing-analysis-label">📊 Desglose del puntaje</div>
          <div className="landing-analysis-breakdown">
            <div className="landing-analysis-stat">
              <span className="landing-analysis-stat-lbl">Distancia</span>
              <span className="landing-analysis-stat-val">{score.distance}</span>
              <span className="landing-analysis-stat-sub">caracteres de diferencia</span>
            </div>
            <div className="landing-analysis-stat">
              <span className="landing-analysis-stat-lbl">Caracteres</span>
              <span className="landing-analysis-stat-val">{score.chars}</span>
              <span className="landing-analysis-stat-sub">en total</span>
            </div>
            <div className="landing-analysis-stat">
              <span className="landing-analysis-stat-lbl">Diferencias</span>
              <span className="landing-analysis-stat-val landing-analysis-stat-val-warn">
                {diffCount}
              </span>
              <span className="landing-analysis-stat-sub">
                palabra{diffCount !== 1 ? 's' : ''} incorrecta{diffCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="landing-analysis-stat">
              <span className="landing-analysis-stat-lbl">Umbral</span>
              <span className="landing-analysis-stat-val landing-analysis-stat-val-threshold">
                {LANDING_VALIDATION_THRESHOLD_PERCENT}%
              </span>
              <span className="landing-analysis-stat-sub">necesario para aprobar</span>
            </div>
          </div>
        </div>
      </div>

      <div className="landing-analysis-footer">
        <span className="landing-analysis-footer-info">
          💡 Necesitas <strong>{LANDING_VALIDATION_THRESHOLD_PERCENT}%</strong> de coincidencia. Tuviste{' '}
          <strong>{score.similarity}%</strong>.
        </span>
      </div>
    </div>
  );
};

export default LandingValidationAnalysis;