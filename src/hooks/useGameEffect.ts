import { useEffect, useRef, useCallback, useState } from 'react';
import type { EffectType, EffectOptions, EffectIntensity } from '../effects/types';

interface UseGameEffectProps {
  containerRef: React.RefObject<HTMLElement | null>;
  targetRef: React.RefObject<HTMLElement | null>;
  sourceRef?: React.RefObject<HTMLElement | null>;
  onComplete?: () => void;
}

interface UseGameEffectReturn {
  trigger: (effectType: EffectType, options?: EffectOptions) => void;
  isPlaying: boolean;
}

interface EffectQueueItem {
  type: EffectType;
  options?: EffectOptions;
  resolve: () => void;
}

const INTENSITY_MULTIPLIERS: Record<EffectIntensity, { duration: number; particleCount: number; scale: number }> = {
  sutil: { duration: 0.7, particleCount: 8, scale: 0.9 },
  normal: { duration: 1.0, particleCount: 14, scale: 1.0 },
  intenso: { duration: 1.3, particleCount: 22, scale: 1.15 },
};

export const useGameEffect = ({
  containerRef,
  targetRef,
  sourceRef,
  onComplete,
}: UseGameEffectProps): UseGameEffectReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const queueRef = useRef<EffectQueueItem[]>([]);
  const isProcessingRef = useRef(false);

  const getPositions = useCallback(
    (options?: EffectOptions) => {
      const containerRect = containerRef.current?.getBoundingClientRect();
      const fallbackSource = sourceRef?.current?.getBoundingClientRect();
      const fallbackTarget = targetRef.current?.getBoundingClientRect();

      const origin = options?.sourcePosition
        ? { x: options.sourcePosition.x, y: options.sourcePosition.y }
        : fallbackSource
        ? {
            x: fallbackSource.left + fallbackSource.width / 2 - (containerRect?.left ?? 0),
            y: fallbackSource.top + fallbackSource.height / 2 - (containerRect?.top ?? 0),
          }
        : { x: 0, y: 0 };

      const target = options?.targetPosition
        ? { x: options.targetPosition.x, y: options.targetPosition.y }
        : fallbackTarget
        ? {
            x: fallbackTarget.left + fallbackTarget.width / 2 - (containerRect?.left ?? 0),
            y: fallbackTarget.top + fallbackTarget.height / 2 - (containerRect?.top ?? 0),
          }
        : { x: 0, y: 0 };

      return { origin, target };
    },
    [containerRef, targetRef, sourceRef]
  );

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    if (queueRef.current.length === 0) {
      setIsPlaying(false);
      return;
    }

    isProcessingRef.current = true;
    setIsPlaying(true);

    const item = queueRef.current.shift()!;
    const { type, options } = item;

    const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      item.resolve();
      isProcessingRef.current = false;
      processQueue();
      return;
    }

    try {
      const { origin, target } = getPositions(options);
      const intensity = options?.intensity ?? 'normal';
      const intensityConfig = INTENSITY_MULTIPLIERS[intensity];
      const baseDuration = options?.duration ?? 800;
      const duration = baseDuration * intensityConfig.duration;

      const root = containerRef.current;
      if (!root) {
        item.resolve();
        isProcessingRef.current = false;
        processQueue();
        return;
      }

      // Create effect container
      const container = document.createElement('div');
      container.setAttribute('data-effect', type);
      container.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:visible;';
      root.appendChild(container);

      const cleanup = () => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      };

      // Execute effect based on type
      const effectPromises: Promise<void>[] = [];

      switch (type) {
        case 'cohete':
        case 'aprendida':
          effectPromises.push(createRocketEffect(container, origin, target, duration, intensityConfig, options?.message));
          break;
        case 'particulas':
          effectPromises.push(createParticlesEffect(container, origin, target, duration, intensity, options?.color));
          break;
        case 'pop':
          effectPromises.push(createPopEffect(container, target, duration, intensity, options?.color));
          break;
        case 'checkmark':
          effectPromises.push(createCheckmarkEffect(container, target, duration, intensity, options?.color));
          break;
        case 'onda':
          effectPromises.push(createWaveEffect(container, target, duration, intensity, options?.color));
          break;
        case 'combo':
          effectPromises.push(createComboEffect(container, target, duration, intensity, options?.color));
          break;
        case 'fallo':
          effectPromises.push(createFailEffect(container, target, duration, intensity, options?.color));
          break;
        case 'shake':
          effectPromises.push(createShakeEffect(container, target, duration, intensity, options?.color));
          break;
        default:
          break;
      }

      await Promise.all(effectPromises);
      cleanup();
    } catch (error) {
      console.error('Effect execution failed:', error);
    } finally {
      item.resolve();
      isProcessingRef.current = false;
      processQueue();
    }

    onComplete?.();
  }, [containerRef, getPositions, onComplete]);

  const trigger = useCallback(
    (effectType: EffectType, options?: EffectOptions) => {
      return new Promise<void>((resolve) => {
        queueRef.current.push({
          type: effectType,
          options,
          resolve,
        });
        if (!isProcessingRef.current) {
          processQueue();
        }
      });
    },
    [processQueue]
  );

  useEffect(() => {
    return () => {
      queueRef.current = [];
      isProcessingRef.current = false;
      setIsPlaying(false);
    };
  }, []);

  return { trigger, isPlaying };
};

