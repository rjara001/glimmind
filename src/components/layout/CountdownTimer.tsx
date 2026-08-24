import React, { useEffect, useRef, useState } from 'react';
import { CountdownTimerProps } from '../../types/countdown-timer-props';

const TICK_INTERVAL_MS = 1000;
const RING_RADIUS = 16;
const RING_VIEWBOX = 36;
const RING_CENTER = RING_VIEWBOX / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  seconds,
  isRunning,
  onComplete,
  className = '',
  ariaLabel,
}) => {
  const [remaining, setRemaining] = useState(seconds);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isRunning) {
      setRemaining(seconds);
      return;
    }

    setRemaining(seconds);
    let elapsedTicks = 0;

    const interval = setInterval(() => {
      elapsedTicks += 1;
      const next = seconds - elapsedTicks;
      setRemaining(next > 0 ? next : 0);
      if (next <= 0) {
        clearInterval(interval);
        onCompleteRef.current?.();
      }
    }, TICK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isRunning, seconds]);

  if (!isRunning || remaining <= 0) return null;

  const progressFraction = seconds > 0 ? remaining / seconds : 0;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel ?? `Auto advance in ${remaining} seconds`}
      className={`pointer-events-none ${className}`}
    >
      <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md shadow-black/10 ring-1 ring-indigo-200 backdrop-blur-sm">
        <svg
          className="absolute inset-0 h-full w-full -rotate-90"
          viewBox={`0 0 ${RING_VIEWBOX} ${RING_VIEWBOX}`}
          aria-hidden="true"
        >
          <circle
            cx={RING_CENTER}
            cy={RING_CENTER}
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-indigo-600 transition-[stroke-dashoffset] duration-1000 ease-linear"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - progressFraction)}
            strokeLinecap="round"
          />
        </svg>
        <span className="relative text-sm font-black tabular-nums text-indigo-700">{remaining}</span>
      </div>
    </div>
  );
};
