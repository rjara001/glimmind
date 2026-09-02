import { useEffect, useRef } from 'react';
import type { EffectType } from './types';

interface EffectCheckmarkProps {
  target: { x: number; y: number };
  duration?: number;
  color?: string;
  intensity?: EffectType;
  onComplete?: () => void;
}

export const EffectCheckmark: React.FC<EffectCheckmarkProps> = ({
  target,
  duration = 600,
  color = '#10b981',
  intensity = 'normal',
  onComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = containerRef.current;
    if (!root) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const checkmark = document.createElement('div');
    checkmark.textContent = '✅';
    checkmark.style.cssText = `
      position: absolute;
      left: ${target.x}px;
      top: ${target.y}px;
      font-size: 32px;
      transform: translate(-50%, -50%) scale(0);
      z-index: 10001;
      will-change: transform, opacity;
      pointer-events: none;
    `;
    root.appendChild(checkmark);

    const startTime = performance.now();
    const scale = intensity === 'sutil' ? 0.9 : intensity === 'intenso' ? 1.3 : 1.0;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const currentScale = prefersReduced ? 1 : scale * (0.5 + 0.5 * Math.sin(progress * Math.PI));
      const opacity = prefersReduced ? 1 : progress < 0.8 ? 1 : 1 - (progress - 0.8) / 0.2;

      checkmark.style.transform = `translate(-50%, -50%) scale(${currentScale})`;
      checkmark.style.opacity = String(opacity);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        checkmark.remove();
        onComplete?.();
      }
    };

    requestAnimationFrame(animate);
  }, [target.x, target.y, duration, color, intensity, onComplete]);

  return <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-visible" />;
};
