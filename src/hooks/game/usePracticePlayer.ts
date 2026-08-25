import { useCallback, useEffect, useRef, useState } from 'react';
import { PlayerPhase, PlayerStatus } from '../../types/player-controls';

interface UsePracticePlayerParams {
  revealSeconds: number;
  advanceSeconds: number;
  onReveal: () => void;
  onAdvance: () => void;
  onPrev: () => void;
  isGameFinished?: boolean;
}

const TICK_INTERVAL_MS = 200;

export interface PracticePlayerState {
  status: PlayerStatus;
  phase: PlayerPhase;
  remainingSeconds: number;
  revealSeconds: number;
  advanceSeconds: number;
}

export function usePracticePlayer({
  revealSeconds,
  advanceSeconds,
  onReveal,
  onAdvance,
  onPrev,
  isGameFinished = false,
}: UsePracticePlayerParams): PracticePlayerState & {
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  prev: () => void;
} {
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [phase, setPhase] = useState<PlayerPhase>('waiting');
  const [remaining, setRemaining] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef<PlayerStatus>('idle');
  const phaseRef = useRef<PlayerPhase>('waiting');
  const startTimeRef = useRef<number>(0);
  const remainingAtPauseRef = useRef<number>(0);
  const revealSecondsRef = useRef(revealSeconds);
  const advanceSecondsRef = useRef(advanceSeconds);
  const onRevealRef = useRef(onReveal);
  const onAdvanceRef = useRef(onAdvance);
  const onPrevRef = useRef(onPrev);
  const isGameFinishedRef = useRef(isGameFinished);
  const cycleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { revealSecondsRef.current = revealSeconds; }, [revealSeconds]);
  useEffect(() => { advanceSecondsRef.current = advanceSeconds; }, [advanceSeconds]);
  useEffect(() => { onRevealRef.current = onReveal; }, [onReveal]);
  useEffect(() => { onAdvanceRef.current = onAdvance; }, [onAdvance]);
  useEffect(() => { onPrevRef.current = onPrev; }, [onPrev]);
  useEffect(() => { isGameFinishedRef.current = isGameFinished; }, [isGameFinished]);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (cycleTimeoutRef.current) {
      clearTimeout(cycleTimeoutRef.current);
      cycleTimeoutRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setStatus('idle');
    setPhase('waiting');
    setRemaining(0);
    remainingAtPauseRef.current = 0;
  }, [clearTimers]);

  const startNextCycle = useCallback(() => {
    if (isGameFinishedRef.current || statusRef.current !== 'playing') return;

    cycleTimeoutRef.current = setTimeout(() => {
      if (isGameFinishedRef.current || statusRef.current !== 'playing') return;
      startTimeRef.current = Date.now();
      setPhase('waiting');
      phaseRef.current = 'waiting';
      setRemaining(revealSecondsRef.current);
    }, 100);
  }, []);

  const tick = useCallback(() => {
    if (statusRef.current !== 'playing') return;

    const now = Date.now();
    const elapsed = now - startTimeRef.current;
    const currentPhase = phaseRef.current;
    const phaseSeconds =
      currentPhase === 'waiting' ? revealSecondsRef.current : advanceSecondsRef.current;
    const remainingTime = Math.max(0, phaseSeconds - elapsed / 1000);

    if (remainingTime <= 0) {
      setRemaining(0);

      if (currentPhase === 'waiting') {
        onRevealRef.current?.();
        setPhase('revealing');
        phaseRef.current = 'revealing';
        startTimeRef.current = Date.now();
        setRemaining(advanceSecondsRef.current);
      } else {
        onAdvanceRef.current?.();
        startNextCycle();
      }
    } else {
      setRemaining(Math.ceil(remainingTime));
    }
  }, [startNextCycle]);

  const pause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const elapsed = Date.now() - startTimeRef.current;
    const phaseSeconds =
      phaseRef.current === 'waiting' ? revealSecondsRef.current : advanceSecondsRef.current;
    const remainingTime = Math.max(0, phaseSeconds - elapsed / 1000);
    remainingAtPauseRef.current = remainingTime;

    setStatus('paused');
    statusRef.current = 'paused';
    setRemaining(Math.ceil(remainingTime));
  }, []);

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return;

    const resumeSeconds = remainingAtPauseRef.current;
    const totalSeconds =
      phaseRef.current === 'waiting' ? revealSecondsRef.current : advanceSecondsRef.current;
    const elapsedOffset = totalSeconds - resumeSeconds;

    setStatus('playing');
    statusRef.current = 'playing';
    setRemaining(Math.ceil(resumeSeconds));
    startTimeRef.current = Date.now() - elapsedOffset * 1000;

    intervalRef.current = setInterval(tick, TICK_INTERVAL_MS);
  }, [tick]);

  const start = useCallback(() => {
    if (isGameFinishedRef.current || statusRef.current === 'playing') return;

    if (statusRef.current === 'paused') {
      resume();
      return;
    }

    setStatus('playing');
    statusRef.current = 'playing';
    setPhase('waiting');
    phaseRef.current = 'waiting';
    setRemaining(revealSecondsRef.current);
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(tick, TICK_INTERVAL_MS);
  }, [tick, resume]);

  const stop = useCallback(() => {
    clearTimers();
    setStatus('idle');
    statusRef.current = 'idle';
  }, [clearTimers]);

  const prev = useCallback(() => {
    clearTimers();
    setStatus('idle');
    statusRef.current = 'idle';
    setPhase('waiting');
    phaseRef.current = 'waiting';
    setRemaining(0);
    remainingAtPauseRef.current = 0;
    onPrevRef.current?.();
  }, [clearTimers]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    if (isGameFinished && statusRef.current === 'playing') {
      reset();
    }
  }, [isGameFinished, reset]);

  return {
    status,
    phase,
    remainingSeconds: remaining,
    revealSeconds,
    advanceSeconds,
    start,
    pause,
    resume,
    stop,
    prev,
  };
}
