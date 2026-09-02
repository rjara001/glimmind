import { useEffect, useRef } from 'react';
import { EFFECT_CONFIGS, type EffectType } from './types';

interface EffectComboProps {
  target: { x: number; y: number };
  duration?: number;
  colors?: string[];
  intensity?: EffectType;
  onComplete?: () => void;
}

export const EffectCombo: React.FC<EffectComboProps> = ({
  target,
  duration = 1000,
  colors = EFFECT_CONFIGS.combo.defaultColors,
  intensity = 'normal',
  onComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = containerRef.current;
    if (!root) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const pops = 3;
    const interval = duration / pops;

    for (let i = 0; i < pops; i++) {
      setTimeout(() => {
        if (prefersReduced) return;

        const pop = document.createElement('div');
        const color = colors[i % colors.length];
        pop.textContent = '+1';
        pop.style.cssText = `
          position: absolute;
          left: ${target.x + (Math.random() - 0.5) * 20}px;
          top: ${target.y - 10 + (Math.random() - 0.5) * 10}px;
          transform: translate(-50%, -50%) scale(0);
          font-size: 18px;
          font-weight: 800;
          color: ${color};
          z-index: 10001;
          will-change: transform, opacity;
          text-shadow: 0 2px 4px rgba(0,0,0,0.15);
          pointer-events: none;
        `;
        root.appendChild(pop);

        const startTime = performance.now();
        const popDuration = 400;

        const animate = (time: number) => {
          const elapsed = time - startTime;
          const progress = Math.min(elapsed / popDuration, 1);
          const scale = 0.5 + 0.5 * Math.sin(progress * Math.PI);
          const y = -20 * progress;
          const opacity = 1 - progress;

          pop.style.transform = `translate(-50%, -50%) scale(${scale})`;
          pop.style.top = `${target.y - 10 + y}px`;
          pop.style.opacity = String(opacity);

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            pop.remove();
          }
        };

        requestAnimationFrame(animate);
      }, i * interval);
    }

    // Onda central
    setTimeout(() => {
      if (prefersReduced) {
        onComplete?.();
        return;
      }

      const wave = document.createElement('div');
      wave.style.cssText = `
        position: absolute;
        left: ${target.x}px;
        top: ${target.y}px;
        width: 0px;
        height: 0px;
        border-radius: 50%;
        border: 2px solid ${colors[0]};
        transform: translate(-50%, -50%);
        z-index: 10000;
        will-change: transform, opacity;
        pointer-events: none;
      `;
      root.appendChild(wave);

      const startTime = performance.now();
      const waveDuration = 600;

      const animateWave = (time: number) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / waveDuration, 1);
        const size = progress * 100;

        wave.style.width = `${size}px`;
        wave.style.height = `${size}px`;
        wave.style.opacity = String(1 - progress);

        if (progress < 1) {
          requestAnimationFrame(animateWave);
        } else {
          wave.remove();
        }
      };

      requestAnimationFrame(animateWave);
    }, pops * interval - 100);

    setTimeout(() => {
      onComplete?.();
    }, duration);
  }, [target.x, target.y, duration, colors, intensity, onComplete]);

  return <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-visible" />;
};