// Effect implementations
const createRocketEffect = async (
  container: HTMLElement,
  origin: { x: number; y: number },
  target: { x: number; y: number },
  duration: number,
  intensityConfig: { particleCount: number; scale: number },
  message?: string
): Promise<void> => {
  return new Promise((resolve) => {
    // Create rocket
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
    container.appendChild(rocket);

    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const startTime = performance.now();

    const animateRocket = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      const currentX = origin.x + dx * eased;
      const currentY = origin.y + dy * eased;
      const rotation = eased * 15;

      rocket.style.transform = `translate(calc(-50% + ${currentX - origin.x}px), calc(-50% + ${currentY - origin.y}px)) rotate(${rotation}deg)`;

      if (progress < 1) {
        requestAnimationFrame(animateRocket);
      } else {
        rocket.remove();
        createExplosion(target, container, intensityConfig.particleCount);
        createWave(target, container, '#fbbf24');
        if (message) {
          createMessage(target, container, message);
        }
        setTimeout(resolve, 400);
      }
    };

    requestAnimationFrame(animateRocket);
  });
};

const createExplosion = (target: { x: number; y: number }, root: HTMLElement, count: number) => {
  const colors = ['#fbbf24', '#f59e0b', '#fb923c', '#fcd34d'];
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
    const particleDuration = 500 + Math.random() * 200;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / particleDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 2);

      const x = Math.cos(angle) * distance * eased;
      const y = Math.sin(angle) * distance * eased + 40 * eased;

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

