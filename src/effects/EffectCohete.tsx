import { useEffect, useRef } from 'react';
import { EFFECT_CONFIGS } from './types';

interface EffectCoheteProps {
  origin: { x: number; y: number };
  target: { x: number; y: number };
  duration?: number;
  colors?: string[];
  message?: string;
  onComplete?: () => void;
}

export const EffectCohete: React.FC<EffectCoheteProps> = ({
  origin,
  target,
  duration = 900,
  colors = EFFECT_CONFIGS.cohete.defaultColors,
  message,
  onComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = containerRef.current;
    if (!root) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Crear cohete
    const rocket = document.createElement('div');
    rocket.textContent = '🚀';
    rocket.style.cssText = `
      position: absolute;
      left: ${origin.x}px;
      top: ${origin.y}px;
      font-size: 24px;
      transform: translate(-50%, -50%);
      z-index: 10000;
      will-change: transform;
      pointer-events: none;
    `;
    root.appendChild(rocket);

    const cleanup = () => {
      rocket.remove();
    };

    if (prefersReduced) {
      cleanup();
      onComplete?.();
      return;
    }

    // 2. Animar cohete
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;

    const startTime = performance.now();

    const animateRocket = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic

      const currentX = origin.x + dx * eased;
      const currentY = origin.y + dy * eased;
      const rotation = eased * 15;

      rocket.style.transform = `translate(calc(-50% + ${currentX - origin.x}px), calc(-50% + ${currentY - origin.y}px)) rotate(${rotation}deg)`;

      if (progress < 1) {
        requestAnimationFrame(animateRocket);
      } else {
        cleanup();
        createExplosion(target, root, colors);
        createWave(target, root, colors[0]);
        if (message) {
          createMessage(target, root, message);
        }
        setTimeout(() => {
          onComplete?.();
        }, 400);
      }
    };

    const raf = requestAnimationFrame(animateRocket);
    return () => {
      cancelAnimationFrame(raf);
      cleanup();
    };
  }, [origin.x, origin.y, target.x, target.y, duration, colors, message, onComplete]);

  return <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-visible" />;
};

const createExplosion = (
  target: { x: number; y: number },
  root: HTMLElement,
  colors: string[]
) => {
  const count = 18;
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    const color = colors[i % colors.length];
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const distance = 30 + Math.random() * 40;

    particle.style.cssText = `
      position: absolute;
      left: ${target.x}px;
      top: ${target.y}px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: ${color};
      transform: translate(-50%, -50%);
      z-index: 10001;
      will-change: transform, opacity;
      pointer-events: none;
    `;
    root.appendChild(particle);

    const startTime = performance.now();
    const duration = 500 + Math.random() * 200;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2);

      const x = Math.cos(angle) * distance * eased;
      const y = Math.sin(angle) * distance * eased + 40 * eased; // gravedad

      particle.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${1 - progress})`;
      particle.style.opacity = String(1 - progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        particle.remove();
      }
    };

    requestAnimationFrame(animate);
  }
};

const createWave = (
  target: { x: number; y: number },
  root: HTMLElement,
  color: string
) => {
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
  const duration = 600;

  const animate = (time: number) => {
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const size = progress * 120;

    wave.style.width = `${size}px`;
    wave.style.height = `${size}px`;
    wave.style.opacity = String(1 - progress);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      wave.remove();
    }
  };

  requestAnimationFrame(animate);
};

const createMessage = (
  target: { x: number; y: number },
  root: HTMLElement,
  message: string
) => {
  const el = document.createElement('div');
  el.textContent = message;
  el.style.cssText = `
    position: absolute;
    left: ${target.x}px;
    top: ${target.y - 40}px;
    transform: translate(-50%, -50%);
    font-size: 18px;
    font-weight: 700;
    color: #fbbf24;
    z-index: 10002;
    text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    will-change: transform, opacity;
    pointer-events: none;
  `;
  root.appendChild(el);

  const startTime = performance.now();
  const duration = 900;

  const animate = (time: number) => {
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const y = -40 * progress;

    el.style.transform = `translate(calc(-50% + 0px), calc(-50% + ${y}px))`;
    el.style.opacity = String(1 - progress);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      el.remove();
    }
  };

  requestAnimationFrame(animate);
};
