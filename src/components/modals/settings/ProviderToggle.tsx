import React from 'react';

interface ProviderToggleProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}

export const ProviderToggle: React.FC<ProviderToggleProps> = ({
  value,
  onChange,
  options,
  disabled = false,
}) => {
  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          disabled={disabled}
          className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
            value === option.value
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-500 border border-slate-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};
