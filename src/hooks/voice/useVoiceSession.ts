import { useState, useEffect, useRef, useCallback } from 'react';
import { AssociationList } from '../../types';
import { GlimmindGame } from '../../services/gameEngine';
import { useGameStore } from '../../store/gameStore';
import { isExactExpectedAnswer } from '../../services/voice/stt/earlyMatch';
import { createActivityEvent } from '../../utils/activity';
import { RESULT_DELAY_MS, LISTENING_TIMEOUT_MS } from '../../constants/voice';
import { useVoiceGameRefs } from './useVoiceGameRefs';
import { useVoiceSTT } from './useVoiceSTT';
import { useChipTTSTT } from './stt/useChipTTSTT';

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
const MAX_RECYCLE_CYCLES = 2;

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
  const browserAudioBlobsRef = useRef<Blob[]>([]);
  const fallbackActiveRef = useRef(false);
  const recycleCountRef = useRef(0);
  const chirpSttRef = useChipTTSTT({ onFinal: () => {}, onInterim: () => {}, onError: () => {} });

  const logFallback = useCallback((attempt: string, data: Record<string, unknown>) => {
    const currentAssociation = gameRef.current?.currentAssociation;
    console.log('[STT-FALLBACK]', { attempt, listId: list.id, cardId: currentAssociation?.id, ...data });
  }, [list.id, gameRef]);

  const playCurrentWordRef = useRef<(() => Promise<void>) | null>(null);
  const handleAnswerRef = useRef<((answer: string) => void) | null>(null);
  const runChirpFallbackRef = useRef<((expected: string) => Promise<void>) | null>(null);
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
      provider: attemptLabel === 'chirp' ? 'chiptt' : 'browser',
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

    if (browserAttemptCountRef.current >= MAX_BROWSER_ATTEMPTS && attemptLabel !== 'chirp') {
      answerHandledRef.current = true;
      setPhaseBoth('evaluating');
      if (list.settings.voiceSttFallback && !fallbackActiveRef.current) {
        void runChirpFallbackRef.current?.(expected);
      } else {
        void handleAnswerRef.current?.(text);
      }
      return true;
    }

    return false;
  }, [list.settings.voiceSttFallback, logFallback, setPhaseBoth, gameRef]);

  const handleSTTInterim = useCallback((text: string) => {
    if (answerHandledRef.current) return;
    const current = gameRef.current?.currentAssociation;
    if (!current) return;
    if (phaseRef.current !== 'listening_for_answer') return;

    const isReversed = list.settings.flipOrder === 'reversed';
    const expected = isReversed ? current.definition : current.term;

    if (isExactExpectedAnswer(text, expected)) {
      answerHandledRef.current = true;
      setTranscript(text);
      transcriptRef.current = text;
      setPhaseBoth('evaluating');
      void handleAnswerRef.current?.(text);
    }
  }, [list.settings.flipOrder, setTranscript, setPhaseBoth, gameRef, phaseRef]);

  const { tts, stt, languages, stop: stopSTT, start: startSTT } = useVoiceSTT({
    list,
    onInterim: handleSTTInterim,
    onFinal: (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (answerHandledRef.current) return;
      if (phaseRef.current !== 'listening_for_answer') return;

      const current = gameRef.current?.currentAssociation;
      if (!current) return;

      const isReversed = list.settings.flipOrder === 'reversed';
      const expected = isReversed ? current.definition : current.term;

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
      const current = gameRef.current?.currentAssociation;
      const expected = current ? (list.settings.flipOrder === 'reversed' ? current.definition : current.term) : '';

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
        if (list.settings.voiceSttFallback && !fallbackActiveRef.current) {
          answerHandledRef.current = true;
          setPhaseBoth('evaluating');
          void runChirpFallbackRef.current?.(expected);
        } else {
          setPhaseBoth('idle');
        }
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
    onAudioChunk: (blob) => {
      if (phaseRef.current === 'listening_for_answer' && !fallbackActiveRef.current) {
        browserAudioBlobsRef.current.push(blob);
        logFallback(String(browserAttemptCountRef.current + 1), {
          provider: 'browser',
          audioBlobSizeBytes: blob.size,
          audioBlobCount: browserAudioBlobsRef.current.length,
        });
      }
    },
  });

  stopSTTRef.current = stopSTT;
  startSTTRef.current = startSTT;
  languagesRef.current = languages;

  const runChirpFallback = useCallback(async (expected: string) => {
    if (!list.settings.voiceSttFallback) {
      return;
    }

    fallbackActiveRef.current = true;
    logFallback('chirp', {
      provider: 'chiptt',
      audioBlobCount: browserAudioBlobsRef.current.length,
      totalAudioBlobSizeBytes: browserAudioBlobsRef.current.reduce((sum, blob) => sum + blob.size, 0),
    });

    setPhaseBoth('listening_for_answer');
    setError(null);

    let chirpTranscript = '';
    try {
      const blobs = browserAudioBlobsRef.current.filter((blob) => blob.size > 0);
      if (blobs.length === 0) {
        throw new Error('No audio captured from browser attempts.');
      }

      const lang = languagesRef.current.sttLang || 'es';
      const results = await Promise.allSettled(
        blobs.map((blob) => chirpSttRef.transcribeExistingAudio?.(blob, lang).catch(() => null))
      );

      const transcripts = results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && typeof r.value === 'string' && r.value.trim().length > 0)
        .map((r) => r.value.trim());

      chirpTranscript = transcripts[0] || '';

      logFallback('chirp', {
        provider: 'chiptt',
        transcript: chirpTranscript,
        expected,
        attempts: transcripts.length,
        passed: !!chirpTranscript,
      });

      if (!chirpTranscript) {
        throw new Error('No speech detected from Chirp fallback.');
      }
    } catch (err) {
      logFallback('chirp', {
        provider: 'chiptt',
        error: err instanceof Error ? err.message : 'Unknown error',
        passed: false,
      });

      if (recycleCountRef.current < MAX_RECYCLE_CYCLES) {
        recycleCountRef.current += 1;
        logFallback('recycle', {
          provider: 'browser',
          recycleCount: recycleCountRef.current,
        });
        browserAttemptCountRef.current = 0;
        browserAudioBlobsRef.current = [];
        fallbackActiveRef.current = false;
        setTimeout(() => {
          if (!shouldRunRef.current) return;
          if (phaseRef.current !== 'listening_for_answer') return;
          const lang = languagesRef.current.sttLang || 'es';
          startSTTRef.current?.(lang);
        }, 300);
        return;
      }

      setPhaseBoth('idle');
      setError('No speech detected after Chirp fallback exhausted.');
      return;
    }

    const handled = evaluateAndHandle(chirpTranscript, expected, 'chirp');
    if (!handled) {
      if (recycleCountRef.current < MAX_RECYCLE_CYCLES) {
        recycleCountRef.current += 1;
        logFallback('recycle', {
          provider: 'browser',
          recycleCount: recycleCountRef.current,
          reason: 'chirp_failed_similarity',
        });
        browserAttemptCountRef.current = 0;
        browserAudioBlobsRef.current = [];
        fallbackActiveRef.current = false;
        setTimeout(() => {
          if (!shouldRunRef.current) return;
          if (phaseRef.current !== 'listening_for_answer') return;
          const lang = languagesRef.current.sttLang || 'es';
          startSTTRef.current?.(lang);
        }, 300);
      } else {
        setPhaseBoth('idle');
        setError('Incorrect after maximum attempts.');
      }
    }
  }, [list.settings.voiceSttFallback, chirpSttRef, setPhaseBoth, logFallback, evaluateAndHandle, gameRef, phaseRef]);
  runChirpFallbackRef.current = runChirpFallback;

  const playCurrentWord = useCallback(async () => {
    if (!shouldRunRef.current) return;
    const current = gameRef.current?.currentAssociation;
    if (!current) return;

    stopSTTRef.current?.();
    const isReversed = list.settings.flipOrder === 'reversed';
    const word = isReversed ? current.definition : current.term;

    browserAttemptCountRef.current = 0;
    browserAudioBlobsRef.current = [];
    fallbackActiveRef.current = false;
    recycleCountRef.current = 0;

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
    if (fallbackActiveRef.current) return;

    const timeout = setTimeout(() => {
      if (phaseRef.current !== 'listening_for_answer') return;
      if (stt.isListening) return;
      if (stt.isProcessing) return;
      if (answerHandledRef.current) return;
      if (listeningFailedRef.current) return;
      if (fallbackActiveRef.current) return;

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
  }, [phase, stt.isListening, stt.isProcessing, setPhaseBoth, fallbackActiveRef]);

  return {
    phase,
    transcript,
    interim: stt.interimTranscript,
    error,
    counts,
    isFinished,
    isListening: stt.isListening,
    currentAssociation: gameRef.current?.currentAssociation,
    gameState: gameRef.current?.state,
    start,
    stop,
    restart,
    repeat,
    submitTyped,
  };
}
