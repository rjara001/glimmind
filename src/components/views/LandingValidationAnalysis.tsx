import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('common');
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

  const statusLabel = (status: AlignedWord['status']) => {
    if (status === 'correct') return t('analysis_correct');
    if (status === 'similar') return t('analysis_similar');
    return t('analysis_incorrect');
  };

  return (
    <div className="landing-analysis">
      <div className="landing-analysis-header">
        <div className="landing-analysis-header-info">
          <div className="landing-analysis-score">
            <span className="landing-analysis-score-pct">{score.similarity}%</span>
            <span className="landing-analysis-score-lbl">{t('analysis_score')}</span>
          </div>
          <div>
            <h3 className="landing-analysis-title">{t('analysis_title')}</h3>
            <p className="landing-analysis-subtitle">
              {t('analysis_threshold')} <strong>{LANDING_VALIDATION_THRESHOLD_PERCENT}%</strong>
              {!passed && ` · ${t('analysis_not_passed')}`}
            </p>
          </div>
        </div>
      </div>

      <div className="landing-analysis-body">
        <div className="landing-analysis-section">
          <div className="landing-analysis-label">📝 {t('analysis_full_sentence')}</div>
          <div className="landing-analysis-sentence">{LANDING_VALIDATION_EXPECTED}</div>
        </div>

        <div className="landing-analysis-section">
          <div className="landing-analysis-label">🔍 {t('analysis_comparison')}</div>

          <table className="landing-analysis-table">
            <thead>
              <tr>
                <th aria-label={t('analysis_status')} />
                <th>{t('analysis_your_answer')}</th>
                <th>{t('analysis_system')}</th>
                <th className="landing-analysis-th-status">{t('analysis_status')}</th>
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
                          aria-label={statusLabel(word.status)}
                        >
                          {STATUS_ICON[word.status]}
                        </span>
                        {isExpandable && (
                          <button
                            type="button"
                            className="landing-analysis-expand"
                            onClick={() => handleToggle(wordIndex)}
                            aria-expanded={isOpen}
                            aria-label={`${t('analysis_detail_word')} ${word.index}`}
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
                                <span className="landing-analysis-char-label">{t('analysis_you')}</span>
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
                                <span className="landing-analysis-char-label">{t('analysis_system')}</span>
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
            <span>{t('analysis_correct_words')}</span>
            <span>
              <strong>{alignment.stats.correct}</strong> / {alignment.stats.total}
            </span>
          </div>
        </div>

        <div className="landing-analysis-section">
          <div className="landing-analysis-label">📊 {t('analysis_distance')}</div>
          <div className="landing-analysis-breakdown">
            <div className="landing-analysis-stat">
              <span className="landing-analysis-stat-lbl">{t('analysis_distance')}</span>
              <span className="landing-analysis-stat-val">{score.distance}</span>
              <span className="landing-analysis-stat-sub">{t('analysis_chars_diff')}</span>
            </div>
            <div className="landing-analysis-stat">
              <span className="landing-analysis-stat-lbl">{t('analysis_chars_total')}</span>
              <span className="landing-analysis-stat-val">{score.chars}</span>
              <span className="landing-analysis-stat-sub">{t('analysis_total')}</span>
            </div>
            <div className="landing-analysis-stat">
              <span className="landing-analysis-stat-lbl">{t('analysis_differences')}</span>
              <span className="landing-analysis-stat-val landing-analysis-stat-val-warn">
                {diffCount}
              </span>
              <span className="landing-analysis-stat-sub">
                {diffCount !== 1 ? t('analysis_wrong_words') : t('analysis_wrong_word')}
              </span>
            </div>
            <div className="landing-analysis-stat">
              <span className="landing-analysis-stat-lbl">{t('analysis_threshold_label')}</span>
              <span className="landing-analysis-stat-val landing-analysis-stat-val-threshold">
                {LANDING_VALIDATION_THRESHOLD_PERCENT}%
              </span>
              <span className="landing-analysis-stat-sub">{t('analysis_needed_pass')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="landing-analysis-footer">
        <span className="landing-analysis-footer-info">
          💡 {t('analysis_need_match')} <strong>{LANDING_VALIDATION_THRESHOLD_PERCENT}%</strong>
          {t('analysis_match_had')} <strong>{score.similarity}%</strong>.
        </span>
      </div>
    </div>
  );
};

export default LandingValidationAnalysis;
