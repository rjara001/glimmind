import { useState, useEffect, useRef, useCallback } from 'react';
import { AssociationList } from '../../types';
import { GlimmindGame } from '../../services/gameEngine';
import { useGameStore } from '../../store/gameStore';
import { isExactExpectedAnswer } from '../../services/voice/stt/earlyMatch';
import { createActivityEvent } from '../../utils/activity';
import { RESULT_DELAY_MS, LISTENING_TIMEOUT_MS } from '../../constants/voice';
import { useVoiceGameRefs } from './useVoiceGameRefs';
import { useVoiceSTT } from './useVoiceSTT';

export interface VoiceSessionCounts {
  total: number;
  correct: number;
  incorrect: number;
}

export type VoicePhase = 'idle' | 'speaking' | 'listening_for_answer' | 'evaluating' | 'finished';

export interface VoiceSessionResult {
  listId: string;
  listName: string;
  counts: VoiceSessionCounts;
  onRestart: () => void;
  onBack: () => void;
}

const MAX_BROWSER_ATTEMPTS = 3;

export function useVoiceSession(list: AssociationList) {
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<VoiceSessionCounts>({ total: 0, correct: 0, incorrect: 0 });
  const [isFinished, setIsFinished] = useState(false);

  const { gameRef, sessionIdRef, shouldRunRef, phaseRef, resultTimerRef, answerHandledRef, listeningFailedRef, transcriptRef } = useVoiceGameRefs(list);

  const setPhaseBoth = useCallback((next: VoicePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, [phaseRef, setPhase]);

  const browserAttemptCountRef = useRef(0);

  const logFallback = useCallback((attempt: string, data: Record<string, unknown>) => {
    const currentAssociation = gameRef.current?.currentAssociation;
    console.log('[STT-FALLBACK]', { attempt, listId: list.id, cardId: currentAssociation?.id, ...data });
  }, [list.id, gameRef]);

  const playCurrentWordRef = useRef<(() => Promise<void>) | null>(null);
  const handleAnswerRef = useRef<((answer: string) => void) | null>(null);
  const stopSTTRef = useRef<(() => void) | null>(null);
  const startSTTRef = useRef<((lang: string) => void) | null>(null);
  const languagesRef = useRef<{ ttsLang: string | null; sttLang: string | null }>({ ttsLang: null, sttLang: null });

  const handleAnswer = useCallback(
    (answer: string) => {
      const before = gameRef.current;
      const current = before?.currentAssociation;
      if (!current) return;

      const evaluated = before.setUserInput(answer).checkAnswer();
      const correct = evaluated.state.feedback === 'correct';

      if (useGameStore.getState().settings.activityHistoryEnabled) {
        const userId = useGameStore.getState().user?.uid || '';
        useGameStore.getState().recordActivity([
          createActivityEvent({
            userId,
            listId: list.id,
            cardId: current.id,
            cardTerm: current.term,
            sessionId: sessionIdRef.current,
            type: 'card_answered',
            correct,
          }),
        ]);
      }

      setCounts((prev) => ({
        total: prev.total + 1,
        correct: prev.correct + (correct ? 1 : 0),
        incorrect: prev.incorrect + (correct ? 0 : 1),
      }));

      const after = evaluated.processAction({ type: correct ? 'CORRECT' : 'PASS' });
      gameRef.current = after;

      if (after.state.isFinished) {
        stopSTTRef.current?.();
        setIsFinished(true);
        setPhaseBoth('finished');
        return;
      }

      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
      resultTimerRef.current = setTimeout(() => {
        resultTimerRef.current = null;
        if (shouldRunRef.current && playCurrentWordRef.current) {
          void playCurrentWordRef.current();
        }
      }, RESULT_DELAY_MS);
    },
    [list.id, setPhaseBoth, gameRef, sessionIdRef, resultTimerRef, shouldRunRef],
  );
  handleAnswerRef.current = handleAnswer;

  const evaluateAndHandle = useCallback((text: string, expected: string, attemptLabel: string) => {
    const evaluated = gameRef.current!.setUserInput(text).checkAnswer();
    const passed = evaluated.state.feedback === 'correct';

    logFallback(attemptLabel, {
      provider: 'browser',
      transcript: text,
      expected,
      passed,
    });

    if (passed) {
      answerHandledRef.current = true;
      setPhaseBoth('evaluating');
      void handleAnswerRef.current?.(text);
      return true;
    }

    browserAttemptCountRef.current += 1;

    if (browserAttemptCountRef.current >= MAX_BROWSER_ATTEMPTS) {
      answerHandledRef.current = true;
      setPhaseBoth('evaluating');
      void handleAnswerRef.current?.(text);
      return true;
    }

    return false;
  }, [logFallback, setPhaseBoth, gameRef]);

  const handleSTTInterim = useCallback((text: string) => {
    if (answerHandledRef.current) return;
    const current = gameRef.current?.currentAssociation;
    if (!current) return;
    if (phaseRef.current !== 'listening_for_answer') return;

    const isReversed = list.settings.flipOrder === 'reversed';
    const expected = isReversed ? current.definition[0] ?? '' : current.term;

    if (isExactExpectedAnswer(text, expected)) {
      answerHandledRef.current = true;
      setTranscript(text);
      transcriptRef.current = text;
      setPhaseBoth('evaluating');
      void handleAnswerRef.current?.(text);
    }
  }, [list.settings.flipOrder, setTranscript, setPhaseBoth, gameRef, phaseRef]);

  const expectedWords = gameRef.current?.currentAssociation
    ? [list.settings.flipOrder === 'reversed'
        ? gameRef.current.currentAssociation.definition[0] ?? ''
        : gameRef.current.currentAssociation.term]
    : undefined;

  const { tts, stt, languages, stop: stopSTT, start: startSTT } = useVoiceSTT({
    list,
    expectedWords,
    onInterim: handleSTTInterim,
    onFinal: (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (answerHandledRef.current) return;
      if (phaseRef.current !== 'listening_for_answer') return;

      const current = gameRef.current?.currentAssociation;
      if (!current) return;

      const isReversed = list.settings.flipOrder === 'reversed';
      const expected = isReversed ? current.definition[0] ?? '' : current.term;

      setTranscript(trimmed);
      transcriptRef.current = trimmed;

      const handled = evaluateAndHandle(trimmed, expected, String(browserAttemptCountRef.current + 1));
      if (handled) return;

      stopSTTRef.current?.();
      setTimeout(() => {
        if (!shouldRunRef.current) return;
        if (phaseRef.current !== 'listening_for_answer') return;
        const lang = languagesRef.current.sttLang || 'es';
        startSTTRef.current?.(lang);
      }, 300);
    },
    onError: (message: string) => {
      setError(message);

      logFallback(String(browserAttemptCountRef.current + 1), {
        provider: 'browser',
        error: message,
        passed: false,
      });

      if (phaseRef.current !== 'listening_for_answer') return;

      const isNoSpeech = message.startsWith('No speech detected');
      if (isNoSpeech) {
        setError(null);
        stopSTTRef.current?.();
        console.log('[STT] no speech, re-listening');
        setTimeout(() => {
          if (!shouldRunRef.current) return;
          if (phaseRef.current !== 'listening_for_answer') return;
          const lang = languagesRef.current.sttLang || 'es';
          startSTTRef.current?.(lang);
        }, 300);
        return;
      }

      browserAttemptCountRef.current += 1;

      if (browserAttemptCountRef.current >= MAX_BROWSER_ATTEMPTS) {
        setPhaseBoth('idle');
        setError('Speech recognition failed after maximum attempts.');
        return;
      }

      stopSTTRef.current?.();
      setTimeout(() => {
        if (!shouldRunRef.current) return;
        if (phaseRef.current !== 'listening_for_answer') return;
        const lang = languagesRef.current.sttLang || 'es';
        startSTTRef.current?.(lang);
      }, 300);
    },
  });

  stopSTTRef.current = stopSTT;
  startSTTRef.current = startSTT;
  languagesRef.current = languages;

  const playCurrentWord = useCallback(async () => {
    if (!shouldRunRef.current) return;
    const current = gameRef.current?.currentAssociation;
    if (!current) return;

    stopSTTRef.current?.();
    const isReversed = list.settings.flipOrder === 'reversed';
    const word = isReversed ? current.definition[0] ?? '' : current.term;

    browserAttemptCountRef.current = 0;

    setError(null);
    setTranscript('');
    transcriptRef.current = '';
    setPhaseBoth('speaking');
    await tts.speak(word, languages.ttsLang || 'es', isReversed ? list.settings.voiceDefId : list.settings.voiceTermId, list.settings.voiceRate, list.settings.voicePitch);
    if (!shouldRunRef.current) return;
    setPhaseBoth('listening_for_answer');
    answerHandledRef.current = false;
    listeningFailedRef.current = false;
    const lang = languages.sttLang || 'es';
    startSTTRef.current?.(lang);
  }, [list.settings.flipOrder, list.settings.voiceTermId, list.settings.voiceDefId, list.settings.voiceRate, list.settings.voicePitch, tts, languages.ttsLang, languages.sttLang, setPhaseBoth, gameRef]);
  playCurrentWordRef.current = playCurrentWord;

  const repeat = useCallback(() => {
    if (resultTimerRef.current) {
      clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
    void playCurrentWordRef.current?.();
  }, []);

  const submitTyped = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      stopSTTRef.current?.();
      setTranscript(trimmed);
      transcriptRef.current = trimmed;
      setPhaseBoth('evaluating');
      void handleAnswerRef.current?.(trimmed);
    },
    [setTranscript, setPhaseBoth],
  );

  const start = useCallback(() => {
    shouldRunRef.current = true;
    setError(null);
    setIsFinished(false);
    void playCurrentWordRef.current?.();
  }, []);

  const stop = useCallback(() => {
    shouldRunRef.current = false;
    if (resultTimerRef.current) {
      clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
    stopSTTRef.current?.();
    tts.cancel();
    setPhaseBoth('idle');
  }, [setPhaseBoth, tts]);

  const restart = useCallback(() => {
    stop();
    gameRef.current = GlimmindGame.create(list, { trackingEnabled: useGameStore.getState().settings.activityHistoryEnabled });
    sessionIdRef.current = crypto.randomUUID();
    setCounts({ total: 0, correct: 0, incorrect: 0 });
    setIsFinished(false);
    shouldRunRef.current = true;
    void playCurrentWordRef.current?.();
  }, [list, stop, playCurrentWordRef]);

  useEffect(() => {
    shouldRunRef.current = true;
    void playCurrentWordRef.current?.();
    return () => {
      shouldRunRef.current = false;
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
      stopSTTRef.current?.();
      tts.cancel();
    };
  }, []);

  useEffect(() => {
    if (phaseRef.current !== 'listening_for_answer') return;
    if (stt.isListening) return;
    if (stt.isProcessing) return;
    if (answerHandledRef.current) return;
    if (listeningFailedRef.current) return;

    const timeout = setTimeout(() => {
      if (phaseRef.current !== 'listening_for_answer') return;
      if (stt.isListening) return;
      if (stt.isProcessing) return;
      if (answerHandledRef.current) return;
      if (listeningFailedRef.current) return;

      listeningFailedRef.current = true;
      const pending = transcriptRef.current?.trim();
      if (pending) {
        setPhaseBoth('evaluating');
        void handleAnswerRef.current?.(pending);
      } else {
        setError('No speech detected (listening timeout).');
        setPhaseBoth('idle');
      }
    }, LISTENING_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [phase, stt.isListening, stt.isProcessing, setPhaseBoth]);

  return {
    phase,
    transcript,
    interim: stt.interimTranscript,
    error,
    counts,
    isFinished,
    isListening: stt.isListening,
    isProcessing: stt.isProcessing,
    currentAssociation: gameRef.current?.currentAssociation,
    gameState: gameRef.current?.state,
    start,
    stop,
    restart,
    repeat,
    submitTyped,
  };
}
