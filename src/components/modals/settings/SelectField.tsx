import React from 'react';

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  ariaLabel?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  onChange,
  children,
  ariaLabel,
}) => {
  return (
    <div>
      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border-2 border-indigo-100 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
        aria-label={ariaLabel || label}
      >
        {children}
      </select>
    </div>
  );
};
