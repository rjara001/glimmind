import React from 'react';

interface ToggleSectionProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onToggle: () => void;
  activeClassName?: string;
}

export const ToggleSection: React.FC<ToggleSectionProps> = ({
  icon,
  label,
  isActive,
  onToggle,
  activeClassName = 'bg-indigo-600 text-white',
}) => {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all shadow-sm ${
        isActive ? activeClassName : 'bg-white text-slate-600 border border-slate-200'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-xs font-bold">{label}</span>
      </div>
      <div
        className={`w-10 h-6 rounded-full relative transition-colors ${
          isActive ? 'bg-indigo-400' : 'bg-slate-200'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${
            isActive ? 'left-5' : 'left-1'
          }`}
        />
      </div>
    </button>
  );
};
