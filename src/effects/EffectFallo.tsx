import { useEffect, useRef } from 'react';
import { EFFECT_CONFIGS, type EffectType } from './types';

interface EffectFalloProps {
  target: { x: number; y: number };
  duration?: number;
  colors?: string[];
  intensity?: EffectType;
  onComplete?: () => void;
}

export const EffectFallo: React.FC<EffectFalloProps> = ({
  target,
  duration = 600,
  colors = EFFECT_CONFIGS.fallo.defaultColors,
  intensity = 'normal',
  onComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = containerRef.current;
    if (!root) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Elemento de error
    const error = document.createElement('div');
    error.textContent = '❌';
    error.style.cssText = `
      position: absolute;
      left: ${target.x}px;
      top: ${target.y}px;
      font-size: 32px;
      transform: translate(-50%, -50%) scale(0);
      z-index: 10001;
      will-change: transform, opacity;
      pointer-events: none;
    `;
    root.appendChild(error);

    // Partículas descendentes
    const particleCount = intensity === 'sutil' ? 6 : intensity === 'intenso' ? 18 : 12;

    const particles: HTMLDivElement[] = [];

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      const color = colors[i % colors.length];
      const startX = target.x + (Math.random() - 0.5) * 40;
      const startY = target.y + (Math.random() - 0.5) * 20;

      particle.style.cssText = `
        position: absolute;
        left: ${startX}px;
        top: ${startY}px;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background-color: ${color};
        transform: translate(-50%, -50%);
        z-index: 10002;
        will-change: transform, opacity;
        pointer-events: none;
      `;
      root.appendChild(particle);
      particles.push(particle);
    }

    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Animar error
      const errorScale = 0.5 + 0.5 * Math.sin(progress * Math.PI);
      error.style.transform = `translate(-50%, -50%) scale(${errorScale})`;
      error.style.opacity = String(1 - progress * 0.5);

      // Animar partículas hacia abajo
      particles.forEach((particle, i) => {
        const particleProgress = Math.max(0, Math.min(1, (progress - i * 0.05) / 0.7));
        const y = 50 * particleProgress;
        const opacity = 1 - particleProgress;
        particle.style.transform = `translate(-50%, -50%) translateY(${y}px)`;
        particle.style.opacity = String(opacity);
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        error.remove();
        particles.forEach(p => p.remove());
        onComplete?.();
      }
    };

    if (prefersReduced) {
      error.remove();
      particles.forEach(p => p.remove());
      onComplete?.();
      return;
    }

    requestAnimationFrame(animate);
  }, [target.x, target.y, duration, colors, intensity, onComplete]);

  return <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-visible" />;
};
