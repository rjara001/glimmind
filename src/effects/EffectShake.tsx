import { useEffect, useRef } from 'react';
import type { EffectType } from './types';

interface EffectShakeProps {
  target: { x: number; y: number };
  duration?: number;
  color?: string;
  intensity?: EffectType;
  onComplete?: () => void;
}

export const EffectShake: React.FC<EffectShakeProps> = ({
  target,
  duration = 400,
  color = '#ef4444',
  intensity = 'normal',
  onComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = containerRef.current;
    if (!root) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Encuentra el elemento target en el DOM para aplicarle shake
    // Usamos el target position para crear un indicador visual de error
    const indicator = document.createElement('div');
    indicator.textContent = '💥';
    indicator.style.cssText = `
      position: absolute;
      left: ${target.x}px;
      top: ${target.y}px;
      font-size: 24px;
      transform: translate(-50%, -50%);
      z-index: 10001;
      will-change: transform, opacity;
      pointer-events: none;
    `;
    root.appendChild(indicator);

    // Efecto de shake visual en la posición
    const shake = document.createElement('div');
    shake.style.cssText = `
      position: absolute;
      left: ${target.x}px;
      top: ${target.y}px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${color}20;
      border: 2px solid ${color};
      transform: translate(-50%, -50%);
      z-index: 10000;
      will-change: transform, opacity;
      pointer-events: none;
    `;
    root.appendChild(shake);

    const startTime = performance.now();
    const shakeIntensity = intensity === 'sutil' ? 3 : intensity === 'intenso' ? 12 : 8;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      // Shake en X
      const shakeX = Math.sin(progress * Math.PI * 6) * shakeIntensity * (1 - eased);
      const scale = 1 + 0.1 * Math.sin(progress * Math.PI * 4);
      const opacity = 1 - eased;

      shake.style.transform = `translate(calc(-50% + ${shakeX}px), -50%) scale(${scale})`;
      shake.style.opacity = String(opacity);
      indicator.style.transform = `translate(calc(-50% + ${shakeX}px), -50%) scale(${0.8 + 0.2 * Math.sin(progress * Math.PI)})`;
      indicator.style.opacity = String(opacity);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        shake.remove();
        indicator.remove();
        onComplete?.();
      }
    };

    if (prefersReduced) {
      shake.remove();
      indicator.remove();
      onComplete?.();
      return;
    }

    requestAnimationFrame(animate);
  }, [target.x, target.y, duration, color, intensity, onComplete]);

  return <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-visible" />;
};