const createWave = (target: { x: number; y: number }, root: HTMLElement, color: string) => {
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

const createMessage = (target: { x: number; y: number }, root: HTMLElement, message: string) => {
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

const createParticlesEffect = (
  container: HTMLElement,
  origin: { x: number; y: number },
  _target: { x: number; y: number },
  duration: number,
  intensity: EffectIntensity,
  _color?: string
): Promise<void> => {
  return new Promise((resolve) => {
    const count = intensity === 'sutil' ? 8 : intensity === 'intenso' ? 22 : 14;
    const colors = _color ? [_color] : ['#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b'];

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      const particleColor = colors[i % colors.length];
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
        background-color: ${particleColor};
        transform: translate(-50%, -50%);
        z-index: 10001;
        will-change: transform, opacity;
        pointer-events: none;
      `;
      container.appendChild(particle);

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

    setTimeout(resolve, duration * 1.2);
  });
};

const createPopEffect = (
  container: HTMLElement,
  target: { x: number; y: number },
  duration: number,
  _intensity: EffectIntensity,
  color?: string
): Promise<void> => {
  return new Promise((resolve) => {
    const pop = document.createElement('div');
    pop.textContent = '+1';
    const popColor = color || '#10b981';
    const scale = _intensity === 'sutil' ? 0.9 : _intensity === 'intenso' ? 1.3 : 1.0;

    pop.style.cssText = `
      position: absolute;
      left: ${target.x}px;
      top: ${target.y - 10}px;
      transform: translate(-50%, -50%);
      font-size: 20px;
      font-weight: 800;
      color: ${popColor};
      z-index: 10001;
      will-change: transform, opacity;
      text-shadow: 0 2px 4px rgba(0,0,0,0.15);
      pointer-events: none;
    `;
    container.appendChild(pop);

    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentScale = scale + 0.4 * Math.sin(progress * Math.PI);
      const y = -30 * progress;
      const opacity = 1 - progress;

      pop.style.transform = `translate(calc(-50% + 0px), calc(-50% + ${y}px)) scale(${currentScale})`;
      pop.style.opacity = String(opacity);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        pop.remove();
        resolve();
      }
    };

    requestAnimationFrame(animate);
  });
};

const createCheckmarkEffect = (
  container: HTMLElement,
  target: { x: number; y: number },
  duration: number,
  intensity: EffectIntensity,
  _color?: string
): Promise<void> => {
  return new Promise((resolve) => {
    const checkmark = document.createElement('div');
    checkmark.textContent = '✅';
    const scale = intensity === 'sutil' ? 0.9 : intensity === 'intenso' ? 1.3 : 1.0;

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
    container.appendChild(checkmark);

    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentScale = scale * (0.5 + 0.5 * Math.sin(progress * Math.PI));
      const opacity = progress < 0.8 ? 1 : 1 - (progress - 0.8) / 0.2;

      checkmark.style.transform = `translate(-50%, -50%) scale(${currentScale})`;
      checkmark.style.opacity = String(opacity);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        checkmark.remove();
        resolve();
      }
    };

    requestAnimationFrame(animate);
  });
};

const createWaveEffect = (
  container: HTMLElement,
  _target: { x: number; y: number },
  duration: number,
  _intensity: EffectIntensity,
  color?: string
): Promise<void> => {
  return new Promise((resolve) => {
    const wave = document.createElement('div');
    const waveColor = color || '#3b82f6';
    const maxSize = _intensity === 'sutil' ? 60 : _intensity === 'intenso' ? 160 : 120;

    wave.style.cssText = `
      position: absolute;
      left: ${_target.x}px;
      top: ${_target.y}px;
      width: 0px;
      height: 0px;
      border-radius: 50%;
      border: 2px solid ${waveColor};
      transform: translate(-50%, -50%);
      z-index: 10000;
      will-change: transform, opacity;
      pointer-events: none;
    `;
    container.appendChild(wave);

    const startTime = performance.now();

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
        resolve();
      }
    };

    requestAnimationFrame(animate);
  });
};

const createComboEffect = (
  container: HTMLElement,
  target: { x: number; y: number },
  duration: number,
  _intensity: EffectIntensity,
  color?: string
): Promise<void> => {
  return new Promise((resolve) => {
    const colors = color ? [color] : ['#ef4444', '#f97316', '#fbbf24'];
    const pops = 3;
    const interval = duration / pops;

    for (let i = 0; i < pops; i++) {
      setTimeout(() => {
        const pop = document.createElement('div');
        const popColor = colors[i % colors.length];
        pop.textContent = '+1';
        pop.style.cssText = `
          position: absolute;
          left: ${target.x + (Math.random() - 0.5) * 20}px;
          top: ${target.y - 10 + (Math.random() - 0.5) * 10}px;
          transform: translate(-50%, -50%) scale(0);
          font-size: 18px;
          font-weight: 800;
          color: ${popColor};
          z-index: 10001;
          will-change: transform, opacity;
          text-shadow: 0 2px 4px rgba(0,0,0,0.15);
          pointer-events: none;
        `;
        container.appendChild(pop);

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

    // Central wave
    setTimeout(() => {
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
      container.appendChild(wave);

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

    setTimeout(resolve, duration);
  });
};

const createFailEffect = (
  container: HTMLElement,
  target: { x: number; y: number },
  duration: number,
  intensity: EffectIntensity,
  color?: string
): Promise<void> => {
  return new Promise((resolve) => {
    const colors = color ? [color] : ['#ef4444', '#f87171', '#fca5a5'];
    const particleCount = intensity === 'sutil' ? 6 : intensity === 'intenso' ? 18 : 12;

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
    container.appendChild(error);

    const particles: HTMLDivElement[] = [];

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      const particleColor = colors[i % colors.length];
      const startX = target.x + (Math.random() - 0.5) * 40;
      const startY = target.y + (Math.random() - 0.5) * 20;

      particle.style.cssText = `
        position: absolute;
        left: ${startX}px;
        top: ${startY}px;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background-color: ${particleColor};
        transform: translate(-50%, -50%);
        z-index: 10002;
        will-change: transform, opacity;
        pointer-events: none;
      `;
      container.appendChild(particle);
      particles.push(particle);
    }

    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const errorScale = 0.5 + 0.5 * Math.sin(progress * Math.PI);
      error.style.transform = `translate(-50%, -50%) scale(${errorScale})`;
      error.style.opacity = String(1 - progress * 0.5);

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
        resolve();
      }
    };

    requestAnimationFrame(animate);
  });
};

const createShakeEffect = (
  container: HTMLElement,
  target: { x: number; y: number },
  duration: number,
  intensity: EffectIntensity,
  color?: string
): Promise<void> => {
  return new Promise((resolve) => {
    const shakeColor = color || '#ef4444';
    const shakeIntensity = intensity === 'sutil' ? 3 : intensity === 'intenso' ? 12 : 8;

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
    container.appendChild(indicator);

    const shake = document.createElement('div');
    shake.style.cssText = `
      position: absolute;
      left: ${target.x}px;
      top: ${target.y}px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${shakeColor}20;
      border: 2px solid ${shakeColor};
      transform: translate(-50%, -50%);
      z-index: 10000;
      will-change: transform, opacity;
      pointer-events: none;
    `;
    container.appendChild(shake);

    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

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
        resolve();
      }
    };

    requestAnimationFrame(animate);
  });
};
