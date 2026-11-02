import React from 'react';
import { useTranslation } from 'react-i18next';
import { RangeSliderField } from './RangeSliderField';
import { ToggleSection } from './ToggleSection';

const THRESHOLD_MIN = 50;
const THRESHOLD_MAX = 100;
const THRESHOLD_STEP = 5;

interface AnswerValidationSectionProps {
  isIgnoringArticles: boolean;
  onIgnoreArticlesToggle: () => void;
  threshold: number;
  onThresholdChange: (value: number) => void;
}

export const AnswerValidationSection: React.FC<AnswerValidationSectionProps> = ({
  isIgnoringArticles,
  onIgnoreArticlesToggle,
  threshold,
  onThresholdChange,
}) => {
  const { t } = useTranslation('settings');

  return (
    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-8">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
        {t('answer_validation', 'Answer Validation')}
      </p>

      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <p className="text-xs font-bold text-slate-700">{t('ignore_articles', 'Ignore articles')}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {t('ignore_articles_desc', 'the, at, to, el, la... not required')}
          </p>
        </div>
        <ToggleSection
          icon={null}
          label=""
          isActive={isIgnoringArticles}
          onToggle={onIgnoreArticlesToggle}
        />
      </div>

      <RangeSliderField
        label={t('similarity_threshold', 'Similarity threshold')}
        value={Math.round(threshold * 100)}
        onChange={(value) => onThresholdChange(value / 100)}
        min={THRESHOLD_MIN}
        max={THRESHOLD_MAX}
        step={THRESHOLD_STEP}
      />
    </div>
  );
};
