import React, { useEffect, useMemo } from 'react';
import { CelebrationOverlayProps } from '../../types/celebration-overlay-props';

const CONFETTI_COUNT = 40;
const AUTO_CLOSE_MS = 4000;
const CONFETTI_COLORS = ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#0ea5e9'];

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
}

function createPieces(): ConfettiPiece[] {
  return Array.from({ length: CONFETTI_COUNT }, (_, index) => ({
    id: index,
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    duration: 2.4 + Math.random() * 1.4,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    size: 6 + Math.random() * 6,
  }));
}

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({ celebration, onClose }) => {
  const pieces = useMemo(createPieces, [celebration.id]);

  useEffect(() => {
    const timer = setTimeout(onClose, AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <style>{`
        @keyframes glimmind-confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(540deg); opacity: 0; }
        }
      `}</style>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {pieces.map((piece) => (
          <span
            key={piece.id}
            className="absolute top-0 block rounded-sm"
            style={{
              left: `${piece.left}%`,
              width: piece.size,
              height: piece.size * 0.6,
              backgroundColor: piece.color,
              animation: `glimmind-confetti-fall ${piece.duration}s linear ${piece.delay}s`,
            }}
          />
        ))}
      </div>
      <div
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl mb-3">{celebration.type === 'goal' ? '🎯' : '🏆'}</div>
        <h3 className="text-2xl font-black text-slate-900">{celebration.message}</h3>
        {celebration.subtitle && <p className="text-sm text-slate-500 mt-2">{celebration.subtitle}</p>}
        <button
          onClick={onClose}
          className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition"
        >
          ¡A seguir!
        </button>
      </div>
    </div>
  );
};
