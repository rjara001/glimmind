import { useEffect, useRef } from 'react';
import type { EffectType } from './types';

interface EffectOndaProps {
  target: { x: number; y: number };
  duration?: number;
  color?: string;
  intensity?: EffectType;
  onComplete?: () => void;
}

export const EffectOnda: React.FC<EffectOndaProps> = ({
  target,
  duration = 800,
  color = '#3b82f6',
  intensity = 'normal',
  onComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = containerRef.current;
    if (!root) return;

    const wave = document.createElement('div');
    wave.style.cssText = `
      position: absolute;
      left: ${target.x}px;
      top: ${target.y}px;
      width: 0px;
      height: 0px;
      border-radius: 50%;
      border: 2px solid ${color};
      transform: translate(-50%, -50%);
      z-index: 10000;
      will-change: transform, opacity;
      pointer-events: none;
    `;
    root.appendChild(wave);

    const startTime = performance.now();
    const maxSize = intensity === 'sutil' ? 60 : intensity === 'intenso' ? 160 : 120;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2);
      const size = eased * maxSize;

      wave.style.width = `${size}px`;
      wave.style.height = `${size}px`;
      wave.style.opacity = String(1 - progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        wave.remove();
        onComplete?.();
      }
    };

    requestAnimationFrame(animate);
  }, [target.x, target.y, duration, color, intensity, onComplete]);

  return <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-visible" />;
};
