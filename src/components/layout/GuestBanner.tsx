import React, { useState } from 'react';

interface GuestBannerProps {
  onDismiss: () => void;
}

const DISMISS_KEY = 'glimmind_guest_banner_dismissed';

export const GuestBanner: React.FC<GuestBannerProps> = ({ onDismiss }) => {
  const [isVisible, setIsVisible] = useState(() => {
    return localStorage.getItem(DISMISS_KEY) !== 'true';
  });

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(DISMISS_KEY, 'true');
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs font-medium text-amber-800">
            Guest mode — data is saved locally and won't sync to the cloud
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-amber-600 hover:text-amber-800 transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
