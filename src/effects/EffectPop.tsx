import { useEffect, useRef } from 'react';
import type { EffectType } from './types';

interface EffectPopProps {
  target: { x: number; y: number };
  duration?: number;
  color?: string;
  intensity?: EffectType;
  onComplete?: () => void;
}

export const EffectPop: React.FC<EffectPopProps> = ({
  target,
  duration = 500,
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

    const pop = document.createElement('div');
    pop.textContent = '+1';
    pop.style.cssText = `
      position: absolute;
      left: ${target.x}px;
      top: ${target.y - 10}px;
      transform: translate(-50%, -50%);
      font-size: 20px;
      font-weight: 800;
      color: ${color};
      z-index: 10001;
      will-change: transform, opacity;
      text-shadow: 0 2px 4px rgba(0,0,0,0.15);
      pointer-events: none;
    `;
    root.appendChild(pop);

    const startTime = performance.now();
    const scale = intensity === 'sutil' ? 0.9 : intensity === 'intenso' ? 1.3 : 1.0;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const currentScale = prefersReduced ? 1 : scale + 0.4 * Math.sin(progress * Math.PI);
      const y = prefersReduced ? 0 : -30 * progress;
      const opacity = prefersReduced ? 1 : 1 - progress;

      pop.style.transform = `translate(calc(-50% + 0px), calc(-50% + ${y}px)) scale(${currentScale})`;
      pop.style.opacity = String(opacity);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        pop.remove();
        onComplete?.();
      }
    };

    requestAnimationFrame(animate);
  }, [target.x, target.y, duration, color, intensity, onComplete]);

  return <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-visible" />;
};
