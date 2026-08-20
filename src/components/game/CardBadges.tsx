import React from 'react';

interface CardBadgesProps {
  isFallbackActive: boolean;
}

export const CardBadges: React.FC<CardBadgesProps> = ({
  isFallbackActive,
}) => {
  return (
    <>
      {isFallbackActive && (
        <div className="absolute bottom-3 left-3 z-50 bg-amber-500 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg">
          Fallback
        </div>
      )}
    </>
  );
};
