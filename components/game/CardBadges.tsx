import React from 'react';

interface CardBadgesProps {
  showCommandToast: boolean;
  commandToastText: string;
  isFallbackActive: boolean;
}

export const CardBadges: React.FC<CardBadgesProps> = ({
  showCommandToast,
  commandToastText,
  isFallbackActive,
}) => {
  return (
    <>
      {showCommandToast && (
        <div className="absolute bottom-3 right-3 z-50 bg-slate-900/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-lg animate-pulse">
          {commandToastText}
        </div>
      )}

      {isFallbackActive && (
        <div className="absolute bottom-3 left-3 z-50 bg-amber-500 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg">
          Fallback
        </div>
      )}
    </>
  );
};
