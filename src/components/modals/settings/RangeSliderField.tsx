import React from 'react';

interface RangeSliderFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  formatValue?: (value: number) => string;
  suffix?: string;
}

export const RangeSliderField: React.FC<RangeSliderFieldProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  formatValue,
  suffix = '',
}) => {
  const displayValue = formatValue ? formatValue(value) : value;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-bold text-slate-700">{label}</p>
        <span className="text-xs font-black text-indigo-600">
          {displayValue}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo-600"
        aria-label={label}
      />
      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
        <span>{min}{suffix}</span>
        <span>{max}{suffix}</span>
      </div>
    </div>
  );
};
