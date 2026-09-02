import { useEffect, useRef } from 'react';
import { EFFECT_CONFIGS, type EffectType } from './types';

interface EffectParticulasProps {
  origin: { x: number; y: number };
  target: { x: number; y: number };
  duration?: number;
  colors?: string[];
  intensity?: EffectType;
  onComplete?: () => void;
}

export const EffectParticulas: React.FC<EffectParticulasProps> = ({
  origin,
  target,
  duration = 700,
  colors = EFFECT_CONFIGS.particulas.defaultColors,
  intensity = 'normal',
  onComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = containerRef.current;
    if (!root) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      onComplete?.();
      return;
    }

    const count = intensity === 'sutil' ? 8 : intensity === 'intenso' ? 22 : 14;

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      const color = colors[i % colors.length];
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const distance = 40 + Math.random() * 60;
      const size = 4 + Math.random() * 4;

      particle.style.cssText = `
        position: absolute;
        left: ${origin.x}px;
        top: ${origin.y}px;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background-color: ${color};
        transform: translate(-50%, -50%);
        z-index: 10001;
        will-change: transform, opacity;
        pointer-events: none;
      `;
      root.appendChild(particle);

      const startTime = performance.now();
      const particleDuration = duration * (0.7 + Math.random() * 0.6);

      const animate = (time: number) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / particleDuration, 1);
        const eased = 1 - Math.pow(1 - progress, 2);

        const x = Math.cos(angle) * distance * eased;
        const y = Math.sin(angle) * distance * eased + 30 * eased;

        particle.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${1 - progress * 0.5})`;
        particle.style.opacity = String(1 - progress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          particle.remove();
        }
      };

      requestAnimationFrame(animate);
    }

    const maxDuration = duration * 1.2;
    setTimeout(() => {
      onComplete?.();
    }, maxDuration);
  }, [origin.x, origin.y, target.x, target.y, duration, colors, intensity, onComplete]);

  return <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-visible" />;
};
